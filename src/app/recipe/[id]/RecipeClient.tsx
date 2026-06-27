"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/Toast";
import { useWakeLock } from "@/lib/useWakeLock";
import { useRecordEvents, clientId } from "@/lib/useRecordEvents";
import { shareOrDownloadFile } from "@/lib/share";
import { formatDuration, formatAmount } from "@/lib/format";
import SmartImage from "@/components/SmartImage";
import { RecipeSkeleton } from "@/components/Skeletons";
import {
  BackIcon,
  EditIcon,
  ClockIcon,
  CheckIcon,
  DownloadIcon,
} from "@/components/icons";

type Recipe = any;
type CookLog = { id: string; cookedAt: string; notes: string | null };

function fmtDate(ms: number | string) {
  return new Date(ms).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function fmtLogDate(ms: number | string) {
  return new Date(ms).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function RecipeClient({
  id,
  backHref = "/",
}: {
  id: string;
  backHref?: string;
}) {
  const { notify } = useToast();
  const router = useRouter();
  const loadedRef = useRef(false);
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [servings, setServings] = useState(1);
  const [logs, setLogs] = useState<CookLog[]>([]);
  const [note, setNote] = useState("");
  const [logging, setLogging] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [exporting, setExporting] = useState<"recipe" | "pdf" | null>(null);
  const exportRef = useRef<HTMLDivElement>(null);
  // aesthetic-only "have I got this?" ticks; intentionally not persisted
  const [checked, setChecked] = useState<Set<string>>(new Set());

  // keep the screen awake while following a recipe
  useWakeLock(true);

  useEffect(() => {
    if (!exportOpen) return;
    const onClick = (e: MouseEvent) => {
      if (!exportRef.current?.contains(e.target as Node)) setExportOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [exportOpen]);

  const refreshRecipe = useCallback(() => {
    return fetch(`/api/recipes?id=${id}`)
      .then((r) => r.json())
      .then((data) => {
        setRecipe(data);
        // only seed the servings stepper on first load, so a live refresh
        // doesn't reset the user's adjustment
        if (!loadedRef.current) {
          setServings(data.servings);
          loadedRef.current = true;
        }
      });
  }, [id]);

  useEffect(() => {
    refreshRecipe();
  }, [refreshRecipe]);

  const refreshLogs = useCallback(() => {
    fetch(`/api/logs?recipeId=${id}`)
      .then((r) => r.json())
      .then(setLogs);
  }, [id]);

  useEffect(() => {
    refreshLogs();
  }, [refreshLogs]);

  // realtime: react to changes made by other viewers of this recipe
  useRecordEvents(`recipe:${id}`, (e) => {
    if (e.type === "deleted") {
      notify("This recipe was deleted", "error");
      router.push("/");
      return;
    }
    refreshRecipe();
    refreshLogs();
    notify("Recipe updated");
  });

  if (!recipe) return <RecipeSkeleton />;

  const scale = servings / recipe.servings;

  const byName = (a: { name: string }, b: { name: string }) =>
    a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
  const ingredients = [...recipe.ingredients].sort(byName);
  const sortedTools = recipe.tools ? [...recipe.tools].sort(byName) : [];

  const times = [
    ["Prep", recipe.prepTime],
    ["Cook", recipe.cookTime],
    ["Chill", recipe.chillTime],
    ["Cool", recipe.coolTime],
    ["Prove", recipe.proveTime],
  ].filter(([, v]) => v != null) as [string, number][];

  async function logCook() {
    setLogging(true);
    try {
      await fetch("/api/logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipeId: id, notes: note, origin: clientId() }),
      });
      setNote("");
      refreshLogs();
      notify("Cook logged");
    } finally {
      setLogging(false);
    }
  }

  async function deleteLog(logId: string) {
    await fetch(`/api/logs?id=${logId}&origin=${clientId()}`, {
      method: "DELETE",
    });
    refreshLogs();
    notify("Entry removed");
  }

  async function exportFile(url: string, ext: "recipe" | "pdf") {
    setExporting(ext);
    try {
      await shareOrDownloadFile(url, `${recipe.title || "recipe"}.${ext}`);
    } catch {
      notify("Could not export recipe", "error");
    } finally {
      setExporting(null);
      setExportOpen(false);
    }
  }

  // The "By … · Created …" credit. On wide screens it closes the left details
  // column; on mobile it drops to the very bottom of the page (after method
  // and history). Rendered in both slots, shown one at a time per breakpoint.
  const metaLine = (
    <>
      {recipe.createdBy && <>By {recipe.createdBy} </>}
      {recipe.emoji && <>{recipe.emoji} </>}
      {(recipe.createdBy || recipe.emoji) && <>· </>}
      Created {fmtDate(recipe.createdAt)}
      {recipe.updatedAt !== recipe.createdAt && (
        <> · Updated {fmtDate(recipe.updatedAt)}</>
      )}
    </>
  );

  return (
    <div className="flex flex-col gap-6">
      {/* Action bar — sticky, stays put while you scroll the recipe */}
      <div className="topbar flex items-center justify-between">
        <Link
          href={backHref}
          className="icon-btn icon-btn-float"
          aria-label={backHref === "/" ? "Back to recipes" : "Back to meal"}
        >
          <BackIcon size={20} />
        </Link>
        <div className="flex items-center gap-2">
          <div className="relative" ref={exportRef}>
            <button
              type="button"
              className="icon-btn icon-btn-float"
              aria-label="Export recipe"
              aria-haspopup="menu"
              aria-expanded={exportOpen}
              onClick={() => setExportOpen((o) => !o)}
            >
              <DownloadIcon size={18} />
            </button>
            {exportOpen && (
              <div
                role="menu"
                className="absolute right-0 mt-2 w-48 bg-surface border rounded-xl p-1 shadow-lg z-10"
              >
                <button
                  type="button"
                  disabled={exporting !== null}
                  onClick={() => exportFile(`/api/recipes/export?id=${id}`, "recipe")}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm text-left hover:bg-background disabled:opacity-50"
                >
                  {exporting === "recipe" ? "Preparing…" : "Recipe file"}
                  <span className="text-muted text-xs">.recipe</span>
                </button>
                <button
                  type="button"
                  disabled={exporting !== null}
                  onClick={() => exportFile(`/api/recipes/pdf?id=${id}`, "pdf")}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm text-left hover:bg-background disabled:opacity-50"
                >
                  {exporting === "pdf" ? "Preparing…" : "PDF document"}
                  <span className="text-muted text-xs">.pdf</span>
                </button>
              </div>
            )}
          </div>
          <Link
            href={`/recipe/${id}/edit`}
            className="icon-btn icon-btn-float"
            aria-label="Edit recipe"
          >
            <EditIcon size={18} />
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-10 lg:items-start animate-rise">
        {/* Left: recipe details */}
        <div className="flex flex-col gap-6 min-w-0">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl leading-tight">{recipe.title}</h1>
        {recipe.description && (
          <p className="text-muted">{recipe.description}</p>
        )}
      </div>

      {recipe.imagePath && (
        <SmartImage
          src={recipe.imagePath}
          style={{ objectPosition: recipe.imagePos || "50% 50%" }}
          wrapperClassName="w-full h-72 rounded-xl"
          imgClassName="w-full h-72 object-cover"
        />
      )}

      {/* Times & oven temp */}
      {(times.length > 0 || recipe.ovenTemp != null) && (
        <div className="flex flex-wrap gap-2 text-sm text-muted">
          {times.map(([label, v]) => (
            <span
              key={label}
              className="inline-flex items-center gap-1.5 border rounded-full px-3 py-1"
            >
              <ClockIcon size={14} />
              {label} {formatDuration(v)}
            </span>
          ))}
          {recipe.ovenTemp != null && (
            <span className="inline-flex items-center gap-1.5 border rounded-full px-3 py-1">
              {recipe.ovenTemp}°C
            </span>
          )}
        </div>
      )}

      {/* Servings stepper */}
      <div className="flex items-center justify-between border-y py-3">
        <span className="text-muted">Servings</span>
        <div className="flex items-center gap-4">
          <button
            className="icon-btn text-lg"
            aria-label="Fewer servings"
            onClick={() => setServings((s) => Math.max(1, s - 1))}
          >
            −
          </button>
          <span className="w-6 text-center text-lg">{servings}</span>
          <button
            className="icon-btn text-lg"
            aria-label="More servings"
            onClick={() => setServings((s) => s + 1)}
          >
            +
          </button>
        </div>
      </div>

      <section>
        <h2 className="text-xl mb-2">Ingredients</h2>
        <ul className="flex flex-col gap-0.5">
          {ingredients.map((ing: any) => {
            const on = checked.has(ing.id);
            return (
              <li key={ing.id}>
                <button
                  type="button"
                  onClick={() =>
                    setChecked((prev) => {
                      const next = new Set(prev);
                      next.has(ing.id) ? next.delete(ing.id) : next.add(ing.id);
                      return next;
                    })
                  }
                  className="flex gap-3 items-baseline w-full text-left py-1 rounded-lg active:bg-background/60 transition"
                >
                  <span
                    aria-hidden
                    className={`mt-0.5 shrink-0 h-[18px] w-[18px] rounded border flex items-center justify-center self-center transition ${
                      on ? "bg-accent border-accent text-accent-fg" : "bg-surface"
                    }`}
                  >
                    {on && <CheckIcon size={12} />}
                  </span>
                  <span
                    className={`text-muted tabular-nums shrink-0 w-20 ${
                      on ? "line-through opacity-50" : ""
                    }`}
                  >
                    {formatAmount(ing.amount * scale, ing.unit)} {ing.unit}
                  </span>
                  <span
                    className={`min-w-0 break-words ${
                      on ? "line-through opacity-50" : ""
                    }`}
                  >
                    {ing.name}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </section>

      {sortedTools.length > 0 && (
        <section>
          <h2 className="text-xl mb-2">Tools</h2>
          <ul className="flex flex-wrap gap-2 text-sm">
            {sortedTools.map((tool: any) => (
              <li key={tool.id} className="border rounded-full px-3 py-1">
                {tool.name}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* wide screens: credit closes the left column */}
      <p className="hidden lg:block text-xs text-muted border-t pt-4">
        {metaLine}
      </p>
        </div>

        {/* Right: method + cooking history — scrolls past the sticky details */}
        <div className="flex flex-col gap-6 min-w-0">
      <section>
        <h2 className="text-xl mb-2">Method</h2>
        <ol className="flex flex-col gap-3">
          {recipe.steps
            .slice()
            .sort((a: any, b: any) => a.order - b.order)
            .map((step: any, i: number) => (
              <li key={step.id} className="flex gap-3">
                <span className="text-accent shrink-0">{i + 1}</span>
                <span className="min-w-0 break-words">{step.content}</span>
              </li>
            ))}
        </ol>
      </section>

      <section className="border-t pt-5">
        <h2 className="text-xl mb-1">Cooking history</h2>
        <p className="text-sm text-muted mb-3">
          {logs.length === 0
            ? "Not cooked yet."
            : `Cooked ${logs.length} ${logs.length === 1 ? "time" : "times"}.`}
        </p>

        <div className="flex gap-2">
          <input
            className="border rounded-lg p-2 flex-1"
            placeholder="Optional note (e.g. doubled the recipe)"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") logCook();
            }}
          />
          <button
            onClick={logCook}
            disabled={logging}
            className="btn-primary disabled:opacity-50 shrink-0"
          >
            <CheckIcon size={16} />
            Log a cook
          </button>
        </div>

        {logs.length > 0 && (
          <ul className="flex flex-col mt-4">
            {logs.map((log) => (
              <li
                key={log.id}
                className="flex items-start gap-3 py-2.5 border-b last:border-b-0"
              >
                <ClockIcon size={15} className="text-muted mt-0.5 shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="text-sm">{fmtLogDate(log.cookedAt)}</div>
                  {log.notes && (
                    <div className="text-sm text-muted">{log.notes}</div>
                  )}
                </div>
                <button
                  onClick={() => deleteLog(log.id)}
                  aria-label="Remove entry"
                  className="text-muted text-sm shrink-0"
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
        </div>
      </div>

      {/* mobile: credit sits at the very bottom of the page */}
      <p className="lg:hidden text-xs text-muted border-t pt-4">{metaLine}</p>
    </div>
  );
}
