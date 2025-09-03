type RoutingInput = {
  originAddress?: string;
  airportIata: string;
  leaveByLocalISO: string;
};

const AIRPORT_ADDRESS: Record<string, string> = {
  YYZ: "Toronto Pearson International Airport",
  YOW: "Ottawa International Airport",
  YUL: "Montréal–Trudeau International Airport",
  JFK: "John F. Kennedy International Airport",
  LGA: "LaGuardia Airport",
  EWR: "Newark Liberty International Airport",
  SEA: "Seattle-Tacoma International Airport",
};

function destFor(iata: string): string {
  return AIRPORT_ADDRESS[iata.toUpperCase()] ?? `${iata.toUpperCase()} airport`;
}

export async function estimateDriveMinutes(input: RoutingInput): Promise<number> {
  const { originAddress, airportIata, leaveByLocalISO } = input;

  // Fallback heuristic if no Maps key or origin address
  if (!originAddress || !process.env.GOOGLE_MAPS_API_KEY) {
    return 35;
  }

  try {
    const params = new URLSearchParams({
      origins: originAddress,
      destinations: destFor(airportIata),
      key: process.env.GOOGLE_MAPS_API_KEY!,
      departure_time: String(Math.floor(new Date(leaveByLocalISO).getTime() / 1000)),
    });

    const url = `https://maps.googleapis.com/maps/api/distancematrix/json?${params.toString()}`;
    const res = await fetch(url);
    const data = await res.json();

    const elem = data?.rows?.[0]?.elements?.[0];
    const seconds =
      elem?.duration_in_traffic?.value ??
      elem?.duration?.value ??
      35 * 60;

    return Math.round(seconds / 60);
  } catch {
    return 35;
  }
}
