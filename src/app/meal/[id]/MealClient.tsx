"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/Toast";
import { useWakeLock } from "@/lib/useWakeLock";
import { useRecordEvents, clientId } from "@/lib/useRecordEvents";
import { shareOrDownloadFile } from "@/lib/share";
import { formatDuration } from "@/lib/format";
import Celebration from "@/components/Celebration";
import SmartImage from "@/components/SmartImage";
import { MealSkeleton } from "@/components/Skeletons";
import {
  BackIcon,
  EditIcon,
  CheckIcon,
  ClockIcon,
  TimerIcon,
  CalendarIcon,
  DownloadIcon,
  PlayIcon,
  StopIcon,
  ResetIcon,
} from "@/components/icons";

type TimelineItem = {
  id: string;
  time: string;
  content: string;
  recipeId: string | null;
  recipeTitle: string | null;
  done: boolean;
  order: number;
};

type Meal = {
  id: string;
  name: string;
  description: string | null;
  emoji: string | null;
  imagePath: string | null;
  imagePos: string | null;
  prepTime: number | null;
  etaAt: string | number | null;
  running: boolean;
  createdBy: string;
  createdAt: string | number;
  updatedAt: string | number;
  version: number;
  recipes: {
    id: string;
    recipeId: string;
    title: string;
    imagePath: string | null;
    missing: boolean;
  }[];
  timeline: TimelineItem[];
};

/* Resolve a "HH:MM" task time to an absolute Date, anchored to the ETA's
   calendar day (or today when there's no ETA). */
function resolveTime(hhmm: string, anchor: Date): Date | null {
  if (!hhmm) return null;
  const [h, m] = hhmm.split(":").map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  const d = new Date(anchor);
  d.setHours(h, m, 0, 0);
  return d;
}

/* Human countdown: 5025000 -> "1h 23m 45s". Always shows seconds so it reads
   as live. */
function countdown(ms: number): string {
  const abs = Math.abs(ms);
  const s = Math.floor(abs / 1000) % 60;
  const m = Math.floor(abs / 60000) % 60;
  const h = Math.floor(abs / 3600000);
  const parts: string[] = [];
  if (h) parts.push(`${h}h`);
  if (h || m) parts.push(`${m}m`);
  parts.push(`${s}s`);
  return parts.join(" ");
}

function fmtDate(value: string | number) {
  return new Date(value).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function fmtClock(value: string | number) {
  return new Date(value).toLocaleString(undefined, {
    weekday: "short",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function MealClient({ id }: { id: string }) {
  const { notify } = useToast();
  const router = useRouter();
  const [meal, setMeal] = useState<Meal | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [celebrate, setCelebrate] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const exportRef = useRef<HTMLDivElement>(null);
  const initialized = useRef(false);
  const prevAllDone = useRef(false);

  useWakeLock(true);

  // tick once a second for the countdowns
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const refresh = useCallback(() => {
    return fetch(`/api/meals?id=${id}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data && !data.error) setMeal(data);
      });
  }, [id]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useRecordEvents(`meal:${id}`, (e) => {
    if (e.type === "deleted") {
      notify("This meal was deleted", "error");
      router.push("/");
      return;
    }
    refresh();
    notify("Meal updated");
  });

  // close export menu on outside click
  useEffect(() => {
    if (!exportOpen) return;
    const onClick = (ev: MouseEvent) => {
      if (!exportRef.current?.contains(ev.target as Node)) setExportOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [exportOpen]);

  // celebrate when the timeline transitions to fully complete
  useEffect(() => {
    if (!meal) return;
    const done =
      meal.timeline.length > 0 && meal.timeline.every((t) => t.done);
    if (!initialized.current) {
      initialized.current = true;
      prevAllDone.current = done;
      return;
    }
    if (done && !prevAllDone.current) setCelebrate(true);
    prevAllDone.current = done;
  }, [meal]);

  async function toggle(item: TimelineItem) {
    if (!meal) return;
    // optimistic
    setMeal({
      ...meal,
      timeline: meal.timeline.map((t) =>
        t.id === item.id ? { ...t, done: !t.done } : t
      ),
    });
    await fetch("/api/meals/timeline", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: item.id, done: !item.done, origin: clientId() }),
    });
  }

  async function runAction(action: "start" | "stop" | "reset") {
    if (!meal) return;
    // optimistic
    if (action === "reset") {
      setMeal({
        ...meal,
        running: false,
        timeline: meal.timeline.map((t) => ({ ...t, done: false })),
      });
    } else {
      setMeal({ ...meal, running: action === "start" });
    }
    await fetch("/api/meals/state", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mealId: id, action, origin: clientId() }),
    });
  }

  async function exportFile() {
    setExporting(true);
    try {
      await shareOrDownloadFile(
        `/api/meals/export?id=${id}`,
        `${meal?.name || "meal"}.meal`
      );
    } catch {
      notify("Could not export meal", "error");
    } finally {
      setExporting(false);
      setExportOpen(false);
    }
  }

  if (!meal) return <MealSkeleton />;

  const eta = meal.etaAt ? new Date(meal.etaAt) : null;
  const anchor = eta ?? new Date();

  const sorted = [...meal.timeline].sort((a, b) => a.order - b.order);
  const allDone = sorted.length > 0 && sorted.every((t) => t.done);
  const anyDone = sorted.some((t) => t.done);
  const hasRecipes = meal.recipes.length > 0;

  // next action = earliest not-done task (by resolved time, then order)
  const pending = sorted.filter((t) => !t.done);
  const nextAction =
    pending
      .map((t) => ({ t, at: resolveTime(t.time, anchor) }))
      .sort((a, b) => {
        if (a.at && b.at) return a.at.getTime() - b.at.getTime();
        if (a.at) return -1;
        if (b.at) return 1;
        return 0;
      })[0] ?? null;

  // timers only count down while started and not yet finished
  const running = meal.running;
  const etaMs = eta ? eta.getTime() - now : null;
  const nextMs = nextAction?.at ? nextAction.at.getTime() - now : null;

  const sortedRecipes = [...meal.recipes].sort((a, b) =>
    a.title.localeCompare(b.title, undefined, { sensitivity: "base" })
  );

  const recipesSection = hasRecipes ? (
    <section>
      <h2 className="text-xl mb-2">Recipes</h2>
      <div className="grid grid-cols-1 gap-2.5">
        {sortedRecipes.map((r) =>
          r.missing ? (
            <div
              key={r.id}
              className="flex items-center gap-3.5 p-2.5 bg-surface border rounded-xl opacity-60"
            >
              <div className="w-12 h-12 rounded-lg bg-background border shrink-0" />
              <span className="text-muted">{r.title}</span>
            </div>
          ) : (
            <Link
              key={r.id}
              href={`/recipe/${r.recipeId}?from=/meal/${id}`}
              className="flex items-center gap-3.5 p-2.5 bg-surface border rounded-xl active:scale-[0.99] transition"
            >
              {r.imagePath ? (
                <SmartImage
                  src={r.imagePath}
                  wrapperClassName="w-12 h-12 rounded-lg shrink-0"
                  imgClassName="w-12 h-12 object-cover"
                />
              ) : (
                <div className="w-12 h-12 rounded-lg bg-background border shrink-0" />
              )}
              <span className="truncate">{r.title}</span>
            </Link>
          )
        )}
      </div>
    </section>
  ) : null;

  const timelineSection = (
    <section>
      <div className="flex items-baseline justify-between mb-3">
        <h2 className="text-xl">Timeline</h2>
        {sorted.length > 0 && (
          <span className="text-sm text-muted tabular-nums">
            {sorted.filter((t) => t.done).length}/{sorted.length} done
          </span>
        )}
      </div>

      {sorted.length === 0 ? (
        <p className="text-muted text-sm">
          No timeline yet.{" "}
          <Link href={`/meal/${id}/edit`} className="text-accent">
            Add some tasks
          </Link>
          .
        </p>
      ) : (
        <ol className="relative flex flex-col">
          {sorted.map((item, i) => {
            const isNext = nextAction?.t.id === item.id;
            const last = i === sorted.length - 1;
            return (
              <li key={item.id} className="flex gap-3">
                {/* rail + node */}
                <div className="flex flex-col items-center shrink-0">
                  <button
                    type="button"
                    aria-label={item.done ? "Mark not done" : "Mark done"}
                    onClick={() => toggle(item)}
                    className={`h-7 w-7 rounded-full border-2 flex items-center justify-center transition shrink-0 ${
                      item.done
                        ? "bg-accent border-accent text-accent-fg"
                        : isNext
                          ? "border-accent text-accent node-pulse"
                          : "border-border text-transparent bg-surface"
                    }`}
                  >
                    <CheckIcon size={15} />
                  </button>
                  {!last && (
                    <span
                      className={`w-0.5 flex-1 my-1 ${
                        item.done ? "bg-accent/50" : "bg-border"
                      }`}
                    />
                  )}
                </div>

                {/* content */}
                <div className={`pb-5 min-w-0 flex-1 ${last ? "pb-0" : ""}`}>
                  <div className="flex items-center gap-2">
                    <span className="text-sm tabular-nums text-muted shrink-0">
                      {item.time || "—"}
                    </span>
                    {isNext && (
                      <span className="text-[10px] uppercase tracking-wide text-accent border border-accent/40 rounded-full px-1.5">
                        Next
                      </span>
                    )}
                  </div>
                  {item.recipeId ? (
                    <Link
                      href={`/recipe/${item.recipeId}?from=/meal/${id}`}
                      className={`block leading-snug underline decoration-dotted underline-offset-2 ${
                        item.done ? "line-through opacity-50" : ""
                      }`}
                    >
                      {item.content || "Untitled task"}
                      {item.recipeTitle && (
                        <span className="text-muted text-sm no-underline">
                          {" "}
                          · {item.recipeTitle}
                        </span>
                      )}
                    </Link>
                  ) : (
                    <span
                      className={`block leading-snug ${
                        item.done ? "line-through opacity-50" : ""
                      }`}
                    >
                      {item.content || "Untitled task"}
                    </span>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );

  return (
    <div className="flex flex-col gap-6">
      {celebrate && <Celebration onDone={() => setCelebrate(false)} />}

      {/* Action bar — sticky, stays put while you scroll the meal */}
      <div className="topbar flex items-center justify-between">
        <Link href="/" className="icon-btn icon-btn-float" aria-label="Back to home">
          <BackIcon size={20} />
        </Link>
        <div className="flex items-center gap-2">
          <div className="relative" ref={exportRef}>
            <button
              type="button"
              className="icon-btn icon-btn-float"
              aria-label="Export meal"
              aria-haspopup="menu"
              aria-expanded={exportOpen}
              onClick={() => setExportOpen((o) => !o)}
            >
              <DownloadIcon size={18} />
            </button>
            {exportOpen && (
              <div
                role="menu"
                className="absolute right-0 mt-2 w-44 bg-surface border rounded-xl p-1 shadow-lg z-10"
              >
                <button
                  type="button"
                  disabled={exporting}
                  onClick={exportFile}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm text-left hover:bg-background disabled:opacity-50"
                >
                  {exporting ? "Preparing…" : "Meal file"}
                  <span className="text-muted text-xs">.meal</span>
                </button>
              </div>
            )}
          </div>
          <Link href={`/meal/${id}/edit`} className="icon-btn icon-btn-float" aria-label="Edit meal">
            <EditIcon size={18} />
          </Link>
        </div>
      </div>

      {/* Header */}
      <div className="flex flex-col gap-1 animate-rise">
        <h1 className="text-3xl leading-tight">{meal.name}</h1>
        {meal.description && <p className="text-muted">{meal.description}</p>}
      </div>

      {meal.imagePath && (
        <SmartImage
          src={meal.imagePath}
          style={{ objectPosition: meal.imagePos || "50% 50%" }}
          wrapperClassName="w-full h-72 rounded-xl"
          imgClassName="w-full h-72 object-cover"
        />
      )}

      {/* Prep time pill sits just below the image */}
      {meal.prepTime != null && (
        <div className="flex flex-wrap gap-2 text-sm text-muted">
          <span className="inline-flex items-center gap-1.5 border rounded-full px-3 py-1">
            <ClockIcon size={14} /> Prep {formatDuration(meal.prepTime)}
          </span>
        </div>
      )}

      {/* Countdowns */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="border rounded-xl p-4 bg-surface flex flex-col gap-1">
          <span className="text-sm text-muted inline-flex items-center gap-1.5">
            <TimerIcon size={15} /> Ready in
          </span>
          {etaMs == null ? (
            <span className="text-muted">No ETA set</span>
          ) : allDone ? (
            <span className="text-2xl">Ready 🎉</span>
          ) : !running ? (
            <span className="text-2xl text-muted">Not started</span>
          ) : etaMs >= 0 ? (
            <span className="text-2xl tabular-nums">{countdown(etaMs)}</span>
          ) : (
            <span className="text-2xl tabular-nums text-danger">
              Overdue {countdown(etaMs)}
            </span>
          )}
          {eta && (
            <span className="text-xs text-muted inline-flex items-center gap-1.5">
              <CalendarIcon size={12} /> {fmtClock(eta.getTime())}
            </span>
          )}
        </div>

        <div className="border rounded-xl p-4 bg-surface flex flex-col gap-1">
          <span className="text-sm text-muted inline-flex items-center gap-1.5">
            <ClockIcon size={15} /> Next task
          </span>
          {allDone ? (
            <span className="text-2xl">All done 🎉</span>
          ) : nextAction ? (
            <>
              <span className="text-base leading-tight truncate">
                {nextAction.t.content || "Untitled task"}
              </span>
              <span className="text-sm tabular-nums text-accent">
                {!running || nextMs == null
                  ? nextAction.t.time || "anytime"
                  : nextMs >= 0
                    ? `in ${countdown(nextMs)}`
                    : `due ${countdown(nextMs)} ago`}
              </span>
            </>
          ) : (
            <span className="text-muted">No tasks yet</span>
          )}
        </div>
      </div>

      {/* Start / stop / reset */}
      {(eta || sorted.length > 0) && (
        <div className="flex items-center gap-2">
          {running && !allDone ? (
            <button
              type="button"
              onClick={() => runAction("stop")}
              className="btn-outline"
            >
              <StopIcon size={15} /> Stop
            </button>
          ) : (
            <button
              type="button"
              onClick={() => runAction("start")}
              disabled={allDone}
              className="btn-primary disabled:opacity-50"
            >
              <PlayIcon size={15} /> Start
            </button>
          )}
          <button
            type="button"
            onClick={() => runAction("reset")}
            disabled={!running && !anyDone}
            className="btn-ghost disabled:opacity-40"
          >
            <ResetIcon size={15} /> Reset
          </button>
        </div>
      )}

      {/* Recipes (sticky on wide screens) + scrolling timeline */}
      {hasRecipes ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-10 lg:items-start">
          <div className="lg:sticky lg:top-4">{recipesSection}</div>
          <div className="min-w-0">{timelineSection}</div>
        </div>
      ) : (
        timelineSection
      )}

      <p className="text-xs text-muted">
        {meal.createdBy && <>By {meal.createdBy} </>}
        {meal.emoji && <>{meal.emoji} </>}
        {(meal.createdBy || meal.emoji) && <>· </>}
        Created {fmtDate(meal.createdAt)}
        {new Date(meal.updatedAt).getTime() !==
          new Date(meal.createdAt).getTime() && (
          <> · Updated {fmtDate(meal.updatedAt)}</>
        )}
      </p>
    </div>
  );
}
