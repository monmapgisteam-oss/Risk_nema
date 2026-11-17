"use client";

import "@arcgis/map-components/components/arcgis-map";
import "@arcgis/map-components/components/arcgis-zoom";
import "@arcgis/map-components/components/arcgis-home";
import "@arcgis/map-components/components/arcgis-basemap-toggle";
import "@arcgis/map-components/components/arcgis-expand";
import "@arcgis/map-components/components/arcgis-basemap-gallery";
import styles from "./RiskMap.module.css";

/** Approximate centre of Mongolia and a zoom that fits the whole country. */
const MONGOLIA_CENTER = "103.8,46.9";
const INITIAL_ZOOM = 5;

export default function RiskMap() {
  return (
    <arcgis-map
      className={styles.map}
      basemap="topo-vector"
      center={MONGOLIA_CENTER}
      zoom={INITIAL_ZOOM}
    >
      <arcgis-zoom slot="top-left" />
      <arcgis-home slot="top-left" />
      <arcgis-basemap-toggle slot="bottom-left" next-basemap="hybrid" />
      <arcgis-expand
        slot="top-right"
        expand-tooltip="Суурь зургийн цуглуулга"
        collapse-tooltip="Хаах"
      >
        <arcgis-basemap-gallery />
      </arcgis-expand>
    </arcgis-map>
  );
}
