export type LiveFetch = { minutes?: number; source?: "catsa" | "tsa-rapidapi" | "tsa" | "estimate"; detail?: string };

// ----------------- Helpers -----------------
function clamp(n: number, lo: number, hi: number) { return Math.min(hi, Math.max(lo, n)); }
function toMs(x: any): number {
  if (typeof x === "number") return x > 2e10 ? x : x * 1000;
  const t = Date.parse(String(x)); return isFinite(t) ? t : 0;
}
function tryParseJsonLoose(txt?: string): any {
  if (!txt) return undefined;
  const t = txt.trim().replace(/^\uFEFF/, "");
  const m = t.match(/^[^(]+\(([\s\S]+)\)\s*;?$/); // JSONP
  const core = m ? m[1] : t;
  try { return JSON.parse(core); } catch { return undefined; }
}

// ----------------- CATSA (Canada) -----------------
const CATSA_SLUG: Record<string, string> = {
  YYZ: "toronto-pearson-international-airport",
  YOW: "ottawa-international-airport",
  YUL: "montreal-trudeau-international-airport",
  YVR: "vancouver-international-airport",
  YYC: "calgary-international-airport",
  YHZ: "halifax-stanfield-international-airport",
  YEG: "edmonton-international-airport",
  YWG: "winnipeg-james-armstrong-richardson-international-airport",
  YQB: "quebec-city-jean-lesage-international-airport",
  YTZ: "billy-bishop-toronto-city-airport",
};
function minutesFromRangeLabel(label: string): number | undefined {
  const t = label.replace(/&nbsp;|&#160;/gi, " ").replace(/&ndash;|&#8211;/gi, "–").replace(/\s+/g, " ").trim();
  const m = t.match(/(\d+)\s*[–-]\s*(\d+)\s*min/i);
  if (m) return Math.max(parseInt(m[1],10), parseInt(m[2],10));
  const s = t.match(/(\d+)\s*min?/i);
  return s ? parseInt(s[1],10) : undefined;
}
function stripHtml(x: string): string {
  return x.replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;|&#160;/gi, " ")
    .replace(/&ndash;|&#8211;/gi, "–")
    .replace(/\s+/g, " ")
    .trim();
}
async function fetchCATSA(iata: string): Promise<LiveFetch | undefined> {
  const slug = CATSA_SLUG[iata.toUpperCase()];
  if (!slug) return;
  const url = "https://www.catsa-acsta.gc.ca/en/airport/" + slug;
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0", "Accept": "text/html,application/xhtml+xml" },
      cache: "no-store", next: { revalidate: 60 },
    });
    if (!res.ok) return;
    const html = await res.text();
    const rows = Array.from(
      html.matchAll(/(?:Wait\s*time|Temps d[’'`]attente)[^<]*<\/th>\s*<td[^>]*>([\s\S]*?)<\/td>/gim)
    ).map(m => stripHtml(m[1]));
    let mins: number[] = rows.map(x => minutesFromRangeLabel(x)).filter((n): n is number => typeof n === "number");
    if (!mins.length) {
      const flat = stripHtml(html);
      const ranges = Array.from(flat.matchAll(/(\d+)\s*(?:–|-)\s*(\d+)\s*min/gi)).map(m => Math.max(parseInt(m[1],10), parseInt(m[2],10)));
      const singles = Array.from(flat.matchAll(/(\d+)\s*min(?![a-z])/gi)).map(m => parseInt(m[1],10));
      mins = [...ranges, ...singles].filter(n => isFinite(n) && n > 0 && n < 180);
    }
    return mins.length ? { minutes: Math.max(...mins), source: "catsa", detail: "catsa-acsta.gc.ca" } : undefined;
  } catch { return; }
}

// ----------------- TSA via RapidAPI aggregator (optional) -----------------
async function fetchTSARapidAPI(iata: string): Promise<LiveFetch | undefined> {
  const key = process.env.RAPIDAPI_KEY;
  const host = process.env.RAPIDAPI_TSA_HOST || "tsa-wait-times.p.rapidapi.com";
  if (!key) return;
  const ap = encodeURIComponent(iata.toUpperCase());

  const variants = [
    `https://${host}/airport?iata=${ap}`,
    `https://${host}/airport/${ap}`,
    `https://${host}/waittimes?airport=${ap}`,
  ];

  for (const url of variants) {
    try {
      const r = await fetch(url, {
        headers: { "X-RapidAPI-Key": key, "X-RapidAPI-Host": host, "Accept": "application/json" },
        cache: "no-store", next: { revalidate: 60 },
      });
      if (!r.ok) continue;
      const json: any = await r.json();
      // Try a few common shapes
      const candidates: number[] = [];
      const pushNum = (v: any) => { const n = Number(v); if (!isNaN(n) && n > 0 && n < 180) candidates.push(n); };

      if (Array.isArray(json)) json.forEach((it) => { pushNum(it?.waitTime ?? it?.minutes ?? it?.estimated ?? it?.value); });
      if (json && typeof json === "object") {
        pushNum(json.waitTime ?? json.minutes ?? json.estimated ?? json.value);
        const list = json.data ?? json.result ?? json.items ?? json.checkpoints;
        if (Array.isArray(list)) list.forEach((it: any) => pushNum(it?.waitTime ?? it?.minutes ?? it?.estimated ?? it?.value));
      }

      if (candidates.length) {
        const minutes = clamp(Math.max(...candidates), 5, 120);
        return { minutes, source: "tsa-rapidapi", detail: host };
      }
    } catch { /* try next variant */ }
  }
  return;
}

// ----------------- TSA via your Worker (optional; may be blocked) -----------------
type TSAWaitItem = {
  Created?: string | number; created?: string | number; Created_Datetime?: string | number; Timestamp?: string | number;
  WaitTime?: number | string; waitTime?: number | string; Status?: string;
  CheckpointWaitTime?: number; AverageWaitTime?: number; AvgWaitTime?: number; Minutes?: number;
};
function mapTSAStatusToMinutes(status?: string): number | undefined {
  if (!status) return;
  const s = status.toLowerCase();
  if (s.includes("not busy")) return 10;
  if (s.includes("moderate")) return 20;
  if (s.includes("busy")) return 30;
  if (s.includes("very busy")) return 45;
}
function mapTSAWaitCategory(val: number): number | undefined {
  if (val >= 1 && val <= 6) return [0,10,20,30,45,60,75][val] ?? undefined;
}
async function fetchTSAWorker(iata: string): Promise<LiveFetch | undefined> {
  const base = process.env.TSA_PROXY_BASE;
  if (!base) return;
  try {
    const r = await fetch(`${base}?ap=${encodeURIComponent(iata.toUpperCase())}`, {
      headers: { "Accept": "application/json,text/javascript,*/*", "User-Agent": "Mozilla/5.0" },
      cache: "no-store", next: { revalidate: 60 },
    });
    if (!r.ok) return;
    const txt = await r.text();
    const json = tryParseJsonLoose(txt);
    if (!json) return;
    const list: TSAWaitItem[] =
      Array.isArray(json) ? json :
      Array.isArray(json.WaitTimes) ? json.WaitTimes :
      Array.isArray(json.Items) ? json.Items :
      Array.isArray(json.Airport?.WaitTimes) ? json.Airport.WaitTimes :
      Array.isArray(json.Data) ? json.Data :
      Array.isArray(json.Result) ? json.Result : [];

    if (!list.length) return;
    const now = Date.now();
    const withTs = list.map(it => ({ it, t: toMs(it.Created ?? it.created ?? it.Created_Datetime ?? it.Timestamp) || 0 }))
                       .sort((a,b)=> b.t - a.t);
    const chosen = withTs[0];
    const ageMin = Math.max(0, Math.round((now - (chosen.t||0)) / 60000));

    const direct = Number(chosen.it.AverageWaitTime ?? chosen.it.AvgWaitTime ?? chosen.it.CheckpointWaitTime ?? chosen.it.Minutes);
    let minutes: number | undefined = (!isNaN(direct) && direct > 0 && direct < 180) ? Math.round(direct) : undefined;
    if (!minutes) {
      const cat = Number(chosen.it.WaitTime ?? chosen.it.waitTime);
      if (!isNaN(cat) && cat > 0) minutes = mapTSAWaitCategory(cat);
      if (!minutes) minutes = mapTSAStatusToMinutes(chosen.it.Status);
    }
    if (!minutes) return;
    const penalty = ageMin > 720 ? 12 : ageMin > 360 ? 8 : ageMin > 180 ? 5 : 0;
    return { minutes: clamp(minutes + penalty, 5, 90), source: "tsa", detail: `worker · age=${ageMin}m` };
  } catch { return; }
}

// ----------------- Predictive fallback by hour -----------------
export function estimateByHour(iata: string, depLocalISO: string, trustedTraveler?: boolean): number {
  const hour = new Date(depLocalISO).getHours();
  const code = iata.toUpperCase();

  // Hour-based baseline - reduced for realistic planning estimates
  // These represent typical advance-planning wait times, not worst-case scenarios
  let base = 12;
  if (hour >= 5 && hour < 8) base = 18;        // Early morning rush
  else if (hour >= 8 && hour < 11) base = 15;  // Morning rush
  else if (hour >= 11 && hour < 15) base = 12; // Midday
  else if (hour >= 15 && hour < 19) base = 16; // Afternoon/evening rush
  else if (hour >= 19 && hour < 23) base = 10; // Evening
  else base = 8; // Late night/early morning

  // Airport size adjustment - more modest multipliers
  const majorHubs = ["YYZ", "YVR", "YUL", "YYC", "LAX", "JFK", "LGA", "EWR", "ORD", "ATL", "DFW", "DEN", "SFO", "SEA", "BOS", "IAD", "DCA"];
  const largeAirports = ["YOW", "YEG", "YWG", "YHZ", "PHX", "LAS", "MIA", "MCO", "CLT", "MSP", "DTW", "PHL"];
  const smallAirports = ["YTZ", "YQR", "YKF", "YQG"];

  if (majorHubs.includes(code)) {
    base = Math.round(base * 1.3); // Major hubs get 30% more time (reduced from 50%)
  } else if (largeAirports.includes(code)) {
    base = Math.round(base * 1.1); // Large airports get 10% more time (reduced from 20%)
  } else if (smallAirports.includes(code)) {
    base = Math.max(5, base - 3); // Small airports get slight reduction
  }

  if (trustedTraveler) base = Math.max(5, Math.round(base * 0.6));
  return base;
}

// ----------------- Orchestrator -----------------
export async function getLiveSecurityForAirport(iata: string): Promise<LiveFetch | undefined> {
  const code = iata.toUpperCase();
  // Canada first (CATSA is reliable & free)
  if (code.startsWith("Y")) {
    const ca = await fetchCATSA(code);
    if (ca?.minutes) return ca;
  }
  // RapidAPI aggregator (if key)
  const ra = await fetchTSARapidAPI(code);
  if (ra?.minutes) return ra;

  // TSA via CF Worker (if it works from your region)
  const tsa = await fetchTSAWorker(code);
  if (tsa?.minutes) return tsa;

  return; // none worked; caller will use estimateByHour()
}
