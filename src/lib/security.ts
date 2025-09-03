import { getLiveSecurityForAirport, estimateByHour } from "./live";

export type SecuritySource = "override" | "catsa" | "tsa" | "heuristic";
export type SecurityWaitResult = { minutes: number; source: SecuritySource; detail?: string };

/** Legacy wrapper used by schedule-based prediction (hour-of-day baseline w/ trusted-traveler) */
export function estimateSecurityWaitMinutes(
  airportIata: string,
  depLocalISO: string,
  trustedTraveler?: boolean
): number {
  return estimateByHour(airportIata, depLocalISO, trustedTraveler);
}

/** Best available security wait (override -> live -> heuristic) */
export async function getSecurityWaitMinutes(
  airportIata: string,
  depLocalISO: string,
  trustedTraveler?: boolean,
  overrideMin?: number
): Promise<SecurityWaitResult> {
  // 1) explicit override wins
  if (typeof overrideMin === "number" && overrideMin >= 0) {
    let m = Math.max(5, Math.round(overrideMin));
    if (trustedTraveler) m = Math.max(5, Math.round(m * 0.65));
    return { minutes: Math.min(90, m), source: "override" };
  }

  // 2) live sources
  const live = await getLiveSecurityForAirport(airportIata);
  if (live?.minutes) {
    let m = live.minutes;
    if (trustedTraveler) m = Math.max(5, Math.round(m * 0.65));
    const src: SecuritySource = live.source === "catsa" ? "catsa" : "tsa";
    return { minutes: Math.min(90, Math.max(5, m)), source: src, detail: live.detail };
  }

  // 3) heuristic fallback by hour
  const minutes = estimateByHour(airportIata, depLocalISO, trustedTraveler);
  return { minutes: Math.min(90, Math.max(5, minutes)), source: "heuristic", detail: "by-hour baseline" };
}
