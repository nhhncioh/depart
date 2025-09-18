"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Plane, Clock, MapPin, Calendar, TrendingUp, Award } from "lucide-react";
import PassportCard from "@/components/passport/PassportCard";
import { getUserFlights } from "@/lib/passport/getUserFlights";
import { computePassportStats } from "@/lib/passport/aggregate";
import { getSavedFlights, removeSavedFlight, updateFlightStatus } from "@/lib/flightSaving";
import { computeCombinedStats, type CombinedStats } from "@/lib/combinedStats";

type UserPreferences = {
  name?: string;
  homeAirport?: string;
  hasNexus: boolean;
  preferredAirline?: string;
  checkedBag: boolean;
  travelParty: "solo" | "couple" | "family" | "group";
  walkingPace: "fast" | "normal" | "slow";
};

export type SavedFlight = {
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

type FlightStats = {
  totalFlights: number;
  totalMiles: number;
  totalHours: number;
  onTimePercentage: number;
  favoriteAirline: string;
  mostVisitedAirport: string;
  longestFlight: SavedFlight | null;
  averageDelay: number; // minutes
};

const PREFERENCES_KEY = "depart:userPreferences";

export default function ProfilePage() {
  const [flights, setFlights] = useState<SavedFlight[]>([]);
  const [stats, setStats] = useState<FlightStats | null>(null);
  const [combinedStats, setCombinedStats] = useState<CombinedStats | null>(null);
  const [activeTab, setActiveTab] = useState<
    "upcoming" | "past" | "stats" | "preferences"
  >("upcoming");
  const [preferences, setPreferences] = useState<UserPreferences>({
    hasNexus: false,
    checkedBag: false,
    travelParty: "solo",
    walkingPace: "normal",
  });

  useEffect(() => {
    // Load saved flights using the utility function
    const savedFlights = getSavedFlights();
    setFlights(savedFlights);

    // Load preferences
    try {
      const saved = localStorage.getItem(PREFERENCES_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        setPreferences((prev) => ({ ...prev, ...parsed }));
      }
    } catch {}

    // Auto-update flight statuses based on current time
    const now = new Date();
    let needsUpdate = false;
    const updatedFlights = savedFlights.map(flight => {
      const depTime = new Date(flight.departure.time);
      const expectedStatus = depTime > now ? "upcoming" : "completed";

      if (flight.status !== expectedStatus && flight.status !== "cancelled") {
        needsUpdate = true;
        return { ...flight, status: expectedStatus as SavedFlight["status"] };
      }
      return flight;
    });

    if (needsUpdate) {
      setFlights(updatedFlights);
      localStorage.setItem("depart:savedFlights", JSON.stringify(updatedFlights));
    }
  }, []);

  useEffect(() => {
    // Calculate both old stats (for saved flights only) and new combined stats
    if (!flights.length) {
      setStats(null);
    } else {
      const completedFlights = flights.filter((f) => f.status === "completed");
      const totalMiles = completedFlights.reduce(
        (sum, f) => sum + (f.distance || 0),
        0
      );
      const totalHours =
        completedFlights.reduce((sum, f) => sum + (f.duration || 0), 0) / 60;

      const onTimeFlights = completedFlights.filter((f) => {
        if (!f.arrival.actualTime) return true;
        const scheduled = new Date(f.arrival.time);
        const actual = new Date(f.arrival.actualTime);
        return actual <= new Date(scheduled.getTime() + 15 * 60000);
      });
      const onTimePercentage =
        completedFlights.length > 0
          ? (onTimeFlights.length / completedFlights.length) * 100
          : 0;

      const airlineCounts = completedFlights.reduce((acc, f) => {
        acc[f.airline] = (acc[f.airline] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      const favoriteAirline = Object.keys(airlineCounts).reduce(
        (a, b) => ((airlineCounts as any)[a] > (airlineCounts as any)[b] ? a : b),
        ""
      );

      const airportCounts = completedFlights.reduce((acc, f) => {
        acc[f.departure.airport] = (acc[f.departure.airport] || 0) + 1;
        acc[f.arrival.airport] = (acc[f.arrival.airport] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      const mostVisitedAirport = Object.keys(airportCounts).reduce(
        (a, b) => (airportCounts[a] > airportCounts[b] ? a : b),
        ""
      );

      const longestFlight = completedFlights.reduce(
        (longest, current) =>
          (current.distance || 0) > (longest?.distance || 0) ? current : longest,
        null as SavedFlight | null
      );

      const delayedFlights = completedFlights.filter((f) => f.arrival.actualTime);
      const totalDelay = delayedFlights.reduce((sum, f) => {
        const scheduled = new Date(f.arrival.time);
        const actual = new Date(f.arrival.actualTime!);
        return sum + Math.max(0, actual.getTime() - scheduled.getTime());
      }, 0);
      const averageDelay =
        delayedFlights.length > 0 ? totalDelay / delayedFlights.length / 60000 : 0;

      setStats({
        totalFlights: completedFlights.length,
        totalMiles,
        totalHours,
        onTimePercentage,
        favoriteAirline,
        mostVisitedAirport,
        longestFlight,
        averageDelay,
      });
    }

    // Always calculate combined stats (includes passport + saved flights)
    setCombinedStats(computeCombinedStats(flights));
  }, [flights]);

  function savePreferences(newPreferences: UserPreferences) {
    try {
      localStorage.setItem(PREFERENCES_KEY, JSON.stringify(newPreferences));
      setPreferences(newPreferences);
    } catch {}
  }

  function deleteFlight(id: string) {
    removeSavedFlight(id);
    setFlights(getSavedFlights());
  }

  function formatDuration(minutes: number) {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  }

  function formatDate(isoString: string) {
    return new Date(isoString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }

  function formatTime(isoString: string) {
    return new Date(isoString).toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  }

  const upcomingFlights = useMemo(
    () =>
      flights
        .filter((f) => f.status === "upcoming")
        .sort(
          (a, b) =>
            new Date(a.departure.time).getTime() -
            new Date(b.departure.time).getTime()
        ),
    [flights]
  );
  const pastFlights = useMemo(
    () => flights
      .filter((f) => f.status !== "upcoming")
      .sort((a, b) => new Date(b.departure.time).getTime() - new Date(a.departure.time).getTime()),
    [flights]
  );

  const passportFlights = getUserFlights();
  const passportStats = computePassportStats(passportFlights);

  // Combine routes from both passport data AND saved flights for the map
  const savedFlightRoutes = new Map<string, number>();

  // Add routes from completed saved flights
  flights
    .filter(f => f.status === 'completed' && f.departure.airport && f.arrival.airport)
    .forEach(flight => {
      const routeKey = `${flight.departure.airport}-${flight.arrival.airport}`;
      savedFlightRoutes.set(routeKey, (savedFlightRoutes.get(routeKey) || 0) + 1);
    });

  // Combine passport routes with saved flight routes
  const combinedRoutes = new Map<string, { from: string; to: string; count: number }>();

  // Add passport routes
  passportStats.routes.forEach(route => {
    const key = `${route.from}-${route.to}`;
    combinedRoutes.set(key, route);
  });

  // Add or update with saved flight routes
  savedFlightRoutes.forEach((count, routeKey) => {
    const [from, to] = routeKey.split('-');
    const existing = combinedRoutes.get(routeKey);
    if (existing) {
      existing.count += count;
    } else {
      combinedRoutes.set(routeKey, { from, to, count });
    }
  });

  const routesForMap = Array.from(combinedRoutes.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, 50)
    .map((r) => ({ fromIata: r.from, toIata: r.to, value: r.count }));

  // Include airports from both passport AND saved flights
  const savedFlightAirports = flights
    .filter(f => f.departure.airport && f.arrival.airport)
    .flatMap(f => [f.departure.airport, f.arrival.airport]);

  const airportsInUse = Array.from(
    new Set([
      ...passportFlights.flatMap((f) => [f.depIata, f.arrIata]),
      ...savedFlightAirports
    ])
  );

  return (
    <main className="app-shell profile-root">
      <div className="container" style={{ maxWidth: 1100 }}>
        <div className="header">
          <div className="brand">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path d="M3 12h18M3 12c6-4 12-4 18 0M3 12c6 4 12 4 18 0" stroke="url(#g)" strokeWidth="1.6" strokeLinecap="round"/>
              <defs>
                <linearGradient id="g" x1="3" y1="12" x2="21" y2="12" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#6ee7ff"/><stop offset="1" stopColor="#a78bfa"/>
                </linearGradient>
              </defs>
            </svg>
            <div>depart</div>
          </div>
          <div className="badge">profile</div>
        </div>

        <section className="card card-lg">
          <div className="card-inner">
            <div className="row" style={{ justifyContent: 'flex-end', gap: 8, marginBottom: 8 }}>
              <Link href="/" className="btn btn-secondary">Home</Link>
            </div>

            <div className="row" style={{ gap: 8, marginBottom: 16 }}>
              <button
                className={`btn ${activeTab === "upcoming" ? "btn-primary" : "btn-secondary"}`}
                onClick={() => setActiveTab("upcoming")}
              >
                Upcoming
              </button>
              <button
                className={`btn ${activeTab === "past" ? "btn-primary" : "btn-secondary"}`}
                onClick={() => setActiveTab("past")}
              >
                Past
              </button>
              <button
                className={`btn ${activeTab === "stats" ? "btn-primary" : "btn-secondary"}`}
                onClick={() => setActiveTab("stats")}
              >
                Stats
              </button>
              <button
                className={`btn ${activeTab === "preferences" ? "btn-primary" : "btn-secondary"}`}
                onClick={() => setActiveTab("preferences")}
              >
                Preferences
              </button>
            </div>

        {activeTab === "upcoming" && (
          <div>
            {upcomingFlights.length === 0 ? (
              <div className="card" style={{ padding: 40, textAlign: "center" }}>
                <Clock size={32} style={{ margin: "0 auto 16px", opacity: 0.5 }} />
                <p style={{ margin: 0, opacity: 0.7 }}>No upcoming flights saved</p>
                <p style={{ margin: "8px 0 0", fontSize: 14, opacity: 0.5 }}>
                  Add a flight to see it here
                </p>
              </div>
            ) : (
              <div className="grid">
                {upcomingFlights.map((flight) => (
                  <div key={flight.id} className="card">
                    <div
                      className="row"
                      style={{ justifyContent: "space-between", alignItems: "flex-start" }}
                    >
                      <div>
                        <div className="row" style={{ alignItems: "center", marginBottom: 8 }}>
                          <strong style={{ fontSize: 18 }}>{flight.flightNumber}</strong>
                          <span style={{ opacity: 0.6, marginLeft: 8 }}>{flight.airline}</span>
                          <span
                            className={`chip ${
                              flight.status === "completed"
                                ? "chip-success"
                                : flight.status === "delayed"
                                ? "chip-warning"
                                : flight.status === "cancelled"
                                ? "chip-error"
                                : ""
                            }`}
                            style={{ marginLeft: 8 }}
                          >
                            {flight.status}
                          </span>
                        </div>
                        <div className="row" style={{ alignItems: "center", marginBottom: 4 }}>
                          <MapPin size={14} style={{ marginRight: 6, opacity: 0.5 }} />
                          <span>
                            {flight.departure.airport} &rarr; {flight.arrival.airport}
                          </span>
                          {flight.distance && (
                            <span style={{ opacity: 0.6, marginLeft: 8 }}>
                              ({flight.distance.toLocaleString()} mi)
                            </span>
                          )}
                        </div>
                        <div className="row" style={{ alignItems: "center" }}>
                          <Calendar size={14} style={{ marginRight: 6, opacity: 0.5 }} />
                          <span>
                            {formatDate(flight.departure.time)} at {formatTime(flight.departure.time)}
                          </span>
                          {flight.duration && (
                            <>
                              <Clock
                                size={14}
                                style={{ marginLeft: 12, marginRight: 6, opacity: 0.5 }}
                              />
                              <span>{formatDuration(flight.duration)}</span>
                            </>
                          )}
                        </div>
                        {flight.gate || flight.seat ? (
                          <div className="row" style={{ alignItems: "center", marginTop: 4 }}>
                            {flight.gate && (
                              <span style={{ fontSize: 12, opacity: 0.6 }}>Gate {flight.gate}</span>
                            )}
                            {flight.seat && (
                              <span style={{ fontSize: 12, opacity: 0.6, marginLeft: 12 }}>
                                Seat {flight.seat}
                              </span>
                            )}
                          </div>
                        ) : null}
                      </div>
                      <button
                        onClick={() => deleteFlight(flight.id)}
                        className="btn btn-secondary"
                        style={{ padding: "4px 8px", fontSize: 12 }}
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === "past" && (
          <div>
            {pastFlights.length === 0 ? (
              <div className="card" style={{ padding: 40, textAlign: "center" }}>
                <Clock size={32} style={{ margin: "0 auto 16px", opacity: 0.5 }} />
                <p style={{ margin: 0, opacity: 0.7 }}>No past flights saved</p>
                <p style={{ margin: "8px 0 0", fontSize: 14, opacity: 0.5 }}>
                  Your completed flights will appear here
                </p>
              </div>
            ) : (
              <div className="grid">
                {pastFlights.map((flight) => (
                  <div key={flight.id} className="card">
                    <div
                      className="row"
                      style={{ justifyContent: "space-between", alignItems: "flex-start" }}
                    >
                      <div>
                        <div className="row" style={{ alignItems: "center", marginBottom: 8 }}>
                          <strong style={{ fontSize: 18 }}>{flight.flightNumber}</strong>
                          <span style={{ opacity: 0.6, marginLeft: 8 }}>{flight.airline}</span>
                          <span
                            className={`chip ${
                              flight.status === "completed"
                                ? "chip-success"
                                : flight.status === "delayed"
                                ? "chip-warning"
                                : "chip-error"
                            }`}
                            style={{ marginLeft: 8 }}
                          >
                            {flight.status}
                          </span>
                        </div>
                        <div className="row" style={{ alignItems: "center", marginBottom: 4 }}>
                          <MapPin size={14} style={{ marginRight: 6, opacity: 0.5 }} />
                          <span>
                            {flight.departure.airport} &rarr; {flight.arrival.airport}
                          </span>
                          {flight.distance && (
                            <span style={{ opacity: 0.6, marginLeft: 8 }}>
                              ({flight.distance.toLocaleString()} mi)
                            </span>
                          )}
                        </div>
                        <div className="row" style={{ alignItems: "center" }}>
                          <Calendar size={14} style={{ marginRight: 6, opacity: 0.5 }} />
                          <span>{formatDate(flight.departure.time)}</span>
                          {flight.duration && (
                            <>
                              <Clock
                                size={14}
                                style={{ marginLeft: 12, marginRight: 6, opacity: 0.5 }}
                              />
                              <span>{formatDuration(flight.duration)}</span>
                            </>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => deleteFlight(flight.id)}
                        className="btn btn-secondary"
                        style={{ padding: "4px 8px", fontSize: 12 }}
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === "stats" && (
          <div>
            <div className="passport-print" style={{ marginBottom: 32 }}>
              <PassportCard
                stats={passportStats}
                routesForMap={routesForMap}
                airportsInUse={airportsInUse}
                username={preferences.name}
              />

              <div className="row" style={{ marginTop: 16, justifyContent: "center" }}>
                <a
                  href={`/passport/og?u=${encodeURIComponent(preferences.name || "traveler")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-secondary"
                >
                  Share image
                </a>
                <button className="btn btn-secondary" onClick={() => window.print()}>
                  Print / Save PDF
                </button>
              </div>
            </div>

            {!combinedStats || combinedStats.totalFlights === 0 ? (
              <div className="card" style={{ padding: 40, textAlign: "center" }}>
                <TrendingUp size={32} style={{ margin: "0 auto 16px", opacity: 0.5 }} />
                <p style={{ margin: 0, opacity: 0.7 }}>No flight statistics available</p>
                <p style={{ margin: "8px 0 0", fontSize: 14, opacity: 0.5 }}>
                  Save some flights or import your flight data to see statistics
                </p>
              </div>
            ) : (
              <div className="grid grid-2">
                <div className="card stats-card">
                  <div className="row" style={{ alignItems: "center", marginBottom: 8 }}>
                    <Plane size={20} style={{ marginRight: 8, opacity: 0.6 }} />
                    <span className="label">Total Flights</span>
                  </div>
                  <div style={{ fontSize: 32, fontWeight: "bold", color: "#6ee7ff" }}>
                    {combinedStats.totalFlights.toLocaleString()}
                  </div>
                  <div style={{ fontSize: 12, opacity: 0.6, marginTop: 4 }}>
                    {combinedStats.upcomingFlights} upcoming, {combinedStats.completedFlights} completed
                  </div>
                </div>

                <div className="card stats-card">
                  <div className="row" style={{ alignItems: "center", marginBottom: 8 }}>
                    <MapPin size={20} style={{ marginRight: 8, opacity: 0.6 }} />
                    <span className="label">Miles Flown</span>
                  </div>
                  <div style={{ fontSize: 32, fontWeight: "bold", color: "#6ee7ff" }}>
                    {Math.round(combinedStats.totalMiles).toLocaleString()}
                  </div>
                  <div style={{ fontSize: 12, opacity: 0.6, marginTop: 4 }}>
                    {Math.round(combinedStats.totalMiles * 1.609).toLocaleString()} km
                  </div>
                </div>

                <div className="card stats-card">
                  <div className="row" style={{ alignItems: "center", marginBottom: 8 }}>
                    <Clock size={20} style={{ marginRight: 8, opacity: 0.6 }} />
                    <span className="label">Hours in Air</span>
                  </div>
                  <div style={{ fontSize: 32, fontWeight: "bold", color: "#6ee7ff" }}>
                    {Math.round(combinedStats.totalHours).toLocaleString()}
                  </div>
                  <div style={{ fontSize: 12, opacity: 0.6, marginTop: 4 }}>
                    {Math.round(combinedStats.totalHours / 24)} days
                  </div>
                </div>

                <div className="card stats-card">
                  <div className="row" style={{ alignItems: "center", marginBottom: 8 }}>
                    <Award size={20} style={{ marginRight: 8, opacity: 0.6 }} />
                    <span className="label">On-Time Rate</span>
                  </div>
                  <div style={{ fontSize: 32, fontWeight: "bold", color: "#6ee7ff" }}>
                    {Math.round(combinedStats.onTimePercentage)}%
                  </div>
                  <div style={{ fontSize: 12, opacity: 0.6, marginTop: 4 }}>
                    {combinedStats.averageDelay > 0 ? `Avg delay: ${Math.round(combinedStats.averageDelay)} min` : 'Usually on time'}
                  </div>
                </div>

                {combinedStats.favoriteAirline && (
                  <div className="card stats-card">
                    <div className="label" style={{ marginBottom: 8 }}>Favorite Airline</div>
                    <div style={{ fontSize: 18, fontWeight: "bold", marginBottom: 4 }}>{combinedStats.favoriteAirline}</div>
                    <div style={{ fontSize: 12, opacity: 0.6 }}>
                      {combinedStats.airlines.find(a => a.name === combinedStats.favoriteAirline)?.count || 0} flights
                      ({Math.round(combinedStats.airlines.find(a => a.name === combinedStats.favoriteAirline)?.percentage || 0)}%)
                    </div>
                  </div>
                )}

                {combinedStats.mostVisitedAirport && (
                  <div className="card stats-card">
                    <div className="label" style={{ marginBottom: 8 }}>Most Visited Airport</div>
                    <div style={{ fontSize: 18, fontWeight: "bold", marginBottom: 4 }}>{combinedStats.mostVisitedAirport}</div>
                    <div style={{ fontSize: 12, opacity: 0.6 }}>
                      {combinedStats.airports.find(a => a.code === combinedStats.mostVisitedAirport)?.visits || 0} visits
                    </div>
                  </div>
                )}

                {combinedStats.longestFlight && (
                  <div className="card stats-card" style={{ gridColumn: "1 / -1" }}>
                    <div className="label" style={{ marginBottom: 8 }}>Longest Flight</div>
                    <div className="row" style={{ alignItems: "center" }}>
                      <span style={{ fontSize: 18, fontWeight: "bold" }}>
                        {combinedStats.longestFlight.flightNumber}
                      </span>
                      <span style={{ marginLeft: 8 }}>
                        {combinedStats.longestFlight.departure} &rarr; {combinedStats.longestFlight.arrival}
                      </span>
                      <span style={{ marginLeft: 8, opacity: 0.6 }}>
                        ({combinedStats.longestFlight.distance.toLocaleString()} mi)
                      </span>
                      {combinedStats.longestFlight.duration && (
                        <span style={{ marginLeft: 8, opacity: 0.6 }}>
                          â€¢ {formatDuration(combinedStats.longestFlight.duration)}
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {combinedStats.yearlyBreakdown.length > 1 && (
                  <div className="card" style={{ gridColumn: "1 / -1" }}>
                    <div className="label" style={{ marginBottom: 12 }}>Yearly Breakdown</div>
                    <div className="row" style={{ gap: 16, flexWrap: 'wrap' }}>
                      {combinedStats.yearlyBreakdown.slice(0, 5).map((year) => (
                        <div key={year.year} style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: 14, fontWeight: 'bold' }}>{year.year}</div>
                          <div style={{ fontSize: 12, opacity: 0.7 }}>{year.flights} flights</div>
                          <div style={{ fontSize: 12, opacity: 0.5 }}>{year.miles.toLocaleString()} mi</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {activeTab === "preferences" && (
          <div>
            <div className="kicker" style={{ marginBottom: 16 }}>
              Personal Information
            </div>
            <form
              className="grid"
              onSubmit={(e) => {
                e.preventDefault();
                savePreferences(preferences);
              }}
            >
              <div className="grid grid-2">
                <div>
                  <label className="label" htmlFor="name">
                    Name
                  </label>
                  <input
                    id="name"
                    className="input"
                    placeholder="Your name"
                    value={preferences.name || ""}
                    onChange={(e) =>
                      setPreferences((prev) => ({ ...prev, name: e.target.value }))
                    }
                  />
                </div>
                <div>
                  <label className="label" htmlFor="homeAirport">
                    Home Airport
                  </label>
                  <input
                    id="homeAirport"
                    className="input"
                    placeholder="e.g., YYZ, LAX"
                    value={preferences.homeAirport || ""}
                    onChange={(e) =>
                      setPreferences((prev) => ({
                        ...prev,
                        homeAirport: e.target.value.toUpperCase(),
                      }))
                    }
                  />
                </div>
              </div>

              <div className="divider" />
              <div className="kicker" style={{ marginBottom: 16 }}>Travel Defaults</div>

              <div className="grid grid-2">
                <label className="check">
                  <input
                    type="checkbox"
                    checked={preferences.hasNexus}
                    onChange={(e) =>
                      setPreferences((prev) => ({ ...prev, hasNexus: e.target.checked }))
                    }
                  />
                  <div>
                    NEXUS/PreCheck Holder
                    <div className="hint">
                      Auto-checks trusted traveler when booking flights
                    </div>
                  </div>
                </label>
                <label className="check">
                  <input
                    type="checkbox"
                    checked={preferences.checkedBag}
                    onChange={(e) =>
                      setPreferences((prev) => ({
                        ...prev,
                        checkedBag: e.target.checked,
                      }))
                    }
                  />
                  <div>
                    Usually Check Bags
                    <div className="hint">Default bag preference for new bookings</div>
                  </div>
                </label>
              </div>

              <div className="grid grid-2">
                <div>
                  <label className="label" htmlFor="travelParty">
                    Default Travel Party
                  </label>
                  <select
                    id="travelParty"
                    className="select"
                    value={preferences.travelParty}
                    onChange={(e) =>
                      setPreferences((prev) => ({
                        ...prev,
                        travelParty: e.target.value as UserPreferences["travelParty"],
                      }))
                    }
                  >
                    <option value="solo">Solo</option>
                    <option value="couple">Couple</option>
                    <option value="family">Family (3+)</option>
                    <option value="group">Group (6+)</option>
                  </select>
                </div>
                <div>
                  <label className="label" htmlFor="walkingPace">
                    Walking Pace
                  </label>
                  <select
                    id="walkingPace"
                    className="select"
                    value={preferences.walkingPace}
                    onChange={(e) =>
                      setPreferences((prev) => ({
                        ...prev,
                        walkingPace: e.target.value as UserPreferences["walkingPace"],
                      }))
                    }
                  >
                    <option value="slow">Slow</option>
                    <option value="normal">Normal</option>
                    <option value="fast">Fast</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="label" htmlFor="preferredAirline">
                  Preferred Airline
                </label>
                <input
                  id="preferredAirline"
                  className="input"
                  placeholder="e.g., Air Canada, WestJet"
                  value={preferences.preferredAirline || ""}
                  onChange={(e) =>
                    setPreferences((prev) => ({
                      ...prev,
                      preferredAirline: e.target.value,
                    }))
                  }
                />
              </div>

              <div className="footer-row">
                <button type="submit" className="btn">
                  Save Preferences
                </button>
              </div>
            </form>
          </div>
        )}
          </div>
        </section>
      </div>
    </main>
  );
}




