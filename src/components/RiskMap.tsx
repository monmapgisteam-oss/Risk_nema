"use client";

// Calcite design tokens and map-component base styles; without these the
// component panels (e.g. basemap gallery) render without backgrounds.
import "@esri/calcite-components/main.css";
import "@arcgis/map-components/main.css";

import "@arcgis/map-components/components/arcgis-map";
import "@arcgis/map-components/components/arcgis-zoom";
import "@arcgis/map-components/components/arcgis-home";
import "@arcgis/map-components/components/arcgis-basemap-toggle";
import "@arcgis/map-components/components/arcgis-expand";
import "@arcgis/map-components/components/arcgis-basemap-gallery";

import { useEffect, useMemo, useRef, useState } from "react";
import FeatureLayer from "@arcgis/core/layers/FeatureLayer";
import FeatureFilter from "@arcgis/core/layers/support/FeatureFilter";
import UniqueValueRenderer from "@arcgis/core/renderers/UniqueValueRenderer";
import SimpleFillSymbol from "@arcgis/core/symbols/SimpleFillSymbol";
import Viewpoint from "@arcgis/core/Viewpoint";
import type Extent from "@arcgis/core/geometry/Extent";
import type MapView from "@arcgis/core/views/MapView";
import type FeatureLayerView from "@arcgis/core/views/layers/FeatureLayerView";

import {
  CLASS_COLORS,
  CLASS_LABELS,
  NODATA_COLOR,
  NOEXP_COLOR,
  OVERLAYS,
  OVERLAY_SERVICE,
  SOUM_LAYER_URL,
  overlayLabel,
  overlayWhere,
  type Mode,
  type Overlay,
  type Picked,
} from "@/lib/riskConfig";
import { overlayLegendSvg, overlayRenderer } from "@/lib/mapSymbols";
import styles from "./RiskMap.module.css";
import Icon from "./Icon";

const HOME = { center: [103.8, 46.9], zoom: 5 };
const CLASSES = [1, 2, 3, 4, 5];

type Props = {
  mode: Mode;
  hazard: string;
  field: string;
  showNoExp: boolean;
  matchedIds: number[] | null; // null = no filter
  matchedCodes: number[] | null; // soum codes of the same soums
  overlays: string[]; // overlay ids
  selectedFid: number | null;
  onSelect: (fid: number | null) => void;
  picked: Picked | null;
  onPick: (picked: Picked) => void;
  focus: { ids: number[] | null; key: number };
  onFocusMatched: () => void;
};

const fill = (color: string) =>
  new SimpleFillSymbol({
    color,
    outline: { color: [255, 255, 255, 0.9], width: 0.5 },
  });

function soumRenderer(field: string, showNoExp: boolean) {
  return new UniqueValueRenderer({
    field,
    defaultSymbol: fill(NODATA_COLOR),
    uniqueValueInfos: [
      ...(showNoExp ? [{ value: 0, symbol: fill(NOEXP_COLOR) }] : []),
      ...CLASSES.map((c) => ({ value: c, symbol: fill(CLASS_COLORS[c]) })),
    ],
  });
}

type OverlayEntry = { layer: FeatureLayer; overlay: Overlay; mode: Mode };

export default function RiskMap({
  mode,
  hazard,
  field,
  showNoExp,
  matchedIds,
  matchedCodes,
  overlays,
  selectedFid,
  onSelect,
  picked,
  onPick,
  focus,
  onFocusMatched,
}: Props) {
  const mapRef = useRef<HTMLArcgisMapElement | null>(null);
  const homeRef = useRef<HTMLArcgisHomeElement | null>(null);
  const fullExtent = useRef<Extent | null>(null);
  const [view, setView] = useState<MapView | null>(null);
  const [layerView, setLayerView] = useState<FeatureLayerView | null>(null);
  const onSelectRef = useRef(onSelect);
  const onPickRef = useRef(onPick);
  useEffect(() => {
    onSelectRef.current = onSelect;
    onPickRef.current = onPick;
  });

  const soumLayer = useMemo(
    () =>
      new FeatureLayer({
        url: SOUM_LAYER_URL,
        title: "Сумын үнэлгээ",
        outFields: ["fid"],
        popupEnabled: false,
        opacity: 0.82,
      }),
    [],
  );
  const overlayLayers = useRef(new Map<string, OverlayEntry>());

  // Add the soum layer and wire map clicks once the view is ready.
  useEffect(() => {
    if (!view) return;
    view.map?.add(soumLayer, 0);
    let alive = true;
    view.set("constraints.snapToZoom", false);
    view
      .whenLayerView(soumLayer)
      .then((lv) => {
        if (alive) setLayerView(lv);
      })
      .catch(() => {});
    soumLayer
      .queryExtent()
      .then(({ extent }) => {
        if (!alive || !extent) return;
        fullExtent.current = extent.expand(1.12);
        if (homeRef.current)
          homeRef.current.viewpoint = new Viewpoint({
            targetGeometry: fullExtent.current,
          });
        return view.goTo(fullExtent.current, { animate: false });
      })
      .catch(() => {});
    const click = view.on("click", async (event) => {
      const entries = [...overlayLayers.current.values()];
      const hit = await view.hitTest(event, {
        include: [soumLayer, ...entries.map((e) => e.layer)],
      });
      // Results come topmost first: an element feature wins over the soum.
      for (const r of hit.results) {
        if (r.type !== "graphic") continue;
        const entry = entries.find((e) => e.layer === r.graphic.layer);
        if (entry) {
          onPickRef.current({
            mode: entry.mode,
            overlay: entry.overlay,
            fid: r.graphic.attributes.fid as number,
            attrs: { ...r.graphic.attributes },
          });
          return;
        }
        if (r.graphic.layer === soumLayer) {
          onSelectRef.current(r.graphic.attributes.fid as number);
          return;
        }
      }
      onSelectRef.current(null);
    });
    return () => {
      alive = false;
      click.remove();
    };
  }, [view, soumLayer]);

  useEffect(() => {
    soumLayer.set("renderer", soumRenderer(field, showNoExp));
  }, [soumLayer, field, showNoExp]);

  // Hide soums that do not match the filters.
  useEffect(() => {
    if (!layerView) return;
    layerView.set(
      "filter",
      matchedIds
        ? new FeatureFilter(
            matchedIds.length ? { objectIds: matchedIds } : { where: "1=0" },
          )
        : null,
    );
  }, [layerView, matchedIds]);

  useEffect(() => {
    if (!layerView || selectedFid == null) return;
    const h = layerView.highlight(selectedFid);
    return () => h.remove();
  }, [layerView, selectedFid]);

  // Highlight the picked element feature.
  useEffect(() => {
    if (!view || !picked) return;
    const entry = overlayLayers.current.get(
      `${picked.mode}:${picked.overlay.id}`,
    );
    if (!entry) return;
    let handle: { remove(): void } | null = null;
    let alive = true;
    view
      .whenLayerView(entry.layer)
      .then((lv) => {
        if (alive) handle = lv.highlight(picked.fid);
      })
      .catch(() => {});
    return () => {
      alive = false;
      handle?.remove();
    };
  }, [view, picked]);

  useEffect(() => {
    if (!view || focus.key === 0) return;
    if (!focus.ids) {
      view.goTo(fullExtent.current ?? HOME).catch(() => {});
      return;
    }
    if (!focus.ids.length) return;
    let alive = true;
    soumLayer
      .queryExtent({ objectIds: focus.ids })
      .then((r) => {
        if (alive && r.extent) return view.goTo(r.extent.expand(1.25));
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [view, soumLayer, focus]);

  // Element layers: polygons sit just above the soums, lines and points on top.
  useEffect(() => {
    if (!view?.map) return;
    const map = view.map;
    let alive = true;
    const wanted = new Set(overlays.map((id) => `${mode}:${id}`));
    for (const [key, entry] of overlayLayers.current) {
      if (!wanted.has(key)) {
        map.remove(entry.layer);
        overlayLayers.current.delete(key);
      }
    }
    for (const o of OVERLAYS[mode]) {
      const key = `${mode}:${o.id}`;
      if (!wanted.has(key)) continue;
      let entry = overlayLayers.current.get(key);
      if (!entry) {
        const layer = new FeatureLayer({
          url: `${OVERLAY_SERVICE[mode]}/${o.layerId}`,
          title: overlayLabel(o),
          outFields: ["*"],
          popupEnabled: false,
          opacity: 1,
          renderer: overlayRenderer(o, null),
        });
        entry = { layer, overlay: o, mode };
        overlayLayers.current.set(key, entry);
        if (o.geometry === "polygon") map.add(layer, 1);
        else map.add(layer);
      }
      const target = entry.layer;
      target
        .load()
        .then(() => {
          if (!alive || overlayLayers.current.get(key)?.layer !== target)
            return;
          const f = `${hazard}_${o.el}_el`;
          const has = target.fields.some((x) => x.name === f);
          target.renderer = overlayRenderer(o, has ? f : null);
        })
        .catch(() => {});
    }
    // Keep markers readable even when a polygon or line is enabled later.
    const order = { polygon: 0, line: 1, point: 2 };
    [...overlayLayers.current.values()]
      .sort((a, b) => order[a.overlay.geometry] - order[b.overlay.geometry])
      .forEach((entry, index) => map.reorder(entry.layer, index + 1));
    return () => {
      alive = false;
    };
  }, [view, mode, hazard, overlays]);

  // Element features follow the soum filter (server-side definition query).
  useEffect(() => {
    for (const { layer, overlay } of overlayLayers.current.values())
      layer.definitionExpression = overlayWhere(overlay, matchedCodes);
  }, [view, matchedCodes, mode, overlays]);

  return (
    <arcgis-map
      ref={mapRef}
      className={styles.map}
      basemap="satellite"
      center={HOME.center.join(",")}
      zoom={HOME.zoom}
      onarcgisViewReadyChange={() => setView(mapRef.current?.view ?? null)}
    >
      <arcgis-zoom slot="top-left" />
      <arcgis-home ref={homeRef} slot="top-left" />
      <arcgis-basemap-toggle slot="bottom-left" next-basemap="gray-vector" />
      <button
        type="button"
        slot="top-left"
        className={styles.mapButton}
        title="Зурагт төвлөрүүлэх"
        aria-label="Зурагт төвлөрүүлэх"
        onClick={onFocusMatched}
      >
        <Icon name="focus" size={16} />
      </button>
      <arcgis-expand
        slot="top-left"
        expand-tooltip="Суурь зураг"
        collapse-tooltip="Хаах"
      >
        <arcgis-basemap-gallery />
      </arcgis-expand>
      <div slot="bottom-right" className={styles.legend}>
        {overlays.length > 0 && (
          <details className={styles.objectLegend} open>
            <summary>
              Объектын тэмдэглэгээ <span>{overlays.length}</span>
            </summary>
            <div className={styles.objectLegendList}>
              {OVERLAYS[mode]
                .filter((o) => overlays.includes(o.id))
                .map((o) => (
                  <div key={o.id} className={styles.objectLegendItem}>
                    {/* The preview is generated from the same symbols as the map. */}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={overlayLegendSvg(o)}
                      alt=""
                      width={26}
                      height={26}
                    />
                    <span>{overlayLabel(o)}</span>
                  </div>
                ))}
            </div>
            <p className={styles.legendNote}>
              {hazard === "all"
                ? "Дүрс, өнгө, хээгээр объектын төрлийг ялгана."
                : "Дүрс, хээ нь төрлийг; ангилалтай объектын өнгө нь үнэлгээг илэрхийлнэ."}
            </p>
            {OVERLAYS[mode].some(
              (o) => overlays.includes(o.id) && o.geometry === "polygon",
            ) && (
              <p className={styles.legendNote}>
                Талбайн давхарга: сумын түвшний үзүүлэлт.
              </p>
            )}
          </details>
        )}
        <strong>Үнэлгээний ангилал</strong>
        {CLASSES.map((c) => (
          <span key={c} className={styles.legendItem}>
            <i style={{ background: CLASS_COLORS[c] }} />
            {CLASS_LABELS[c]}
          </span>
        ))}
        {showNoExp && (
          <span className={styles.legendItem}>
            <i style={{ background: NOEXP_COLOR }} />
            {CLASS_LABELS[0]}
          </span>
        )}
        <span className={styles.legendItem}>
          <i style={{ background: NODATA_COLOR }} />
          Өгөгдөлгүй
        </span>
      </div>
    </arcgis-map>
  );
}
