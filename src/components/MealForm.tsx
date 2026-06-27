"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useToast } from "@/components/Toast";
import { clientId } from "@/lib/useRecordEvents";
import ConfirmDialog from "@/components/ConfirmDialog";
import EmojiPicker from "@/components/EmojiPicker";
import ImageField, { DEFAULT_IMAGE_POS } from "@/components/ImageField";
import {
  BackIcon,
  CheckIcon,
  ChevronUpIcon,
  ChevronDownIcon,
  TrashIcon,
} from "@/components/icons";

export type MealTimelineItem = {
  time: string; // "HH:MM"
  content: string;
  recipeId: string | null;
};

export type MealFormData = {
  name: string;
  description: string;
  createdBy: string;
  emoji: string;
  imagePath: string;
  imagePos: string;
  prepTime: number | null;
  etaAt: string; // datetime-local value, "" when unset
  version?: number;
  recipes: { recipeId: string }[];
  timeline: MealTimelineItem[];
};

const EMPTY: MealFormData = {
  name: "",
  description: "",
  createdBy: "",
  emoji: "",
  imagePath: "",
  imagePos: DEFAULT_IMAGE_POS,
  prepTime: null,
  etaAt: "",
  recipes: [],
  timeline: [],
};

const inputCls = "border rounded-lg p-2 w-full";
const labelCls = "text-sm font-medium text-muted";

export default function MealForm({
  initial,
  mealId,
  availableRecipes,
}: {
  initial?: Partial<MealFormData>;
  mealId?: string;
  availableRecipes: { id: string; title: string }[];
}) {
  const router = useRouter();
  const { notify } = useToast();
  const [data, setData] = useState<MealFormData>({ ...EMPTY, ...initial });
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const titleById = new Map(availableRecipes.map((r) => [r.id, r.title]));
  const attachedIds = new Set(data.recipes.map((r) => r.recipeId));
  const unattached = availableRecipes.filter((r) => !attachedIds.has(r.id));

  function set<K extends keyof MealFormData>(key: K, value: MealFormData[K]) {
    setData((d) => ({ ...d, [key]: value }));
  }

  function addRecipe(recipeId: string) {
    if (!recipeId || attachedIds.has(recipeId)) return;
    set("recipes", [...data.recipes, { recipeId }]);
  }

  function removeRecipe(recipeId: string) {
    set(
      "recipes",
      data.recipes.filter((r) => r.recipeId !== recipeId)
    );
    // also unlink any timeline items pointing at it
    set(
      "timeline",
      data.timeline.map((t) =>
        t.recipeId === recipeId ? { ...t, recipeId: null } : t
      )
    );
  }

  function updateItem(i: number, patch: Partial<MealTimelineItem>) {
    const next = [...data.timeline];
    next[i] = { ...next[i], ...patch };
    set("timeline", next);
  }

  function moveItem(i: number, dir: -1 | 1) {
    const j = i + dir;
    if (j < 0 || j >= data.timeline.length) return;
    const next = [...data.timeline];
    [next[i], next[j]] = [next[j], next[i]];
    set("timeline", next);
  }

  async function save() {
    if (!data.name.trim()) {
      notify("Give the meal a name", "error");
      return;
    }
    setSaving(true);

    // sort timeline by clock time so it always reads chronologically
    const timeline = [...data.timeline]
      .filter((t) => t.content.trim() || t.time)
      .sort((a, b) => (a.time || "99:99").localeCompare(b.time || "99:99"));

    const payload = {
      ...data,
      timeline,
      etaAt: data.etaAt ? new Date(data.etaAt).toISOString() : null,
      baseVersion: data.version,
      origin: clientId(),
    };

    const res = await fetch(mealId ? `/api/meals?id=${mealId}` : "/api/meals", {
      method: mealId ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (res.status === 409) {
      setSaving(false);
      const { error } = await res.json().catch(() => ({ error: "" }));
      notify(error || "This meal was changed elsewhere.", "error");
      return;
    }
    if (!res.ok) {
      setSaving(false);
      notify("Could not save meal", "error");
      return;
    }
    const json = await res.json();
    router.push(`/meal/${mealId ?? json.id}`);
  }

  async function remove() {
    if (!mealId) return;
    setDeleting(true);
    const res = await fetch(`/api/meals?id=${mealId}`, { method: "DELETE" });
    if (!res.ok) {
      setDeleting(false);
      setConfirmDelete(false);
      notify("Could not delete meal", "error");
      return;
    }
    notify("Meal deleted");
    router.push("/");
  }

  return (
    <div className="flex flex-col gap-5 max-w-xl mx-auto w-full">
      <header className="flex items-center gap-3">
        <Link
          href={mealId ? `/meal/${mealId}` : "/"}
          className="icon-btn"
          aria-label="Cancel"
        >
          <BackIcon size={20} />
        </Link>
        <h1 className="text-2xl">{mealId ? "Edit meal" : "New meal"}</h1>
      </header>

      <div className="flex flex-col gap-1">
        <span className={labelCls}>Name</span>
        <div className="flex gap-2 items-stretch">
          <input
            className={inputCls}
            value={data.name}
            onChange={(e) => set("name", e.target.value)}
          />
          <EmojiPicker
            value={data.emoji}
            onChange={(emoji) => set("emoji", emoji)}
          />
        </div>
      </div>

      <label className="flex flex-col gap-1">
        <span className={labelCls}>Description</span>
        <textarea
          className={inputCls}
          rows={2}
          value={data.description}
          onChange={(e) => set("description", e.target.value)}
        />
      </label>

      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1">
          <span className={labelCls}>Created by</span>
          <input
            className={inputCls}
            value={data.createdBy}
            onChange={(e) => set("createdBy", e.target.value)}
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className={labelCls}>
            Prep time <span className="text-muted">(min)</span>
          </span>
          <input
            type="number"
            className={inputCls}
            value={data.prepTime ?? ""}
            onChange={(e) =>
              set("prepTime", e.target.value === "" ? null : Number(e.target.value))
            }
          />
        </label>
      </div>

      <label className="flex flex-col gap-1">
        <span className={labelCls}>Ready by (ETA)</span>
        <input
          type="datetime-local"
          className={inputCls}
          value={data.etaAt}
          onChange={(e) => set("etaAt", e.target.value)}
        />
      </label>

      {/* ---------------- Image ---------------- */}
      <ImageField
        imagePath={data.imagePath}
        imagePos={data.imagePos}
        onImagePathChange={(path) => set("imagePath", path)}
        onImagePosChange={(pos) => set("imagePos", pos)}
      />

      {/* ---------------- Recipes ---------------- */}
      <div className="flex flex-col gap-2">
        <h2 className="text-lg">Recipes</h2>
        {data.recipes.length > 0 && (
          <ul className="flex flex-col gap-1.5">
            {data.recipes.map((r) => (
              <li
                key={r.recipeId}
                className="flex items-center gap-2 border rounded-lg px-3 py-2 bg-surface"
              >
                <span className="flex-1 min-w-0 truncate">
                  {titleById.get(r.recipeId) ?? "(unknown recipe)"}
                </span>
                <button
                  type="button"
                  className="text-muted"
                  aria-label="Remove recipe"
                  onClick={() => removeRecipe(r.recipeId)}
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>
        )}
        {unattached.length > 0 ? (
          <select
            className={inputCls}
            value=""
            onChange={(e) => {
              addRecipe(e.target.value);
              e.target.value = "";
            }}
          >
            <option value="">+ Attach a recipe…</option>
            {unattached.map((r) => (
              <option key={r.id} value={r.id}>
                {r.title}
              </option>
            ))}
          </select>
        ) : availableRecipes.length === 0 ? (
          <p className="text-sm text-muted">
            No recipes yet — create some first to attach them.
          </p>
        ) : null}
      </div>

      {/* ---------------- Timeline ---------------- */}
      <div className="flex flex-col gap-2">
        <h2 className="text-lg">Timeline</h2>
        <p className="text-sm text-muted -mt-1">
          Tasks to do during prep. Link one to a recipe to jump to it.
        </p>
        {data.timeline.map((item, i) => (
          <div
            key={i}
            className="flex flex-col gap-2 border rounded-xl p-2.5 bg-surface"
          >
            <div className="flex gap-2 items-start">
              <input
                type="time"
                className="border rounded-lg p-2 w-28 shrink-0"
                value={item.time}
                onChange={(e) => updateItem(i, { time: e.target.value })}
              />
              <input
                className="border rounded-lg p-2 flex-1 min-w-0"
                placeholder="What needs doing"
                value={item.content}
                onChange={(e) => updateItem(i, { content: e.target.value })}
              />
            </div>
            <div className="flex gap-2 items-center">
              <select
                className="border rounded-lg p-2 flex-1 min-w-0 text-sm"
                value={item.recipeId ?? ""}
                onChange={(e) =>
                  updateItem(i, { recipeId: e.target.value || null })
                }
              >
                <option value="">No linked recipe</option>
                {data.recipes.map((r) => (
                  <option key={r.recipeId} value={r.recipeId}>
                    {titleById.get(r.recipeId) ?? "(recipe)"}
                  </option>
                ))}
              </select>
              <button
                type="button"
                className="icon-btn"
                aria-label="Move up"
                onClick={() => moveItem(i, -1)}
              >
                <ChevronUpIcon size={16} />
              </button>
              <button
                type="button"
                className="icon-btn"
                aria-label="Move down"
                onClick={() => moveItem(i, 1)}
              >
                <ChevronDownIcon size={16} />
              </button>
              <button
                type="button"
                className="icon-btn text-danger"
                aria-label="Remove task"
                onClick={() =>
                  set(
                    "timeline",
                    data.timeline.filter((_, j) => j !== i)
                  )
                }
              >
                <TrashIcon size={16} />
              </button>
            </div>
          </div>
        ))}
        <button
          type="button"
          className="text-sm text-left text-accent"
          onClick={() =>
            set("timeline", [
              ...data.timeline,
              { time: "", content: "", recipeId: null },
            ])
          }
        >
          + Add timeline task
        </button>
      </div>

      <div className="flex items-center gap-2 border-t pt-4">
        {mealId && (
          <button
            type="button"
            onClick={() => setConfirmDelete(true)}
            className="btn-ghost mr-auto text-danger"
          >
            Delete
          </button>
        )}
        <Link href={mealId ? `/meal/${mealId}` : "/"} className="btn-ghost">
          Cancel
        </Link>
        <button
          onClick={save}
          disabled={saving}
          className="btn-primary disabled:opacity-50"
        >
          <CheckIcon size={16} />
          {saving ? "Saving…" : "Save meal"}
        </button>
      </div>

      <ConfirmDialog
        open={confirmDelete}
        title="Delete this meal?"
        message="This removes the meal and its timeline. Attached recipes are not deleted."
        confirmLabel={deleting ? "Deleting…" : "Delete"}
        destructive
        onCancel={() => setConfirmDelete(false)}
        onConfirm={remove}
      />
    </div>
  );
}
