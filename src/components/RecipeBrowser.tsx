"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/Toast";
import { PlusIcon, SearchIcon, ImportIcon } from "@/components/icons";

export type BrowserRecipe = {
  id: string;
  title: string;
  description: string;
  imagePath: string;
  createdBy: string;
  ingredients: string[];
};

const ALPHABET = ["#", ..."ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("")];

function letterOf(title: string) {
  const c = (title.trim()[0] || "#").toUpperCase();
  return /[A-Z]/.test(c) ? c : "#";
}

function Card({ r }: { r: BrowserRecipe }) {
  return (
    <Link
      href={`/recipe/${r.id}`}
      className="flex items-center gap-3.5 p-2.5 bg-surface border rounded-xl active:scale-[0.99] transition"
    >
      {r.imagePath ? (
        <img
          src={r.imagePath}
          className="w-16 h-16 rounded-lg object-cover shrink-0"
        />
      ) : (
        <div className="w-16 h-16 rounded-lg bg-background border shrink-0" />
      )}
      <div className="min-w-0">
        <div className="truncate text-lg leading-tight">{r.title}</div>
        {r.description && (
          <div className="text-sm text-muted truncate mt-0.5">
            {r.description}
          </div>
        )}
      </div>
    </Link>
  );
}

export default function RecipeBrowser({
  recipes,
}: {
  recipes: BrowserRecipe[];
}) {
  const router = useRouter();
  const { notify } = useToast();
  const [query, setQuery] = useState("");
  const importRef = useRef<HTMLInputElement>(null);
  const scrubbing = useRef(false);
  const lastJump = useRef<string>("");

  async function importFile(file: File) {
    try {
      const text = await file.text();
      const res = await fetch("/api/recipes/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: text,
      });
      if (!res.ok) {
        const { error } = await res.json().catch(() => ({ error: "" }));
        notify(error || "Could not import file", "error");
        return;
      }
      const { id } = await res.json();
      notify("Recipe imported");
      router.push(`/recipe/${id}`);
    } catch {
      notify("Could not read file", "error");
    }
  }

  const indexed = useMemo(
    () =>
      recipes.map((r) => ({
        recipe: r,
        haystack: [r.title, r.description, r.createdBy, ...r.ingredients]
          .join(" ")
          .toLowerCase(),
      })),
    [recipes]
  );

  const q = query.trim().toLowerCase();
  const searching = q.length > 0;
  const filtered = searching
    ? indexed.filter((x) => x.haystack.includes(q)).map((x) => x.recipe)
    : recipes;

  // group (only used when not searching)
  const groups = useMemo(() => {
    const m = new Map<string, BrowserRecipe[]>();
    for (const r of recipes) {
      const key = letterOf(r.title);
      if (!m.has(key)) m.set(key, []);
      m.get(key)!.push(r);
    }
    return m;
  }, [recipes]);

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
        <h1 className="text-3xl">Recipes</h1>
        <div className="flex items-center gap-2">
          <input
            ref={importRef}
            type="file"
            accept=".recipe,application/json"
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
            aria-label="Import recipe"
            title="Import a .recipe file"
          >
            <ImportIcon size={18} />
          </button>
          <Link href="/new" className="icon-btn" aria-label="New recipe">
            <PlusIcon size={20} />
          </Link>
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

      {recipes.length === 0 ? (
        <p className="text-muted text-center py-10">
          No recipes yet. Tap + to create your first one.
        </p>
      ) : searching ? (
        filtered.length === 0 ? (
          <p className="text-muted text-center py-10">
            No recipes match “{query}”.
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
            {filtered.map((r) => (
              <Card key={r.id} r={r} />
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
                  {groups.get(letter)!.map((r) => (
                    <Card key={r.id} r={r} />
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
