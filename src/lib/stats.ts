import {
  CLASS_COLORS,
  NODATA_COLOR,
  NOEXP_COLOR,
  classField,
  scoreField,
  type Filters,
  type SoumRow,
} from "./riskConfig";

/** Fill colour of a class value (0 = no exposure, null = no data). */
export const colorOf = (c: unknown) =>
  typeof c !== "number"
    ? NODATA_COLOR
    : c === 0
      ? NOEXP_COLOR
      : (CLASS_COLORS[c] ?? NODATA_COLOR);

export const fmt = (v: unknown) =>
  typeof v === "number" && Number.isFinite(v)
    ? Number.isInteger(v)
      ? String(v)
      : v.toFixed(2)
    : "–";

/** Mean of the numeric values of `field`; null when there are none. */
export function mean(rows: SoumRow[], field: string): number | null {
  let sum = 0;
  let n = 0;
  for (const r of rows) {
    const v = r[field];
    if (typeof v === "number") {
      sum += v;
      n++;
    }
  }
  return n ? sum / n : null;
}

/** Field ranked in lists: the class when an element is chosen, else the score. */
export const rankField = (f: Filters) =>
  f.element ? classField(f) : scoreField(f);

export type AimagRank = {
  code: string;
  name: string;
  /** Soums of the aimag. */
  total: number;
  /** Soums of the aimag that pass the non-area filters. */
  matched: number;
  /** Soums in class 4–5 of the drawn indicator. */
  high: number;
  /** Mean of the ranked field over all soums of the aimag. */
  score: number | null;
  /** Rounded mean class, used for the colour swatch. */
  cls: number | null;
};

/**
 * One row per aimag, aggregated from its soums. The score always describes the
 * whole aimag; `matched` tells how many of its soums pass the current
 * (non-area) filters so the list can follow them the same way the soum list does.
 */
export function aimagRanking(
  rows: SoumRow[],
  matchedNoArea: SoumRow[],
  f: Filters,
): AimagRank[] {
  const cf = classField(f);
  const sf = rankField(f);
  const groups = new Map<string, SoumRow[]>();
  for (const r of rows) {
    const code = String(r.aimag_code ?? "");
    if (!code) continue;
    const g = groups.get(code);
    if (g) g.push(r);
    else groups.set(code, [r]);
  }
  const matchedBy = new Map<string, number>();
  for (const r of matchedNoArea) {
    const code = String(r.aimag_code ?? "");
    matchedBy.set(code, (matchedBy.get(code) ?? 0) + 1);
  }
  return [...groups].map(([code, list]) => {
    const meanCls = mean(list, cf);
    return {
      code,
      name: String(list[0].aimag_name ?? code),
      total: list.length,
      matched: matchedBy.get(code) ?? 0,
      high: list.filter((r) => ((r[cf] as number) ?? 0) >= 4).length,
      score: mean(list, sf),
      cls: meanCls == null ? null : Math.round(meanCls),
    };
  });
}
