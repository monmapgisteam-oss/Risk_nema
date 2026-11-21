"use client";

import {
  CLASS_LABELS,
  ELEMENTS,
  HAZARDS,
  type Filters,
  type HazardId,
  type Picked,
  type SoumRow,
} from "@/lib/riskConfig";
import { colorOf, fmt } from "@/lib/stats";
import styles from "./Dashboard.module.css";
import ObjectDetail from "./ObjectDetail";

type Props = {
  /** The docked dashboard, shown under any selection details. */
  children?: React.ReactNode;
  filters: Filters;
  update: (patch: Partial<Filters>) => void;
  selected: SoumRow | null;
  elements: string[];
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
  children,
  filters,
  update,
  selected,
  elements,
  onSelect,
  picked,
  pickedSoum,
  pickedVul,
  onClosePicked,
}: Props) {
  return (
    <aside
      className={`${styles.panel} ${styles.resultPanel}`}
      aria-label="Үр дүн"
    >
      {(picked || selected) && (
        <div className={styles.resultSummary}>
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
      )}
      {children}
    </aside>
  );
}
