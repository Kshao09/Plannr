"use client";

import React, { createContext, useCallback, useContext, useMemo, useState } from "react";

type ToastType = "success" | "error" | "info";

type Toast = {
  id: string;
  type: ToastType;
  title?: string;
  message: string;
  timeoutMs: number;
};

type ToastInput = {
  type?: ToastType;
  title?: string;
  message: string;
  timeoutMs?: number;
};

type ToastApi = {
  show: (t: ToastInput) => void;
  success: (message: string, title?: string) => void;
  error: (message: string, title?: string) => void;
  info: (message: string, title?: string) => void;
};

const ToastContext = createContext<ToastApi | null>(null);

function uid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const remove = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const show = useCallback(
    (input: ToastInput) => {
      const id = uid();
      const toast: Toast = {
        id,
        type: input.type ?? "info",
        title: input.title,
        message: input.message,
        timeoutMs: input.timeoutMs ?? 3200,
      };

      setToasts((prev) => [...prev, toast]);

      // auto-dismiss
      window.setTimeout(() => remove(id), toast.timeoutMs);
    },
    [remove]
  );

  const api = useMemo<ToastApi>(
    () => ({
      show,
      success: (message, title) => show({ type: "success", title, message }),
      error: (message, title) => show({ type: "error", title, message, timeoutMs: 4500 }),
      info: (message, title) => show({ type: "info", title, message }),
    }),
    [show]
  );

  return (
    <ToastContext.Provider value={api}>
      {children}

      {/* Toast UI */}
      <div className="toastRegion" aria-live="polite" aria-relevant="additions">
        {toasts.map((t) => (
          <div key={t.id} className={`toast toast_${t.type}`}>
            <div className="toastBody">
              {t.title ? <div className="toastTitle">{t.title}</div> : null}
              <div className="toastMsg">{t.message}</div>
            </div>

            <button className="toastClose" onClick={() => remove(t.id)} aria-label="Close">
              ×
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within <ToastProvider />");
  return ctx;
}
