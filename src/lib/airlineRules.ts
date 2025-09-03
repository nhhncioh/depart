export type FlightType = "domestic" | "international";

export type AirlineRule = {
  airline: string;
  gateCloseLead: { domestic: number; international: number };   // minutes before departure
  bagDropCutoff: { domestic: number; international: number };   // minutes before departure
  bagDropProcessMin: number;                                    // time to drop bag at counter
};

const RULES: AirlineRule[] = [
  {
    airline: "Air Canada",
    gateCloseLead: { domestic: 30, international: 45 },
    bagDropCutoff: { domestic: 45, international: 60 },
    bagDropProcessMin: 10,
  },
  {
    airline: "WestJet",
    gateCloseLead: { domestic: 30, international: 45 },
    bagDropCutoff: { domestic: 45, international: 60 },
    bagDropProcessMin: 10,
  },
  {
    airline: "United",
    gateCloseLead: { domestic: 30, international: 45 },
    bagDropCutoff: { domestic: 45, international: 60 },
    bagDropProcessMin: 10,
  },
  {
    airline: "Delta",
    gateCloseLead: { domestic: 30, international: 45 },
    bagDropCutoff: { domestic: 45, international: 60 },
    bagDropProcessMin: 10,
  },
];

// fallback generic rules
const GENERIC: AirlineRule = {
  airline: "Generic",
  gateCloseLead: { domestic: 30, international: 45 },
  bagDropCutoff: { domestic: 45, international: 60 },
  bagDropProcessMin: 10,
};

export function getAirlineRule(airline: string | undefined): AirlineRule {
  if (!airline) return GENERIC;
  const key = airline.trim().toLowerCase();
  return (
    RULES.find((r) => r.airline.toLowerCase() === key) ??
    RULES.find((r) => key.includes(r.airline.toLowerCase())) ??
    GENERIC
  );
}
