"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

type ToastKind = "success" | "error";
type Toast = { id: number; message: string; kind: ToastKind };

const ToastContext = createContext<{
  notify: (message: string, kind?: ToastKind) => void;
}>({ notify: () => {} });

export function useToast() {
  return useContext(ToastContext);
}

function ToastItem({
  toast,
  onDone,
}: {
  toast: Toast;
  onDone: (id: number) => void;
}) {
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    const hide = setTimeout(() => setLeaving(true), 3000);
    const remove = setTimeout(() => onDone(toast.id), 3300);
    return () => {
      clearTimeout(hide);
      clearTimeout(remove);
    };
  }, [toast.id, onDone]);

  return (
    <div
      role="status"
      onClick={() => setLeaving(true)}
      className={`pointer-events-auto flex items-center gap-2 rounded-xl border bg-surface px-4 py-2.5 text-sm shadow-sm transition-all duration-300 ${
        leaving ? "opacity-0 -translate-y-1" : "opacity-100 translate-y-0"
      }`}
    >
      <span
        className={`inline-block h-1.5 w-1.5 rounded-full ${
          toast.kind === "error" ? "bg-danger" : "bg-accent"
        }`}
      />
      {toast.message}
    </div>
  );
}

export default function ToastProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const notify = useCallback((message: string, kind: ToastKind = "success") => {
    setToasts((t) => [...t, { id: Date.now() + Math.random(), message, kind }]);
  }, []);

  const remove = useCallback((id: number) => {
    setToasts((t) => t.filter((x) => x.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ notify }}>
      {children}
      <div className="fixed inset-x-0 top-0 z-50 flex flex-col items-center gap-2 p-3 pointer-events-none">
        {toasts.map((t) => (
          <ToastItem key={t.id} toast={t} onDone={remove} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}
