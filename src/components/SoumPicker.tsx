"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./Dashboard.module.css";
import Icon from "./Icon";

type Option = { fid: number; name: string; aimag: string };

type Props = {
  options: Option[];
  value: number[];
  onChange: (fids: number[]) => void;
  placeholder: string;
  showAimag: boolean;
};

/** Toolbar dropdown for choosing one or several soums. */
export default function SoumPicker({
  options,
  value,
  onChange,
  placeholder,
  showAimag,
}: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const root = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const down = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", down);
    document.addEventListener("keydown", key);
    return () => {
      document.removeEventListener("pointerdown", down);
      document.removeEventListener("keydown", key);
    };
  }, [open]);

  const q = query.trim().toLowerCase();
  const list = q
    ? options.filter((o) => o.name.toLowerCase().includes(q))
    : options;
  const label =
    value.length === 0
      ? placeholder
      : value.length === 1
        ? (options.find((o) => o.fid === value[0])?.name ?? "1 сум")
        : `${value.length} сум`;

  return (
    <div className={styles.locationField} ref={root}>
      <span>
        <Icon name="pin" size={14} />
        Сум
      </span>
      <div className={styles.soumPicker}>
        <button
          type="button"
          className={styles.soumButton}
          aria-haspopup="listbox"
          aria-expanded={open}
          disabled={!options.length}
          onClick={() => setOpen((v) => !v)}
        >
          <span>{label}</span>
          <Icon name="chevron" size={12} />
        </button>
        {open && (
          <div className={styles.soumPopover}>
            <input
              type="search"
              placeholder="Сумын нэр"
              value={query}
              autoFocus
              onChange={(e) => setQuery(e.target.value)}
            />
            <div className={styles.soumList}>
              {list.map((o) => (
                <label key={o.fid}>
                  <input
                    type="checkbox"
                    checked={value.includes(o.fid)}
                    onChange={() =>
                      onChange(
                        value.includes(o.fid)
                          ? value.filter((f) => f !== o.fid)
                          : [...value, o.fid],
                      )
                    }
                  />
                  <span>{o.name}</span>
                  {showAimag && <small>{o.aimag}</small>}
                </label>
              ))}
            </div>
            {value.length > 0 && (
              <button
                type="button"
                className={styles.linkButton}
                onClick={() => onChange([])}
              >
                {value.length} · цэвэрлэх
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
