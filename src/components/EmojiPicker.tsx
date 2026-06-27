"use client";

import { useEffect, useRef, useState } from "react";
import { EMOJIS } from "@/lib/emoji";

/* A compact emoji button that opens a grid popover. Optional — when left blank
   the server assigns a random one on save. */
export default function EmojiPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (emoji: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="relative shrink-0" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="Pick an emoji"
        aria-haspopup="dialog"
        aria-expanded={open}
        className="h-full min-h-[42px] w-12 border rounded-lg bg-surface grid place-items-center"
        title="Pick an emoji (optional)"
      >
        {value ? (
          <span className="text-2xl leading-none">{value}</span>
        ) : (
          <span className="text-muted text-xl leading-none">＋</span>
        )}
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Choose an emoji"
          className="absolute right-0 mt-2 z-20 w-64 max-h-64 overflow-y-auto bg-surface border rounded-xl p-2 shadow-lg"
        >
          {value && (
            <button
              type="button"
              onClick={() => {
                onChange("");
                setOpen(false);
              }}
              className="w-full text-left text-xs text-muted mb-1.5 px-1 py-1 rounded hover:bg-background"
            >
              Clear — assign a random one on save
            </button>
          )}
          <div className="grid grid-cols-7 gap-0.5">
            {EMOJIS.map((e) => (
              <button
                key={e}
                type="button"
                onClick={() => {
                  onChange(e);
                  setOpen(false);
                }}
                className={`text-2xl leading-none aspect-square rounded grid place-items-center hover:bg-background ${
                  value === e ? "bg-accent/15 ring-1 ring-accent" : ""
                }`}
              >
                {e}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
