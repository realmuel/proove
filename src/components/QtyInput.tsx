"use client";

import { useState } from "react";
import { formatAmount, parseQuantity } from "@/lib/format";

/* Quantity field that lets cooks type fractions ("1/4", "1 1/2") as well as
   decimals, while the form keeps storing a plain number.

   We hold the raw text locally so partial input ("1/") isn't clobbered mid-
   keystroke, and only commit a parsed number on change when it's valid. On
   blur the text is normalised to the canonical fraction so it matches what the
   recipe page will show. */
export default function QtyInput({
  amount,
  unit,
  onAmountChange,
  className = "",
}: {
  amount: number;
  unit: string;
  onAmountChange: (n: number) => void;
  className?: string;
}) {
  const [text, setText] = useState(() => formatAmount(amount, unit) || "");
  const [focused, setFocused] = useState(false);

  // Reflect external changes (a freshly added row, or a unit switch that flips
  // whether we show a fraction) when not being edited. Done during render — the
  // React-blessed way to resync state to props — rather than in an effect.
  const [synced, setSynced] = useState({ amount, unit });
  if (!focused && (synced.amount !== amount || synced.unit !== unit)) {
    setSynced({ amount, unit });
    setText(formatAmount(amount, unit) || "");
  }

  return (
    <input
      type="text"
      inputMode="decimal"
      className={className}
      placeholder="Qty"
      value={text}
      onFocus={() => setFocused(true)}
      onChange={(e) => {
        const raw = e.target.value;
        setText(raw);
        const parsed = parseQuantity(raw);
        if (parsed != null) onAmountChange(parsed);
        else if (raw.trim() === "") onAmountChange(0);
      }}
      onBlur={() => {
        setFocused(false);
        // snap the visible text to the canonical form of what we committed
        setText(formatAmount(amount, unit) || "");
      }}
    />
  );
}
