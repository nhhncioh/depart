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

/** Lookup a single flight by flight number and date (local date string yyyy-mm-dd). */
function normalizeDesignator(desig: string): string {
  const raw = (desig || "").toString().trim().toUpperCase().replace(/\s+/g, "");
  const m = raw.match(/^([A-Z]{2,3})(\d{1,4})$/);
  if (!m) return raw;
  const letters = m[1];
  const digits  = String(parseInt(m[2], 10)); // strips leading zeros
  return letters + digits;
}

export async function fetchFlightByNumberOnDate(
  flightNumber: string,
  dateYYYYMMDD: string
): Promise<any | null> {
  const key =
    process.env.AERODATABOX_RAPIDAPI_KEY ||
    process.env.AERODATABOX_RAPID_KEY ||
    process.env.RAPIDAPI_KEY;
  const host = "aerodatabox.p.rapidapi.com";
  if (!key) {
    console.warn("[ADB] Missing API key for flightByNumber");
    return null;
  }
  const num = encodeURIComponent(normalizeDesignator(flightNumber));
  const day = encodeURIComponent(dateYYYYMMDD);
  // dateLocalRole=Departure forces the API to interpret the date as DEPARTURE date, avoiding red-eye mismatches
  const url = `https://${host}/flights/number/${num}/${day}?withLeg=true&withCancelled=true&dateLocalRole=Departure`;
  const headers = {
    "X-RapidAPI-Key": key,
    "X-RapidAPI-Host": host,
    Accept: "application/json",
  } as Record<string, string>;
  try {
    const out = await fetchJson(url, headers);
    if (!out.ok) {
      console.warn("[ADB] flightByNumber failed", { status: out.status, url: out.url });
      return null;
    }
    const b: any = out.body;
    // Common shapes seen: { flights: [...] } or array
    const list: any[] = Array.isArray(b?.flights) ? b.flights : (Array.isArray(b) ? b : []);
    if (!list.length) return null;
    // Robust time extraction across ADB response variants
    const pickStr = (v: any): string | null => {
      if (!v) return null;
      if (typeof v === 'string') return v;
      if (typeof v === 'object') {
        return pickStr(v.local) || pickStr(v.utc) || pickStr(v.time) || null;
      }
      return null;
    };
    const pickTime = (it: any, leg: 'departure'|'arrival', local=true): string | null => {
      const node = it?.[leg] ?? it?.[leg?.toUpperCase?.() ?? leg];
      const candidates = [
        node?.scheduledTimeLocal,
        node?.scheduledTimeUtc,
        node?.scheduledTime,
        node?.times?.scheduled?.[leg]?.local,
        node?.times?.scheduled?.[leg]?.utc,
        it?.movement?.scheduledTimeLocal,
        it?.movement?.scheduledTimeUtc,
        it?.movement?.scheduledTime,
      ];
      for (const c of candidates) {
        const s = pickStr(c);
        if (s) return s;
      }
      return null;
    };
    const toDateStr = (raw?: any): string | null => {
      const s = String(raw||'');
      const m = s.replace(/T/, ' ').match(/^(\d{4}-\d{2}-\d{2})/);
      return m ? m[1] : null;
    };
    const dayKey = dateYYYYMMDD;
    const sameDayLocal = list.filter(it => toDateStr(pickTime(it,'departure',true)) === dayKey);
    const sameDayUtc   = list.filter(it => toDateStr(pickTime(it,'departure',false)) === dayKey);

    const isOperating = (it: any) => {
      const cs = String(it?.codeshareStatus || '').toLowerCase();
      if (cs === 'isoperator' || cs.includes('isoperator') || cs.includes('operat')) return true;
      if (cs.includes('codeshare')) return false;
      if (it?.isCodeshare === false) return true;
      if (it?.operator && (it?.operator?.iata || it?.operator?.icao)) return true;
      return false;
    };

    let pick = sameDayLocal.find(isOperating) || sameDayLocal[0] || sameDayUtc.find(isOperating) || sameDayUtc[0] || null;
    if (pick) return pick;

    // Bullet-proof fallback: query 2-day range and filter client-side to chosen local date
    const nextDay = (()=>{
      const d = new Date(`${dateYYYYMMDD}T00:00:00Z`); d.setUTCDate(d.getUTCDate()+1);
      const y=d.getUTCFullYear(), m=String(d.getUTCMonth()+1).padStart(2,'0'), da=String(d.getUTCDate()).padStart(2,'0');
      return `${y}-${m}-${da}`;
    })();
    const rangeUrl = `https://${host}/flights/number/${num}/${day}/${encodeURIComponent(nextDay)}?withLeg=true&withCancelled=true&dateLocalRole=Departure`;
    const out2 = await fetchJson(rangeUrl, headers);
    if (!out2.ok) return null;
    const b2: any = out2.body;
    const list2: any[] = Array.isArray(b2?.flights) ? b2.flights : (Array.isArray(b2) ? b2 : []);
    const sameDayLocal2 = list2.filter(it => toDateStr(pickTime(it,'departure',true)) === dayKey);
    pick = sameDayLocal2.find(isOperating) || sameDayLocal2[0] || null;
    return pick || null;
  } catch (e) {
    console.warn("[ADB] flightByNumber error", e);
    return null;
  }
}
