/**
 * Airports helpers:
 * - iataToIcao: map IATA -> ICAO for schedule APIs (e.g., JFK -> KJFK)
 * - capacityTierFor: rough tier per airport (used to scale "typical capacity")
 * - saturationFor: typical max departures within a ±90 min window for a tier
 */

export type CapacityTier = "mega" | "large" | "medium" | "small";

/* ---- IATA -> ICAO ---- */
export const IATA_TO_ICAO: Record<string, string> = {
  // Canada
  YYZ:"CYYZ", YUL:"CYUL", YOW:"CYOW", YVR:"CYVR", YEG:"CYEG", YWG:"CYWG",
  // US Northeast
  JFK:"KJFK", LGA:"KLGA", EWR:"KEWR", BOS:"KBOS", PHL:"KPHL", BWI:"KBWI",
  IAD:"KIAD", DCA:"KDCA",
  // US Hubs
  ATL:"KATL", ORD:"KORD", DEN:"KDEN", DFW:"KDFW", IAH:"KIAH", CLT:"KCLT",
  MSP:"KMSP", DTW:"KDTW", PHX:"KPHX", LAS:"KLAS", SLC:"KSLC",
  // West
  SEA:"KSEA", PDX:"KPDX", SFO:"KSFO", OAK:"KOAK", SJC:"KSJC", LAX:"KLAX",
  // South / Florida / Texas
  MCO:"KMCO", MIA:"KMIA", FLL:"KFLL", TPA:"KTPA", AUS:"KAUS", DAL:"KDAL",
  // Chicago alt
  MDW:"KMDW"
};
export function iataToIcao(iata: string): string | undefined {
  return IATA_TO_ICAO[iata.trim().toUpperCase()];
}

/* ---- Capacity tiers per airport (rough heuristics) ---- */
const TIER_OVERRIDES: Record<string, CapacityTier> = {
  // Mega hubs (highest traffic international airports)
  JFK:"mega", EWR:"mega", LGA:"large",
  ATL:"mega", ORD:"mega", LAX:"mega", DFW:"mega", DEN:"mega",
  SFO:"mega", IAH:"mega", // Added IAH as mega - Houston is huge
  // Large hubs
  MIA:"large", CLT:"large", PHX:"large", SEA:"large",
  BOS:"large", PHL:"large", MSP:"large", DTW:"large", LAS:"large",
  DCA:"large", IAD:"large",
  // Medium airports
  SJC:"medium", OAK:"medium", PDX:"medium", MDW:"medium", DAL:"medium",
  AUS:"medium", TPA:"medium", FLL:"medium", MCO:"large", // Added MCO as large
  // Canada
  YYZ:"mega", YUL:"large", YVR:"large", YOW:"medium", YEG:"medium", YWG:"small",
};

export function capacityTierFor(iataOrIcao: string): CapacityTier {
  const k = (iataOrIcao || "").toUpperCase();
  // If ICAO passed, peel to IATA where we can
  const iata = k.length === 4 && k.startsWith("K") || k.startsWith("C")
    ? Object.keys(IATA_TO_ICAO).find(i => IATA_TO_ICAO[i] === k) ?? k
    : k;

  return TIER_OVERRIDES[iata] ?? "medium";
}

/**
 * Realistic capacity (departures) in a ±90 minute window for the tier.
 * These numbers represent high but normal operating levels - not absolute maximum.
 * Updated to reflect real-world airport capacities more accurately.
 */
const SATURATION_BY_TIER: Record<CapacityTier, number> = {
  small: 40,   // Small airports: 40 departures in 3 hours is high activity
  medium: 100, // Medium airports: 100 departures in 3 hours
  large: 200,  // Large airports: 200 departures in 3 hours
  mega: 450,   // Mega hubs like YYZ/ATL: 450 departures in 3 hours is busy but normal
};

export function saturationFor(tierOrIata: CapacityTier | string): number {
  const tier = (["small","medium","large","mega"] as CapacityTier[]).includes(tierOrIata as CapacityTier)
    ? (tierOrIata as CapacityTier)
    : capacityTierFor(String(tierOrIata));
  return SATURATION_BY_TIER[tier];
}
