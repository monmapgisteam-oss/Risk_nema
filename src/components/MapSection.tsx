"use client";

import dynamic from "next/dynamic";
import styles from "./MapSection.module.css";

// ArcGIS map components are browser-only custom elements, so the map
// is loaded on the client without server-side rendering.
const RiskMap = dynamic(() => import("./RiskMap"), {
  ssr: false,
  loading: () => (
    <div className={styles.loading} role="status">
      Карт ачаалж байна…
    </div>
  ),
});

export default function MapSection() {
  return <RiskMap />;
}
