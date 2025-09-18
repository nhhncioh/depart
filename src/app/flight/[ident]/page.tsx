"use client";
import "../../ui.css";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { saveFlightToProfile, convertLookupToSaveable } from "@/lib/flightSaving";

type LookupOut = {
  flight?: string;
  airline?: string;
  airlineCode?: string;
  airlineName?: string;
  departureLocalISO?: string;
  airport?: string;
  isInternational?: boolean;
  departure?: { airport: string; scheduledLocalISO?: string; terminal?: string; gate?: string };
  arrival?: { airport: string; scheduledLocalISO?: string; terminal?: string; gate?: string };
  status?: string;
  aircraft?: { type?: string; registration?: string };
  inbound?: { ident?: string; origin?: string; arrivalLocalISO?: string } | null;
};

function fmtTime(iso?: string) {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}
function fmtDate(iso?: string) {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}

function addMinutes(iso?: string, minutes = 0) {
  if (!iso) return undefined;
  return new Date(new Date(iso).getTime() + minutes * 60000).toISOString();
}

function Dot() { return <span style={{ display: 'inline-block', width: 6, height: 6, borderRadius: 999, background: 'var(--accent, #6ee7ff)' }} />; }

export default function FlightDetailPage() {
  const params = useParams<{ ident: string }>();
  const ident = decodeURIComponent(params.ident || ""); // e.g., AC452-2025-09-27
  const [data, setData] = useState<LookupOut | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    const m = ident.match(/^([A-Za-z]{2}\s?\d{1,4})-(\d{4}-\d{2}-\d{2})$/);
    if (!m) { setErr("Invalid flight ident"); return; }
    const flight = m[1].replace(/\s+/g, '');
    const dateISO = new Date(m[2]).toISOString();
    (async () => {
      try {
        const res = await fetch('/api/lookup-flight', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ flight, dateISO }) });
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error || 'Lookup failed');
        setData(json);
      } catch (e: any) {
        setErr(e?.message || 'Lookup error');
      }
    })();
  }, [ident]);

  const timeline = useMemo(() => {
    const dep = data?.departure?.scheduledLocalISO || data?.departureLocalISO;
    const turn = 40; // min
    const boardStart = -35; // before dep
    const gateClose = -15;
    const push = -10;
    return [
      { label: 'Inbound arrival', at: addMinutes(dep, -(turn + 10)), show: !!data?.inbound?.arrivalLocalISO },
      { label: 'Turn', at: addMinutes(dep, -turn) },
      { label: 'Boarding', at: addMinutes(dep, boardStart) },
      { label: 'Gate close', at: addMinutes(dep, gateClose) },
      { label: 'Pushback', at: addMinutes(dep, push) },
      { label: 'Takeoff', at: dep },
      { label: 'Landing', at: data?.arrival?.scheduledLocalISO },
    ];
  }, [data]);

  async function share() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true); setTimeout(() => setCopied(false), 1200);
    } catch {}
  }

  async function saveToProfile() {
    if (!data) return;

    setSaveStatus('saving');
    setSaveError(null);

    try {
      const flightToSave = convertLookupToSaveable(data);
      if (!flightToSave) {
        throw new Error("Unable to convert flight data for saving");
      }

      saveFlightToProfile(flightToSave);
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch (error: any) {
      setSaveStatus('error');
      setSaveError(error.message || "Failed to save flight");
      setTimeout(() => setSaveStatus('idle'), 5000);
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
            <div>depart</div>
          </div>
          <div className="badge">flight</div>
        </div>

        <section className="card card-lg" style={{ marginBottom: 14 }}>
          <div className="card-inner">
            {err ? (
              <div>
                <div className="kicker">Error</div>
                <p className="help">{err}</p>
                <div className="footer-row"><Link className="btn" href="/">Back</Link></div>
              </div>
            ) : !data ? (
              <div style={{ display: 'grid', placeItems: 'center', padding: 20 }}>
                <div className="spinner" aria-label="loading"></div>
              </div>
            ) : (
              <div>
                <div className="row" style={{ justifyContent: 'space-between' }}>
                  <div className="row" style={{ gap: 10 }}>
                    <div className="chip" style={{ fontSize: 14 }}>{(data.airlineName || data.airline) || 'Airline'}</div>
                    <div className="chip" style={{ fontSize: 14 }}>{data.flight || ident.split('-')[0]}</div>
                    <div className="chip" style={{ fontSize: 14, borderColor: 'rgba(255,255,255,.3)' }}>{(data.status || 'Scheduled').toUpperCase()}</div>
                  </div>
                  <div className="row" style={{ gap: 8 }}>
                    <button
                      className={`btn ${saveStatus === 'saved' ? 'btn-primary' : 'btn-secondary'}`}
                      onClick={saveToProfile}
                      disabled={saveStatus === 'saving'}
                    >
                      {saveStatus === 'saving' ? 'Saving...' :
                       saveStatus === 'saved' ? 'Saved!' :
                       saveStatus === 'error' ? 'Error' : 'Save to Profile'}
                    </button>
                    <button className="btn btn-secondary" onClick={share}>{copied ? 'Copied!' : 'Share'}</button>
                  </div>
                </div>

                {saveError && (
                  <div style={{ marginTop: 8, padding: 8, backgroundColor: 'rgba(254, 202, 202, 0.1)', borderRadius: 4, border: '1px solid rgba(254, 202, 202, 0.3)' }}>
                    <div style={{ fontSize: 12, color: '#fecaca' }}>{saveError}</div>
                  </div>
                )}

                <div className="grid grid-2" style={{ marginTop: 12 }}>
                  <div>
                    <div className="kicker">Departure</div>
                    <h3 style={{ margin: '6px 0 6px', fontSize: 20 }}>
                      {data.departure?.airport || data.airport} · {fmtDate(data.departure?.scheduledLocalISO || data.departureLocalISO)}
                    </h3>
                    <div className="help">Sched {fmtTime(data.departure?.scheduledLocalISO || data.departureLocalISO)}</div>
                    {(data.departure?.terminal || data.departure?.gate) && (
                      <div className="help">Terminal {data.departure?.terminal || '—'} · Gate {data.departure?.gate || '—'}</div>
                    )}
                  </div>
                  <div>
                    <div className="kicker">Arrival</div>
                    <h3 style={{ margin: '6px 0 6px', fontSize: 20 }}>
                      {data.arrival?.airport || '—'} · {fmtDate(data.arrival?.scheduledLocalISO)}
                    </h3>
                    <div className="help">Sched {fmtTime(data.arrival?.scheduledLocalISO)}</div>
                    {(data.arrival?.terminal || data.arrival?.gate) && (
                      <div className="help">Terminal {data.arrival?.terminal || '—'} · Gate {data.arrival?.gate || '—'}</div>
                    )}
                  </div>
                </div>

                <div className="divider" />
                <div className="kicker">Aircraft</div>
                <div className="help">{data.aircraft?.type || '—'}{data.aircraft?.registration ? ` · ${data.aircraft.registration}` : ''}</div>

                <div className="divider" />
                <div className="kicker">Timeline</div>
                <div className="timeline" style={{ marginTop: 8 }}>
                  {timeline.filter(t => t.show === undefined || t.show).map((t, i) => (
                    <div className="item" key={i}><Dot /> {t.label}: <strong>{fmtTime(t.at)}</strong></div>
                  ))}
                </div>

                <div className="divider" />
                <div className="grid grid-2">
                  <div className="card">
                    <div className="card-inner">
                      <div className="kicker">Origin weather</div>
                      <div className="help">Weather unavailable</div>
                    </div>
                  </div>
                  <div className="card">
                    <div className="card-inner">
                      <div className="kicker">Destination weather</div>
                      <div className="help">Weather unavailable</div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>

        <div className="footer-row">
          <Link className="btn btn-secondary" href="/">Back to Home</Link>
          <Link className="btn btn-secondary" href="/profile">Profile</Link>
        </div>
      </div>
    </main>
  );
}
