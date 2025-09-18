import type { SavedFlight } from "@/app/profile/page";

const SAVED_FLIGHTS_KEY = "depart:savedFlights";

export interface FlightToSave {
  flightNumber: string;
  airline: string;
  departure: {
    airport: string;
    city?: string;
    time: string; // ISO string
    terminal?: string;
    gate?: string;
  };
  arrival: {
    airport: string;
    city?: string;
    time: string; // ISO string
    terminal?: string;
    gate?: string;
  };
  aircraft?: string;
  distance?: number; // miles
  duration?: number; // minutes
  notes?: string;
}

export function generateFlightId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

export function determineFlightStatus(departureTime: string): SavedFlight["status"] {
  const now = new Date();
  const depTime = new Date(departureTime);

  if (depTime > now) {
    return "upcoming";
  } else {
    return "completed";
  }
}

export function saveFlightToProfile(flightData: FlightToSave): SavedFlight {
  const savedFlight: SavedFlight = {
    id: generateFlightId(),
    flightNumber: flightData.flightNumber,
    airline: flightData.airline,
    departure: {
      airport: flightData.departure.airport,
      city: flightData.departure.city,
      time: flightData.departure.time,
    },
    arrival: {
      airport: flightData.arrival.airport,
      city: flightData.arrival.city,
      time: flightData.arrival.time,
    },
    status: determineFlightStatus(flightData.departure.time),
    aircraft: flightData.aircraft,
    duration: flightData.duration,
    distance: flightData.distance,
    gate: flightData.departure.gate,
    notes: flightData.notes,
    savedAt: Date.now(),
  };

  // Get existing flights
  const existing = getSavedFlights();

  // Check if this flight already exists (same flight number and departure time)
  const isDuplicate = existing.some(f =>
    f.flightNumber === savedFlight.flightNumber &&
    f.departure.time === savedFlight.departure.time
  );

  if (isDuplicate) {
    throw new Error("This flight has already been saved to your profile");
  }

  // Add new flight and save
  const updated = [...existing, savedFlight];
  localStorage.setItem(SAVED_FLIGHTS_KEY, JSON.stringify(updated));

  return savedFlight;
}

export function getSavedFlights(): SavedFlight[] {
  try {
    const saved = localStorage.getItem(SAVED_FLIGHTS_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      return Array.isArray(parsed) ? parsed : [];
    }
  } catch {}
  return [];
}

export function removeSavedFlight(flightId: string): void {
  const existing = getSavedFlights();
  const updated = existing.filter(f => f.id !== flightId);
  localStorage.setItem(SAVED_FLIGHTS_KEY, JSON.stringify(updated));
}

export function updateFlightStatus(flightId: string, status: SavedFlight["status"]): void {
  const existing = getSavedFlights();
  const updated = existing.map(f =>
    f.id === flightId ? { ...f, status } : f
  );
  localStorage.setItem(SAVED_FLIGHTS_KEY, JSON.stringify(updated));
}

// Helper to convert lookup data to our SavedFlight format
export function convertLookupToSaveable(lookupData: any): FlightToSave | null {
  try {
    if (!lookupData.flight || !lookupData.departure?.scheduledLocalISO || !lookupData.arrival?.scheduledLocalISO) {
      return null;
    }

    return {
      flightNumber: lookupData.flight,
      airline: lookupData.airlineName || lookupData.airline || "Unknown Airline",
      departure: {
        airport: lookupData.departure.airport,
        city: lookupData.departure.city,
        time: lookupData.departure.scheduledLocalISO,
        terminal: lookupData.departure.terminal,
        gate: lookupData.departure.gate,
      },
      arrival: {
        airport: lookupData.arrival.airport,
        city: lookupData.arrival.city,
        time: lookupData.arrival.scheduledLocalISO,
        terminal: lookupData.arrival.terminal,
        gate: lookupData.arrival.gate,
      },
      aircraft: lookupData.aircraft?.type,
      // Calculate duration if not provided
      duration: lookupData.duration || calculateFlightDuration(
        lookupData.departure.scheduledLocalISO,
        lookupData.arrival.scheduledLocalISO
      ),
      // Distance would need to be calculated or fetched separately
      distance: undefined,
    };
  } catch {
    return null;
  }
}

function calculateFlightDuration(depTime: string, arrTime: string): number {
  const dep = new Date(depTime);
  const arr = new Date(arrTime);
  return Math.round((arr.getTime() - dep.getTime()) / (1000 * 60));
}