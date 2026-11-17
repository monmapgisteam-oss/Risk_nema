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

`VulExp_bySoum_AllHazards` (339 сум × 10 аюул × V/E) өгөгдөл feature service болж
publish хийгдэх хүртэл shapefile → GeoJSON хувиргалтаар түр холбогдоно.
