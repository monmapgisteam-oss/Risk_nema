"use client";

import {
  CLASS_COLORS,
  CLASS_LABELS,
  ELEMENTS,
  HAZARDS,
  MODES,
  NOEXP_COLOR,
  OVERLAYS,
  type Filters,
} from "@/lib/riskConfig";
import styles from "./Dashboard.module.css";

type Props = {
  filters: Filters;
  update: (patch: Partial<Filters>) => void;
  reset: () => void;
  elements: string[];
  aimags: [string, string][];
  overlays: string[];
  setOverlays: (els: string[]) => void;
};

const toggle = <T,>(list: T[], v: T) =>
  list.includes(v) ? list.filter((x) => x !== v) : [...list, v];

function ClassChips({
  value,
  onChange,
  withZero,
}: {
  value: number[];
  onChange: (v: number[]) => void;
  withZero?: boolean;
}) {
  const classes = withZero ? [0, 1, 2, 3, 4, 5] : [1, 2, 3, 4, 5];
  return (
    <div className={styles.chips}>
      {classes.map((c) => (
        <button
          key={c}
          type="button"
          className={styles.classChip}
          aria-pressed={value.includes(c)}
          onClick={() => onChange(toggle(value, c))}
        >
          <i style={{ background: c ? CLASS_COLORS[c] : NOEXP_COLOR }} />
          {CLASS_LABELS[c]}
        </button>
      ))}
    </div>
  );
}

export default function FilterPanel({
  filters,
  update,
  reset,
  elements,
  aimags,
  overlays,
  setOverlays,
}: Props) {
  const other = MODES.find((m) => m.id !== filters.mode)!;
  return (
    <aside className={styles.panel} aria-label="Шүүлтүүр">
      <div className={styles.segmented} role="group" aria-label="Үзүүлэлт">
        {MODES.map((m) => (
          <button
            key={m.id}
            type="button"
            aria-pressed={filters.mode === m.id}
            onClick={() => update({ mode: m.id })}
          >
            {m.label}
          </button>
        ))}
      </div>

      <div className={styles.group}>
        <span className={styles.label}>Аюул</span>
        <div className={styles.chips}>
          {HAZARDS.map((h) => (
            <button
              key={h.id}
              type="button"
              className={styles.chip}
              aria-pressed={filters.hazard === h.id}
              onClick={() => update({ hazard: h.id })}
            >
              {h.label}
            </button>
          ))}
        </div>
      </div>

      <label className={styles.group}>
        <span className={styles.label}>Элемент</span>
        <select
          value={filters.element}
          disabled={!elements.length}
          onChange={(e) => update({ element: e.target.value })}
        >
          <option value="">Бүгд (дундаж)</option>
          {elements.map((el) => (
            <option key={el} value={el}>
              {ELEMENTS[el]}
            </option>
          ))}
        </select>
      </label>

      <div className={styles.group}>
        <span className={styles.label}>Ангилал</span>
        <ClassChips
          value={filters.classes}
          withZero={!!filters.element}
          onChange={(classes) => update({ classes })}
        />
      </div>

      <div className={styles.group}>
        <span className={styles.label}>{other.label}</span>
        <ClassChips
          value={filters.otherClasses}
          onChange={(otherClasses) => update({ otherClasses })}
        />
      </div>

      <div className={styles.row}>
        <label className={styles.group}>
          <span className={styles.label}>Аймаг</span>
          <select
            value={filters.aimag}
            onChange={(e) => update({ aimag: e.target.value })}
          >
            <option value="">Бүгд</option>
            {aimags.map(([code, name]) => (
              <option key={code} value={code}>
                {name}
              </option>
            ))}
          </select>
        </label>
        <label className={styles.group}>
          <span className={styles.label}>Тэргүүлэх аюул</span>
          <select
            value={filters.topHaz}
            onChange={(e) => update({ topHaz: e.target.value })}
          >
            <option value="">Бүгд</option>
            {HAZARDS.filter((h) => h.id !== "all").map((h) => (
              <option key={h.id} value={h.id.toUpperCase()}>
                {h.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className={styles.group}>
        <span className={styles.label}>Сум</span>
        <input
          type="search"
          placeholder="Хайх"
          value={filters.q}
          onChange={(e) => update({ q: e.target.value })}
        />
      </label>

      <label className={styles.group}>
        <span className={styles.label}>
          Өндөр ангилалтай аюул ≥ {filters.minHigh}
        </span>
        <input
          type="range"
          min={0}
          max={10}
          value={filters.minHigh}
          onChange={(e) => update({ minHigh: Number(e.target.value) })}
        />
      </label>

      <div className={styles.group}>
        <span className={styles.label}>Объект</span>
        <div className={styles.chips}>
          {OVERLAYS[filters.mode].map((o) => (
            <button
              key={o.el}
              type="button"
              className={styles.chip}
              aria-pressed={overlays.includes(o.el)}
              onClick={() => setOverlays(toggle(overlays, o.el))}
            >
              {ELEMENTS[o.el]}
            </button>
          ))}
        </div>
      </div>

      <button type="button" className={styles.reset} onClick={reset}>
        Цэвэрлэх
      </button>
    </aside>
  );
}
