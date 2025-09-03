import { capacityTierFor, saturationFor } from "./airports";
import { iataToIcao } from "./iataIcao";

export type FlightLoad = {
  count: number;
  score: number;             // 0..1 vs capacity
  source: "aerodatabox" | "heuristic";
  windowMin: number;         // 180
  capacityTier: "small" | "medium" | "large" | "mega";
  detail: string;
};

const clamp = (n:number, lo:number, hi:number)=>Math.min(hi, Math.max(lo, n));

function localWindowISO(depLocalISO: string, minutes: number) {
  const dep = new Date(depLocalISO);
  const start = new Date(dep.getTime() - (minutes/2)*60000);
  const end   = new Date(dep.getTime() + (minutes/2)*60000);
  const fmt = (d: Date) => {
    const pad = (x:number)=>String(x).padStart(2,"0");
    return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };
  return { start, end, startStr: fmt(start), endStr: fmt(end) };
}

// Heuristic fallback if no key or API error
function heuristicLoad(iata: string, depLocalISO: string): FlightLoad {
  const tier = capacityTierFor(iata);
  const sat = saturationFor(tier);
  const hour = new Date(depLocalISO).getHours();
  const hodFactor = [0.3,0.25,0.2,0.25,0.6,0.8,0.95,0.9,0.7,0.6,0.5,0.5,0.55,0.6,0.65,0.8,0.9,0.95,0.8,0.6,0.45,0.35,0.3,0.3][hour];
  const est = Math.round(hodFactor * sat);
  return {
    count: est,
    score: clamp(est / sat, 0, 1),
    source: "heuristic",
    windowMin: 180,
    capacityTier: tier,
    detail: `heuristic · hod=${hour} est2h=${est} sat2h=${sat}`,
  };
}

export async function fetchFlightLoad(iata: string, depLocalISO: string): Promise<FlightLoad> {
  const key = process.env.AERODATABOX_RAPIDAPI_KEY;
  if (!key) return heuristicLoad(iata, depLocalISO);

  const icao = await iataToIcao(iata);
  if (!icao) return heuristicLoad(iata, depLocalISO);

  const tier = capacityTierFor(iata);
  const sat  = saturationFor(tier);
  const { startStr, endStr } = localWindowISO(depLocalISO, 180); // ±90m

  // Aerodatabox departures for a window (local airport time); direction=Departures
  const url = `https://aerodatabox.p.rapidapi.com/flights/airports/icao/${encodeURIComponent(icao)}/${startStr}/${endStr}?direction=Departures&withLeg=true&limit=100`;

  try {
    const r = await fetch(url, {
      headers: {
        "X-RapidAPI-Key": key!,
        "X-RapidAPI-Host": "aerodatabox.p.rapidapi.com",
      },
      // keep it fresh; we’re planning ahead
      cache: "no-store",
    });
    if (!r.ok) throw new Error(`aerodatabox ${r.status}`);
    const j: any = await r.json();

    // Responses vary: often { departures:[...] }, sometimes { flights:[...] }
    let rows: any[] = [];
    if (Array.isArray(j?.departures)) rows = j.departures;
    else if (Array.isArray(j?.flights)) rows = j.flights;
    else if (Array.isArray(j)) rows = j;

    const count = rows.length ?? 0;
    const score = clamp(count / sat, 0, 1);

    return {
      count, score,
      source: "aerodatabox",
      windowMin: 180,
      capacityTier: tier,
      detail: `aerodatabox · icao=${icao} ${startStr}..${endStr} count=${count} sat2h=${sat}`,
    };
  } catch {
    return heuristicLoad(iata, depLocalISO);
  }
}
