"use client";

import { useMemo, useState } from "react";
import {
  CLASS_COLORS,
  CLASS_LABELS,
  ELEMENTS,
  HAZARDS,
  NODATA_COLOR,
  NOEXP_COLOR,
  classField,
  scoreField,
  type Filters,
  type HazardId,
  type SoumRow,
} from "@/lib/riskConfig";
import styles from "./Dashboard.module.css";

type Props = {
  filters: Filters;
  update: (patch: Partial<Filters>) => void;
  total: number;
  matched: SoumRow[];
  selected: SoumRow | null;
  elements: string[];
  loading: boolean;
  error: boolean;
  onSelect: (fid: number | null) => void;
};

const colorOf = (c: unknown) =>
  typeof c !== "number"
    ? NODATA_COLOR
    : c === 0
      ? NOEXP_COLOR
      : (CLASS_COLORS[c] ?? NODATA_COLOR);

const fmt = (v: unknown) =>
  typeof v === "number" ? (Number.isInteger(v) ? String(v) : v.toFixed(2)) : "–";

function Cell({ cls, value }: { cls: unknown; value: unknown }) {
  return (
    <span
      className={styles.cell}
      style={{ background: colorOf(cls) }}
      title={typeof cls === "number" ? CLASS_LABELS[cls] : "Өгөгдөлгүй"}
    >
      {fmt(value)}
    </span>
  );
}

function Detail({
  row,
  filters,
  elements,
  update,
  onClose,
}: {
  row: SoumRow;
  filters: Filters;
  elements: string[];
  update: Props["update"];
  onClose: () => void;
}) {
  return (
    <div className={styles.detail}>
      <div className={styles.detailHead}>
        <div>
          <strong>{row.soum_name}</strong>
          <span>{row.aimag_name ?? ""}</span>
        </div>
        <button type="button" onClick={onClose} aria-label="Хаах">
          ×
        </button>
      </div>
      <table className={styles.matrix}>
        <thead>
          <tr>
            <th />
            <th>Эмзэг</th>
            <th>Өртөх</th>
          </tr>
        </thead>
        <tbody>
          {HAZARDS.map((h) => (
            <tr
              key={h.id}
              aria-selected={filters.hazard === h.id}
              onClick={() => update({ hazard: h.id as HazardId })}
            >
              <td>{h.label}</td>
              <td>
                <Cell cls={row[`${h.id}_v_cls`]} value={row[`${h.id}_v_sc`]} />
              </td>
              <td>
                <Cell cls={row[`${h.id}_e_cls`]} value={row[`${h.id}_e_sc`]} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {elements.length > 0 && (
        <div className={styles.elements}>
          {elements.map((el) => {
            const v = row[`${filters.hazard}_${el}_${filters.mode}`];
            return (
              <span key={el} className={styles.element}>
                <Cell cls={v} value={v} />
                {ELEMENTS[el]}
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function ResultPanel({
  filters,
  update,
  total,
  matched,
  selected,
  elements,
  loading,
  error,
  onSelect,
}: Props) {
  const [byName, setByName] = useState(false);
  const cf = classField(filters);
  const sf = filters.element ? cf : scoreField(filters);

  const counts = useMemo(() => {
    const c: Record<number, number> = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    for (const r of matched) {
      const v = r[cf];
      if (typeof v === "number" && v in c) c[v]++;
    }
    return c;
  }, [matched, cf]);

  const sorted = useMemo(() => {
    const list = [...matched];
    if (byName)
      list.sort((a, b) =>
        String(a.soum_name).localeCompare(String(b.soum_name), "mn"),
      );
    else
      list.sort(
        (a, b) => ((b[sf] as number) ?? -1) - ((a[sf] as number) ?? -1),
      );
    return list;
  }, [matched, byName, sf]);

  const classes = filters.element ? [0, 1, 2, 3, 4, 5] : [1, 2, 3, 4, 5];
  const max = Math.max(1, ...classes.map((c) => counts[c]));

  return (
    <aside className={styles.panel} aria-label="Үр дүн">
      {selected && (
        <Detail
          row={selected}
          filters={filters}
          elements={elements}
          update={update}
          onClose={() => onSelect(null)}
        />
      )}

      <div className={styles.count}>
        <strong>{matched.length}</strong>
        <span>/ {total} сум</span>
      </div>

      <div className={styles.bars}>
        {classes.map((c) => (
          <button
            key={c}
            type="button"
            className={styles.bar}
            aria-pressed={filters.classes.includes(c)}
            onClick={() =>
              update({
                classes: filters.classes.includes(c)
                  ? filters.classes.filter((x) => x !== c)
                  : [...filters.classes, c],
              })
            }
          >
            <span>{CLASS_LABELS[c]}</span>
            <span className={styles.barTrack}>
              <i
                style={{
                  width: `${(counts[c] / max) * 100}%`,
                  background: colorOf(c),
                }}
              />
            </span>
            <b>{counts[c]}</b>
          </button>
        ))}
      </div>

      <div className={styles.sort} role="group" aria-label="Эрэмбэ">
        <button
          type="button"
          aria-pressed={!byName}
          onClick={() => setByName(false)}
        >
          Оноо
        </button>
        <button
          type="button"
          aria-pressed={byName}
          onClick={() => setByName(true)}
        >
          Нэр
        </button>
      </div>

      <ul className={styles.list}>
        {loading && <li className={styles.note}>Ачаалж байна…</li>}
        {error && <li className={styles.note}>Өгөгдөл ачаалагдсангүй</li>}
        {!loading && !error && !sorted.length && (
          <li className={styles.note}>Илэрц алга</li>
        )}
        {sorted.map((r) => (
          <li key={r.fid}>
            <button
              type="button"
              aria-current={selected?.fid === r.fid}
              onClick={() => onSelect(r.fid)}
            >
              <i style={{ background: colorOf(r[cf]) }} />
              <span>
                {r.soum_name}
                <small>{r.aimag_name ?? ""}</small>
              </span>
              <b>{fmt(r[sf])}</b>
            </button>
          </li>
        ))}
      </ul>
    </aside>
  );
}
