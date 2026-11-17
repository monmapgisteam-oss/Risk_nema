"use client";

import { useEffect, useId, useState, type ReactNode } from "react";
import styles from "./DisabledHint.module.css";

export default function DisabledHint({
  reason,
  label,
  children,
}: {
  reason?: string;
  label: string;
  children: ReactNode;
}) {
  const hintId = useId();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const dismiss = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", dismiss);
    return () => document.removeEventListener("keydown", dismiss);
  }, [open]);

  return (
    <span
      className={styles.field}
      tabIndex={reason ? 0 : undefined}
      role={reason ? "group" : undefined}
      aria-label={reason ? label : undefined}
      aria-disabled={reason ? true : undefined}
      aria-describedby={reason ? hintId : undefined}
      onPointerEnter={() => reason && setOpen(true)}
      onPointerLeave={(event) => {
        if (!event.currentTarget.contains(document.activeElement))
          setOpen(false);
      }}
      onFocus={() => reason && setOpen(true)}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
      }}
    >
      {children}
      {reason && (
        <span
          id={hintId}
          role="tooltip"
          className={styles.tooltip}
          data-open={open}
        >
          <span>{reason}</span>
        </span>
      )}
    </span>
  );
}
