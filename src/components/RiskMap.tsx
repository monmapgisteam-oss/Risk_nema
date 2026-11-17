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
import FeatureEffect from "@arcgis/core/layers/support/FeatureEffect";
import FeatureFilter from "@arcgis/core/layers/support/FeatureFilter";
import PopupTemplate from "@arcgis/core/PopupTemplate";
import UniqueValueRenderer from "@arcgis/core/renderers/UniqueValueRenderer";
import SimpleRenderer from "@arcgis/core/renderers/SimpleRenderer";
import SimpleFillSymbol from "@arcgis/core/symbols/SimpleFillSymbol";
import SimpleMarkerSymbol from "@arcgis/core/symbols/SimpleMarkerSymbol";
import SimpleLineSymbol from "@arcgis/core/symbols/SimpleLineSymbol";
import type MapView from "@arcgis/core/views/MapView";
import type FeatureLayerView from "@arcgis/core/views/layers/FeatureLayerView";

import {
  CLASS_COLORS,
  CLASS_LABELS,
  ELEMENTS,
  HAZARDS,
  NODATA_COLOR,
  NOEXP_COLOR,
  OVERLAYS,
  OVERLAY_SERVICE,
  SOUM_LAYER_URL,
  type Mode,
  type Overlay,
} from "@/lib/riskConfig";
import styles from "./RiskMap.module.css";

const HOME = { center: [103.8, 46.9], zoom: 5 };
const CLASSES = [1, 2, 3, 4, 5];

type Props = {
  mode: Mode;
  hazard: string;
  field: string;
  showNoExp: boolean;
  matchedIds: number[] | null; // null = no filter
  overlays: string[];
  selectedFid: number | null;
  onSelect: (fid: number | null) => void;
  focus: { ids: number[] | null; key: number };
};

function soumRenderer(field: string, showNoExp: boolean) {
  const fill = (color: string) =>
    new SimpleFillSymbol({
      color,
      outline: { color: [255, 255, 255, 0.9], width: 0.5 },
    });
  return new UniqueValueRenderer({
    field,
    defaultSymbol: fill(NODATA_COLOR),
    uniqueValueInfos: [
      ...(showNoExp ? [{ value: 0, symbol: fill(NOEXP_COLOR) }] : []),
      ...CLASSES.map((c) => ({ value: c, symbol: fill(CLASS_COLORS[c]) })),
    ],
  });
}

function overlaySymbol(o: Overlay, color: string, neutral: boolean) {
  return o.geometry === "line"
    ? new SimpleLineSymbol({ color, width: neutral ? 1.2 : 2 })
    : new SimpleMarkerSymbol({
        color,
        size: neutral ? 5 : 7,
        outline: { color: neutral ? "#ffffff" : "#1a1f24", width: 0.6 },
      });
}

function overlayRenderer(o: Overlay, field: string | null) {
  if (!field)
    return new SimpleRenderer({ symbol: overlaySymbol(o, "#0f2a44", true) });
  return new UniqueValueRenderer({
    field,
    defaultSymbol: overlaySymbol(o, "#8a96a3", true),
    uniqueValueInfos: CLASSES.map((c) => ({
      value: c,
      symbol: overlaySymbol(o, CLASS_COLORS[c], false),
    })),
  });
}

export default function RiskMap({
  mode,
  hazard,
  field,
  showNoExp,
  matchedIds,
  overlays,
  selectedFid,
  onSelect,
  focus,
}: Props) {
  const mapRef = useRef<HTMLArcgisMapElement | null>(null);
  const [view, setView] = useState<MapView | null>(null);
  const [layerView, setLayerView] = useState<FeatureLayerView | null>(null);
  const onSelectRef = useRef(onSelect);
  useEffect(() => {
    onSelectRef.current = onSelect;
  });

  const soumLayer = useMemo(
    () =>
      new FeatureLayer({
        url: SOUM_LAYER_URL,
        outFields: ["fid"],
        popupEnabled: false,
        opacity: 0.82,
      }),
    [],
  );
  const overlayLayers = useRef(new Map<string, FeatureLayer>());

  // Add the soum layer and wire map clicks once the view is ready.
  useEffect(() => {
    if (!view) return;
    view.map?.add(soumLayer, 0);
    let alive = true;
    view.whenLayerView(soumLayer).then((lv) => {
      if (alive) setLayerView(lv);
    });
    const click = view.on("click", async (event) => {
      const hit = await view.hitTest(event, { include: [soumLayer] });
      const g = hit.results.find((r) => r.type === "graphic");
      onSelectRef.current(
        g && g.type === "graphic" ? (g.graphic.attributes.fid as number) : null,
      );
    });
    return () => {
      alive = false;
      click.remove();
    };
  }, [view, soumLayer]);

  useEffect(() => {
    soumLayer.set("renderer", soumRenderer(field, showNoExp));
  }, [soumLayer, field, showNoExp]);

  // Dim soums that do not match the filters.
  useEffect(() => {
    if (!layerView) return;
    layerView.set(
      "featureEffect",
      matchedIds
        ? new FeatureEffect({
            filter: new FeatureFilter(
              matchedIds.length ? { objectIds: matchedIds } : { where: "1=0" },
            ),
            excludedEffect: "grayscale(100%) opacity(18%)",
          })
        : null,
    );
  }, [layerView, matchedIds]);

  useEffect(() => {
    if (!layerView || selectedFid == null) return;
    const h = layerView.highlight(selectedFid);
    return () => h.remove();
  }, [layerView, selectedFid]);

  useEffect(() => {
    if (!view || focus.key === 0) return;
    if (!focus.ids) {
      view.goTo(HOME).catch(() => {});
      return;
    }
    soumLayer
      .queryExtent({ objectIds: focus.ids })
      .then((r) => {
        if (r.extent) return view.goTo(r.extent.expand(1.25));
      })
      .catch(() => {});
  }, [view, soumLayer, focus]);

  // Element point / line layers.
  useEffect(() => {
    if (!view?.map) return;
    const map = view.map;
    const wanted = new Set(overlays.map((el) => `${mode}:${el}`));
    for (const [key, layer] of overlayLayers.current) {
      if (!wanted.has(key)) {
        map.remove(layer);
        overlayLayers.current.delete(key);
      }
    }
    for (const o of OVERLAYS[mode]) {
      const key = `${mode}:${o.el}`;
      if (!wanted.has(key)) continue;
      let layer = overlayLayers.current.get(key);
      if (!layer) {
        layer = new FeatureLayer({
          url: `${OVERLAY_SERVICE[mode]}/${o.layerId}`,
          outFields: ["*"],
          renderer: overlayRenderer(o, null),
        });
        overlayLayers.current.set(key, layer);
        map.add(layer);
      }
      const target = layer;
      target
        .load()
        .then(() => {
          const has = (n: string) => target.fields.some((f) => f.name === n);
          const f = `${hazard}_${o.el}_el`;
          target.renderer = overlayRenderer(o, has(f) ? f : null);
          target.popupTemplate = new PopupTemplate({
            title: `${ELEMENTS[o.el]}${has(o.nameField) ? `: {${o.nameField}}` : ""}`,
            content: [
              {
                type: "fields",
                fieldInfos: HAZARDS.filter((h) =>
                  has(`${h.id}_${o.el}_el`),
                ).map((h) => ({
                  fieldName: `${h.id}_${o.el}_el`,
                  label: h.label,
                })),
              },
            ],
          });
        })
        .catch(() => {});
    }
  }, [view, mode, hazard, overlays]);

  return (
    <arcgis-map
      ref={mapRef}
      className={styles.map}
      basemap="gray-vector"
      center={HOME.center.join(",")}
      zoom={HOME.zoom}
      onarcgisViewReadyChange={() => setView(mapRef.current?.view ?? null)}
    >
      <arcgis-zoom slot="top-left" />
      <arcgis-home slot="top-left" />
      <arcgis-basemap-toggle slot="bottom-left" next-basemap="hybrid" />
      <arcgis-expand
        slot="top-right"
        expand-tooltip="Суурь зураг"
        collapse-tooltip="Хаах"
      >
        <arcgis-basemap-gallery />
      </arcgis-expand>
      <div slot="bottom-right" className={styles.legend}>
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
