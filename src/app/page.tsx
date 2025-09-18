'use client';

import Select from "@/components/forms/Select";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type FormState = {
  airport: string;
  airline?: string;
  departureLocal: string;
  checkedBag: boolean;
  hasNexus: boolean;
  isInternational: boolean;
  flightNumber?: string;
  alreadyCheckedIn: boolean; // NEW FIELD
  travelParty?: "solo" | "couple" | "family" | "group";
  walkingPace?: "fast" | "normal" | "slow";
};

const PROFILE_KEY = "depart:profile";
const RECENTS_KEY = "depart:recentFlights";
const SAVED_FLIGHTS_KEY = "depart:savedFlights";
const PREFERENCES_KEY = "depart:userPreferences";

type RecentFlight = { flight: string; airline?: string; airport?: string; departureLocalISO?: string; isInternational?: boolean };

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

function encodeB64(obj: any){ try{ return btoa(unescape(encodeURIComponent(JSON.stringify(obj)))); }catch{ return ""; } }

export default function HomePage(){
  const router = useRouter();
  const [form, setForm] = useState<FormState>({
    airport: "",
    airline: "",
    departureLocal: "",
    checkedBag: false,
    hasNexus: false,
    isInternational: false,
    flightNumber: "",
    alreadyCheckedIn: false, // NEW FIELD
    travelParty: "solo",
    walkingPace: "normal",
  });
  const [lookupMsg, setLookupMsg] = useState<string>("");
  const [lookupErr, setLookupErr] = useState<string>("");
  const [recents, setRecents] = useState<RecentFlight[]>([]);
  const [flightDate, setFlightDate] = useState<string>("");

  // Load saved profile once
  useEffect(()=>{
    try{
      // Load recent flights
      const rf = localStorage.getItem(RECENTS_KEY);
      if (rf) {
        const list = JSON.parse(rf);
        if (Array.isArray(list)) setRecents(list.slice(0,3));
      }

      // Load user preferences (new system)
      const prefs = localStorage.getItem(PREFERENCES_KEY);
      if (prefs) {
        const preferences = JSON.parse(prefs);
        setForm(prev => ({
          ...prev,
          airport: preferences.homeAirport || prev.airport,
          checkedBag: !!preferences.checkedBag,
          hasNexus: !!preferences.hasNexus,
          airline: preferences.preferredAirline || prev.airline,
          travelParty: preferences.travelParty || prev.travelParty,
          walkingPace: preferences.walkingPace || prev.walkingPace,
        }));
      } else {
        // Fallback to old profile system for backwards compatibility
        const raw = localStorage.getItem(PROFILE_KEY);
        if(raw){
          const prof = JSON.parse(raw);
          setForm(prev => ({
            ...prev,
            airport: prof.homeAirport || prev.airport,
            checkedBag: !!prof.checkedBag,
            hasNexus: !!prof.hasNexus,
            isInternational: !!prof.isInternational,
            airline: prof.preferredAirline || prev.airline,
            alreadyCheckedIn: !!prof.alreadyCheckedIn,
            travelParty: prof.travelParty || prev.travelParty,
            walkingPace: prof.walkingPace || prev.walkingPace,
          }));
        }
      }
    }catch{}
  }, []);

  function saveRecent(r: RecentFlight){
    try {
      const head = { flight: (r.flight||"").trim(), airline: r.airline, airport: r.airport, departureLocalISO: r.departureLocalISO, isInternational: r.isInternational };
      const cur = recents.slice();
      const next = [head, ...cur.filter(x => (x.flight||"").trim().toUpperCase() !== head.flight.toUpperCase())].slice(0,3);
      setRecents(next);
      localStorage.setItem(RECENTS_KEY, JSON.stringify(next));
    } catch {}
  }

  function goToCalculating(withData?: { airline?: string; airport?: string; departureLocalISO?: string; isInternational?: boolean; flight?: string; route?: { departure?: any; arrival?: any } }){
    let depISO: string;
    if (withData?.departureLocalISO) {
      depISO = withData.departureLocalISO;
    } else if (form.departureLocal) {
      // Fix timezone issue: treat the datetime-local value as if it's already in the correct timezone
      // by appending 'Z' to make it UTC, but representing the local time
      const localDateTimeString = form.departureLocal;
      if (localDateTimeString.includes('T')) {
        // Keep as local time without 'Z' to avoid UTC conversion
        depISO = localDateTimeString + ':00';
      } else {
        // For other formats, create a proper local time representation
        const d = new Date(localDateTimeString);
        depISO = d.getFullYear() + '-' +
          String(d.getMonth() + 1).padStart(2, '0') + '-' +
          String(d.getDate()).padStart(2, '0') + 'T' +
          String(d.getHours()).padStart(2, '0') + ':' +
          String(d.getMinutes()).padStart(2, '0') + ':00';
      }
    } else {
      depISO = new Date().toISOString();
    }
    const dep = new Date(depISO);
    const payload = {
      airport: (withData?.airport || form.airport || "").trim(),
      airline: (withData?.airline || form.airline || "").trim() || undefined,
      departureLocalISO: depISO, // Use the original ISO string, not re-converted
      departureEpochMs: dep.getTime(),
      checkedBag: !!form.checkedBag,
      hasNexus: !!form.hasNexus,
      isInternational: typeof withData?.isInternational === "boolean" ? withData?.isInternational : !!form.isInternational,
      flightNumber: (withData?.flight || form.flightNumber || "").trim() || undefined,
      alreadyCheckedIn: !!form.alreadyCheckedIn,
      submittedAt: Date.now(),
      // Add route information for display on results page
      route: withData?.route ? {
        departure: withData.route.departure,
        arrival: withData.route.arrival
      } : undefined
    } as any;
    try { sessionStorage.setItem("depart:lastPayload", JSON.stringify(payload)); } catch {}
    const b64 = encodeB64(payload);
    router.push("/calculating?payload=" + encodeURIComponent(b64));
  }

  async function trackFlight(){
    setLookupErr(""); setLookupMsg("");
    const flight = (form.flightNumber||"").trim();
    if(!flight){ setLookupErr("Enter a flight number, e.g., AC123"); return; }
    // Optional date hint from manual datetime
    let dateISO: string | undefined;
    if (flightDate) {
      const d = new Date(flightDate);
      if (!isNaN(d.getTime())) dateISO = d.toISOString();
    } else if(form.departureLocal){
      const d = new Date(form.departureLocal);
      if(!isNaN(d.getTime())) dateISO = d.toISOString();
    }
    try{
      const res = await fetch("/api/lookup-flight", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ flight, date: flightDate || undefined, dateISO }) });
      const data = await res.json();
      if(!res.ok){ setLookupErr(data?.error || "Couldn't find that flight. Try again or set up manually."); return; }
      setForm(prev=>({
        ...prev,
        airline: data?.airline || prev.airline,
        airport: data?.airport || prev.airport,
        departureLocal: data?.departureLocalISO ? data.departureLocalISO.slice(0,16) : prev.departureLocal,
        isInternational: typeof data?.isInternational === "boolean" ? data.isInternational : prev.isInternational
      }));
      saveRecent({ flight, airline: data?.airline, airport: data?.airport, departureLocalISO: data?.departureLocalISO, isInternational: data?.isInternational });

      // Also save to profile if we have enough data
      if (data?.departureLocalISO && data?.airport) {
        saveFlight({
          flightNumber: flight,
          airline: data.airline || 'Unknown',
          airport: data.airport,
          departureLocalISO: data.departureLocalISO,
          isInternational: data.isInternational || false
        });
      }

      // Prioritize user's manual time over API's generated time
      let finalDepartureTime = data?.departureLocalISO;
      console.log('trackFlight - API returned time:', data?.departureLocalISO);
      console.log('trackFlight - form.departureLocal:', form.departureLocal);
      console.log('trackFlight - flightDate:', flightDate);

      if (form.departureLocal) {
        // User has manually entered a time - use it instead of API time
        const localDateTimeString = form.departureLocal;
        console.log('trackFlight - using manual time:', localDateTimeString);
        if (localDateTimeString.includes('T')) {
          // Don't append 'Z' - keep it as local time without timezone indicator
          finalDepartureTime = localDateTimeString + ':00';
        } else {
          // For other formats, create a proper local time representation
          const d = new Date(localDateTimeString);
          finalDepartureTime = d.getFullYear() + '-' +
            String(d.getMonth() + 1).padStart(2, '0') + '-' +
            String(d.getDate()).padStart(2, '0') + 'T' +
            String(d.getHours()).padStart(2, '0') + ':' +
            String(d.getMinutes()).padStart(2, '0') + ':00';
        }
      }

      console.log('trackFlight - final departure time:', finalDepartureTime);

      goToCalculating({
        airline: data?.airlineName || data?.airline,
        airport: data?.airport,
        departureLocalISO: finalDepartureTime,
        isInternational: data?.isInternational,
        flight,
        route: {
          departure: { ...data?.departure, scheduledLocalISO: finalDepartureTime },
          arrival: data?.arrival
        }
      });
    } catch {
      setLookupErr("Lookup error. Try again or set up manually.");
    }
  }

  function onChange(e: React.ChangeEvent<HTMLInputElement>){
    const { name, value, type, checked } = e.target;
    setForm(prev => ({ ...prev, [name]: type === "checkbox" ? checked : value }));
  }


  function saveProfile(){
    try{
      // Save to new preferences system
      const preferences = {
        homeAirport: form.airport || undefined,
        preferredAirline: form.airline || undefined,
        checkedBag: form.checkedBag,
        hasNexus: form.hasNexus,
        travelParty: form.travelParty,
        walkingPace: form.walkingPace,
      };
      localStorage.setItem(PREFERENCES_KEY, JSON.stringify(preferences));

      // Keep old system for backwards compatibility
      const profile = {
        homeAirport: form.airport || undefined,
        preferredAirline: form.airline || undefined,
        checkedBag: form.checkedBag,
        hasNexus: form.hasNexus,
        isInternational: form.isInternational,
        alreadyCheckedIn: form.alreadyCheckedIn,
        travelParty: form.travelParty,
        walkingPace: form.walkingPace,
      };
      localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
      setLookupMsg("Defaults saved.");
    }catch{}
  }
  function clearProfile(){
    try{ localStorage.removeItem(PROFILE_KEY); setLookupMsg("Defaults cleared."); }catch{}
  }

  function saveFlight(flightData: { flightNumber: string; airline: string; airport: string; departureLocalISO: string; isInternational: boolean }) {
    try {
      const saved: SavedFlight = {
        id: `${flightData.flightNumber}-${new Date(flightData.departureLocalISO).toISOString().split('T')[0]}`,
        flightNumber: flightData.flightNumber,
        airline: flightData.airline,
        departure: {
          airport: flightData.airport,
          time: flightData.departureLocalISO
        },
        arrival: {
          airport: 'Unknown',
          time: new Date(new Date(flightData.departureLocalISO).getTime() + 2 * 60 * 60 * 1000).toISOString() // 2hr estimate
        },
        status: new Date(flightData.departureLocalISO) > new Date() ? 'upcoming' : 'completed',
        savedAt: Date.now()
      };

      const existing = localStorage.getItem(SAVED_FLIGHTS_KEY);
      const flights: SavedFlight[] = existing ? JSON.parse(existing) : [];

      const existingIndex = flights.findIndex(f => f.id === saved.id);
      if (existingIndex >= 0) {
        flights[existingIndex] = { ...flights[existingIndex], ...saved };
      } else {
        flights.push(saved);
      }

      localStorage.setItem(SAVED_FLIGHTS_KEY, JSON.stringify(flights));
    } catch (error) {
      console.error('Failed to save flight:', error);
    }
  }

  return (
    <main className="app-shell">
      <div className="container">
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
            <div>depart<span style={{opacity:.6}}> · smart arrival</span></div>
          </div>
          <div className="badge">v1 · modern UI</div>
        </div>

        <div className="card card-lg">
          <div className="card-inner">
            <div className="row" style={{ justifyContent: 'flex-end', marginBottom: 8 }}>
              <Link href="/profile" className="btn btn-secondary">Profile</Link>
              <Link href="/flight" className="btn btn-secondary">Flights</Link>
            </div>
            <div className="kicker">Plan</div>
            <h1>Calculate your airport arrival time</h1>
            <p className="sub">We combine security waits, airline policies and smart buffers to recommend when to arrive. You can still prefill with a flight number below.</p>

            <form className="grid" onSubmit={(e)=>{ e.preventDefault(); trackFlight(); }}>
              <div className="grid grid-3">
                <div>
                  <label className="label" htmlFor="flightNumberTop">Flight number</label>
                  <input id="flightNumberTop" name="flightNumber" placeholder="e.g., AC123" className="input" value={form.flightNumber} onChange={onChange} aria-describedby="flightLookupHelp" />
                </div>
                <div>
                  <label className="label" htmlFor="flightDateTop">Flight date</label>
                  <input id="flightDateTop" type="date" className="input" placeholder="YYYY-MM-DD" value={flightDate} onChange={(e)=> setFlightDate(e.target.value)} />
                </div>
                <div style={{ display:"flex", alignItems:"flex-end" }}>
                  <button type="submit" className="btn" style={{ width:"100%" }}>Calculate arrive time</button>
                </div>
              </div>
              {(lookupMsg || lookupErr) && <p id="flightLookupHelp" className="help" style={{marginTop:8, color: lookupErr? '#fecaca': undefined}}>{lookupErr || lookupMsg}</p>}

              <div className="divider"></div>

              {/* Travel options */}
              <div className="grid grid-2">
                <Select
                  id="travelParty"
                  label="Travel party"
                  value={form.travelParty || "solo"}
                  onChange={(v)=> setForm(prev=>({ ...prev, travelParty: v as FormState["travelParty"] }))}
                  options={[
                    { value: "solo", label: "Solo" },
                    { value: "couple", label: "Couple" },
                    { value: "family", label: "Family (3+)" },
                    { value: "group", label: "Group (6+)" },
                  ]}
                  helpText="Used to estimate movement through the airport."
                />
                <Select
                  id="hasNexus"
                  label="Trusted traveler"
                  value={form.hasNexus ? "yes" : "no"}
                  onChange={(v)=> setForm(prev=>({ ...prev, hasNexus: v === "yes" }))}
                  options={[
                    { value: "no", label: "No" },
                    { value: "yes", label: "Yes (NEXUS/PreCheck)" },
                  ]}
                  helpText="Usually shortens security time"
                />
              </div>

              <div className="grid grid-2">
                <label className="check">
                  <input type="checkbox" name="alreadyCheckedIn" checked={form.alreadyCheckedIn} onChange={onChange} />
                  <div>Already checked in<div className="hint">Skip check-in time (only works with carry-on only)</div></div>
                </label>
                <label className="check">
                  <input type="checkbox" name="checkedBag" checked={form.checkedBag} onChange={onChange} />
                  <div>Checking a bag<div className="hint">Adds time for bag-drop / check-in</div></div>
                </label>
              </div>
            </form>

            {recents.length > 0 && (
              <div className="row" style={{ marginTop: 10 }}>
                <span className="label" style={{ marginBottom: 0 }}>Recent</span>
                {recents.map((r, idx) => (
                  <button key={idx} className="chip" type="button" onClick={()=>{
                    setForm(prev=>({ ...prev, flightNumber: r.flight }));
                    // Use stored values immediately - note: recent flights don't have full route info
                    goToCalculating({ airline: r.airline, airport: r.airport, departureLocalISO: r.departureLocalISO, isInternational: r.isInternational, flight: r.flight });
                  }} title={`${r.flight} · ${r.airport || ''} · ${r.departureLocalISO ? new Date(r.departureLocalISO).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}) : ''}`}>
                    {r.flight}
                  </button>
                ))}
              </div>
            )}

            <div className="divider"></div>

            <div className="footer-row">
              <button type="button" className="btn btn-secondary" onClick={()=>{
                setForm({
                  airport:"",
                  airline:"",
                  departureLocal:"",
                  checkedBag:false,
                  hasNexus:false,
                  isInternational:false,
                  flightNumber:"",
                  alreadyCheckedIn:false,
                  travelParty:"solo",
                  walkingPace:"normal",
                });
                setFlightDate("");
              }}>Clear</button>
              <button type="button" className="btn btn-secondary" onClick={saveProfile}>Save defaults</button>
              <button type="button" className="btn btn-secondary" onClick={clearProfile}>Clear defaults</button>
            </div>

            <div className="divider"></div>
            <div className="divider"></div>
            <div className="row" style={{ justifyContent: 'center', gap: 12, margin: '20px 0' }}>
              <Link href="/flight" className="btn btn-secondary" style={{ padding: '14px 18px' }}>
                Open Flight Details
              </Link>
              <button type="button" className="btn" onClick={() => router.push('/trip/1')} style={{ padding: '14px 18px' }}>
                Live Tracking Demo (sample)
              </button>
            </div>
            
            <div className="row">
              <div className="lozenge">Secure · No data shared</div>
              <div className="lozenge">Unified look across all pages</div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

