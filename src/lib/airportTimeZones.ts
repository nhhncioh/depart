const MAP: Record<string, string> = {
  YYZ: "America/Toronto", YOW: "America/Toronto", YUL: "America/Toronto", YHZ: "America/Halifax",
  YVR: "America/Vancouver", YYC: "America/Edmonton", YEG: "America/Edmonton", YWG: "America/Winnipeg",
  JFK: "America/New_York", LGA: "America/New_York", EWR: "America/New_York", BOS: "America/New_York",
  PHL: "America/New_York", DCA: "America/New_York", IAD: "America/New_York", ATL: "America/New_York",
  MIA: "America/New_York", CLT: "America/New_York", DTW: "America/Detroit", MSP: "America/Chicago",
  ORD: "America/Chicago", DFW: "America/Chicago", IAH: "America/Chicago", BWI: "America/New_York",
  DEN: "America/Denver", SLC: "America/Denver", PHX: "America/Phoenix",
  LAX: "America/Los_Angeles", SFO: "America/Los_Angeles", SAN: "America/Los_Angeles",
  SEA: "America/Los_Angeles", PDX: "America/Los_Angeles", LAS: "America/Los_Angeles"
};

export function timeZoneForIata(iata?: string | null): string | null {
  if (!iata) return null;
  const key = iata.trim().toUpperCase();
  return MAP[key] ?? null;
}
