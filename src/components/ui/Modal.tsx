"use client";

import {
  useCallback,
  useEffect,
  useRef,
  type ReactNode,
} from "react";

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
}

export function Modal({ open, onClose, title, children }: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const previousActive = useRef<HTMLElement | null>(null);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    },
    [onClose]
  );

  useEffect(() => {
    if (!open) return;
    previousActive.current = document.activeElement as HTMLElement | null;
    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";
    const panel = panelRef.current;
    if (panel) {
      panel.setAttribute("tabIndex", "-1");
      panel.focus();
      const focusable = panel.querySelector<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (focusable) focusable.focus();
    }
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
      previousActive.current?.focus();
    };
  }, [open, handleKeyDown]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? "modal-title" : undefined}
    >
      <div
        className="fixed inset-0 bg-black/40"
        aria-hidden
        onClick={onClose}
      />
      <div
        ref={panelRef}
        className="relative z-10 w-full max-w-md rounded-lg border border-border bg-surface shadow-lg outline-none"
        onClick={(e) => e.stopPropagation()}
      >
        {title && (
          <div className="border-b border-border px-4 py-3">
            <h2 id="modal-title" className="text-base font-semibold text-text">
              {title}
            </h2>
          </div>
        )}
        <div className="px-4 py-3">{children}</div>
      </div>
    </div>
  );
}
