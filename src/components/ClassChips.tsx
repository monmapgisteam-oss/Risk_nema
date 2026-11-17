"use client";

import { CLASS_COLORS, CLASS_LABELS, NOEXP_COLOR } from "@/lib/riskConfig";
import styles from "./Dashboard.module.css";

export default function ClassChips({
  value,
  onChange,
  withZero,
  label = "Үнэлгээний ангилал",
}: {
  value: number[];
  onChange: (value: number[]) => void;
  withZero?: boolean;
  label?: string;
}) {
  const classes = withZero ? [0, 1, 2, 3, 4, 5] : [1, 2, 3, 4, 5];
  return (
    <div className={styles.chips} role="group" aria-label={label}>
      {classes.map((c) => (
        <button
          key={c}
          type="button"
          className={styles.classChip}
          aria-pressed={value.includes(c)}
          onClick={() =>
            onChange(
              value.includes(c) ? value.filter((v) => v !== c) : [...value, c],
            )
          }
        >
          <i
            aria-hidden="true"
            style={{ background: c ? CLASS_COLORS[c] : NOEXP_COLOR }}
          />
          {CLASS_LABELS[c]}
        </button>
      ))}
    </div>
  );
}
