'use client';

import "./ui.css";
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
};

const PROFILE_KEY = "depart:profile";

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
    alreadyCheckedIn: false // NEW FIELD
  });
  const [lookupMsg, setLookupMsg] = useState<string>("");

  // Load saved profile once
  useEffect(()=>{
    try{
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
          alreadyCheckedIn: !!prof.alreadyCheckedIn // NEW FIELD
        }));
      }
    }catch{}
  }, []);

  function onChange(e: React.ChangeEvent<HTMLInputElement>){
    const { name, value, type, checked } = e.target;
    setForm(prev => ({ ...prev, [name]: type === "checkbox" ? checked : value }));
  }

  async function onLookup(){
    setLookupMsg("");
    const flight = (form.flightNumber||"").trim();
    if(!flight){ setLookupMsg("Enter a flight number, e.g., AC123"); return; }

    // Use the date part of the datetime-local if present
    let dateISO: string | undefined;
    if(form.departureLocal){
      const d = new Date(form.departureLocal);
      if(!isNaN(d.getTime())) dateISO = new Date(d.getFullYear(), d.getMonth(), d.getDate()).toISOString();
    }
    try{
      const res = await fetch("/api/lookup-flight", {
        method:"POST", headers:{ "Content-Type":"application/json" },
        body: JSON.stringify({ flight, dateISO })
      });
      const data = await res.json();
      if(!res.ok){ setLookupMsg(data?.error || "Lookup failed"); return; }

      setForm(prev => ({
        ...prev,
        airline: data?.airline || prev.airline,
        airport: data?.airport || prev.airport,
        departureLocal: data?.departureLocalISO ? new Date(data.departureLocalISO).toISOString().slice(0,16) : prev.departureLocal,
        isInternational: typeof data?.isInternational === "boolean" ? data.isInternational : prev.isInternational
      }));
      setLookupMsg("Flight details filled (demo lookup).");
    }catch{
      setLookupMsg("Lookup error. Try again.");
    }
  }

  function saveProfile(){
    try{
      const profile = {
        homeAirport: form.airport || undefined,
        preferredAirline: form.airline || undefined,
        checkedBag: form.checkedBag,
        hasNexus: form.hasNexus,
        isInternational: form.isInternational,
        alreadyCheckedIn: form.alreadyCheckedIn // NEW FIELD
      };
      localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
      setLookupMsg("Defaults saved.");
    }catch{}
  }
  function clearProfile(){
    try{ localStorage.removeItem(PROFILE_KEY); setLookupMsg("Defaults cleared."); }catch{}
  }

  function onSubmit(e: React.FormEvent){
    e.preventDefault();
    if(!form.departureLocal || !form.airport){
      alert("Please enter your flight time and airport."); return;
    }
    const dep = new Date(form.departureLocal);
    const payload = {
      airport: form.airport.trim(),
      airline: form.airline?.trim() || undefined,
      departureLocalISO: dep.toISOString(),
      departureEpochMs: dep.getTime(),
      checkedBag: !!form.checkedBag,
      hasNexus: !!form.hasNexus,
      isInternational: !!form.isInternational,
      flightNumber: (form.flightNumber||"").trim() || undefined,
      alreadyCheckedIn: !!form.alreadyCheckedIn, // NEW FIELD
      submittedAt: Date.now()
    };
    try { sessionStorage.setItem("depart:lastPayload", JSON.stringify(payload)); } catch {}
    const b64 = encodeB64(payload);
    router.push("/calculating?payload=" + encodeURIComponent(b64));
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
            <div className="kicker">Plan</div>
            <h1>When is your flight?</h1>
            <p className="sub">We'll crunch security, buffer and timing to suggest when you should arrive at the airport.</p>

            <form className="grid" onSubmit={onSubmit}>
              <div className="grid grid-2">
                <div>
                  <label className="label" htmlFor="departureLocal">Flight date & time</label>
                  <input id="departureLocal" name="departureLocal" type="datetime-local" className="input" value={form.departureLocal} onChange={onChange} required />
                </div>
                <div>
                  <label className="label" htmlFor="airport">Departure airport (IATA)</label>
                  <input id="airport" name="airport" placeholder="e.g., YOW" className="input" value={form.airport} onChange={onChange} required />
                </div>
              </div>

              <div className="grid grid-2">
                <div>
                  <label className="label" htmlFor="airline">Airline (optional)</label>
                  <input id="airline" name="airline" placeholder="e.g., Air Canada" className="input" value={form.airline} onChange={onChange} />
                </div>
                <div>
                  <label className="label" htmlFor="flightNumber">Flight number (optional)</label>
                  <div className="row">
                    <input id="flightNumber" name="flightNumber" placeholder="e.g., AC123" className="input" value={form.flightNumber} onChange={onChange} />
                    <button type="button" className="btn btn-secondary" onClick={onLookup}>Lookup</button>
                  </div>
                  {lookupMsg && <p className="help" style={{marginTop:8}}>{lookupMsg}</p>}
                </div>
              </div>

              <div className="grid grid-2">
                {/* NEW CHECKBOX - Place first in the grid */}
                <label className="check">
                  <input type="checkbox" name="alreadyCheckedIn" checked={form.alreadyCheckedIn} onChange={onChange} />
                  <div>Already checked in<div className="hint">Skip check-in time (only works with carry-on only)</div></div>
                </label>
                <label className="check">
                  <input type="checkbox" name="isInternational" checked={form.isInternational} onChange={onChange} />
                  <div>International flight<div className="hint">Adds time for passport/doc checks & gate processes</div></div>
                </label>
                <label className="check">
                  <input type="checkbox" name="checkedBag" checked={form.checkedBag} onChange={onChange} />
                  <div>Checking a bag<div className="hint">Adds time for bag-drop / check-in</div></div>
                </label>
                <label className="check">
                  <input type="checkbox" name="hasNexus" checked={form.hasNexus} onChange={onChange} />
                  <div>NEXUS / Trusted Traveler<div className="hint">Usually shortens security time</div></div>
                </label>
              </div>

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
                    alreadyCheckedIn:false // NEW FIELD
                  });
                }}>Clear</button>
                <button type="button" className="btn btn-secondary" onClick={saveProfile}>Save defaults</button>
                <button type="button" className="btn btn-secondary" onClick={clearProfile}>Clear defaults</button>
                <button className="btn" type="submit">Calculate arrival time</button>
              </div>
            </form>

            <div className="divider"></div>
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