/** Aerodatabox client — FIDS by LOCAL time range (Tier 2).
 * Endpoint: GET /flights/airports/icao/{icao}/{fromLocal}/{toLocal}
 * Docs mention a 12h maximum window; we use ±355m to stay under 12h.
 */
export type ADBFlight = any;

async function fetchJson(url: string, headers: Record<string, string>) {
  const res = await fetch(url, { headers, cache: "no-store", next: { revalidate: 60 } });
  const text = await res.text();
  try { return { ok: res.ok, status: res.status, body: JSON.parse(text) as any, url }; }
  catch { return { ok: res.ok, status: res.status, body: text as any, url }; }
}

/** Query LOCAL time window already constructed by caller */
export async function fetchDeparturesByLocalRange(
  icao: string,
  fromLocal: string,
  toLocal: string
): Promise<ADBFlight[] | null> {
  const key =
    process.env.AERODATABOX_RAPIDAPI_KEY ||
    process.env.AERODATABOX_RAPID_KEY ||
    process.env.RAPIDAPI_KEY;

  const host = "aerodatabox.p.rapidapi.com";
  if (!key) {
    console.warn("[ADB] Missing API key: set AERODATABOX_RAPIDAPI_KEY (or RAPIDAPI_KEY)");
    return null;
  }
  if (!icao || !fromLocal || !toLocal) {
    console.warn("[ADB] fetchDeparturesByLocalRange: missing params", { icao, fromLocal, toLocal });
    return null;
  }

  const enc = (s: string) => encodeURIComponent(s);
  const base = `https://${host}/flights/airports/icao/${enc(icao)}/${enc(fromLocal)}/${enc(toLocal)}`;
  const q = "direction=Departure&withLeg=true&withCodeshared=true&withCancelled=true&withCargo=false&withPrivate=false&withLocation=false";

  const url = `${base}?${q}`;
  const headers = {
    "X-RapidAPI-Key": key,
    "X-RapidAPI-Host": host,
    "Accept": "application/json",
  };

  const out = await fetchJson(url, headers);
  if (!out.ok) {
    console.warn("[ADB] fetch failed", { status: out.status, url: out.url, body: out.body });
    return null;
  }

  const b: any = out.body;
  if (Array.isArray(b?.departures)) return b.departures;
  if (Array.isArray(b)) return b;
  if (Array.isArray(b?.flights)) return b.flights;
  if (Array.isArray(b?.items)) return b.items;

  console.warn("[ADB] Unrecognized response shape", { url: out.url, keys: b && Object.keys(b) });
  return null;
}
