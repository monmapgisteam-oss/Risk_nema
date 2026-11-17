"use client";

import { useEffect, useMemo, useState } from "react";
import {
  DEFAULT_FILTERS,
  OVERLAYS,
  SOUM_LAYER_URL,
  applyFilters,
  classField,
  elementCombos,
  type Filters,
  type SoumRow,
} from "@/lib/riskConfig";
import FilterPanel from "./FilterPanel";
import ResultPanel from "./ResultPanel";
import RiskMap from "./RiskMap";
import styles from "./Dashboard.module.css";

const ROWS_URL = `${SOUM_LAYER_URL}/query?where=1%3D1&outFields=*&returnGeometry=false&f=json`;

export default function Dashboard() {
  const [rows, setRows] = useState<SoumRow[]>([]);
  const [error, setError] = useState(false);
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [overlays, setOverlays] = useState<string[]>([]);
  const [selectedFid, setSelectedFid] = useState<number | null>(null);
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
  const selected = useMemo(
    () => rows.find((r) => r.fid === selectedFid) ?? null,
    [rows, selectedFid],
  );

  const focusOn = (ids: number[] | null) =>
    setFocus((f) => ({ ids, key: f.key + 1 }));

  const update = (patch: Partial<Filters>) => {
    setFilters((cur) => {
      const next = { ...cur, ...patch };
      // Keep the element only while it exists for the chosen indicator + hazard.
      const available = combos[`${next.mode}:${next.hazard}`] ?? [];
      if (next.element && !available.includes(next.element)) next.element = "";
      if (next.element !== cur.element || next.hazard !== cur.hazard)
        next.classes = patch.classes ?? [];
      return next;
    });
    if (patch.mode) {
      const els = OVERLAYS[patch.mode].map((o) => o.el);
      setOverlays((cur) => cur.filter((el) => els.includes(el)));
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
    setFilters(DEFAULT_FILTERS);
    setOverlays([]);
    setSelectedFid(null);
    focusOn(null);
  };

  return (
    <div className={styles.dashboard}>
      <FilterPanel
        filters={filters}
        update={update}
        reset={reset}
        elements={combos[`${filters.mode}:${filters.hazard}`] ?? []}
        aimags={aimags}
        overlays={overlays}
        setOverlays={setOverlays}
      />
      <div className={styles.mapWrap}>
        <RiskMap
          mode={filters.mode}
          hazard={filters.hazard}
          field={classField(filters)}
          showNoExp={!!filters.element}
          matchedIds={matchedIds}
          overlays={overlays}
          selectedFid={selectedFid}
          onSelect={setSelectedFid}
          focus={focus}
        />
      </div>
      <ResultPanel
        filters={filters}
        update={update}
        total={rows.length}
        matched={matched}
        selected={selected}
        elements={combos[`${filters.mode}:${filters.hazard}`] ?? []}
        loading={!rows.length && !error}
        error={error}
        onSelect={(fid) => {
          setSelectedFid(fid);
          if (fid != null) focusOn([fid]);
        }}
      />
    </div>
  );
}
