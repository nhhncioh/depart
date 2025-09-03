function partsToIso(parts: Intl.DateTimeFormatPart[]) {
  const get = (t: string) => parts.find(p => p.type === t)?.value ?? "";
  const yyyy = get("year");
  const mm   = get("month").padStart(2, "0");
  const dd   = get("day").padStart(2, "0");
  const hh   = get("hour").padStart(2, "0");
  const mi   = get("minute").padStart(2, "0");
  return `${yyyy}-${mm}-${dd}T${hh}:${mi}`;
}

/** Format a UTC instant (ms) into local wall time string for a given IANA tz */
export function toLocalYMDHM(instantMs: number, timeZone: string): string {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone, year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hour12: false
  });
  // @ts-ignore formatToParts exists at runtime
  return partsToIso(fmt.formatToParts(new Date(instantMs)));
}

/** Build a local ±(mins) window around a base ISO time (which may include Z) */
export function localWindowAround(baseIso: string, timeZone: string, halfWindowMinutes = 355) {
  const base = new Date(baseIso); // treat as an instant
  const delta = halfWindowMinutes * 60 * 1000;
  return {
    fromLocal: toLocalYMDHM(base.getTime() - delta, timeZone),
    toLocal:   toLocalYMDHM(base.getTime() + delta, timeZone),
  };
}
