"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useToast } from "@/components/Toast";
import { clientId } from "@/lib/useRecordEvents";
import ConfirmDialog from "@/components/ConfirmDialog";
import EmojiPicker from "@/components/EmojiPicker";
import QtyInput from "@/components/QtyInput";
import ImageField, { DEFAULT_IMAGE_POS } from "@/components/ImageField";
import { BackIcon, CheckIcon } from "@/components/icons";

/* Metric units plus the spoon measures requested. */
export const UNITS = [
  "g",
  "kg",
  "ml",
  "l",
  "tsp",
  "tbsp",
  "pinch",
  "pcs",
] as const;

type Ingredient = { name: string; amount: number; unit: string };
type Step = { order: number; content: string };
type Tool = { name: string };

export type RecipeFormData = {
  title: string;
  description: string;
  servings: number;
  createdBy: string;
  emoji: string;
  /* concurrency token of the loaded recipe; undefined for new recipes */
  version?: number;
  ovenTemp: number | null;
  prepTime: number | null;
  cookTime: number | null;
  chillTime: number | null;
  coolTime: number | null;
  proveTime: number | null;
  imagePath: string;
  imagePos: string;
  ingredients: Ingredient[];
  steps: Step[];
  tools: Tool[];
};

const EMPTY: RecipeFormData = {
  title: "",
  description: "",
  servings: 2,
  createdBy: "",
  emoji: "",
  ovenTemp: null,
  prepTime: null,
  cookTime: null,
  chillTime: null,
  coolTime: null,
  proveTime: null,
  imagePath: "",
  imagePos: DEFAULT_IMAGE_POS,
  ingredients: [{ name: "", amount: 0, unit: "g" }],
  steps: [{ order: 1, content: "" }],
  tools: [],
};

const inputCls = "border rounded-lg p-2 w-full";
const labelCls = "text-sm font-medium text-muted";

export default function RecipeForm({
  initial,
  recipeId,
}: {
  initial?: Partial<RecipeFormData>;
  recipeId?: string;
}) {
  const router = useRouter();
  const { notify } = useToast();
  const [data, setData] = useState<RecipeFormData>({ ...EMPTY, ...initial });
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function remove() {
    if (!recipeId) return;
    setDeleting(true);
    const res = await fetch(`/api/recipes?id=${recipeId}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      setDeleting(false);
      setConfirmDelete(false);
      notify("Could not delete recipe", "error");
      return;
    }
    notify("Recipe deleted");
    router.push("/");
  }

  function set<K extends keyof RecipeFormData>(key: K, value: RecipeFormData[K]) {
    setData((d) => ({ ...d, [key]: value }));
  }

  /* number field that allows being blank (null) */
  function numField(key: keyof RecipeFormData, label: string, suffix?: string) {
    const value = data[key] as number | null;
    return (
      <label className="flex flex-col gap-1">
        <span className={labelCls}>
          {label} {suffix && <span className="text-muted">({suffix})</span>}
        </span>
        <input
          type="number"
          className={inputCls}
          value={value ?? ""}
          onChange={(e) =>
            set(key, e.target.value === "" ? null : Number(e.target.value))
          }
        />
      </label>
    );
  }

  async function save() {
    setSaving(true);
    // re-number steps in case rows were added/removed
    const payload = {
      ...data,
      steps: data.steps.map((s, i) => ({ ...s, order: i + 1 })),
      baseVersion: data.version,
      origin: clientId(),
    };

    const res = await fetch(
      recipeId ? `/api/recipes?id=${recipeId}` : "/api/recipes",
      {
        method: recipeId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }
    );

    if (res.status === 409) {
      setSaving(false);
      const { error } = await res.json().catch(() => ({ error: "" }));
      notify(error || "This recipe was changed elsewhere.", "error");
      return;
    }

    if (!res.ok) {
      setSaving(false);
      console.error("Save failed:", await res.text());
      notify("Could not save recipe", "error");
      return;
    }

    const json = await res.json();
    router.push(`/recipe/${recipeId ?? json.id}`);
  }

  return (
    <div className="flex flex-col gap-5 max-w-xl mx-auto w-full">
      <header className="flex items-center gap-3">
        <Link
          href={recipeId ? `/recipe/${recipeId}` : "/"}
          className="icon-btn"
          aria-label="Cancel"
        >
          <BackIcon size={20} />
        </Link>
        <h1 className="text-2xl">
          {recipeId ? "Edit recipe" : "New recipe"}
        </h1>
      </header>

      <div className="flex flex-col gap-1">
        <span className={labelCls}>Title</span>
        <div className="flex gap-2 items-stretch">
          <input
            className={inputCls}
            value={data.title}
            onChange={(e) => set("title", e.target.value)}
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
        {numField("servings", "Servings")}
      </div>

      {/* ---------------- Image ---------------- */}
      <ImageField
        imagePath={data.imagePath}
        imagePos={data.imagePos}
        onImagePathChange={(path) => set("imagePath", path)}
        onImagePosChange={(pos) => set("imagePos", pos)}
      />

      {/* ---------------- Times ---------------- */}
      <fieldset className="grid grid-cols-2 gap-3">
        <legend className="text-lg mb-1">Times & temperature</legend>
        {numField("prepTime", "Prep", "min")}
        {numField("cookTime", "Cook", "min")}
        {numField("chillTime", "Chill", "min")}
        {numField("coolTime", "Cool", "min")}
        {numField("proveTime", "Prove", "min")}
        {numField("ovenTemp", "Oven", "°C")}
      </fieldset>

      {/* ---------------- Ingredients ---------------- */}
      <div className="flex flex-col gap-2">
        <h2 className="text-lg">Ingredients</h2>
        {data.ingredients.map((ing, i) => (
          <div key={i} className="flex gap-2">
            <QtyInput
              className="border rounded-lg p-2 w-20"
              amount={ing.amount}
              unit={ing.unit}
              onAmountChange={(amount) => {
                const next = [...data.ingredients];
                next[i] = { ...ing, amount };
                set("ingredients", next);
              }}
            />
            <select
              className="border rounded-lg p-2"
              value={ing.unit}
              onChange={(e) => {
                const next = [...data.ingredients];
                next[i] = { ...ing, unit: e.target.value };
                set("ingredients", next);
              }}
            >
              {UNITS.map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </select>
            <input
              className="border rounded-lg p-2 flex-1 min-w-0"
              placeholder="Ingredient"
              value={ing.name}
              onChange={(e) => {
                const next = [...data.ingredients];
                next[i] = { ...ing, name: e.target.value };
                set("ingredients", next);
              }}
            />
            <button
              type="button"
              className="px-3 text-muted"
              onClick={() =>
                set(
                  "ingredients",
                  data.ingredients.filter((_, j) => j !== i)
                )
              }
            >
              ✕
            </button>
          </div>
        ))}
        <button
          type="button"
          className="text-sm text-left text-accent"
          onClick={() =>
            set("ingredients", [
              ...data.ingredients,
              { name: "", amount: 0, unit: "g" },
            ])
          }
        >
          + Add ingredient
        </button>
      </div>

      {/* ---------------- Tools ---------------- */}
      <div className="flex flex-col gap-2">
        <h2 className="text-lg">Tools</h2>
        {data.tools.map((tool, i) => (
          <div key={i} className="flex gap-2">
            <input
              className="border rounded-lg p-2 flex-1 min-w-0"
              placeholder="Tool"
              value={tool.name}
              onChange={(e) => {
                const next = [...data.tools];
                next[i] = { name: e.target.value };
                set("tools", next);
              }}
            />
            <button
              type="button"
              className="px-3 text-muted"
              onClick={() =>
                set(
                  "tools",
                  data.tools.filter((_, j) => j !== i)
                )
              }
            >
              ✕
            </button>
          </div>
        ))}
        <button
          type="button"
          className="text-sm text-left text-accent"
          onClick={() => set("tools", [...data.tools, { name: "" }])}
        >
          + Add tool
        </button>
      </div>

      {/* ---------------- Steps ---------------- */}
      <div className="flex flex-col gap-2">
        <h2 className="text-lg">Steps</h2>
        {data.steps.map((step, i) => (
          <div key={i} className="flex gap-2 items-start">
            <span className="pt-2 text-muted w-5">{i + 1}.</span>
            <textarea
              className="border rounded-lg p-2 flex-1 min-w-0"
              rows={2}
              placeholder="Describe this step"
              value={step.content}
              onChange={(e) => {
                const next = [...data.steps];
                next[i] = { ...step, content: e.target.value };
                set("steps", next);
              }}
            />
            <button
              type="button"
              className="px-3 text-muted"
              onClick={() =>
                set(
                  "steps",
                  data.steps.filter((_, j) => j !== i)
                )
              }
            >
              ✕
            </button>
          </div>
        ))}
        <button
          type="button"
          className="text-sm text-left text-accent"
          onClick={() =>
            set("steps", [
              ...data.steps,
              { order: data.steps.length + 1, content: "" },
            ])
          }
        >
          + Add step
        </button>
      </div>

      <div className="flex items-center gap-2 border-t pt-4">
        {recipeId && (
          <button
            type="button"
            onClick={() => setConfirmDelete(true)}
            className="btn-ghost mr-auto text-danger"
          >
            Delete
          </button>
        )}
        <Link
          href={recipeId ? `/recipe/${recipeId}` : "/"}
          className="btn-ghost"
        >
          Cancel
        </Link>
        <button
          onClick={save}
          disabled={saving}
          className="btn-primary disabled:opacity-50"
        >
          <CheckIcon size={16} />
          {saving ? "Saving…" : "Save recipe"}
        </button>
      </div>

      <ConfirmDialog
        open={confirmDelete}
        title="Delete this recipe?"
        message="This permanently removes the recipe and its cooking history. This can’t be undone."
        confirmLabel={deleting ? "Deleting…" : "Delete"}
        destructive
        onCancel={() => setConfirmDelete(false)}
        onConfirm={remove}
      />
    </div>
  );
}
