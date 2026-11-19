"use client";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "@/components/icons";
import { useLayoutEffect, useRef, type ReactNode } from "react";
export function Dialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  variant = "modal",
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  title: string;
  description?: string;
  children: ReactNode;
  variant?: "modal" | "navigation";
}) {
  const returnFocus = useRef<HTMLElement | null>(null);
  useLayoutEffect(() => {
    if (open && document.activeElement instanceof HTMLElement)
      returnFocus.current = document.activeElement;
  }, [open]);
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="dialog-overlay" />
        <DialogPrimitive.Content
          className={`dialog-content ${variant === "navigation" ? "navigation-drawer" : ""}`}
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            const target = returnFocus.current;
            if (target?.isConnected && target !== document.body) target.focus();
            else
              document
                .querySelector<HTMLElement>(
                  ".page-heading button, #main button, a[href='/app']",
                )
                ?.focus();
          }}
        >
          <div className="dialog-heading">
            <DialogPrimitive.Title
              className={variant === "navigation" ? "sr-only" : "dialog-title"}
            >
              {title}
            </DialogPrimitive.Title>
            <DialogPrimitive.Description
              className={description ? "muted" : "sr-only"}
            >
              {description ?? title}
            </DialogPrimitive.Description>
            <DialogPrimitive.Close
              className="dialog-close"
              aria-label={
                variant === "navigation" ? "Close navigation" : "Close dialog"
              }
            >
              <X size={20} />
            </DialogPrimitive.Close>
          </div>
          {children}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
