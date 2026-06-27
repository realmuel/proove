"use client";

import { CSSProperties, useEffect, useRef, useState } from "react";

/* An <img> that shows a warm shimmer placeholder until the image has actually
   decoded, then fades it in. Avoids the half-loaded / popping-in look and gives
   a graceful state when an image is slow or fails.

   Handles the cached-image race: if the browser already has the image, `onLoad`
   may fire before React attaches the handler, so we also check `complete` once
   the element is mounted. */
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
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const img = ref.current;
    if (img && img.complete) {
      // already decoded (e.g. from cache) — reveal immediately
      if (img.naturalWidth > 0) {
        setLoaded(true);
        setFailed(false);
      } else {
        setFailed(true);
      }
    } else {
      // new source: wait for onLoad/onError
      setLoaded(false);
      setFailed(false);
    }
  }, [src]);

  return (
    <div className={`relative overflow-hidden bg-accent/10 ${wrapperClassName}`}>
      {!loaded && !failed && (
        <div className="absolute inset-0 animate-pulse bg-accent/10" aria-hidden />
      )}
      <img
        ref={ref}
        src={src}
        alt={alt}
        style={style}
        onLoad={() => setLoaded(true)}
        onError={() => setFailed(true)}
        className={`${imgClassName} transition-opacity duration-500 ${
          loaded ? "opacity-100" : "opacity-0"
        }`}
      />
    </div>
  );
}
