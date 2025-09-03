import { getAirlineRule, FlightType } from "./airlineRules";
import { getLiveSecurityForAirport, estimateByHour } from "./live";
import { predictSecurityFromScheduleWithLoad } from "./scheduleLoad";

export type RecommendInput = {
  airport: string;
  airline: string;
  flightType: FlightType;
  depTimeLocalISO: string;
  options?: {
    checkedBags?: boolean;
    trustedTraveler?: boolean;
    rideType?: "rideshare" | "self-park" | "dropoff";
    securityOverrideMinutes?: number;
  };
};

export type RecommendOutput = {
  leaveByLocalISO: string;
  arriveAirportLocalISO: string;
  travelMinutes: number;
  breakdown: {
    gateCloseLeadMin: number;
    securityWaitMin: number;
    walkBufferMin: number;
    airportMiscBufferMin: number;
    bagDropCutoffMin?: number;
    bagDropProcessMin?: number;
    arrivalBufferMin: number;
  };
  bands: {
    aggressiveArriveLocalISO: string;
    normalArriveLocalISO: string;
    cautiousArriveLocalISO: string;
    aggressiveLeaveLocalISO: string;
    normalLeaveLocalISO: string;
    cautiousLeaveLocalISO: string;
  };
  warnings?: string[];
  meta?: {
    horizonHours: number;
    securitySource?: "catsa" | "tsa-rapidapi" | "tsa" | "schedule" | "schedule+load" | "estimate" | "override";
    securityDetail?: string;
    busyness?: { source: string; count: number; score: number; capacityTier: string; windowMin: number; };
    constraint: "gate-close" | "bag-drop" | "policy-floor";
    leadMinutes: { gateScenarioMin: number; bagScenarioMin: number; policyFloorMin: number; chosenMin: number; };
  };
};

function addMinutes(iso: string, minutes: number): string {
  return new Date(new Date(iso).getTime() + minutes * 60_000).toISOString();
}
function subMinutes(iso: string, minutes: number): string {
  return addMinutes(iso, -minutes);
}

export async function computeRecommendation(input: RecommendInput): Promise<RecommendOutput> {
  const { airport, airline, flightType, depTimeLocalISO, options } = input;

  const rule = getAirlineRule(airline);
  const gateCloseLeadMin = rule.gateCloseLead[flightType];
  const bagDropCutoffMin = options?.checkedBags ? rule.bagDropCutoff[flightType] : undefined;
  const bagDropProcessMin = options?.checkedBags ? rule.bagDropProcessMin : undefined;

  const now = Date.now();
  const horizonHours = Math.max(0, Math.round((new Date(depTimeLocalISO).getTime() - now) / 3_600_000));

  let securityWaitMin = options?.securityOverrideMinutes;
  let securitySource: RecommendOutput["meta"]["securitySource"] = securityWaitMin ? "override" : undefined;
  let securityDetail: string | undefined;
  let busyness: RecommendOutput["meta"]["busyness"] | undefined;

  if (securityWaitMin === undefined) {
    if (horizonHours >= 6) {
      const pred = await predictSecurityFromScheduleWithLoad(airport, depTimeLocalISO, options?.trustedTraveler);
      securityWaitMin = pred.minutes;
      securitySource = "schedule+load";
      securityDetail = pred.detail;
      busyness = { source: pred.busyness.source, count: pred.busyness.count, score: pred.busyness.score, capacityTier: pred.busyness.capacityTier, windowMin: pred.busyness.windowMin };
    } else {
      const live = await getLiveSecurityForAirport(airport);
      if (live?.minutes) {
        securityWaitMin = live.minutes;
        securitySource = live.source;
        securityDetail = live.detail;
      } else {
        securityWaitMin = estimateByHour(airport, depTimeLocalISO, options?.trustedTraveler);
        securitySource = "estimate";
        securityDetail = "by-hour baseline";
      }
    }
  }

  const walkBufferMin = flightType === "international" ? 20 : 12;
  const airportMiscBufferMin = 8;
  const ride = options?.rideType ?? "rideshare";
  const arrivalBufferMin = ride === "self-park" ? 20 : ride === "dropoff" ? 8 : 12;

  const preGateProcess = securityWaitMin + walkBufferMin + airportMiscBufferMin;
  const gateScenarioMin = gateCloseLeadMin + preGateProcess;
  const bagScenarioMin  = (bagDropCutoffMin && bagDropProcessMin) ? (bagDropCutoffMin + bagDropProcessMin) : 0;
  const policyFloorMin  = flightType === "international" ? 120 : 75;

  let chosenMin = Math.max(gateScenarioMin, bagScenarioMin, policyFloorMin);
  let constraint: RecommendOutput["meta"]["constraint"] = "gate-close";
  if (chosenMin === bagScenarioMin) constraint = "bag-drop";
  if (chosenMin === policyFloorMin) constraint = "policy-floor";

  const arriveAirportLocalISO = subMinutes(depTimeLocalISO, chosenMin);

  const aggressiveArrive = addMinutes(arriveAirportLocalISO, 10);
  const normalArrive     = arriveAirportLocalISO;
  const cautiousArrive   = subMinutes(arriveAirportLocalISO, 20);

  return {
    leaveByLocalISO: arriveAirportLocalISO,
    arriveAirportLocalISO,
    travelMinutes: 0,
    breakdown: {
      gateCloseLeadMin,
      securityWaitMin: securityWaitMin!,
      walkBufferMin,
      airportMiscBufferMin,
      bagDropCutoffMin,
      bagDropProcessMin,
      arrivalBufferMin,
    },
    bands: {
      aggressiveArriveLocalISO: aggressiveArrive,
      normalArriveLocalISO: normalArrive,
      cautiousArriveLocalISO: cautiousArrive,
      aggressiveLeaveLocalISO: aggressiveArrive,
      normalLeaveLocalISO: normalArrive,
      cautiousLeaveLocalISO: cautiousArrive,
    },
    warnings: [],
    meta: {
      horizonHours, securitySource, securityDetail, busyness, constraint,
      leadMinutes: { gateScenarioMin, bagScenarioMin, policyFloorMin, chosenMin },
    },
  };
}
