import { capacityTierFor, saturationFor, CapacityTier } from "./airports";
import { fetchDeparturesByLocalRange } from "./aerodatabox";
import { estimateSecurityWaitMinutes } from "./security";
import { iataToIcao } from "./icao";
import { timeZoneForIata } from "./airportTimeZones";
import { localWindowAround } from "./time";

/** Internal (raw) busyness */
export type ScheduleBusyness = {
  departuresInWindow: number;   // 0 when none
  busynessPercent: number;      // 1..100 for schedule/heuristic (never 0 to avoid falsy UI)
  source: "schedule+load" | "heuristic";
  note?: string;
};

function clamp(n: number, lo: number, hi: number) { return Math.min(hi, Math.max(lo, n)); }

function normalizeISO(s: string): string {
  let t = (s || "").trim();
  t = t.replace(/^(\d{4}-\d{2}-\d{2})\s+/, "$1T");
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(t)) t += ":00";
  return t;
}

function pickStr(v: any): string | null {
  if (!v) return null;
  if (typeof v === "string") return normalizeISO(v);
  if (typeof v === "object") {
    return pickStr(v.local) || pickStr(v.utc) || null;
  }
  return null;
}

/** Try many realistic paths that ADB returns across endpoints/tiers */
function pickDepartureISO(f: any): string | null {
  const tryPaths = [
    ["movement","scheduledTimeLocal"],
    ["movement","scheduledTimeUtc"],
    ["movement","scheduledTime"],
    ["departure","scheduledTimeLocal"],
    ["departure","scheduledTimeUtc"],
    ["departure","scheduledTime"],
    ["time","scheduled","departure","local"],
    ["time","scheduled","departure","utc"],
    ["times","scheduled","departure","local"],
    ["times","scheduled","departure","utc"],
    ["schedule","departure","local"],
    ["schedule","departure","utc"],
    ["scheduled","departure","local"],
    ["scheduled","departure","utc"],
  ];
  for (const p of tryPaths) {
    let node: any = f;
    for (const k of p) { if (node == null) break; node = node[k]; }
    const s = pickStr(node);
    if (s) return s;
  }
  for (const k of Object.keys(f || {})) {
    const s = pickStr((f as any)[k]);
    if (typeof s === "string" && /\d{4}-\d{2}-\d{2}T?\d{2}:\d{2}/.test(s)) return s;
  }
  return null;
}

function withinMinutes(aISO: string, bISO: string, windowMin: number): boolean {
  const a = new Date(normalizeISO(aISO)).getTime();
  const b = new Date(normalizeISO(bISO)).getTime();
  if (!Number.isFinite(a) || !Number.isFinite(b)) return false;
  return Math.abs(a - b) / 60000 <= windowMin;
}

function hourOfLocal(iso: string): number {
  const d = new Date(normalizeISO(iso));
  return Number.isFinite(d.getTime()) ? d.getHours() : 12;
}

/** Hour-of-day curve -> 0..100, nudged by capacity tier */
function hourlyPercentHeuristic(depLocalISO: string, tier: CapacityTier): number {
  const h = hourOfLocal(depLocalISO);
  let base =
    (h >= 5 && h < 7)  ? 60 :
    (h >= 7 && h < 10) ? 75 :
    (h >= 10 && h < 13)? 60 :
    (h >= 13 && h < 16)? 65 :
    (h >= 16 && h < 19)? 75 :
    (h >= 19 && h < 22)? 50 :
                         25;
  const tierBump = { micro: -10, small: -5, medium: 0, large: 5, mega: 10 } as Record<CapacityTier, number>;
  base = clamp(base + (tierBump[tier] ?? 0), 0, 100);
  return base;
}

/** Busyness using ADB LOCAL ±5h55m window around the requested time; robust time parsing.
 *  If ADB returns flights but none fall within ±windowMin, we fall back to hour-of-day heuristic.
 */
export async function getScheduleBusyness(
  airportIata: string,
  depLocalISO: string,
  windowMin = 90
): Promise<ScheduleBusyness> {
  const icao = iataToIcao(airportIata);
  const tier = capacityTierFor(airportIata);
  const tz   = timeZoneForIata(airportIata) || "UTC";

  if (!icao) {
    const pct = hourlyPercentHeuristic(depLocalISO, tier);
    const shown = clamp(Math.max(1, Math.round(pct)), 1, 100);
    console.warn("[SCHED] no ICAO mapping — heuristic", { airportIata, shown });
    return { departuresInWindow: 0, busynessPercent: shown, source: "heuristic", note: "no ICAO mapping" };
  }

  const { fromLocal, toLocal } = localWindowAround(depLocalISO, tz, 355);
  const list = await fetchDeparturesByLocalRange(icao, fromLocal, toLocal);

  if (!list || list.length === 0) {
    const pct = hourlyPercentHeuristic(depLocalISO, tier);
    const shown = clamp(Math.max(1, Math.round(pct)), 1, 100);
    console.warn("[SCHED] empty/no ADB schedule — heuristic", { icao, fromLocal, toLocal, tz, shown });
    return { departuresInWindow: 0, busynessPercent: shown, source: "heuristic", note: "no schedule data" };
  }

  const times = list.map((f: any) => pickDepartureISO(f)).filter(Boolean) as string[];
  if (times.length === 0) {
    const pct = hourlyPercentHeuristic(depLocalISO, tier);
    const shown = clamp(Math.max(1, Math.round(pct)), 1, 100);
    console.warn("[SCHED] flights with unrecognized time fields — heuristic", {
      icao, fromLocal, toLocal, tz, samples: Object.keys(list[0] || {})
    });
    return { departuresInWindow: 0, busynessPercent: shown, source: "heuristic", note: "unrecognized time fields" };
  }

  const inWindow = times.filter((when) => withinMinutes(when, depLocalISO, windowMin));
  const count = inWindow.length;

  if (count === 0) {
    const pct = hourlyPercentHeuristic(depLocalISO, tier);
    const shown = clamp(Math.max(1, Math.round(pct)), 1, 100);
    console.warn("[SCHED] flights present but none within ±window — heuristic", {
      icao, depLocalISO, windowMin, total: list.length, sample: times.slice(0,3)
    });
    return { departuresInWindow: 0, busynessPercent: shown, source: "heuristic", note: "no flights within window" };
  }

  const sat   = saturationFor(tier);
  const rawPercent = clamp(Math.round((count / sat) * 100), 0, 100);
  const shown = clamp(rawPercent === 0 ? 1 : rawPercent, 1, 100);

  console.info("[SCHED] schedule window", { airportIata, icao, tz, fromLocal, toLocal, count, windowMin, percent: shown });
  return { departuresInWindow: count, busynessPercent: shown, source: "schedule+load", note: "schedule+load" };
}

/** Legacy shape compute.ts expects */
type LegacyBusynessOut = { source: string; count: number; score: number; capacityTier: CapacityTier; windowMin: number; };

function toLegacyBusyness(airportIata: string, sb: ScheduleBusyness, windowMin: number): LegacyBusynessOut {
  const tier = capacityTierFor(airportIata);
  return {
    source: sb.source,
    count: sb.departuresInWindow,
    score: sb.busynessPercent,
    capacityTier: tier,
    windowMin,
  };
}

export async function predictSecurityFromScheduleWithLoad(
  airportOrObj: any,
  depMaybe?: string,
  optsMaybe?: any
): Promise<{ minutes: number; detail: string; busyness: LegacyBusynessOut; meta: any }> {
  const WINDOW = 90;

  let airport = "";
  let depLocalISO = "";
  let options: any = {};
  if (typeof airportOrObj === "string") {
    airport = airportOrObj;
    depLocalISO = String(depMaybe);
    options = optsMaybe || {};
  } else if (airportOrObj && typeof airportOrObj === "object") {
    airport = airportOrObj.airport || airportOrObj.airportIata || "";
    depLocalISO = airportOrObj.depLocalISO || airportOrObj.depTimeLocalISO || "";
    options = airportOrObj.options || {};
  }

  const base = estimateSecurityWaitMinutes(airport, depLocalISO, !!options?.trustedTraveler);
  const sb = await getScheduleBusyness(airport, depLocalISO, WINDOW);
  const legacy = toLegacyBusyness(airport, sb, WINDOW);

  // map 1..100 busyness -> ~0.9x..1.3x multiplier (more conservative scaling)
  // Normal airport traffic shouldn't dramatically increase security times for planning
  const factor = 0.9 + (sb.busynessPercent / 100) * 0.4;
  const minutes = clamp(Math.round(base * factor), 5, 90);

  // Human label from % busyness
  const label =
    sb.busynessPercent >= 91 ? "peak" :
    sb.busynessPercent >= 71 ? "heavy" :
    sb.busynessPercent >= 41 ? "moderate" : "light";

  // Range multipliers by label (more conservative ranges)
  const range: [number, number] =
    label === "peak"     ? [0.8, 1.4] :
    label === "heavy"    ? [0.8, 1.3] :
    label === "moderate" ? [0.7, 1.2] :
                           [0.6, 1.0];

  const waitLo = clamp(Math.round(minutes * range[0]), 5, 150);
  const waitHi = Math.max(waitLo + 2, clamp(Math.round(minutes * range[1]), 8, 180));

  const deltaTypical = Math.round(minutes - base);
  const deltaPhrase =
    deltaTypical > 3 ? `${deltaTypical} min longer than typical` :
    deltaTypical < -3 ? `${Math.abs(deltaTypical)} min shorter than typical` :
    "about the typical wait";

  const detail =
    sb.source === "schedule+load"
      ? `schedule+load (${sb.busynessPercent}% · ${sb.departuresInWindow} deps in ±${WINDOW}m)`
      : `heuristic (${sb.busynessPercent}% by hour-of-day)`;

  const summary = `Security looks ${label}; expect about ${waitLo}-${waitHi} min (${deltaPhrase}).`;

  return {
    minutes,
    detail,
    busyness: legacy,
    meta: {
      securitySource: "estimate",
      securityDetail: detail,
      busynessPercent: sb.busynessPercent,     // guaranteed >= 1
      busynessLabel: label,
      securityWaitMin: waitLo,
      securityWaitMax: waitHi,
      securityDeltaVsTypicalMin: deltaTypical,
      securitySummary: summary,
      departuresInWindow: sb.departuresInWindow,
      busynessSource: sb.source,
    },
  };
}
