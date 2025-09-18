import { FlightRecord } from './types';

const SAVED_FLIGHTS_KEY = "depart:savedFlights";

type SavedFlight = {
  id: string;
  flightNumber: string;
  airline: string;
  departure: {
    airport: string;
    city?: string;
    time: string; // ISO string
    actualTime?: string;
  };
  arrival: {
    airport: string;
    city?: string;
    time: string; // ISO string
    actualTime?: string;
  };
  status: "upcoming" | "completed" | "cancelled" | "delayed";
  aircraft?: string;
  duration?: number; // minutes
  distance?: number; // miles
  gate?: string;
  seat?: string;
  notes?: string;
  savedAt: number;
};

function extractAirlineIata(flightNumber: string): string | undefined {
  const match = flightNumber.match(/^([A-Z]{2})\d+$/);
  return match ? match[1] : undefined;
}

function convertMilesToKm(miles?: number): number | undefined {
  return miles ? miles * 1.609344 : undefined;
}

export function getUserFlights(): FlightRecord[] {
  try {
    const saved = localStorage.getItem(SAVED_FLIGHTS_KEY);
    if (!saved) {
      // Return sample data for development
      return getSampleFlights();
    }

    const flights: SavedFlight[] = JSON.parse(saved);
    if (!Array.isArray(flights)) {
      return getSampleFlights();
    }

    // Convert SavedFlight to FlightRecord
    return flights
      .filter(flight => flight.departure?.airport && flight.arrival?.airport)
      .map((flight) => ({
        id: flight.id,
        depIata: flight.departure.airport,
        arrIata: flight.arrival.airport,
        depLocalISO: flight.departure.time,
        arrLocalISO: flight.arrival?.time,
        airlineIata: extractAirlineIata(flight.flightNumber),
        operatorAirlineIata: extractAirlineIata(flight.flightNumber),
        blockMinutes: flight.duration,
        distanceKm: convertMilesToKm(flight.distance)
      }));

  } catch (error) {
    console.error('Error loading flights:', error);
    return getSampleFlights();
  }
}

function getSampleFlights(): FlightRecord[] {
  return [
    {
      id: 'sample-1',
      depIata: 'YYZ',
      arrIata: 'LAX',
      depLocalISO: '2024-01-15T08:00:00',
      arrLocalISO: '2024-01-15T11:30:00',
      airlineIata: 'AC',
      operatorAirlineIata: 'AC',
      blockMinutes: 330,
      distanceKm: 3505
    },
    {
      id: 'sample-2',
      depIata: 'LAX',
      arrIata: 'LHR',
      depLocalISO: '2024-01-20T14:00:00',
      arrLocalISO: '2024-01-21T09:45:00',
      airlineIata: 'BA',
      operatorAirlineIata: 'BA',
      blockMinutes: 645,
      distanceKm: 8756
    },
    {
      id: 'sample-3',
      depIata: 'LHR',
      arrIata: 'CDG',
      depLocalISO: '2024-02-01T10:15:00',
      arrLocalISO: '2024-02-01T12:45:00',
      airlineIata: 'AF',
      operatorAirlineIata: 'AF',
      blockMinutes: 90,
      distanceKm: 344
    },
    {
      id: 'sample-4',
      depIata: 'CDG',
      arrIata: 'NRT',
      depLocalISO: '2024-02-05T13:20:00',
      arrLocalISO: '2024-02-06T08:55:00',
      airlineIata: 'JL',
      operatorAirlineIata: 'JL',
      blockMinutes: 735,
      distanceKm: 9850
    },
    {
      id: 'sample-5',
      depIata: 'NRT',
      arrIata: 'SIN',
      depLocalISO: '2024-02-10T16:30:00',
      arrLocalISO: '2024-02-10T23:15:00',
      airlineIata: 'SQ',
      operatorAirlineIata: 'SQ',
      blockMinutes: 405,
      distanceKm: 5320
    },
    {
      id: 'sample-6',
      depIata: 'SIN',
      arrIata: 'SYD',
      depLocalISO: '2024-02-15T02:10:00',
      arrLocalISO: '2024-02-15T12:25:00',
      airlineIata: 'QF',
      operatorAirlineIata: 'QF',
      blockMinutes: 495,
      distanceKm: 6305
    },
    {
      id: 'sample-7',
      depIata: 'SYD',
      arrIata: 'YYZ',
      depLocalISO: '2024-03-01T22:00:00',
      arrLocalISO: '2024-03-01T17:30:00',
      airlineIata: 'AC',
      operatorAirlineIata: 'AC',
      blockMinutes: 975,
      distanceKm: 15400
    }
  ];
}