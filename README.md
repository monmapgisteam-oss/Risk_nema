# Risk_nema — Аюулт үзэгдлийн эрсдэлийн зураглал

Монгол Улсын сумдын түвшинд 10 аюулт үзэгдлийн **эмзэг байдал (Vulnerability)** ба
**өртөх байдал (Exposure)** оноо/ангиллыг харуулах вэб карт.

## Технологи

- [Next.js](https://nextjs.org) (App Router, TypeScript)
- [ArcGIS Maps SDK for JavaScript](https://developers.arcgis.com/javascript/latest/) 5.x —
  `@arcgis/core` + `@arcgis/map-components` (2D карт, basemap toggle, basemap gallery)

## Ажиллуулах

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # production build
npm run lint
```

## Бүтэц

```
src/
  app/
    layout.tsx          # root layout, metadata
    page.tsx            # нэг section: header + карт
  components/
    MapSection.tsx      # картыг client талд (SSR-гүй) ачаална
    RiskMap.tsx         # <arcgis-map> + zoom/home/basemap toggle/basemap gallery
  types/
    arcgis.d.ts         # arcgis-* custom element-үүдийн JSX type
```

## Өгөгдөл (дараагийн шат)

Өгөгдөл `arcgis.ubhub.mn`-ийн feature service-ээс шууд уншигдана (`src/lib/riskConfig.ts`):
`NEMA_VulExp_bySoum_Full` (сумын 339 полигон, будалт ба шүүлтүүр), `Vul_risk` / `exp_risk` (элементийн цэг, шугам давхарга).
