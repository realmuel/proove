"use client";

import { useRef, useState } from "react";
import { useToast } from "@/components/Toast";
import { UploadIcon } from "@/components/icons";

export const DEFAULT_IMAGE_POS = "50% 50%";

function parsePos(pos: string): { x: number; y: number } {
  const m = (pos || "").match(/(-?\d+(?:\.\d+)?)%\s+(-?\d+(?:\.\d+)?)%/);
  return m ? { x: +m[1], y: +m[2] } : { x: 50, y: 50 };
}

const clamp = (n: number) => Math.min(100, Math.max(0, n));

/* Image upload with drag-to-reposition. The position is stored as a CSS
   object-position string ("50% 30%") so the view pages can render the same
   crop. Shared by the recipe and meal forms. */
export default function ImageField({
  imagePath,
  imagePos,
  onImagePathChange,
  onImagePosChange,
}: {
  imagePath: string;
  imagePos: string;
  onImagePathChange: (path: string) => void;
  onImagePosChange: (pos: string) => void;
}) {
  const { notify } = useToast();
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const dragging = useRef(false);
  const moved = useRef(false);
  const start = useRef({ px: 0, py: 0, x: 50, y: 50 });

  async function uploadImage(file: File) {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      if (!res.ok) {
        notify("Could not upload image", "error");
        return;
      }
      const json = await res.json();
      onImagePathChange(json.path);
      onImagePosChange(DEFAULT_IMAGE_POS);
    } finally {
      setUploading(false);
    }
  }

  function onPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    // Don't hijack presses on the Change/Remove buttons — capturing the pointer
    // here would swallow their click (the bug where they were unclickable).
    if ((e.target as HTMLElement).closest("button")) return;
    dragging.current = true;
    moved.current = false;
    const { x, y } = parsePos(imagePos);
    start.current = { px: e.clientX, py: e.clientY, x, y };
    e.currentTarget.setPointerCapture(e.pointerId);
  }

  function onPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!dragging.current) return;
    const box = e.currentTarget.getBoundingClientRect();
    const dx = ((e.clientX - start.current.px) / box.width) * 100;
    const dy = ((e.clientY - start.current.py) / box.height) * 100;
    if (Math.abs(dx) > 1 || Math.abs(dy) > 1) moved.current = true;
    // drag the photo with the pointer: pulling right reveals its left side
    const x = clamp(start.current.x - dx);
    const y = clamp(start.current.y - dy);
    onImagePosChange(`${Math.round(x)}% ${Math.round(y)}%`);
  }

  function onPointerUp(e: React.PointerEvent<HTMLDivElement>) {
    dragging.current = false;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm font-medium text-muted">Image</span>

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) uploadImage(file);
          e.target.value = "";
        }}
      />

      {imagePath ? (
        <div className="flex flex-col gap-1.5">
          <div
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            className="relative h-72 rounded-xl overflow-hidden border touch-none cursor-grab active:cursor-grabbing"
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- runtime upload preview */}
            <img
              src={imagePath}
              alt=""
              draggable={false}
              style={{ objectPosition: imagePos || DEFAULT_IMAGE_POS }}
              className="w-full h-full object-cover select-none pointer-events-none"
            />
            <div className="absolute bottom-2 right-2 flex gap-2">
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="bg-surface/90 border rounded-lg px-3 py-1.5 text-sm font-medium"
              >
                Change
              </button>
              <button
                type="button"
                onClick={() => {
                  onImagePathChange("");
                  onImagePosChange(DEFAULT_IMAGE_POS);
                }}
                className="bg-surface/90 border rounded-lg px-3 py-1.5 text-sm font-medium"
              >
                Remove
              </button>
            </div>
          </div>
          <span className="text-xs text-muted">Drag the image to reposition it.</span>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="flex flex-col items-center justify-center gap-2 border border-dashed rounded-xl h-72 text-muted disabled:opacity-50"
        >
          <UploadIcon size={26} />
          <span className="text-sm font-medium">
            {uploading ? "Uploading…" : "Upload an image"}
          </span>
        </button>
      )}
    </div>
  );
}
