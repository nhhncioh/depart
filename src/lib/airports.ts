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
  // Mega hubs
  JFK:"mega", EWR:"mega", LGA:"large",
  ATL:"mega", ORD:"mega", LAX:"mega", DFW:"mega", DEN:"mega",
  SFO:"mega", MIA:"large", IAH:"large", CLT:"large", PHX:"large", SEA:"large",
  BOS:"large", PHL:"large", MSP:"large", DTW:"large", LAS:"large",
  // Regionals/medium
  SJC:"medium", OAK:"medium", PDX:"medium", MDW:"medium", DAL:"medium",
  AUS:"medium", TPA:"medium", FLL:"medium",
  // Canada
  YYZ:"mega", YUL:"large", YVR:"large", YOW:"medium", YEG:"medium", YWG:"small",
  DCA:"large", IAD:"large",
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
 * Typical capacity (departures) in a ±90 minute window for the tier.
 * These numbers are deliberately conservative and only used for a *percentage*
 * (we clamp later). Example: if we see 18 departures and tier=medium (36),
 * busyness = 50%.
 */
const SATURATION_BY_TIER: Record<CapacityTier, number> = {
  small: 18,
  medium: 36,
  large: 60,
  mega: 90,
};

export function saturationFor(tierOrIata: CapacityTier | string): number {
  const tier = (["small","medium","large","mega"] as CapacityTier[]).includes(tierOrIata as CapacityTier)
    ? (tierOrIata as CapacityTier)
    : capacityTierFor(String(tierOrIata));
  return SATURATION_BY_TIER[tier];
}
