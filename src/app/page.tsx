import styles from "./page.module.css";
import MapSection from "@/components/MapSection";

export default function Home() {
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <span className={styles.badge}>ОБЕГ</span>
        <div className={styles.titles}>
          <h1 className={styles.title}>Аюулт үзэгдлийн эрсдэлийн зураглал</h1>
          <p className={styles.subtitle}>
            Сумын түвшний эмзэг байдал ба өртөх байдал — бүх аюул
          </p>
        </div>
      </header>
      <section className={styles.mapSection} aria-label="Вэб карт">
        <MapSection />
      </section>
    </div>
  );
}
