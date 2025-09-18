"use client";
import "../ui.css";
import { useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";

export default function FlightIndexPage() {
  const router = useRouter();
  const [flight, setFlight] = useState(""); // e.g., AC123
  const [date, setDate] = useState("");   // yyyy-mm-dd
  const [err, setErr] = useState<string | null>(null);

  function go(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    const f = flight.replace(/\s+/g, "").toUpperCase();
    if (!/^([A-Z]{2}\d{1,4})$/.test(f)) { setErr("Enter a flight like AC123"); return; }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) { setErr("Enter a date like 2025-09-27"); return; }
    router.push(`/flight/${encodeURIComponent(f + "-" + date)}`);
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
            <div>depart</div>
          </div>
          <div className="badge">flight</div>
        </div>

        <section className="card card-lg">
          <div className="card-inner">
            <div className="kicker">Flight details</div>
            <h1>Open a flight</h1>
            <p className="help">Enter a flight ident like AC123 and a date (YYYY-MM-DD).</p>

            <form className="grid grid-2" onSubmit={go}>
              <div>
                <label className="label" htmlFor="f">Flight</label>
                <input id="f" className="input" placeholder="AC123" value={flight} onChange={(e)=>setFlight(e.target.value)} />
              </div>
              <div>
                <label className="label" htmlFor="d">Date</label>
                <input id="d" className="input" placeholder="2025-09-27" value={date} onChange={(e)=>setDate(e.target.value)} />
              </div>
              <div className="footer-row">
                <button className="btn" type="submit">View details</button>
                <Link href="/" className="btn btn-secondary">Back</Link>
                <Link href="/profile" className="btn btn-secondary">Profile</Link>
              </div>
            </form>

            {err && <p className="help" style={{ color: '#fecaca', marginTop: 8 }}>{err}</p>}

            <div className="divider" />
            <div className="kicker">Quick demo</div>
            <div className="row" style={{ gap: 8, marginTop: 8 }}>
              <Link className="chip" href="/flight/AC123-2025-01-15">AC123-2025-01-15</Link>
              <Link className="chip" href="/flight/WS3456-2025-01-15">WS3456-2025-01-15</Link>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
