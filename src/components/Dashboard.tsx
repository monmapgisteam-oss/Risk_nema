"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  CLASS_LABELS,
  DEFAULT_FILTERS,
  HAZARD_ZONES,
  ELEMENTS,
  OVERLAYS,
  OVERLAY_SERVICE,
  SOUM_LAYER_URL,
  applyFilters,
  classField,
  elementCombos,
  MODES,
  hazardLabel,
  soumOfPicked,
  type Filters,
  type Picked,
  type SoumRow,
} from "@/lib/riskConfig";
import FilterPanel from "./FilterPanel";
import ResultPanel from "./ResultPanel";
import RiskMap from "./RiskMap";
import SoumPicker from "./SoumPicker";
import PanelResizer from "./PanelResizer";
import styles from "./Dashboard.module.css";
import Icon from "./Icon";
import ClassPicker from "./ClassPicker";
import DisabledHint from "./DisabledHint";

const ROWS_URL = `${SOUM_LAYER_URL}/query?where=1%3D1&outFields=*&returnGeometry=false&f=json`;

/** The app opens on the hazard view, which needs a single hazard. */
const START_FILTERS: Filters = { ...DEFAULT_FILTERS, hazard: "wf" };

export default function Dashboard() {
  // Rendered client-only (ssr:false), so the header slot already exists.
  const [headerSlot] = useState(() =>
    typeof document === "undefined"
      ? null
      : document.getElementById("header-slot"),
  );
  // Side panel widths in px; null = layout default.
  const [panelW, setPanelW] = useState<{
    left: number | null;
    right: number | null;
  }>(() => {
    try {
      const v = JSON.parse(localStorage.getItem("panelWidths") ?? "null");
      if (v && typeof v === "object")
        return { left: v.left ?? null, right: v.right ?? null };
    } catch {}
    return { left: null, right: null };
  });
  const resizePanel = (side: "left" | "right", w: number | null) =>
    setPanelW((cur) => {
      const next = { ...cur, [side]: w };
      try {
        localStorage.setItem("panelWidths", JSON.stringify(next));
      } catch {}
      return next;
    });
  const [rows, setRows] = useState<SoumRow[]>([]);
  const [error, setError] = useState(false);
  const [filters, setFilters] = useState<Filters>(START_FILTERS);
  const [filterResetKey, setFilterResetKey] = useState(0);
  const [overlays, setOverlayIds] = useState<string[]>([]);
  // "Аюул": show the hazard zoning of the chosen hazard instead of V/E.
  const [hazardView, setHazardView] = useState(true);
  // Soum outlines over the hazard zoning; off by default.
  const [soumOutlines, setSoumOutlines] = useState(false);
  // Aimag borders in the hazard view; off by default.
  const [aimagOutlines, setAimagOutlines] = useState(false);
  const [picked, setPicked] = useState<Picked | null>(null);
  // Vulnerability-layer attributes of the picked object (its own CVI classes).
  const [pickedVul, setPickedVul] = useState<Record<string, unknown> | null>(
    null,
  );
  const pickSeq = useRef(0);
  const [selectedFid, setSelectedFid] = useState<number | null>(null);
  const [mobilePanel, setMobilePanel] = useState<"map" | "filters" | "results">(
    "map",
  );
  const [focus, setFocus] = useState<{ ids: number[] | null; key: number }>({
    ids: null,
    key: 0,
  });

  useEffect(() => {
    let alive = true;
    fetch(ROWS_URL)
      .then((r) => r.json())
      .then((d) => {
        if (!alive) return;
        if (!d.features) throw new Error("no features");
        setRows(d.features.map((f: { attributes: SoumRow }) => f.attributes));
      })
      .catch(() => alive && setError(true));
    return () => {
      alive = false;
    };
  }, []);

  const combos = useMemo(() => elementCombos(rows[0]), [rows]);
  const aimags = useMemo(() => {
    const m = new Map<string, string>();
    for (const r of rows) {
      const code = r.aimag_code as string;
      if (r.aimag_name && !m.has(code)) m.set(code, r.aimag_name as string);
    }
    return [...m].sort((a, b) => a[1].localeCompare(b[1], "mn"));
  }, [rows]);

  const matched = useMemo(() => applyFilters(rows, filters), [rows, filters]);
  const matchedIds = useMemo(
    () =>
      rows.length && matched.length < rows.length
        ? matched.map((r) => r.fid)
        : null,
    [rows, matched],
  );
  const matchedCodes = useMemo(
    () => (matchedIds ? matched.map((r) => Number(r.code)) : null),
    [matched, matchedIds],
  );
  const soumOptions = useMemo(
    () =>
      rows
        .filter((r) => !filters.aimag || r.aimag_code === filters.aimag)
        .map((r) => ({
          fid: r.fid,
          name: String(r.soum_name ?? ""),
          aimag: String(r.aimag_name ?? ""),
        }))
        .sort((a, b) => a.name.localeCompare(b.name, "mn")),
    [rows, filters.aimag],
  );
  const selected = useMemo(
    () => rows.find((r) => r.fid === selectedFid) ?? null,
    [rows, selectedFid],
  );

  const pickedSoum = useMemo(
    () => (picked ? soumOfPicked(rows, picked) : null),
    [rows, picked],
  );

  const clearPicked = () => {
    pickSeq.current++;
    setPicked(null);
    setPickedVul(null);
  };

  const pick = (p: Picked) => {
    const seq = ++pickSeq.current;
    setPicked(p);
    // Only the object is highlighted; its soum is shown in the detail panel.
    setSelectedFid(null);
    setMobilePanel("results");
    if (p.mode === "v") {
      setPickedVul(p.attrs);
      return;
    }
    setPickedVul(null);
    // The same object in the vulnerability service shares fid and geometry.
    const twin = OVERLAYS.v.find((o) => o.id === p.overlay.id);
    if (!twin || twin.geometry === "polygon") return;
    fetch(
      `${OVERLAY_SERVICE.v}/${twin.layerId}/query?objectIds=${p.fid}&outFields=*&returnGeometry=false&f=json`,
    )
      .then((r) => r.json())
      .then((d) => {
        if (seq === pickSeq.current)
          setPickedVul(d.features?.[0]?.attributes ?? null);
      })
      .catch(() => {});
  };

  const setOverlays = (ids: string[]) => {
    setOverlayIds(ids);
    if (picked && !ids.includes(picked.overlay.id)) clearPicked();
  };

  const focusOn = (ids: number[] | null) =>
    setFocus((f) => ({ ids, key: f.key + 1 }));

  const update = (patch: Partial<Filters>) => {
    setFilters((cur) => {
      const next = { ...cur, ...patch };
      if (next.aimag !== cur.aimag) {
        next.soums = [];
        next.q = "";
      }
      // Keep the element only while it exists for the chosen indicator + hazard.
      const available = combos[`${next.mode}:${next.hazard}`] ?? [];
      if (next.element && !available.includes(next.element)) next.element = "";
      if (next.element !== cur.element || next.hazard !== cur.hazard)
        next.classes = patch.classes ?? [];
      return next;
    });
    if (patch.mode) {
      const ids = OVERLAYS[patch.mode].map((o) => o.id);
      setOverlayIds((cur) => cur.filter((id) => ids.includes(id)));
      if (picked && picked.mode !== patch.mode) clearPicked();
    }
    if (patch.aimag !== undefined || patch.soums !== undefined) {
      clearPicked();
      setSelectedFid(null);
    }
    if (patch.soums !== undefined && patch.aimag === undefined) {
      focusOn(
        patch.soums.length
          ? patch.soums
          : filters.aimag
            ? rows
                .filter((r) => r.aimag_code === filters.aimag)
                .map((r) => r.fid)
            : null,
      );
    }
    if (patch.aimag !== undefined) {
      focusOn(
        patch.aimag
          ? rows.filter((r) => r.aimag_code === patch.aimag).map((r) => r.fid)
          : null,
      );
    }
  };

  const reset = () => {
    setFilters(START_FILTERS);
    setHazardView(true);
    setFilterResetKey((key) => key + 1);
    setOverlayIds([]);
    clearPicked();
    setSelectedFid(null);
    focusOn(null);
  };

  // What the result summary describes: the chosen area plus element/class.
  const scopeLabel = useMemo(() => {
    const names = filters.soums
      .map((fid) => rows.find((r) => r.fid === fid))
      .filter((r): r is SoumRow => !!r);
    const aimagName = aimags.find(([code]) => code === filters.aimag)?.[1];
    let area = "";
    if (names.length === 1)
      area = [`${names[0].soum_name} сум`, names[0].aimag_name]
        .filter(Boolean)
        .join(", ");
    else if (names.length > 1 && names.length <= 3)
      area = `${names.map((r) => r.soum_name).join(", ")} сум`;
    else if (names.length > 3) area = `${names.length} сум сонгосон`;
    else if (aimagName) area = `${aimagName} аймаг`;
    const extra = [
      filters.element ? ELEMENTS[filters.element] : "",
      filters.classes.length
        ? [...filters.classes]
            .sort((a, b) => a - b)
            .map((c) => CLASS_LABELS[c])
            .join(", ")
        : "",
    ].filter(Boolean);
    if (
      !area &&
      !extra.length &&
      !filters.q &&
      !filters.otherClasses.length &&
      !filters.topHaz &&
      !filters.minHigh
    )
      return "Монгол Улсын нийт сумдын үнэлгээ";
    return [area || "Монгол Улс", ...extra].join(" · ");
  }, [rows, aimags, filters]);

  const activeCount = [
    filters.hazard !== "all",
    !!filters.element,
    !!filters.classes.length,
    !!filters.otherClasses.length,
    !!filters.aimag,
    !!filters.soums.length,
    !!filters.q,
    !!filters.topHaz,
    filters.minHigh > 0,
    !!overlays.length,
  ].filter(Boolean).length;
  const elements = combos[`${filters.mode}:${filters.hazard}`] ?? [];
  const elementDisabledReason = elements.length
    ? undefined
    : error
      ? "Өгөгдөл ачаалагдаагүй тул элемент сонгох боломжгүй байна. Хуудсыг дахин ачаална уу."
      : !rows.length
        ? "Өгөгдөл ачаалж байгаа тул элемент сонгох боломжгүй байна. Түр хүлээнэ үү."
        : filters.hazard === "all"
          ? "Элементээр шүүхийн тулд «Аюулт үзэгдэл»-ээс нэг аюул сонгоно уу. «Бүх аюулт үзэгдэл» үед нэгдсэн дундаж үнэлгээ харагдана."
          : "Сонгосон аюул болон үнэлгээний төрөлд элементийн мэдээлэл байхгүй байна.";

  const toolbar = (
    <header className={styles.toolbar}>
      <div className={styles.toolbarTitle}>
        <nav className={styles.crumbs} aria-label="Үнэлгээ">
          <span>
            {hazardView
              ? "Аюул"
              : MODES.find((m) => m.id === filters.mode)?.label}
          </span>
          <Icon name="chevron" size={13} />
          <span aria-current="page">
            {filters.hazard === "all"
              ? "Нэгдсэн үнэлгээ"
              : hazardLabel(filters.hazard)}
          </span>
        </nav>
      </div>
      <div className={styles.toolbarActions}>
        <div
          className={styles.locationFilters}
          role="group"
          aria-label="Нутаг дэвсгэрээр шүүх"
        >
          <label className={styles.locationField}>
            <span>
              <Icon name="pin" size={14} />
              Аймаг
            </span>
            <select
              value={filters.aimag}
              onChange={(e) => update({ aimag: e.target.value })}
            >
              <option value="">Бүх аймаг</option>
              {aimags.map(([code, name]) => (
                <option key={code} value={code}>
                  {name}
                </option>
              ))}
            </select>
          </label>
          <SoumPicker
            key={filterResetKey}
            options={soumOptions}
            value={filters.soums}
            onChange={(soums) => update({ soums, q: "" })}
            placeholder={
              error
                ? "Өгөгдөл ачаалагдсангүй"
                : !rows.length
                  ? "Ачаалж байна…"
                  : "Бүх сум"
            }
            showAimag={!filters.aimag}
          />
        </div>
        <div className={styles.analysisFilters}>
          <label className={styles.locationField}>
            <span>
              <Icon name="layers" size={14} />
              Элемент
            </span>
            <DisabledHint
              key={elementDisabledReason ?? "enabled"}
              label="Элемент"
              reason={elementDisabledReason}
            >
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
            </DisabledHint>
          </label>
          <div className={styles.locationField}>
            <span>
              <Icon name="filter" size={14} />
              Үнэлгээний ангилал
            </span>
            <ClassPicker
              key={filterResetKey}
              value={filters.classes}
              withZero={!!filters.element}
              onChange={(classes) => update({ classes })}
            />
          </div>
        </div>
        <button
          type="button"
          className={styles.headerReset}
          onClick={reset}
          aria-label="Бүх шүүлтүүрийг цэвэрлэх"
          title="Бүх шүүлтүүрийг цэвэрлэх"
        >
          <Icon name="reset" size={15} />
          Цэвэрлэх
        </button>
      </div>
    </header>
  );

  return (
    <div className={styles.workspace} data-panel={mobilePanel}>
      {headerSlot ? createPortal(toolbar, headerSlot) : toolbar}
      <div
        className={styles.mobileTabs}
        role="group"
        aria-label="Дэлгэц сонгох"
      >
        <button
          aria-pressed={mobilePanel === "filters"}
          onClick={() => setMobilePanel("filters")}
        >
          <Icon name="filter" size={16} />
          Шүүлтүүр{activeCount > 0 && ` · ${activeCount}`}
        </button>
        <button
          aria-pressed={mobilePanel === "map"}
          onClick={() => setMobilePanel("map")}
        >
          <Icon name="map" size={16} />
          Газрын зураг
        </button>
        <button
          aria-pressed={mobilePanel === "results"}
          onClick={() => setMobilePanel("results")}
        >
          <Icon name="chart" size={16} />
          Үр дүн
        </button>
      </div>
      <div
        className={styles.dashboard}
        style={
          {
            ...(panelW.left ? { "--left-w": `${panelW.left}px` } : {}),
            ...(panelW.right ? { "--right-w": `${panelW.right}px` } : {}),
          } as React.CSSProperties
        }
      >
        <FilterPanel
          filters={filters}
          update={update}
          overlays={overlays}
          setOverlays={setOverlays}
          hazardView={hazardView}
          soumOutlines={soumOutlines}
          setSoumOutlines={setSoumOutlines}
          aimagOutlines={aimagOutlines}
          setAimagOutlines={setAimagOutlines}
          setHazardView={(on) => {
            setHazardView(on);
            if (on) clearPicked();
          }}
        />
        <PanelResizer
          side="left"
          label="Шүүлтүүрийн самбарын өргөн"
          min={220}
          max={520}
          onResize={(w) => resizePanel("left", w)}
        />
        <div className={styles.mapWrap}>
          <div className={styles.mapCanvas}>
            <RiskMap
              mode={filters.mode}
              hazard={filters.hazard}
              field={classField(filters)}
              showNoExp={!!filters.element}
              matchedIds={matchedIds}
              matchedCodes={matchedCodes}
              // Object layers belong to the V/E views, not the hazard view.
              overlays={hazardView ? [] : overlays}
              selectedFid={selectedFid}
              selectedCode={selected ? Number(selected.code) : null}
              onSelect={(fid) => {
                clearPicked();
                setSelectedFid(fid);
                if (fid != null) setMobilePanel("results");
              }}
              picked={picked}
              onPick={pick}
              focus={focus}
              onFocusMatched={() => focusOn(matchedIds)}
              hazardZone={
                hazardView ? (HAZARD_ZONES[filters.hazard] ?? null) : null
              }
              showSoums={!hazardView || soumOutlines}
              // Hazard view: the panel toggle. V/E: shown once an aimag or
              // soums are chosen.
              showAimags={
                hazardView
                  ? aimagOutlines
                  : !!filters.aimag || filters.soums.length > 0
              }
              areaFocus={!!filters.aimag || filters.soums.length > 0}
            />
          </div>
        </div>
        <PanelResizer
          side="right"
          label="Үр дүнгийн самбарын өргөн"
          min={240}
          max={560}
          onResize={(w) => resizePanel("right", w)}
        />
        <ResultPanel
          filters={filters}
          update={update}
          total={rows.length}
          matched={matched}
          scopeLabel={scopeLabel}
          selected={selected}
          elements={elements}
          loading={!rows.length && !error}
          error={error}
          onSelect={(fid) => {
            clearPicked();
            setSelectedFid(fid);
            if (fid != null) focusOn([fid]);
          }}
          picked={picked}
          pickedSoum={pickedSoum}
          pickedVul={pickedVul}
          onClosePicked={clearPicked}
        />
      </div>
      <footer className={styles.footer}>
        <span>
          <span
            className={
              error
                ? styles.errorDot
                : rows.length
                  ? styles.statusDot
                  : styles.loadingDot
            }
          />
          {error
            ? "Өгөгдөлтэй холбогдсонгүй"
            : rows.length
              ? `${rows.length} сумын өгөгдөл ачаалагдсан`
              : "Өгөгдөл ачаалж байна…"}
        </span>
        <span>
          Эх сурвалж: ОБЕГ <span className={styles.footerDivider}>/</span> Эмзэг
          байдал · Өртөх байдал
        </span>
      </footer>
    </div>
  );
}
