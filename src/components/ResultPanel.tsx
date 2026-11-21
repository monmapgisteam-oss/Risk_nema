"use client";

import { useMemo } from "react";
import {
  CLASS_LABELS,
  ELEMENTS,
  HAZARDS,
  classField,
  type Filters,
  type HazardId,
  type Picked,
  type SoumRow,
} from "@/lib/riskConfig";
import { colorOf, fmt } from "@/lib/stats";
import styles from "./Dashboard.module.css";
import Icon from "./Icon";
import ObjectDetail from "./ObjectDetail";

type Props = {
  dashboardOpen: boolean;
  onToggleDashboard: () => void;
  filters: Filters;
  update: (patch: Partial<Filters>) => void;
  total: number;
  matched: SoumRow[];
  scopeLabel: string;
  selected: SoumRow | null;
  elements: string[];
  loading: boolean;
  error: boolean;
  onSelect: (fid: number | null) => void;
  picked: Picked | null;
  pickedSoum: SoumRow | null;
  pickedVul: Record<string, unknown> | null;
  onClosePicked: () => void;
};

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
              <td>
                <button
                  className={styles.matrixButton}
                  aria-pressed={filters.hazard === h.id}
                  onClick={(event) => {
                    event.stopPropagation();
                    update({ hazard: h.id });
                  }}
                >
                  {h.label}
                </button>
              </td>
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
  dashboardOpen,
  onToggleDashboard,
  filters,
  update,
  total,
  matched,
  scopeLabel,
  selected,
  elements,
  loading,
  error,
  onSelect,
  picked,
  pickedSoum,
  pickedVul,
  onClosePicked,
}: Props) {
  const cf = classField(filters);

  const counts = useMemo(() => {
    const c: Record<number, number> = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    for (const r of matched) {
      const v = r[cf];
      if (typeof v === "number" && v in c) c[v]++;
    }
    return c;
  }, [matched, cf]);

  const classes = filters.element ? [0, 1, 2, 3, 4, 5] : [1, 2, 3, 4, 5];
  const max = Math.max(1, ...classes.map((c) => counts[c]));

  return (
    <aside
      className={`${styles.panel} ${styles.resultPanel}`}
      aria-label="Үр дүн"
    >
      <div className={styles.resultSummary}>
        <button
          type="button"
          className={styles.dashboardButton}
          aria-pressed={dashboardOpen}
          aria-controls="risk-dashboard"
          disabled={loading || error}
          onClick={onToggleDashboard}
        >
          <Icon name="chart" size={15} />
          {dashboardOpen ? "Дашбоард хаах" : "Дашбоард"}
          <Icon name="chevron" size={13} />
        </button>
        <div className={styles.summaryCard} aria-busy={loading}>
          <div className={styles.summaryHeading}>
            <p className={styles.summaryTitle}>
              {loading
                ? "Үнэлгээний мэдээлэл ачаалж байна"
                : error
                  ? "Мэдээлэл ачаалагдсангүй"
                  : scopeLabel}
            </p>
          </div>
          <div className={styles.count} aria-live="polite" aria-atomic="true">
            <Icon name={error ? "info" : "map"} size={14} />
            <strong>{loading || error ? "—" : matched.length}</strong>
            <span>/ {total || "—"} сум</span>
          </div>
        </div>

        <details className={styles.bars} open>
          <summary className={styles.sectionLabel}>
            <span className={styles.barsToggle}>
              <Icon name="chevron" size={13} />
              Ангиллын тархалт
            </span>
            <span>Сумын тоо</span>
          </summary>
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
        </details>

        {picked && (
          <ObjectDetail
            picked={picked}
            soum={pickedSoum}
            vul={pickedVul}
            onClose={onClosePicked}
          />
        )}
        {!picked && selected && (
          <Detail
            row={selected}
            filters={filters}
            elements={elements}
            update={update}
            onClose={() => onSelect(null)}
          />
        )}
      </div>
    </aside>
  );
}
