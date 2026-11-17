import styles from "./page.module.css";
import MapSection from "@/components/MapSection";
import Image from "next/image";

export default function Home() {
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.brand}>
          <Image
            className={styles.brandLogo}
            src="/nema-logo.png"
            alt="ОБЕГ"
            width={176}
            height={150}
            priority
          />
          <span className={styles.brandName}>
            Онцгой байдлын
            <br />
            ерөнхий газар
          </span>
        </div>
        <span className={styles.headerDivider} />
        <div id="header-slot" className={styles.headerSlot} />
      </header>
      <main className={styles.mapSection} aria-label="Вэб карт">
        <MapSection />
      </main>
    </div>
  );
}
