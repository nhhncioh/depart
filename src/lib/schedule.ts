export type DemandResult = { score: number; detail: string }; // score in [0..1]
const clamp = (n:number, lo:number, hi:number) => Math.min(hi, Math.max(lo, n));

// Hour-of-day baseline demand (0..23). Tuned conservative.
const HOD_BASE = [0.10,0.08,0.06,0.08,0.30,0.55,0.70,0.65,0.45,0.35,0.30,0.28,0.30,0.35,0.40,0.55,0.65,0.70,0.55,0.40,0.30,0.22,0.16,0.12];

// Light airport scale nudges (until we wire real flight counts)
const AIRPORT_NUDGE: Record<string, number> = {
  JFK:0.10, EWR:0.08, LGA:0.06, ATL:0.10, LAX:0.09, ORD:0.09, DFW:0.08, DEN:0.08, SFO:0.07, SEA:0.06, IAD:0.05, DCA:0.04,
  YYZ:0.06, YUL:0.04, YVR:0.04, YYC:0.03,
};

export function scheduleDemandScore(airportIata: string, depLocalISO: string): DemandResult {
  const d = new Date(depLocalISO);
  const hour = d.getHours();
  const dow  = d.getDay(); // 0=Sun
  let score = HOD_BASE[hour] + (AIRPORT_NUDGE[airportIata.toUpperCase()] ?? 0);

  // DOW patterns: Mon AM, Fri PM, Sun PM
  if (dow === 1 && hour >= 5 && hour <= 9)  score += 0.10;
  if (dow === 5 && hour >= 15 && hour <= 19) score += 0.10;
  if (dow === 0 && hour >= 16 && hour <= 21) score += 0.10;

  score = clamp(score, 0, 1);
  return { score, detail: `hod=${hour} dow=${dow} score=${score.toFixed(2)}` };
}

export function predictSecurityFromSchedule(
  airportIata: string,
  depLocalISO: string,
  trustedTraveler?: boolean
): { minutes: number; detail: string } {
  const { score, detail } = scheduleDemandScore(airportIata, depLocalISO);
  const clamp = (n:number, lo:number, hi:number)=>Math.min(hi, Math.max(lo, n));

  let minutes = Math.round(10 + score * 30); // 10..40m typical
  const smalls = ["YOW","YTZ","YQR","YKF"];
  if (smalls.includes(airportIata.toUpperCase())) minutes = Math.max(5, minutes - 5);
  if (trustedTraveler) minutes = Math.max(5, Math.round(minutes * 0.65));
  minutes = clamp(minutes, 5, 90);

  return { minutes, detail: `schedule-model · ${detail}` };
}
