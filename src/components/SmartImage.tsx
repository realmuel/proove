"use client";

import { CSSProperties, useEffect, useRef, useState } from "react";
import { ImagePlaceholderIcon } from "@/components/icons";

/* An <img> with a soft shimmer placeholder while it loads.

   Crucially, the image's visibility never depends on a JS load event firing.
   The skeleton sits *behind* the image, which is rendered at full opacity on
   top — so the moment the browser paints the picture it covers the skeleton,
   whether or not React saw the `load` event. (Gating the image's own opacity on
   a `loaded` flag was leaving cached/raced images stuck blank until a refresh.)

   The `loaded` flag is only used to stop the shimmer. A failed fetch is retried
   a couple of times with a cache-bust, since image requests can hiccup on flaky
   connections — so a transient miss recovers on its own instead of needing a
   manual refresh. */
export default function SmartImage({
  src,
  alt = "",
  imgClassName = "",
  wrapperClassName = "",
  style,
}: {
  src: string;
  alt?: string;
  imgClassName?: string;
  wrapperClassName?: string;
  style?: CSSProperties;
}) {
  const ref = useRef<HTMLImageElement>(null);
  const [loaded, setLoaded] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [failed, setFailed] = useState(false);

  const MAX_ATTEMPTS = 2;

  // Reconcile with the real element state (covers an image that finished
  // loading before React attached onLoad, e.g. from cache).
  useEffect(() => {
    // Intentional: syncs React state with the DOM element's real load state.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setFailed(false);
    const img = ref.current;
    setLoaded(!!(img && img.complete && img.naturalWidth > 0));
  }, [src, attempt]);

  // Cache-bust on retry so the browser genuinely refetches.
  const url =
    attempt === 0 ? src : `${src}${src.includes("?") ? "&" : "?"}retry=${attempt}`;

  // After retries are exhausted, show a themed stand-in instead of the
  // browser's broken-image glyph.
  if (failed) {
    return (
      <div
        className={`relative overflow-hidden bg-accent/10 grid place-items-center text-accent/60 ${wrapperClassName}`}
        role="img"
        aria-label={alt || "Image unavailable"}
      >
        <ImagePlaceholderIcon size={32} />
      </div>
    );
  }

  return (
    <div className={`relative overflow-hidden bg-accent/10 ${wrapperClassName}`}>
      {/* skeleton behind the image */}
      <div
        aria-hidden
        className={`absolute inset-0 ${
          loaded ? "" : "bg-accent/10 animate-pulse"
        }`}
      />
      {/* eslint-disable-next-line @next/next/no-img-element -- runtime uploads, served by /uploads route */}
      <img
        key={url}
        ref={ref}
        src={url}
        alt={alt}
        style={style}
        decoding="async"
        onLoad={() => setLoaded(true)}
        onError={() => {
          if (attempt < MAX_ATTEMPTS) setAttempt((a) => a + 1);
          else setFailed(true);
        }}
        // `relative` keeps the image painted above the absolutely-placed skeleton
        className={`relative ${imgClassName}`}
      />
    </div>
  );
}
