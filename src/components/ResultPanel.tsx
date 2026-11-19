"use client";

import { useMemo, useState } from "react";
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
import { colorOf, fmt, rankField, type AimagRank } from "@/lib/stats";
import styles from "./Dashboard.module.css";
import Icon from "./Icon";
import ObjectDetail from "./ObjectDetail";

type Props = {
  aimagRanks: AimagRank[];
  onSelectAimag: (code: string) => void;
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
  aimagRanks,
  onSelectAimag,
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
  const [byName, setByName] = useState(false);
  const [level, setLevel] = useState<"soum" | "aimag">("aimag");
  const [rankCollapsed, setRankCollapsed] = useState(false);
  const cf = classField(filters);
  const sf = rankField(filters);

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

  // Aimags without a soum passing the filters drop out, like soums do.
  const aimagList = useMemo(() => {
    const list = aimagRanks.filter((a) => a.matched > 0);
    if (byName) list.sort((a, b) => a.name.localeCompare(b.name, "mn"));
    else list.sort((a, b) => (b.score ?? -1) - (a.score ?? -1));
    return list;
  }, [aimagRanks, byName]);

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
      <div className={styles.listHeading}>
        <h3 className={styles.caps}>
          <button
            type="button"
            className={styles.listToggle}
            aria-expanded={!rankCollapsed}
            aria-controls="rank-body"
            onClick={() => setRankCollapsed((v) => !v)}
          >
            <Icon name="chevron" size={13} />
            {level === "soum" ? "Сумдын эрэмбэ" : "Аймгийн эрэмбэ"}
          </button>
        </h3>
        <span>
          {level === "soum" ? sorted.length : aimagList.length} илэрц
        </span>
      </div>
      <div id="rank-body" className={styles.rankBody} hidden={rankCollapsed}>
      <div
        className={styles.levelToggle}
        role="group"
        aria-label="Эрэмбийн түвшин"
      >
        <button
          type="button"
          aria-pressed={level === "aimag"}
          onClick={() => setLevel("aimag")}
        >
          <Icon name="map" size={13} />
          Аймгийн эрэмбэ
        </button>
        <button
          type="button"
          aria-pressed={level === "soum"}
          onClick={() => setLevel("soum")}
        >
          <Icon name="pin" size={13} />
          Сумын эрэмбэ
        </button>
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

      {level === "aimag" && (
        <ul className={styles.list}>
          {loading && <li className={styles.note}>Ачаалж байна…</li>}
          {error && <li className={styles.note}>Өгөгдөл ачаалагдсангүй</li>}
          {!loading && !error && !aimagList.length && (
            <li className={styles.note}>
              <Icon name="search" size={26} />
              <strong>Тохирох аймаг олдсонгүй</strong>
              <span>Шүүлтүүрийн нөхцөлөө өөрчилж үзнэ үү.</span>
            </li>
          )}
          {aimagList.map((a, index) => (
            <li key={a.code}>
              <button
                type="button"
                aria-current={filters.aimag === a.code}
                title={
                  filters.aimag === a.code
                    ? "Аймгийн сонголтыг цуцлах"
                    : `${a.name} аймгийг сонгох`
                }
                onClick={() => onSelectAimag(a.code)}
              >
                <span className={styles.rank}>
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span>
                  {a.name}
                  <small>
                    {a.matched < a.total
                      ? `${a.matched}/${a.total} сум`
                      : `${a.total} сум`}
                    {a.high > 0 && ` · ${a.high} өндөр`}
                  </small>
                </span>
                <b
                  className={styles.score}
                  title={
                    filters.element ? "Дундаж ангилал" : "Сумдын дундаж оноо"
                  }
                >
                  <i style={{ background: colorOf(a.cls) }} />
                  {fmt(a.score)}
                </b>
                <Icon name="chevron" size={13} />
              </button>
            </li>
          ))}
        </ul>
      )}

      <ul className={styles.list} hidden={level !== "soum"}>
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
              title={
                filters.soums.length === 1 && filters.soums[0] === r.fid
                  ? "Сумын шүүлтүүрийг цуцлах"
                  : `Газрын зургийг ${r.soum_name} сумаар шүүх`
              }
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
      </div>
    </aside>
  );
}
