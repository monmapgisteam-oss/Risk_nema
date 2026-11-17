import Color from "@arcgis/core/Color";
import SimpleRenderer from "@arcgis/core/renderers/SimpleRenderer";
import UniqueValueRenderer from "@arcgis/core/renderers/UniqueValueRenderer";
import SizeVariable from "@arcgis/core/renderers/visualVariables/SizeVariable";
import CIMSymbol from "@arcgis/core/symbols/CIMSymbol";
import PictureMarkerSymbol from "@arcgis/core/symbols/PictureMarkerSymbol";
import SimpleFillSymbol from "@arcgis/core/symbols/SimpleFillSymbol";
import type { FillStyle } from "@arcgis/core/symbols/types";
import { ICON_PATHS, type IconName } from "./iconPaths";
import {
  CLASS_COLORS,
  CLASS_LABELS,
  NODATA_COLOR,
  NOEXP_COLOR,
  overlayLabel,
  type Overlay,
} from "./riskConfig";

type Appearance = { icon: IconName; color: string; fill?: FillStyle };

// Geometry and glyph identify the object type; the ring/fill color carries
// the risk class when a classification field exists for the chosen hazard.
const APPEARANCES: Record<string, Appearance> = {
  edu: { icon: "school", color: "#6d57aa" },
  hlth: { icon: "hospital", color: "#bd4b75" },
  trf: { icon: "lt", color: "#b57922" },
  brdg: { icon: "bridge", color: "#277f85" },
  culv: { icon: "pipe", color: "#478db0" },
  gas: { icon: "fuel", color: "#b66b46" },
  term: { icon: "warehouse", color: "#596d98" },
  cmf: { icon: "tower", color: "#8664a4" },
  cult: { icon: "landmark", color: "#a16a83" },
  mine: { icon: "pickaxe", color: "#8c7057" },
  mnts: { icon: "wrench", color: "#577a81" },
  brdp: { icon: "gate", color: "#526e9f" },
  road: { icon: "road", color: "#597c9b" },
  rail: { icon: "train", color: "#7f638b" },
  com: { icon: "building", color: "#7f6da5", fill: "solid" },
  hh: { icon: "home", color: "#b1765c", fill: "forward-diagonal" },
  pop: { icon: "users", color: "#55899f", fill: "backward-diagonal" },
  hsar: { icon: "building", color: "#9a698d", fill: "horizontal" },
  hsdw: { icon: "home", color: "#94794c", fill: "vertical" },
  farm: { icon: "wheat", color: "#a48b3d", fill: "vertical" },
  past: { icon: "grass", color: "#5e8b73", fill: "horizontal" },
  crop: { icon: "wheat", color: "#b08d4d", fill: "vertical" },
  crhh: { icon: "home", color: "#9f795c", fill: "cross" },
  cren: { icon: "building", color: "#8a8760", fill: "diagonal-cross" },
  ls: { icon: "livestock", color: "#697e65", fill: "cross" },
  ent: { icon: "building", color: "#717e9e", fill: "diagonal-cross" },
};

const FALLBACK: Appearance = {
  icon: "layers",
  color: "#59758d",
  fill: "solid",
};
const appearance = (o: Overlay) => APPEARANCES[o.el] ?? FALLBACK;

export const overlayBaseColor = (o: Overlay): string => appearance(o).color;

const svgUrl = (content: string) =>
  `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">${content}</svg>`,
  )}`;

const markerSvg = (o: Overlay, color: string) =>
  svgUrl(
    `<circle cx="16" cy="16" r="14.5" fill="#fff" stroke="#263e55" stroke-opacity=".35" stroke-width=".8"/>` +
      `<circle cx="16" cy="16" r="12.2" fill="#fff" stroke="${color}" stroke-width="3"/>` +
      `<path d="${ICON_PATHS[appearance(o).icon]}" transform="translate(7 7) scale(.75)" fill="none" stroke="#243e55" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"/>`,
  );

function lineAppearance(o: Overlay): {
  width: number;
  dash: string;
} {
  if (o.el === "rail")
    return o.id.endsWith("_sec")
      ? { width: 1.7, dash: "5 3 1 3" }
      : { width: 2.3, dash: "9 3 1 3" };
  return o.id.endsWith("_sec")
    ? { width: 1.6, dash: "5 3" }
    : { width: 2.2, dash: "" };
}

const withAlpha = (color: string, alpha: number) => {
  const result = new Color(color);
  result.a = alpha;
  return result;
};

export function overlaySymbol(o: Overlay, color: string) {
  if (o.geometry === "point")
    return new PictureMarkerSymbol({
      url: markerSvg(o, color),
      width: "18px",
      height: "18px",
    });

  if (o.geometry === "line") {
    const { width, dash } = lineAppearance(o);
    const c = new Color(color);
    return new CIMSymbol({
      data: {
        type: "CIMSymbolReference",
        symbol: {
          type: "CIMLineSymbol",
          // CIM draws the first symbol layer on top. The light casing keeps
          // class-colored roads distinct from the same-colored soum fills.
          symbolLayers: [
            {
              type: "CIMSolidStroke",
              enable: true,
              width,
              color: [c.r, c.g, c.b, Math.round(c.a * 255)],
              capStyle: "Round",
              joinStyle: "Round",
              ...(dash
                ? {
                    effects: [
                      {
                        type: "CIMGeometricEffectDashes" as const,
                        dashTemplate: dash.split(" ").map(Number),
                        lineDashEnding: "NoConstraint" as const,
                      },
                    ],
                  }
                : {}),
            },
            {
              type: "CIMSolidStroke",
              enable: true,
              width: width + 1.8,
              color: [255, 255, 255, 255],
              capStyle: "Round",
              joinStyle: "Round",
            },
          ],
        },
      },
    });
  }

  const style = appearance(o).fill ?? "solid";
  return new SimpleFillSymbol({
    style,
    color: withAlpha(color, style === "solid" ? 0.2 : 0.48),
    outline: { color: withAlpha(color, 0.88), width: 0.9 },
  });
}

export function overlayRenderer(o: Overlay, field: string | null) {
  // Small marks at national scale, readable icons when zoomed into a soum.
  const visualVariables =
    o.geometry === "point"
      ? [
          new SizeVariable({
            valueExpression: "$view.scale",
            stops: [
              { value: 100_000, size: "24px" },
              { value: 750_000, size: "20px" },
              { value: 3_000_000, size: "14px" },
              { value: 12_000_000, size: "9px" },
            ],
            legendOptions: { showLegend: false },
          }),
        ]
      : [];
  if (!field)
    return new SimpleRenderer({
      visualVariables,
      symbol: overlaySymbol(o, overlayBaseColor(o)),
      label: overlayLabel(o),
    });

  return new UniqueValueRenderer({
    visualVariables,
    field,
    defaultLabel: "Өгөгдөлгүй",
    defaultSymbol: overlaySymbol(
      o,
      o.geometry === "polygon" ? NODATA_COLOR : "#8a96a3",
    ),
    legendOptions: { title: overlayLabel(o) },
    uniqueValueInfos: [
      ...(o.geometry === "polygon"
        ? [
            {
              value: 0,
              label: CLASS_LABELS[0],
              symbol: overlaySymbol(o, NOEXP_COLOR),
            },
          ]
        : []),
      ...[1, 2, 3, 4, 5].map((c) => ({
        value: c,
        label: CLASS_LABELS[c],
        symbol: overlaySymbol(o, CLASS_COLORS[c]),
      })),
    ],
  });
}

const HATCH_PATHS: Partial<Record<FillStyle, string>> = {
  "forward-diagonal": "M-2 2 2-2M0 8 8 0M6 10 10 6",
  "backward-diagonal": "M-2 6 2 10M0 0 8 8M6-2 10 2",
  horizontal: "M0 4h8",
  vertical: "M4 0v8",
  cross: "M0 4h8M4 0v8",
  "diagonal-cross": "M0 0 8 8M0 8 8 0",
};

/** Compact SVG preview of the same type symbol used by the map renderer. */
export function overlayLegendSvg(o: Overlay): string {
  const color = overlayBaseColor(o);
  if (o.geometry === "point") return markerSvg(o, color);
  if (o.geometry === "line") {
    const { width, dash } = lineAppearance(o);
    const svgDash = dash
      .split(" ")
      .map((n) => (Number(n) * 4) / 3)
      .join(" ");
    return svgUrl(
      `<path d="M3 22 12 12 20 18 29 8" fill="none" stroke="#fff" stroke-width="${((width + 1.8) * 4) / 3}" stroke-linecap="round" stroke-linejoin="round"/>` +
        `<path d="M3 22 12 12 20 18 29 8" fill="none" stroke="${color}" stroke-width="${(width * 4) / 3}" stroke-linecap="round" stroke-linejoin="round"${dash ? ` stroke-dasharray="${svgDash}"` : ""}/>`,
    );
  }
  const style = appearance(o).fill ?? "solid";
  const path = HATCH_PATHS[style];
  const pattern = path
    ? `<defs><pattern id="hatch" width="8" height="8" patternUnits="userSpaceOnUse"><path d="${path}" fill="none" stroke="${color}" stroke-opacity=".48" stroke-width="1"/></pattern></defs>`
    : "";
  return svgUrl(
    `${pattern}<rect x="4" y="5" width="24" height="22" rx="1" fill="${path ? "url(#hatch)" : color}"${path ? "" : ' fill-opacity=".2"'} stroke="${color}" stroke-opacity=".88" stroke-width="1.2"/>`,
  );
}
