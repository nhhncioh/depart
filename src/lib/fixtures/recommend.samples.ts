import { computeRecommendation, type RecommendInput, type RecommendOutput } from "@/lib/compute";

export type SelfTestSample = {
  name: string;
  input: RecommendInput;
  // Optional extra expectations; default validator checks generic shape
  validate?: (out: RecommendOutput) => string[];
};

function toISOIn(hoursFromNow: number): string {
  return new Date(Date.now() + Math.round(hoursFromNow * 60) * 60_000).toISOString();
}

function upcomingAtHourLocal(targetHour: number): string {
  const now = new Date();
  const d = new Date(now.getTime());
  d.setSeconds(0, 0);
  d.setMinutes(0);
  d.setHours(targetHour);
  if (d.getTime() <= now.getTime()) d.setDate(d.getDate() + 1);
  return d.toISOString();
}

function isValidISO(s: any): boolean {
  if (typeof s !== "string" || !s) return false;
  const t = Date.parse(s);
  return Number.isFinite(t);
}

function validateShape(out: RecommendOutput): string[] {
  const failures: string[] = [];

  // Top-level
  if (!isValidISO(out.leaveByLocalISO)) failures.push("leaveByLocalISO invalid");
  if (!isValidISO(out.arriveAirportLocalISO)) failures.push("arriveAirportLocalISO invalid");
  if (typeof out.travelMinutes !== "number") failures.push("travelMinutes missing");

  // Breakdown
  const b = out.breakdown as any;
  const reqBreak = [
    "gateCloseLeadMin",
    "securityWaitMin",
    "walkBufferMin",
    "airportMiscBufferMin",
    "arrivalBufferMin",
  ];
  for (const k of reqBreak) {
    if (typeof b?.[k] !== "number") failures.push(`breakdown.${k} missing`);
  }
  // Optional bag fields may be undefined, but must be numbers if present
  for (const opt of ["bagDropCutoffMin", "bagDropProcessMin"]) {
    if (opt in b && b[opt] !== undefined && typeof b[opt] !== "number") failures.push(`breakdown.${opt} not number`);
  }

  // Bands
  const bands = out.bands as any;
  const bandKeys = [
    "aggressiveArriveLocalISO",
    "normalArriveLocalISO",
    "cautiousArriveLocalISO",
    "aggressiveLeaveLocalISO",
    "normalLeaveLocalISO",
    "cautiousLeaveLocalISO",
  ];
  for (const k of bandKeys) {
    if (!isValidISO(bands?.[k])) failures.push(`bands.${k} invalid`);
  }

  // Meta
  const m = out.meta as any;
  if (!m || typeof m.horizonHours !== "number") failures.push("meta.horizonHours missing");
  const allowedSources = new Set(["catsa", "tsa-rapidapi", "tsa", "schedule", "schedule+load", "estimate", "override"]);
  if (m && m.securitySource !== undefined && m.securitySource !== null && !allowedSources.has(m.securitySource)) {
    failures.push(`meta.securitySource unexpected: ${m.securitySource}`);
  }
  // Ensure busyness field key exists on the meta object (may be undefined)
  if (!(m && ("busyness" in m))) failures.push("meta.busyness key missing");
  const allowedConstraints = new Set(["gate-close", "bag-drop", "policy-floor"]);
  if (!m || !allowedConstraints.has(m.constraint)) failures.push("meta.constraint missing/invalid");
  const lm = m?.leadMinutes;
  for (const k of ["gateScenarioMin", "bagScenarioMin", "policyFloorMin", "chosenMin"]) {
    if (typeof lm?.[k] !== "number") failures.push(`meta.leadMinutes.${k} missing`);
  }

  return failures;
}

// Scenario-specific validators
function expectBagFields(out: RecommendOutput): string[] {
  const f: string[] = [];
  if (typeof out.breakdown.bagDropCutoffMin !== "number") f.push("breakdown.bagDropCutoffMin expected for checked bag");
  if (typeof out.breakdown.bagDropProcessMin !== "number") f.push("breakdown.bagDropProcessMin expected for checked bag");
  return f;
}

export const samples: SelfTestSample[] = [
  {
    name: "YYZ domestic (far-out) with NEXUS",
    input: {
      airport: "YYZ",
      airline: "Air Canada",
      flightType: "domestic",
      depTimeLocalISO: toISOIn(12), // ensure >= 6h to avoid live fetch
      options: { trustedTraveler: true, checkedBags: false, alreadyCheckedIn: true },
    },
  },
  {
    name: "YYZ domestic (far-out) without NEXUS",
    input: {
      airport: "YYZ",
      airline: "Air Canada",
      flightType: "domestic",
      depTimeLocalISO: toISOIn(14), // avoid live
      options: { trustedTraveler: false, checkedBags: false },
    },
  },
  {
    name: "YYZ international (far-out) with bag",
    input: {
      airport: "YYZ",
      airline: "Air Canada",
      flightType: "international",
      depTimeLocalISO: toISOIn(20), // avoid live
      options: { checkedBags: true, trustedTraveler: false },
    },
    validate: (out) => expectBagFields(out),
  },
  {
    name: "Small airport (YTZ) far-out",
    input: {
      airport: "YTZ",
      airline: "Porter",
      flightType: "domestic",
      depTimeLocalISO: toISOIn(9),
      options: { trustedTraveler: false, checkedBags: false },
    },
  },
  {
    name: "Holiday spike far-out (schedule+load path)",
    input: {
      airport: "YYZ",
      airline: "Air Canada",
      flightType: "international",
      // Ensure >= 6h horizon to exercise schedule+load path (busyness defined)
      depTimeLocalISO: toISOIn(24 * 7 + 2), // ~1 week + 2h from now
      options: { checkedBags: true, trustedTraveler: false },
    },
    validate: (out) => {
      const errs: string[] = [];
      const m: any = out.meta || {};
      if (!(m && ("busyness" in m))) errs.push("meta.busyness key missing");
      if (!m?.busyness || typeof m.busyness !== "object") errs.push("meta.busyness expected object on schedule+load path");
      return errs;
    },
  },
  {
    name: "Missing live data (non-supported airport code, far-out)",
    input: {
      airport: "XXX",
      airline: "TestAir",
      flightType: "domestic",
      depTimeLocalISO: toISOIn(10), // avoid live
      options: { trustedTraveler: false, checkedBags: false },
    },
  },
];

export async function runSelfTests(): Promise<{ pass: boolean; failures: string[] }> {
  const failures: string[] = [];
  for (const s of samples) {
    try {
      const out = await computeRecommendation(s.input);
      for (const msg of validateShape(out)) failures.push(`${s.name}: ${msg}`);
      if (s.validate) {
        for (const msg of s.validate(out)) failures.push(`${s.name}: ${msg}`);
      }
    } catch (e: any) {
      failures.push(`${s.name}: threw ${e?.message || e}`);
    }
  }
  return { pass: failures.length === 0, failures };
}
