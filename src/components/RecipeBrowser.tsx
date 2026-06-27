"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/Toast";
import { PlusIcon, SearchIcon, ImportIcon } from "@/components/icons";

export type BrowserItem = {
  id: string;
  kind: "recipe" | "meal";
  title: string;
  description: string;
  emoji: string;
  imagePath: string;
  createdBy: string;
  /* extra text to match on when searching (ingredient / recipe names) */
  keywords: string[];
  /* most recent cook (ms since epoch); recipes only */
  lastCookedAt: number | null;
};

const ALPHABET = ["#", ..."ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("")];

function letterOf(title: string) {
  const c = (title.trim()[0] || "#").toUpperCase();
  return /[A-Z]/.test(c) ? c : "#";
}

function relativeDay(ms: number) {
  const then = new Date(ms);
  const today = new Date();
  const startOf = (d: Date) =>
    new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const days = Math.round((startOf(today) - startOf(then)) / 86400000);
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 7) return `${days} days ago`;
  return then.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year:
      then.getFullYear() === today.getFullYear() ? undefined : "numeric",
  });
}

function Card({ item }: { item: BrowserItem }) {
  const isMeal = item.kind === "meal";
  return (
    <Link
      href={isMeal ? `/meal/${item.id}` : `/recipe/${item.id}`}
      className="relative flex items-center gap-3.5 p-2.5 bg-surface border rounded-xl active:scale-[0.99] transition"
    >
      {item.imagePath ? (
        <img
          src={item.imagePath}
          className="w-16 h-16 rounded-lg object-cover shrink-0"
        />
      ) : (
        <div className="w-16 h-16 rounded-lg bg-accent/10 border shrink-0 grid place-items-center select-none">
          <span className="text-3xl leading-none">{item.emoji || "🍽️"}</span>
        </div>
      )}
      <div className="min-w-0 flex-1 pr-12">
        <div className="truncate text-lg leading-tight">{item.title}</div>
        {item.description && (
          <div className="text-sm text-muted truncate mt-0.5">
            {item.description}
          </div>
        )}
        {!isMeal && (
          <div className="text-xs text-muted mt-0.5">
            {item.lastCookedAt
              ? `Last cooked ${relativeDay(item.lastCookedAt)}`
              : "Not cooked yet"}
          </div>
        )}
      </div>
      <span className="absolute top-2 right-2 shrink-0 rounded-full border px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-muted">
        {isMeal ? "Meal" : "Recipe"}
      </span>
    </Link>
  );
}

export default function RecipeBrowser({
  items,
}: {
  items: BrowserItem[];
}) {
  const router = useRouter();
  const { notify } = useToast();
  const [query, setQuery] = useState("");
  const importRef = useRef<HTMLInputElement>(null);
  const scrubbing = useRef(false);
  const lastJump = useRef<string>("");
  const [newOpen, setNewOpen] = useState(false);
  const newRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!newOpen) return;
    const onClick = (e: MouseEvent) => {
      if (!newRef.current?.contains(e.target as Node)) setNewOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [newOpen]);

  async function importFile(file: File) {
    try {
      const text = await file.text();
      // route by file extension: .meal vs .recipe
      const isMeal = /\.meal$/i.test(file.name);
      const res = await fetch(
        isMeal ? "/api/meals/import" : "/api/recipes/import",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: text,
        }
      );
      if (!res.ok) {
        const { error } = await res.json().catch(() => ({ error: "" }));
        notify(error || "Could not import file", "error");
        return;
      }
      const { id } = await res.json();
      notify(isMeal ? "Meal imported" : "Recipe imported");
      router.push(isMeal ? `/meal/${id}` : `/recipe/${id}`);
    } catch {
      notify("Could not read file", "error");
    }
  }

  const indexed = useMemo(
    () =>
      items.map((item) => ({
        item,
        haystack: [item.title, item.description, item.createdBy, ...item.keywords]
          .join(" ")
          .toLowerCase(),
      })),
    [items]
  );

  const q = query.trim().toLowerCase();
  const searching = q.length > 0;
  const filtered = searching
    ? indexed.filter((x) => x.haystack.includes(q)).map((x) => x.item)
    : items;

  // group (only used when not searching)
  const groups = useMemo(() => {
    const m = new Map<string, BrowserItem[]>();
    for (const item of items) {
      const key = letterOf(item.title);
      if (!m.has(key)) m.set(key, []);
      m.get(key)!.push(item);
    }
    return m;
  }, [items]);

  function jump(letter: string) {
    if (!groups.has(letter) || lastJump.current === letter) return;
    lastJump.current = letter;
    document
      .getElementById(`letter-${letter}`)
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function jumpFromPoint(clientY: number) {
    const el = document.elementFromPoint(
      // rail is on the far right; sample a few px in from its center
      window.innerWidth - 14,
      clientY
    );
    const letter = el?.getAttribute?.("data-letter");
    if (letter) jump(letter);
  }

  return (
    <div className="flex flex-col gap-5">
      <header className="flex items-center justify-between">
        <h1 className="text-5xl tracking-tight">Proove</h1>
        <div className="flex items-center gap-2">
          <input
            ref={importRef}
            type="file"
            accept=".recipe,.meal,application/json"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) importFile(file);
              e.target.value = "";
            }}
          />
          <button
            type="button"
            onClick={() => importRef.current?.click()}
            className="icon-btn"
            aria-label="Import"
            title="Import a .recipe or .meal file"
          >
            <ImportIcon size={18} />
          </button>
          <div className="relative" ref={newRef}>
            <button
              type="button"
              className="icon-btn"
              aria-label="Create new"
              aria-haspopup="menu"
              aria-expanded={newOpen}
              onClick={() => setNewOpen((o) => !o)}
            >
              <PlusIcon size={20} />
            </button>
            {newOpen && (
              <div
                role="menu"
                className="absolute right-0 mt-2 w-44 bg-surface border rounded-xl p-1 shadow-lg z-10"
              >
                <Link
                  href="/new"
                  onClick={() => setNewOpen(false)}
                  className="flex items-center justify-between px-3 py-2 rounded-lg text-sm hover:bg-background"
                >
                  New recipe
                  <span className="text-muted text-xs">.recipe</span>
                </Link>
                <Link
                  href="/meal/new"
                  onClick={() => setNewOpen(false)}
                  className="flex items-center justify-between px-3 py-2 rounded-lg text-sm hover:bg-background"
                >
                  New meal
                  <span className="text-muted text-xs">.meal</span>
                </Link>
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="relative">
        <SearchIcon
          size={18}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-muted"
        />
        <input
          className="border rounded-xl py-2.5 pl-10 pr-9 w-full"
          placeholder="Search recipes, ingredients…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        {query && (
          <button
            type="button"
            aria-label="Clear search"
            onClick={() => setQuery("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted text-sm"
          >
            ✕
          </button>
        )}
      </div>

      {items.length === 0 ? (
        <p className="text-muted text-center py-10">
          Nothing yet. Tap + to create your first recipe or meal.
        </p>
      ) : searching ? (
        filtered.length === 0 ? (
          <p className="text-muted text-center py-10">
            Nothing matches “{query}”.
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
            {filtered.map((item) => (
              <Card key={`${item.kind}-${item.id}`} item={item} />
            ))}
          </div>
        )
      ) : (
        <div className="flex gap-1">
          {/* grouped list */}
          <div className="flex-1 flex flex-col gap-7 min-w-0">
            {ALPHABET.filter((l) => groups.has(l)).map((letter) => (
              <section key={letter} id={`letter-${letter}`} className="scroll-mt-4">
                <h2 className="text-sm text-muted mb-2 tracking-wider">
                  {letter}
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                  {groups.get(letter)!.map((item) => (
                    <Card key={`${item.kind}-${item.id}`} item={item} />
                  ))}
                </div>
              </section>
            ))}
          </div>

          {/* A–Z jump rail */}
          <nav
            aria-label="Jump to letter"
            className="sticky top-4 self-start flex flex-col items-center text-[11px] leading-none py-1 touch-none select-none"
            onPointerDown={(e) => {
              scrubbing.current = true;
              (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
              jumpFromPoint(e.clientY);
            }}
            onPointerMove={(e) => {
              if (scrubbing.current) jumpFromPoint(e.clientY);
            }}
            onPointerUp={() => {
              scrubbing.current = false;
              lastJump.current = "";
            }}
            onPointerCancel={() => {
              scrubbing.current = false;
              lastJump.current = "";
            }}
          >
            {ALPHABET.map((letter) => {
              const present = groups.has(letter);
              return (
                <button
                  key={letter}
                  data-letter={letter}
                  onClick={() => jump(letter)}
                  className={`w-5 h-[18px] flex items-center justify-center rounded ${
                    present
                      ? "text-accent font-medium"
                      : "text-muted/40 pointer-events-none"
                  }`}
                >
                  {letter}
                </button>
              );
            })}
          </nav>
        </div>
      )}
    </div>
  );
}
