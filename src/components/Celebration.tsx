"use client";

import { useEffect, useMemo } from "react";

const COLORS = ["#b3622f", "#d68a52", "#e0b04a", "#7a9a6d", "#c96b5b", "#e9dcc3"];

/* A lightweight, dependency-free confetti burst + message, shown when every
   timeline task has been ticked off. Auto-dismisses, and is click-to-close. */
export default function Celebration({ onDone }: { onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 6000);
    return () => clearTimeout(t);
  }, [onDone]);

  // Deterministic pseudo-random spread (golden-ratio hashing): render stays pure.
  const pieces = useMemo(() => {
    const r = (i: number, k: number) => ((i + 1) * 0.618033988749 * k) % 1;
    return Array.from({ length: 80 }, (_, i) => ({
      left: r(i, 1) * 100,
      delay: r(i, 7) * 0.8,
      duration: 2.4 + r(i, 13) * 1.8,
      size: 6 + r(i, 19) * 8,
      color: COLORS[i % COLORS.length],
      round: r(i, 23) > 0.5,
    }));
  }, []);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden"
      onClick={onDone}
    >
      <div className="absolute inset-0 bg-black/20" />
      {pieces.map((p, i) => (
        <span
          key={i}
          className="absolute top-0"
          style={{
            left: `${p.left}%`,
            width: p.size,
            height: p.size,
            background: p.color,
            borderRadius: p.round ? "9999px" : "2px",
            animation: `confetti-fall ${p.duration}s linear ${p.delay}s forwards`,
          }}
        />
      ))}
      <div className="relative animate-pop-in bg-surface border rounded-2xl px-8 py-6 text-center shadow-xl">
        <div className="text-5xl mb-2">🎉</div>
        <h2 className="text-2xl">All done!</h2>
        <p className="text-muted text-sm mt-1">Everything’s ticked off. Enjoy the meal.</p>
      </div>
    </div>
  );
}
