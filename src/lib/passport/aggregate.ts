import { FlightRecord, PassportStats } from './types';
import { getAirportInfo } from './airports';

// Haversine distance calculation
export function haversineKm(iataA: string, iataB: string): number {
  const airportA = getAirportInfo(iataA);
  const airportB = getAirportInfo(iataB);

  if (!airportA || !airportB) return 0;

  const R = 6371; // Earth radius in km
  const dLat = (airportB.lat - airportA.lat) * Math.PI / 180;
  const dLon = (airportB.lon - airportA.lon) * Math.PI / 180;

  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(airportA.lat * Math.PI / 180) * Math.cos(airportB.lat * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function getFlightDurationMinutes(depISO: string, arrISO?: string): number {
  if (!arrISO) return 0;
  const dep = new Date(depISO);
  const arr = new Date(arrISO);
  return Math.max(0, (arr.getTime() - dep.getTime()) / (1000 * 60));
}

function getMostFrequent<T>(items: T[]): T | undefined {
  if (items.length === 0) return undefined;

  const counts = new Map<T, number>();
  for (const item of items) {
    counts.set(item, (counts.get(item) || 0) + 1);
  }

  let maxCount = 0;
  let mostFrequent: T | undefined;
  for (const [item, count] of counts) {
    if (count > maxCount) {
      maxCount = count;
      mostFrequent = item;
    }
  }

  return mostFrequent;
}

export function computePassportStats(flights: FlightRecord[]): PassportStats {
  if (flights.length === 0) {
    return {
      totalFlights: 0,
      totalDistanceKm: 0,
      totalFlightTimeMin: 0,
      uniqueAirports: 0,
      uniqueAirlines: 0,
      firstSeenDate: new Date().toISOString().slice(0, 10),
      issuedDate: new Date().toISOString().slice(0, 10),
      placeOfIssueIata: 'YYZ',
      countriesVisited: [],
      routes: []
    };
  }

  // Total flights
  const totalFlights = flights.length;

  // Total distance
  const totalDistanceKm = flights.reduce((sum, flight) => {
    return sum + (flight.distanceKm || haversineKm(flight.depIata, flight.arrIata));
  }, 0);

  // Total flight time
  const totalFlightTimeMin = flights.reduce((sum, flight) => {
    return sum + (flight.blockMinutes || getFlightDurationMinutes(flight.depLocalISO, flight.arrLocalISO));
  }, 0);

  // Unique airports
  const airportSet = new Set<string>();
  flights.forEach(flight => {
    airportSet.add(flight.depIata);
    airportSet.add(flight.arrIata);
  });
  const uniqueAirports = airportSet.size;

  // Unique airlines
  const airlineSet = new Set<string>();
  flights.forEach(flight => {
    const airline = flight.operatorAirlineIata || flight.airlineIata;
    if (airline) airlineSet.add(airline);
  });
  const uniqueAirlines = airlineSet.size;

  // First seen date
  const firstSeenDate = flights
    .map(f => f.depLocalISO.slice(0, 10))
    .sort()[0] || new Date().toISOString().slice(0, 10);

  // Issued date (today)
  const issuedDate = new Date().toISOString().slice(0, 10);

  // Place of issue (most frequent departure airport)
  const placeOfIssueIata = getMostFrequent(flights.map(f => f.depIata)) || 'YYZ';

  // Countries visited
  const countrySet = new Set<string>();
  flights.forEach(flight => {
    const depAirport = getAirportInfo(flight.depIata);
    const arrAirport = getAirportInfo(flight.arrIata);
    if (depAirport) countrySet.add(depAirport.country);
    if (arrAirport) countrySet.add(arrAirport.country);
  });
  const countriesVisited = Array.from(countrySet).sort();

  // Routes with counts
  const routeMap = new Map<string, number>();
  flights.forEach(flight => {
    const route = `${flight.depIata}-${flight.arrIata}`;
    routeMap.set(route, (routeMap.get(route) || 0) + 1);
  });

  const routes = Array.from(routeMap.entries())
    .map(([route, count]) => {
      const [from, to] = route.split('-');
      return { from, to, count };
    })
    .sort((a, b) => b.count - a.count)
    .slice(0, 150);

  return {
    totalFlights,
    totalDistanceKm,
    totalFlightTimeMin,
    uniqueAirports,
    uniqueAirlines,
    firstSeenDate,
    issuedDate,
    placeOfIssueIata,
    countriesVisited,
    routes
  };
}

export function formatKm(km: number): string {
  if (km >= 1000000) {
    return `${(km / 1000000).toFixed(1)}M km`;
  } else if (km >= 1000) {
    return `${(km / 1000).toFixed(1)}K km`;
  }
  return `${Math.round(km)} km`;
}

export function formatDuration(minutes: number): string {
  const days = Math.floor(minutes / (24 * 60));
  const hours = Math.floor((minutes % (24 * 60)) / 60);
  const mins = Math.floor(minutes % 60);

  if (days > 0) {
    return `${days}d ${hours}h`;
  } else if (hours > 0) {
    return `${hours}h ${mins}m`;
  } else {
    return `${mins}m`;
  }
}