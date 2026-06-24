"use client";

import { useEffect } from "react";
import { cn } from "@/lib/utils/cn";
import { CrossIcon } from "@/components/ui/Glyph";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  className?: string;
}

export function Modal({ open, onClose, title, children, className }: ModalProps) {
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    if (open) document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-[oklch(0.08_0_0_/_0.6)] backdrop-blur-sm"
        onClick={onClose}
      />
      <div
        className={cn("panel relative z-10 w-full max-w-lg shadow-(--shadow-pop)", className)}
      >
        <div className="panel-head">
          <span className="panel-title">{title}</span>
          <button onClick={onClose} className="btn btn-ghost btn-sm" aria-label="Close">
            <CrossIcon size={11} />
          </button>
        </div>
        <div className="p-4">{children}</div>
      </div>
    </div>
  );
}
