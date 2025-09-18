export interface FlightRecord {
  id: string;
  depIata: string;
  arrIata: string;
  depLocalISO: string;   // "YYYY-MM-DDTHH:mm"
  arrLocalISO?: string;
  airlineIata?: string;
  operatorAirlineIata?: string;
  blockMinutes?: number;
  distanceKm?: number;
}

export interface PassportStats {
  totalFlights: number;
  totalDistanceKm: number;
  totalFlightTimeMin: number;
  uniqueAirports: number;
  uniqueAirlines: number;
  firstSeenDate: string;     // ISO date (YYYY-MM-DD)
  issuedDate: string;        // today (YYYY-MM-DD)
  placeOfIssueIata: string;  // most frequent origin
  countriesVisited: string[]; // ISO-3166-1 alpha-2
  routes: Array<{ from: string; to: string; count: number }>;
}