"use client";

import { useEffect, useId, useRef } from "react";

export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  destructive = false,
  confirmDisabled = false,
  children,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  confirmDisabled?: boolean;
  children?: React.ReactNode;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  // Native <dialog> traps focus, restores it on close and handles Escape.
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  if (!open) return null;

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onCancel={(e) => {
        e.preventDefault();
        onCancel();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
      className="m-auto w-[calc(100%-2.5rem)] max-w-sm bg-surface text-foreground border rounded-2xl p-5 shadow-lg backdrop:bg-black/40"
    >
      <div className="flex flex-col gap-3">
        <h2 id={titleId} className="text-xl">{title}</h2>
        {message && <p className="text-muted text-sm">{message}</p>}
        {children}
        <div className="flex justify-end gap-2 mt-2">
          <button autoFocus onClick={onCancel} className="btn-ghost">
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            disabled={confirmDisabled}
            className={`${destructive ? "btn-danger" : "btn-primary"} disabled:opacity-50`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </dialog>
  );
}
