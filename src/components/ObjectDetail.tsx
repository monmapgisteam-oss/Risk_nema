"use client";

import { useId, type CSSProperties } from "react";
import {
  CLASS_COLORS,
  CLASS_LABELS,
  HAZARDS,
  NODATA_COLOR,
  NOEXP_COLOR,
  overlayLabel,
  parseClass,
  type Picked,
  type SoumRow,
} from "@/lib/riskConfig";
import Icon from "./Icon";
import styles from "./ObjectDetail.module.css";

function ClassBadge({ value }: { value: number | null }) {
  const label = value == null ? "Өгөгдөлгүй" : CLASS_LABELS[value];
  const color =
    value == null
      ? NODATA_COLOR
      : value === 0
        ? NOEXP_COLOR
        : CLASS_COLORS[value];

  return (
    <span
      className={styles.badge}
      data-empty={value == null}
      style={{ "--class-color": color } as CSSProperties}
      title={label}
      aria-label={value == null ? label : `${value} · ${label}`}
    >
      {value != null && <i aria-hidden="true" />}
      {value ?? "–"}
    </span>
  );
}

export default function ObjectDetail({
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
  const headingId = useId();
  const { overlay: o, attrs, mode } = picked;
  const isObject = o.geometry !== "polygon";
  const hazards = HAZARDS.filter((h) => h.id !== "all");
  const name = String(attrs[o.nameField] ?? "").trim();
  const place = soum
    ? [soum.soum_name, soum.aimag_name].filter(Boolean).join(", ")
    : "";

  // The object's own assessment is separate from the soum's element classes.
  const objV = (h: string) =>
    isObject && vul ? parseClass(vul[`${h}_cvi`] ?? vul[`cvi_${h}`]) : null;
  const elem = (h: string, m: "v" | "e") =>
    (soum?.[`${h}_${o.el}_${m}`] as number | null | undefined) ??
    (mode === m ? parseClass(attrs[`${h}_${o.el}_el`]) : null);
  const hasObj = hazards.some((h) => objV(h.id) != null);
  const hasElem = hazards.some(
    (h) => elem(h.id, "v") != null || elem(h.id, "e") != null,
  );
  // Only fall back to totals when the element has no assessment at all.
  const soumV = (h: string) =>
    hasElem ? elem(h, "v") : ((soum?.[`${h}_v_cls`] as number) ?? null);
  const soumE = (h: string) =>
    hasElem ? elem(h, "e") : ((soum?.[`${h}_e_cls`] as number) ?? null);
  const hasRows = hasObj || hasElem || !!soum;
  const mhE = parseClass(attrs.mh_expclas ?? attrs.mh_expcl ?? attrs.mh_el345);
  const mhV = isObject && vul ? parseClass(vul.cvi_mhei ?? vul.cvi) : null;
  const hasZero =
    mhV === 0 ||
    mhE === 0 ||
    hazards.some((h) => [objV(h.id), soumV(h.id), soumE(h.id)].includes(0));

  return (
    <section className={styles.card} aria-labelledby={headingId}>
      <div className={styles.header}>
        <div className={styles.identity}>
          <span className={styles.category}>
            <Icon name={o.el === "edu" ? "school" : "layers"} size={14} />
            {overlayLabel(o)}
          </span>
          <h3 id={headingId}>{isObject && name ? name : overlayLabel(o)}</h3>
          {place && (
            <p className={styles.location}>
              <Icon name="pin" size={12} />
              {place}
            </p>
          )}
        </div>
        <button
          type="button"
          className={styles.close}
          onClick={onClose}
          aria-label="Объектын дэлгэрэнгүйг хаах"
          title="Хаах"
        >
          <span aria-hidden="true">×</span>
        </button>
      </div>

      {(mhV != null || mhE != null) && (
        <div className={styles.overall}>
          <h4>Олон аюулын нэгдсэн үнэлгээ</h4>
          <div className={styles.metrics}>
            {[
              { label: "Эмзэг байдал", value: mhV },
              { label: "Өртөх байдал", value: mhE },
            ].map(
              ({ label, value }) =>
                value != null && (
                  <div className={styles.metric} key={label}>
                    <span>{label}</span>
                    <div className={styles.metricValue}>
                      <ClassBadge value={value} />
                      <strong>{CLASS_LABELS[value]}</strong>
                    </div>
                  </div>
                ),
            )}
          </div>
        </div>
      )}

      {hasRows ? (
        <>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <caption>Аюул тус бүрийн үнэлгээ</caption>
              <colgroup>
                <col />
                {hasObj && <col className={styles.scoreColumn} />}
                <col className={styles.scoreColumn} />
                <col className={styles.scoreColumn} />
              </colgroup>
              <thead>
                <tr>
                  <th rowSpan={2} scope="col" className={styles.hazardHeading}>
                    Аюулт үзэгдэл
                  </th>
                  {hasObj && (
                    <th scope="col" className={styles.objectColumn}>
                      Объект
                    </th>
                  )}
                  <th colSpan={2} scope="colgroup">
                    Сум
                  </th>
                </tr>
                <tr>
                  {hasObj && (
                    <th scope="col" className={styles.objectColumn}>
                      Эмзэг
                    </th>
                  )}
                  <th scope="col">Эмзэг</th>
                  <th scope="col">Өртөх</th>
                </tr>
              </thead>
              <tbody>
                {hazards.map((h) => (
                  <tr key={h.id}>
                    <th scope="row">
                      <span className={styles.hazard}>
                        <Icon name={h.id} size={13} />
                        <span>{h.label}</span>
                      </span>
                    </th>
                    {hasObj && (
                      <td className={styles.objectColumn}>
                        <ClassBadge value={objV(h.id)} />
                      </td>
                    )}
                    <td>
                      <ClassBadge value={soumV(h.id)} />
                    </td>
                    <td>
                      <ClassBadge value={soumE(h.id)} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className={styles.footnote}>
            <p>
              {hasElem
                ? "Сум: тухайн элементийн үнэлгээ"
                : "Сумын нийт үнэлгээ"}
            </p>
            <span>– Өгөгдөлгүй{hasZero && " · 0 Өртөлтгүй"}</span>
          </div>
        </>
      ) : (
        <p className={styles.empty}>
          <Icon name="info" size={15} />
          Аюул тус бүрийн үнэлгээний мэдээлэл алга.
        </p>
      )}
    </section>
  );
}
