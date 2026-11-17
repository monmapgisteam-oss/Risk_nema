const BASE = "https://arcgis.ubhub.mn/arcgis/rest/services/Hosted";

export const SOUM_LAYER_URL = `${BASE}/NEMA_VulExp_bySoum_Full/FeatureServer/0`;
export const OVERLAY_SERVICE = {
  v: `${BASE}/Vul_risk/FeatureServer`,
  e: `${BASE}/exp_risk/FeatureServer`,
} as const;

export type Mode = "v" | "e";
export const MODES: { id: Mode; label: string }[] = [
  { id: "v", label: "Эмзэг байдал" },
  { id: "e", label: "Өртөх байдал" },
];

export const HAZARDS = [
  { id: "all", label: "Нийт" },
  { id: "eq", label: "Газар хөдлөлт" },
  { id: "ds", label: "Шороон шуурга" },
  { id: "ws", label: "Салхин шуурга" },
  { id: "ss", label: "Цасан шуурга" },
  { id: "dr", label: "Ган" },
  { id: "dz", label: "Зуд" },
  { id: "fl", label: "Үер" },
  { id: "wf", label: "Түймэр" },
  { id: "zd", label: "Зооноз" },
  { id: "lt", label: "Аянга" },
] as const;
export type HazardId = (typeof HAZARDS)[number]["id"];

export const hazardLabel = (id: string) =>
  HAZARDS.find((h) => h.id === id.toLowerCase())?.label ?? id;

export const ELEMENTS: Record<string, string> = {
  com: "Суурин газар",
  hh: "Өрх",
  pop: "Хүн ам",
  hsar: "Орон сууц (талбай)",
  hsdw: "Орон сууц (төрөл)",
  edu: "Боловсрол",
  hlth: "Эрүүл мэнд",
  brdg: "Гүүр",
  culv: "Хоолой",
  gas: "ШТС",
  wh: "Агуулах",
  term: "Терминал",
  cmf: "Холбооны байгууламж",
  trf: "Дэд станц",
  cult: "Соёлын өв",
  mine: "Уурхай",
  road: "Улсын зам",
  pwr: "Цахилгааны шугам",
  comm: "Холбооны шугам",
  farm: "Тариалангийн талбай",
  past: "Бэлчээр",
  crop: "Ургац",
  crhh: "Тариаланч өрх",
  cren: "Тариалангийн ААН",
  ls: "Мал",
  ent: "Аж ахуйн нэгж",
  mnts: "Засвар үйлчилгээ",
  brdp: "Хилийн боомт",
  rail: "Төмөр зам",
};

/** Class 1–5 colours; 0 = no exposure; null = no data. */
export const CLASS_COLORS: Record<number, string> = {
  1: "#1a9850",
  2: "#a6d96a",
  3: "#fee08b",
  4: "#f46d43",
  5: "#d73027",
};
export const NOEXP_COLOR = "#cfd6dd";
export const NODATA_COLOR = "#eef1f4";
export const CLASS_LABELS: Record<number, string> = {
  0: "Өртөлтгүй",
  1: "Маш бага",
  2: "Бага",
  3: "Дунд",
  4: "Өндөр",
  5: "Маш өндөр",
};

export type Overlay = {
  el: string;
  layerId: number;
  geometry: "point" | "line";
  nameField: string;
};

/** Point / line element layers of the Vul_risk and exp_risk services. */
export const OVERLAYS: Record<Mode, Overlay[]> = {
  v: [
    { el: "edu", layerId: 1, geometry: "point", nameField: "name_mon" },
    { el: "trf", layerId: 0, geometry: "point", nameField: "station_na" },
    { el: "brdg", layerId: 3, geometry: "point", nameField: "bridgename" },
    { el: "culv", layerId: 2, geometry: "point", nameField: "cul_type" },
    { el: "road", layerId: 4, geometry: "line", nameField: "roadname" },
  ],
  e: [
    { el: "edu", layerId: 6, geometry: "point", nameField: "name_mon" },
    { el: "hlth", layerId: 4, geometry: "point", nameField: "name" },
    { el: "trf", layerId: 0, geometry: "point", nameField: "station_na" },
    { el: "gas", layerId: 5, geometry: "point", nameField: "name_of_st" },
    { el: "term", layerId: 1, geometry: "point", nameField: "name_mon" },
    { el: "cmf", layerId: 9, geometry: "point", nameField: "type" },
    { el: "cult", layerId: 8, geometry: "point", nameField: "name" },
    { el: "mine", layerId: 3, geometry: "point", nameField: "areaname" },
    { el: "brdg", layerId: 11, geometry: "point", nameField: "bridgename" },
    { el: "culv", layerId: 7, geometry: "point", nameField: "cul_type" },
    { el: "mnts", layerId: 2, geometry: "point", nameField: "azza_name" },
    { el: "brdp", layerId: 10, geometry: "point", nameField: "name" },
    { el: "road", layerId: 12, geometry: "line", nameField: "roadname" },
    { el: "rail", layerId: 14, geometry: "line", nameField: "name" },
  ],
};

export type SoumRow = Record<string, string | number | null> & { fid: number };

export type Filters = {
  mode: Mode;
  hazard: HazardId;
  element: string; // "" = hazard score
  classes: number[]; // empty = all
  otherClasses: number[]; // class of the other indicator, empty = all
  aimag: string; // aimag_code, "" = all
  q: string;
  topHaz: string; // "" = all
  minHigh: number;
};

export const DEFAULT_FILTERS: Filters = {
  mode: "v",
  hazard: "all",
  element: "",
  classes: [],
  otherClasses: [],
  aimag: "",
  q: "",
  topHaz: "",
  minHigh: 0,
};

/** Field holding the class that is drawn on the map. */
export const classField = (f: Pick<Filters, "mode" | "hazard" | "element">) =>
  f.element && f.hazard !== "all"
    ? `${f.hazard}_${f.element}_${f.mode}`
    : `${f.hazard}_${f.mode}_cls`;

export const scoreField = (f: Pick<Filters, "mode" | "hazard">) =>
  `${f.hazard}_${f.mode}_sc`;

/** Elements available per mode and hazard, derived from the layer's field names. */
export function elementCombos(row: SoumRow | undefined) {
  const out: Record<string, string[]> = {};
  if (!row) return out;
  for (const k of Object.keys(row)) {
    const m = /^([a-z]{2})_([a-z]+)_(v|e)$/.exec(k);
    if (m && ELEMENTS[m[2]]) (out[`${m[3]}:${m[1]}`] ??= []).push(m[2]);
  }
  return out;
}

export function applyFilters(rows: SoumRow[], f: Filters): SoumRow[] {
  const cf = classField(f);
  const other = `${f.hazard}_${f.mode === "v" ? "e" : "v"}_cls`;
  const q = f.q.trim().toLowerCase();
  return rows.filter((r) => {
    if (f.classes.length && !f.classes.includes(r[cf] as number)) return false;
    if (f.otherClasses.length && !f.otherClasses.includes(r[other] as number))
      return false;
    if (f.aimag && r.aimag_code !== f.aimag) return false;
    if (f.topHaz && r[`top_${f.mode}_haz`] !== f.topHaz) return false;
    if (f.minHigh && ((r[`n_${f.mode}_high`] as number) ?? 0) < f.minHigh)
      return false;
    if (
      q &&
      !String(r.soum_name ?? "").toLowerCase().includes(q) &&
      !String(r.s_name_eng ?? "").toLowerCase().includes(q)
    )
      return false;
    return true;
  });
}
