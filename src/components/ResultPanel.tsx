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
  overlayLabel,
  parseClass,
  scoreField,
  type Filters,
  type HazardId,
  type Picked,
  type SoumRow,
} from "@/lib/riskConfig";
import styles from "./Dashboard.module.css";
import Icon from "./Icon";

type Props = {
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

const colorOf = (c: unknown) =>
  typeof c !== "number"
    ? NODATA_COLOR
    : c === 0
      ? NOEXP_COLOR
      : (CLASS_COLORS[c] ?? NODATA_COLOR);

const fmt = (v: unknown) =>
  typeof v === "number"
    ? Number.isInteger(v)
      ? String(v)
      : v.toFixed(2)
    : "–";

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

function ObjectDetail({
  picked,
  soum,
  vul,
  onClose,
}: {
  picked: Picked;
  soum: SoumRow | null;
  vul: Record<string, unknown> | null;
  onClose: () => void;
}) {
  const { overlay: o, attrs, mode } = picked;
  const isObject = o.geometry !== "polygon";
  const hazards = HAZARDS.filter((h) => h.id !== "all");
  const name = String(attrs[o.nameField] ?? "").trim();
  const place = soum
    ? [soum.soum_name, soum.aimag_name].filter(Boolean).join(", ")
    : "";

  // Vulnerability class assessed for the object itself (point / line layers).
  const objV = (h: string) =>
    isObject && vul ? parseClass(vul[`${h}_cvi`] ?? vul[`cvi_${h}`]) : null;
  // Class of this element in the soum the object belongs to.
  const elem = (h: string, m: "v" | "e") =>
    (soum?.[`${h}_${o.el}_${m}`] as number | null | undefined) ??
    (mode === m ? parseClass(attrs[`${h}_${o.el}_el`]) : null);
  const hasObj = hazards.some((h) => objV(h.id) != null);
  const hasElem = hazards.some(
    (h) => elem(h.id, "v") != null || elem(h.id, "e") != null,
  );
  // Elements without an assessment of their own fall back to the soum totals.
  const soumV = (h: string) =>
    hasElem ? elem(h, "v") : ((soum?.[`${h}_v_cls`] as number) ?? null);
  const soumE = (h: string) =>
    hasElem ? elem(h, "e") : ((soum?.[`${h}_e_cls`] as number) ?? null);
  const hasRows = hasObj || hasElem || !!soum;

  const mhE = parseClass(attrs.mh_expclas ?? attrs.mh_expcl ?? attrs.mh_el345);
  const mhV = isObject && vul ? parseClass(vul.cvi_mhei ?? vul.cvi) : null;

  return (
    <div className={styles.detail}>
      <div className={styles.detailHead}>
        <div>
          <strong>{isObject && name ? name : overlayLabel(o)}</strong>
          <span>
            {[isObject && name ? overlayLabel(o) : "", place]
              .filter(Boolean)
              .join(" · ")}
          </span>
        </div>
        <button type="button" onClick={onClose} aria-label="Хаах">
          ×
        </button>
      </div>
      {(mhV != null || mhE != null) && (
        <div className={styles.mhRow}>
          <span>Олон аюул</span>
          {mhV != null && (
            <span>
              Эмзэг <Cell cls={mhV} value={mhV} />
            </span>
          )}
          {mhE != null && (
            <span>
              Өртөх <Cell cls={mhE} value={mhE} />
            </span>
          )}
        </div>
      )}
      {hasRows && (
        <table className={`${styles.matrix} ${styles.objectMatrix}`}>
          <thead>
            <tr>
              <th />
              {hasObj && (
                <th>
                  Эмзэг<small>объект</small>
                </th>
              )}
              <th>
                Эмзэг<small>сум</small>
              </th>
              <th>
                Өртөх<small>сум</small>
              </th>
            </tr>
          </thead>
          <tbody>
            {hazards.map((h) => (
              <tr key={h.id}>
                <td>{h.label}</td>
                {hasObj && (
                  <td>
                    <Cell cls={objV(h.id)} value={objV(h.id)} />
                  </td>
                )}
                <td>
                  <Cell cls={soumV(h.id)} value={soumV(h.id)} />
                </td>
                <td>
                  <Cell cls={soumE(h.id)} value={soumE(h.id)} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {hasRows && !hasElem && (
        <span className={styles.detailNote}>Сумын нийт үнэлгээ</span>
      )}
    </div>
  );
}

export default function ResultPanel({
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
    <aside
      className={`${styles.panel} ${styles.resultPanel}`}
      aria-label="Үр дүн"
    >
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

        <div className={styles.summaryCard}>
          <span className={styles.label}>
            {loading
              ? "Үнэлгээний мэдээлэл ачаалж байна"
              : error
                ? "Мэдээлэл ачаалагдсангүй"
                : scopeLabel}
          </span>
          <div className={styles.count} aria-live="polite">
            <strong>{loading || error ? "—" : matched.length}</strong>
            <span>/ {total || "—"} сум</span>
            <span className={styles.summaryIcon}>
              <Icon name="map" size={18} />
            </span>
          </div>
          <div className={styles.distribution} aria-hidden="true">
            {classes.map((c) => (
              <span
                key={c}
                style={{ flex: counts[c], background: colorOf(c) }}
              />
            ))}
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
      </div>
      <div className={styles.listHeading}>
        <h3>Сумдын эрэмбэ</h3>
        <span>{sorted.length} илэрц</span>
      </div>
      <div className={styles.sort} role="group" aria-label="Эрэмбэ">
        <button
          type="button"
          aria-pressed={!byName}
          onClick={() => setByName(false)}
        >
          Оноогоор ↓
        </button>
        <button
          type="button"
          aria-pressed={byName}
          onClick={() => setByName(true)}
        >
          Нэрээр А–Я
        </button>
      </div>

      <ul className={styles.list}>
        {loading && <li className={styles.note}>Ачаалж байна…</li>}
        {error && <li className={styles.note}>Өгөгдөл ачаалагдсангүй</li>}
        {!loading && !error && !sorted.length && (
          <li className={styles.note}>
            <Icon name="search" size={26} />
            <strong>Тохирох сум олдсонгүй</strong>
            <span>Шүүлтүүрийн нөхцөлөө өөрчилж үзнэ үү.</span>
          </li>
        )}
        {sorted.map((r, index) => (
          <li key={r.fid}>
            <button
              type="button"
              aria-current={selected?.fid === r.fid}
              onClick={() => onSelect(r.fid)}
            >
              <span className={styles.rank}>
                {String(index + 1).padStart(2, "0")}
              </span>
              <span>
                {r.soum_name}
                <small>{r.aimag_name ?? ""}</small>
              </span>
              <b className={styles.score}>
                <i style={{ background: colorOf(r[cf]) }} />
                {fmt(r[sf])}
              </b>
              <Icon name="chevron" size={13} />
            </button>
          </li>
        ))}
      </ul>
    </aside>
  );
}
