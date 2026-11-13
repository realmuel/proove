"use client";

const EMOJI_RE = /\p{Extended_Pictographic}|\p{Regional_Indicator}/u;
const segmenter = new Intl.Segmenter();

/* Last emoji in the text, or "". Taking the last one means typing or picking a
   new emoji replaces the old; non-emoji characters are dropped. */
function lastEmoji(text: string): string {
  const found = [...segmenter.segment(text)]
    .map((s) => s.segment)
    .filter((g) => EMOJI_RE.test(g));
  return found[found.length - 1] ?? "";
}

/* A one-emoji text field. There's no web API to open the OS emoji picker, so
   focusing this lets you use it yourself: ⌃⌘Space (Mac), Win+. (Windows), or
   the emoji keyboard on a phone. Optional — when left blank the server assigns
   a random one on save. */
export default function EmojiPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (emoji: string) => void;
}) {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(lastEmoji(e.target.value))}
      onFocus={(e) => e.target.select()}
      aria-label="Emoji"
      placeholder="＋"
      autoComplete="off"
      title="Click, then open your system emoji picker (⌃⌘Space on Mac, Win+. on Windows). Leave blank for a random one."
      className="shrink-0 min-h-[42px] w-12 border rounded-lg bg-surface text-center text-2xl leading-none placeholder:text-muted placeholder:text-xl"
    />
  );
}
