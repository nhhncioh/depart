import type { SavedFlight } from "@/app/profile/page";
import { getUserFlights } from "@/lib/passport/getUserFlights";
import { computePassportStats } from "@/lib/passport/aggregate";
import type { FlightRecord } from "@/lib/passport/types";

export interface CombinedStats {
  totalFlights: number;
  totalMiles: number;
  totalHours: number;
  onTimePercentage: number;
  favoriteAirline: string;
  mostVisitedAirport: string;
  longestFlight: {
    flightNumber: string;
    departure: string;
    arrival: string;
    distance: number;
    duration?: number;
    source: 'saved' | 'passport';
  } | null;
  averageDelay: number;
  upcomingFlights: number;
  completedFlights: number;
  airlines: Array<{ name: string; count: number; percentage: number }>;
  airports: Array<{ code: string; name?: string; visits: number; percentage: number }>;
  yearlyBreakdown: Array<{ year: number; flights: number; miles: number }>;
}

export function computeCombinedStats(savedFlights: SavedFlight[]): CombinedStats {
  const passportFlights = getUserFlights();
  const passportStats = computePassportStats(passportFlights);

  // Process saved flights
  const completedSavedFlights = savedFlights.filter(f => f.status === "completed");
  const upcomingFlights = savedFlights.filter(f => f.status === "upcoming").length;

  // Combine flight data for stats
  const allFlights = [
    ...completedSavedFlights.map(f => ({
      flightNumber: f.flightNumber,
      airline: f.airline,
      departure: { airport: f.departure.airport, time: f.departure.time },
      arrival: { airport: f.arrival.airport, time: f.arrival.time },
      distance: f.distance || 0,
      duration: f.duration,
      actualArrival: f.arrival.actualTime,
      source: 'saved' as const
    })),
    ...passportFlights.map(f => ({
      flightNumber: f.id || 'Unknown',
      airline: f.airlineIata || 'Unknown',
      departure: { airport: f.depIata, time: f.depLocalISO },
      arrival: { airport: f.arrIata, time: f.arrLocalISO || f.depLocalISO },
      distance: f.distanceKm ? f.distanceKm * 0.621371 : 0, // Convert km to miles
      duration: f.blockMinutes,
      actualArrival: undefined,
      source: 'passport' as const
    }))
  ];

  // Calculate total stats
  const totalFlights = allFlights.length;
  const totalMiles = allFlights.reduce((sum, f) => sum + f.distance, 0);
  const totalHours = allFlights.reduce((sum, f) => sum + (f.duration || 0), 0) / 60;

  // Calculate on-time performance (only for flights with actual times)
  const flightsWithActuals = completedSavedFlights.filter(f => f.arrival.actualTime);
  const onTimeFlights = flightsWithActuals.filter(f => {
    if (!f.arrival.actualTime) return true;
    const scheduled = new Date(f.arrival.time);
    const actual = new Date(f.arrival.actualTime);
    return actual <= new Date(scheduled.getTime() + 15 * 60000); // 15 min tolerance
  });
  const onTimePercentage = flightsWithActuals.length > 0 ?
    (onTimeFlights.length / flightsWithActuals.length) * 100 : 0;

  // Calculate airline distribution
  const airlineCounts: Record<string, number> = {};
  allFlights.forEach(f => {
    airlineCounts[f.airline] = (airlineCounts[f.airline] || 0) + 1;
  });

  const airlines = Object.entries(airlineCounts)
    .map(([name, count]) => ({
      name,
      count,
      percentage: (count / totalFlights) * 100
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  const favoriteAirline = airlines.length > 0 ? airlines[0].name : '';

  // Calculate airport distribution
  const airportCounts: Record<string, number> = {};
  allFlights.forEach(f => {
    airportCounts[f.departure.airport] = (airportCounts[f.departure.airport] || 0) + 1;
    airportCounts[f.arrival.airport] = (airportCounts[f.arrival.airport] || 0) + 1;
  });

  const airports = Object.entries(airportCounts)
    .map(([code, visits]) => ({
      code,
      visits,
      percentage: (visits / (totalFlights * 2)) * 100
    }))
    .sort((a, b) => b.visits - a.visits)
    .slice(0, 15);

  const mostVisitedAirport = airports.length > 0 ? airports[0].code : '';

  // Find longest flight
  const longestFlight = allFlights.reduce((longest, current) => {
    if (current.distance > (longest?.distance || 0)) {
      return {
        flightNumber: current.flightNumber,
        departure: current.departure.airport,
        arrival: current.arrival.airport,
        distance: current.distance,
        duration: current.duration,
        source: current.source
      };
    }
    return longest;
  }, null as CombinedStats['longestFlight']);

  // Calculate average delay
  const delayedFlights = completedSavedFlights.filter(f => f.arrival.actualTime);
  const totalDelay = delayedFlights.reduce((sum, f) => {
    if (!f.arrival.actualTime) return sum;
    const scheduled = new Date(f.arrival.time);
    const actual = new Date(f.arrival.actualTime);
    return sum + Math.max(0, actual.getTime() - scheduled.getTime());
  }, 0);
  const averageDelay = delayedFlights.length > 0 ? totalDelay / delayedFlights.length / 60000 : 0;

  // Calculate yearly breakdown
  const yearCounts: Record<number, { flights: number; miles: number }> = {};
  allFlights.forEach(f => {
    const year = new Date(f.departure.time).getFullYear();
    if (!yearCounts[year]) {
      yearCounts[year] = { flights: 0, miles: 0 };
    }
    yearCounts[year].flights += 1;
    yearCounts[year].miles += f.distance;
  });

  const yearlyBreakdown = Object.entries(yearCounts)
    .map(([year, data]) => ({
      year: parseInt(year),
      flights: data.flights,
      miles: data.miles
    }))
    .sort((a, b) => b.year - a.year);

  return {
    totalFlights,
    totalMiles,
    totalHours,
    onTimePercentage,
    favoriteAirline,
    mostVisitedAirport,
    longestFlight,
    averageDelay,
    upcomingFlights,
    completedFlights: completedSavedFlights.length,
    airlines,
    airports,
    yearlyBreakdown
  };
}