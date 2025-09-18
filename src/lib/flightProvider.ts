export type FlightStatus = 
  | 'scheduled' 
  | 'boarding' 
  | 'departed' 
  | 'in-flight' 
  | 'landed' 
  | 'arrived' 
  | 'delayed' 
  | 'cancelled' 
  | 'diverted';

export interface FlightLeg {
  airport: {
    code: string;
    name: string;
    city: string;
    timezone: string;
  };
  terminal?: string;
  gate?: string;
  scheduled: {
    time: string; // ISO string
    runway?: string;
  };
  actual?: {
    time?: string; // ISO string
    runway?: string;
  };
  estimated?: {
    time?: string; // ISO string
  };
}

export interface FlightDetail {
  id: string;
  flightNumber: string;
  airline: {
    code: string;
    name: string;
  };
  aircraft: {
    type: string;
    registration?: string;
    age?: number;
  };
  departure: FlightLeg;
  arrival: FlightLeg;
  status: FlightStatus;
  duration: {
    scheduled: number; // minutes
    actual?: number; // minutes
  };
  distance: {
    nauticalMiles: number;
    kilometers: number;
  };
  route?: {
    waypoints: string[];
    cruisingAltitude?: number;
  };
  delays?: {
    departure?: {
      minutes: number;
      reason?: string;
    };
    arrival?: {
      minutes: number;
      reason?: string;
    };
  };
  metrics: {
    delayRisk: number; // 0-100
    taxiTimes: number[]; // historical taxi times in minutes
    arrivalOffsets: number[]; // historical arrival offsets in minutes
    onTimePerformance: number; // 0-100
  };
  lastUpdated: string; // ISO string
}

export interface FlightProvider {
  getFlightById(id: string): Promise<FlightDetail>;
}

class DummyProvider implements FlightProvider {
  private flights: Map<string, FlightDetail> = new Map();

  constructor() {
    // Seed with some realistic sample flights
    this.seedData();
  }

  private seedData(): void {
    const baseDate = new Date('2025-01-15');
    
    const sampleFlights: FlightDetail[] = [
      {
        id: '1',
        flightNumber: 'AC 1234',
        airline: {
          code: 'AC',
          name: 'Air Canada'
        },
        aircraft: {
          type: 'Boeing 737-800',
          registration: 'C-FXXX',
          age: 8
        },
        departure: {
          airport: {
            code: 'YOW',
            name: 'Ottawa Macdonald-Cartier International Airport',
            city: 'Ottawa',
            timezone: 'America/Toronto'
          },
          terminal: '1',
          gate: 'B12',
          scheduled: {
            time: new Date(baseDate.getTime() + 14.5 * 60 * 60 * 1000).toISOString(), // 2:30 PM
            runway: '07R'
          },
          actual: {
            time: new Date(baseDate.getTime() + 14.58 * 60 * 60 * 1000).toISOString(), // 2:35 PM (5 min delay)
            runway: '07R'
          }
        },
        arrival: {
          airport: {
            code: 'YYZ',
            name: 'Toronto Pearson International Airport',
            city: 'Toronto',
            timezone: 'America/Toronto'
          },
          terminal: '1',
          gate: 'D23',
          scheduled: {
            time: new Date(baseDate.getTime() + 15.75 * 60 * 60 * 1000).toISOString(), // 3:45 PM
            runway: '05'
          },
          estimated: {
            time: new Date(baseDate.getTime() + 15.83 * 60 * 60 * 1000).toISOString() // 3:50 PM
          }
        },
        status: 'in-flight',
        duration: {
          scheduled: 75, // 1h 15m
          actual: 70 // actual flight time shorter due to winds
        },
        distance: {
          nauticalMiles: 220,
          kilometers: 407
        },
        route: {
          waypoints: ['YOW', 'LIBKO', 'BRAFS', 'YYZ'],
          cruisingAltitude: 35000
        },
        delays: {
          departure: {
            minutes: 5,
            reason: 'Air traffic control delay'
          }
        },
        metrics: {
          delayRisk: 25,
          taxiTimes: [12, 15, 18, 14, 16, 13, 17, 19, 15, 14, 16, 12],
          arrivalOffsets: [-5, 2, -3, 8, 1, -2, 4, -1, 3, 0, 2, -4],
          onTimePerformance: 78
        },
        lastUpdated: new Date().toISOString()
      },
      {
        id: '2',
        flightNumber: 'WS 3456',
        airline: {
          code: 'WS',
          name: 'WestJet'
        },
        aircraft: {
          type: 'Boeing 787-9',
          registration: 'C-GVWJ',
          age: 3
        },
        departure: {
          airport: {
            code: 'YYC',
            name: 'Calgary International Airport',
            city: 'Calgary',
            timezone: 'America/Edmonton'
          },
          terminal: 'International',
          gate: 'F45',
          scheduled: {
            time: new Date(baseDate.getTime() + 20 * 60 * 60 * 1000).toISOString(), // 8:00 PM
          },
          actual: {
            time: new Date(baseDate.getTime() + 19.92 * 60 * 60 * 1000).toISOString(), // 7:55 PM (5 min early)
          }
        },
        arrival: {
          airport: {
            code: 'LHR',
            name: 'London Heathrow Airport',
            city: 'London',
            timezone: 'Europe/London'
          },
          terminal: '2',
          gate: 'A12',
          scheduled: {
            time: new Date(baseDate.getTime() + 29 * 60 * 60 * 1000).toISOString(), // 5:00 AM+1
          }
        },
        status: 'departed',
        duration: {
          scheduled: 540, // 9h 0m
        },
        distance: {
          nauticalMiles: 4200,
          kilometers: 7778
        },
        route: {
          waypoints: ['YYC', 'TUDEP', 'OYKEL', 'MALOT', 'LHR'],
          cruisingAltitude: 42000
        },
        metrics: {
          delayRisk: 45,
          taxiTimes: [25, 28, 32, 30, 27, 29, 35, 31, 28, 26],
          arrivalOffsets: [-10, 15, -5, 25, 8, -3, 12, -8, 18, 2],
          onTimePerformance: 65
        },
        lastUpdated: new Date().toISOString()
      }
    ];

    sampleFlights.forEach(flight => {
      this.flights.set(flight.id, flight);
    });
  }

  async getFlightById(id: string): Promise<FlightDetail> {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, Math.random() * 500 + 200));
    
    const flight = this.flights.get(id);
    
    if (!flight) {
      throw new Error(`Flight with ID ${id} not found`);
    }
    
    // Return a copy to prevent mutations
    return JSON.parse(JSON.stringify(flight));
  }
}

let providerInstance: FlightProvider | null = null;

export function getProvider(): FlightProvider {
  if (!providerInstance) {
    // For now, always return DummyProvider
    // Later this could check environment variables or config
    // to return different providers (FlightAware, FlightRadar24, etc.)
    providerInstance = new DummyProvider();
  }
  
  return providerInstance;
}

// Helper function to reset provider (useful for testing)
export function resetProvider(): void {
  providerInstance = null;
}