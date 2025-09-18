// Minimal airport registry with coordinates and country codes
export const AIRPORTS: Record<string, { lat: number; lon: number; country: string; city?: string }> = {
  // North America
  'YYZ': { lat: 43.6777, lon: -79.6248, country: 'CA', city: 'Toronto' },
  'LAX': { lat: 33.9425, lon: -118.4081, country: 'US', city: 'Los Angeles' },
  'JFK': { lat: 40.6413, lon: -73.7781, country: 'US', city: 'New York' },
  'ORD': { lat: 41.9742, lon: -87.9073, country: 'US', city: 'Chicago' },
  'DFW': { lat: 32.8998, lon: -97.0403, country: 'US', city: 'Dallas' },
  'YVR': { lat: 49.1967, lon: -123.1815, country: 'CA', city: 'Vancouver' },
  'YUL': { lat: 45.4657, lon: -73.7455, country: 'CA', city: 'Montreal' },

  // Europe
  'LHR': { lat: 51.4700, lon: -0.4543, country: 'GB', city: 'London' },
  'CDG': { lat: 49.0097, lon: 2.5479, country: 'FR', city: 'Paris' },
  'FRA': { lat: 50.0379, lon: 8.5622, country: 'DE', city: 'Frankfurt' },
  'AMS': { lat: 52.3105, lon: 4.7683, country: 'NL', city: 'Amsterdam' },
  'FCO': { lat: 41.8003, lon: 12.2389, country: 'IT', city: 'Rome' },
  'MAD': { lat: 40.4839, lon: -3.5680, country: 'ES', city: 'Madrid' },
  'ZUR': { lat: 47.4647, lon: 8.5492, country: 'CH', city: 'Zurich' },

  // Asia
  'NRT': { lat: 35.7720, lon: 140.3928, country: 'JP', city: 'Tokyo' },
  'HND': { lat: 35.5494, lon: 139.7798, country: 'JP', city: 'Tokyo Haneda' },
  'ICN': { lat: 37.4602, lon: 126.4407, country: 'KR', city: 'Seoul' },
  'PEK': { lat: 39.5098, lon: 116.4105, country: 'CN', city: 'Beijing' },
  'PVG': { lat: 31.1443, lon: 121.8083, country: 'CN', city: 'Shanghai' },
  'BKK': { lat: 13.6900, lon: 100.7501, country: 'TH', city: 'Bangkok' },
  'SIN': { lat: 1.3644, lon: 103.9915, country: 'SG', city: 'Singapore' },

  // Australia/Oceania
  'SYD': { lat: -33.9399, lon: 151.1753, country: 'AU', city: 'Sydney' },
  'MEL': { lat: -37.6690, lon: 144.8410, country: 'AU', city: 'Melbourne' },
  'AKL': { lat: -37.0082, lon: 174.7850, country: 'NZ', city: 'Auckland' },

  // Middle East
  'DXB': { lat: 25.2532, lon: 55.3657, country: 'AE', city: 'Dubai' },
  'DOH': { lat: 25.2731, lon: 51.6080, country: 'QA', city: 'Doha' },

  // Sample airlines for development
  'AC123': { lat: 43.6777, lon: -79.6248, country: 'CA', city: 'Sample Route' },
  'WS3456': { lat: 49.1967, lon: -123.1815, country: 'CA', city: 'Sample Route' }
};

export function getAirportInfo(iata: string) {
  return AIRPORTS[iata.toUpperCase()];
}