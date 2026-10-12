/* ---------------- Quantities ----------------
   Cooking amounts read better as fractions than decimals: a quarter teaspoon
   is "1/4 tsp", not "0.25 tsp". These helpers convert between the decimal we
   store and the fractions cooks actually type and read — and crucially the
   fractions survive serving-scaling (0.25 × 5 → "1 1/4"). */

// Unicode fraction glyphs people sometimes paste, mapped to their value.
const GLYPH_FRACTIONS: Record<string, number> = {
  "½": 0.5,
  "⅓": 1 / 3,
  "⅔": 2 / 3,
  "¼": 0.25,
  "¾": 0.75,
  "⅛": 0.125,
  "⅜": 0.375,
  "⅝": 0.625,
  "⅞": 0.875,
};

// trimmed decimal: 200.00 -> "200", 66.666 -> "66.67"
function trimDecimal(n: number): string {
  return parseFloat(n.toFixed(2)).toString();
}

/* Parse a typed quantity into a number: accepts "1 1/2", "3/4", "0.5", "2",
   and single glyphs like "½". Returns null when it can't make sense of it. */
export function parseQuantity(input: string): number | null {
  const s = (input ?? "").trim();
  if (s === "") return null;

  // A glyph fraction, optionally after a whole number ("1½").
  for (const [glyph, val] of Object.entries(GLYPH_FRACTIONS)) {
    if (s.includes(glyph)) {
      const whole = s.replace(glyph, "").trim();
      if (whole === "") return val;
      const w = Number(whole);
      return Number.isFinite(w) ? w + val : null;
    }
  }

  // "1 1/2" — whole plus fraction
  let m = s.match(/^(\d+)\s+(\d+)\/(\d+)$/);
  if (m) {
    const d = +m[3];
    return d === 0 ? null : +m[1] + +m[2] / d;
  }

  // "3/4" — bare fraction
  m = s.match(/^(\d+)\/(\d+)$/);
  if (m) {
    const d = +m[2];
    return d === 0 ? null : +m[1] / d;
  }

  // plain decimal / integer
  if (/^\d*\.?\d+$/.test(s)) return parseFloat(s);
  return null;
}

// Common cooking fractions, ascending, used to snap a decimal to something
// readable.
const NICE_FRACTIONS: [number, number][] = [
  [1, 8],
  [1, 4],
  [1, 3],
  [3, 8],
  [1, 2],
  [5, 8],
  [2, 3],
  [3, 4],
  [7, 8],
];

/* Render a stored decimal as a friendly quantity: 1.25 -> "1 1/4",
   0.5 -> "1/2", 0.666… -> "2/3". Values that don't land near a common
   fraction fall back to a trimmed decimal so nothing is misrepresented. */
function formatQuantity(n: number | null | undefined): string {
  if (n == null || isNaN(n)) return "";
  if (n < 0) return trimDecimal(n);

  const whole = Math.floor(n);
  const frac = n - whole;

  // baseline candidate: drop the fraction (error is the fraction itself)
  let bestStr = String(whole);
  let bestErr = frac;

  // rounding up to the next whole, for values like 1.99
  if (1 - frac < bestErr) {
    bestStr = String(whole + 1);
    bestErr = 1 - frac;
  }

  for (const [num, den] of NICE_FRACTIONS) {
    const err = Math.abs(frac - num / den);
    if (err < bestErr) {
      bestErr = err;
      bestStr = whole > 0 ? `${whole} ${num}/${den}` : `${num}/${den}`;
    }
  }

  // No common fraction is close enough — keep it as a decimal.
  if (bestErr > 0.02 && frac > 0) return trimDecimal(n);
  return bestStr;
}

// Metric weight/volume read better as decimals ("87.5 g"); spoon and count
// measures read better as fractions ("1/2 tbsp").
const DECIMAL_UNITS = new Set(["g", "kg", "ml", "l"]);

/* Format an amount for display, choosing fractions or decimals based on unit. */
export function formatAmount(n: number | null | undefined, unit: string): string {
  if (n == null || isNaN(n)) return "";
  return DECIMAL_UNITS.has(unit) ? trimDecimal(n) : formatQuantity(n);
}

/* Compact duration formatting.
   25  -> "25m"
   60  -> "1h"
   95  -> "1h 35m"
*/
export function formatDuration(minutes: number | null | undefined): string {
  if (minutes == null || isNaN(minutes)) return "";
  const total = Math.max(0, Math.round(minutes));
  const h = Math.floor(total / 60);
  const m = total % 60;

  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

/* ---------------- Dates ----------------
   Dates render on the server and again in the browser; both must produce the
   same text or React hydration fails. So pin locale + timezone rather than
   using whatever each machine defaults to (the Docker server runs UTC/en-US). */
// ponytail: single-user app, hardcoded zone — make it a setting if others use it
const LOCALE = "en-GB";
const TIME_ZONE = "Europe/London";

export function formatDate(
  value: string | number | Date,
  opts: Intl.DateTimeFormatOptions
): string {
  return new Date(value).toLocaleString(LOCALE, { timeZone: TIME_ZONE, ...opts });
}

/* Whole calendar days between two instants, counted in TIME_ZONE. */
export function daysBetween(from: string | number | Date, to: string | number | Date): number {
  const day = (v: string | number | Date) =>
    Date.parse(new Date(v).toLocaleDateString("en-CA", { timeZone: TIME_ZONE }));
  return Math.round((day(to) - day(from)) / 86400000);
}
