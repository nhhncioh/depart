'use client';

import '../ui.css';
import { useSearchParams, useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState, Suspense } from 'react';
import { motion } from 'framer-motion';
import { Plane } from 'lucide-react';

function decodeB64(b64: string) { try { return JSON.parse(decodeURIComponent(escape(atob(b64)))); } catch { return null; } }
function encodeB64(obj: any) { try { return btoa(unescape(encodeURIComponent(JSON.stringify(obj)))); } catch { return ''; } }

function CalculatingPageContent() {
  const sp = useSearchParams();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const kicked = useRef(false);

  const payloadFromQuery = useMemo(() => {
    const raw = sp.get('payload');
    if (!raw) return null;
    return decodeB64(raw);
  }, [sp]);

  useEffect(() => {
    if (kicked.current) return;
    kicked.current = true;

    const stored = (() => { try { return JSON.parse(sessionStorage.getItem('depart:lastPayload') || 'null'); } catch { return null; } })();
    const payload = payloadFromQuery || stored;
    if (!payload) { setError('Missing flight details. Please start again.'); return; }

    const depISO = payload?.departureLocalISO || (payload?.departureEpochMs ? new Date(payload.departureEpochMs).toISOString() : undefined);
    const common = { checkedBag: payload.checkedBag, hasNexus: payload.hasNexus, isInternational: payload.isInternational, airline: payload.airline };

    const candidates = [
      { ...payload },
      { airport: payload.airport, departureLocalISO: depISO, ...common },
      { airport: payload.airport, flightDateTime: depISO, ...common },
      { airport: payload.airport, departureEpochMs: payload.departureEpochMs, ...common },
    ];

    (async () => {
      let lastErr: any = null;
      for (const body of candidates) {
        try {
          const res = await fetch('/api/recommend', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
          if (res.ok) {
            const data = await res.json();

            try {
              const prevRaw = sessionStorage.getItem('depart:lastResult');
              if (prevRaw) {
                const prev = JSON.parse(prevRaw);
                const a = Date.parse(prev?.timeline?.arriveByISO || prev?.departureLocalISO || '');
                const b = Date.parse(data?.timeline?.arriveByISO || data?.departureLocalISO || '');
                if (!isNaN(a) && !isNaN(b)) {
                  const diffMin = Math.round((b - a) / 60000);
                  if (diffMin !== 0) {
                    data.changed = { minutes: Math.abs(diffMin), direction: diffMin > 0 ? 'later' : 'earlier' };
                  }
                }
              }
              sessionStorage.setItem('depart:lastResultPrev', prevRaw || 'null');
            } catch { }

            try { sessionStorage.setItem('depart:lastResult', JSON.stringify(data)); } catch { }
            const b64 = encodeB64(data);
            await new Promise(r => setTimeout(r, 450));
            router.replace('/result?data=' + encodeURIComponent(b64));
            return;
          } else {
            let detail = '';
            try { const txt = await res.text(); try { detail = JSON.parse(txt)?.error ?? txt; } catch { detail = txt; } } catch { }
            lastErr = new Error('HTTP ' + res.status + (detail ? ' - ' + String(detail) : ''));
          }
        } catch (e: any) { lastErr = e; }
      }
      setError((lastErr?.message || 'Unknown error') + ' - please go back and try again.');
    })();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [payloadFromQuery]);

  return (
    <main className="app-shell">
      <div className="container">
        <div className="header">
          <div className="brand">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path d="M3 12h18M3 12c6-4 12-4 18 0M3 12c6 4 12 4 18 0" stroke="url(#g)" strokeWidth="1.6" strokeLinecap="round" />
              <defs>
                <linearGradient id="g" x1="3" y1="12" x2="21" y2="12" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#6ee7ff" /><stop offset="1" stopColor="#a78bfa" />
                </linearGradient>
              </defs>
            </svg>
            <div>depart</div>
          </div>
          <div className="badge">calculating.</div>
        </div>

        <div className="card card-lg">
          <div className="card-inner" style={{ display: 'grid', placeItems: 'center', textAlign: 'center', gap: 16 }}>
            <div style={{ width: '100%', maxWidth: 520, height: 140, position: 'relative' }}>
              <div aria-hidden style={{ position: 'absolute', left: 0, right: 0, bottom: 22, height: 4, background: 'linear-gradient(90deg, rgba(255,255,255,.18) 0 60%, transparent 60% 100%)', backgroundSize: '24px 100%', opacity: .7 }} />
              <div aria-hidden style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 6, borderRadius: 999, overflow: 'hidden', background: 'rgba(255,255,255,.08)', border: '1px solid rgba(255,255,255,.08)' }}>
                <div style={{ width: '40%', height: '100%', background: 'linear-gradient(90deg, transparent, rgba(110,231,255,.55), transparent)', animation: 'shimmer 1.8s linear infinite' }} />
              </div>
              <style>{`@keyframes shimmer{0%{transform:translateX(-100%)}100%{transform:translateX(250%)}}`}</style>
              <motion.div
                style={{ position: 'absolute', left: 0, right: 0, margin: '0 auto', bottom: 20, display: 'flex', justifyContent: 'center' }}
                initial={{ x: -180, y: 0, rotate: 0 }}
                animate={{ x: [-180, -60, 40, 180], y: [0, 0, -6, -10], rotate: [0, 0, -6, -10] }}
                transition={{ duration: 3.6, ease: 'easeInOut', repeat: Infinity, repeatType: 'loop' }}
                aria-hidden
              >
                <Plane size={72} strokeWidth={1.8} color="#8bd3ff" />
              </motion.div>
            </div>

            <h1>Calculating.</h1>
            <TipsRotator />

            {error && (
              <div style={{ marginTop: 18 }}>
                <div className="lozenge" style={{ borderColor: 'rgba(255,0,0,.25)', color: '#ffd1d1' }}>Error</div>
                <p className="help" style={{ marginTop: 8 }}>{error}</p>
                <div className="footer-row" style={{ justifyContent: 'center' }}>
                  <button className="btn btn-secondary" onClick={() => history.back()}>Go back</button>
                </div>
              </div>
            )}

            {!error && (
              <div className="footer-row" style={{ justifyContent: 'center', marginTop: 6 }}>
                <button className="btn btn-secondary" onClick={() => router.push('/')}>Cancel</button>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}

const TIPS = [
  "We’re pulling live security data…",
  "We adjust for holidays and peak hours…",
  "We factor in bag-drop and gate cutoffs…",
  "Trusted traveler can change the timeline…",
  "Small airports can still be busy at 6am…",
  "Walking time matters — pace and terminal layout…",
];

function TipsRotator() {
  const [i, setI] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setI(v => (v + 1) % TIPS.length), 2000);
    return () => clearInterval(id);
  }, []);
  return (
    <div aria-live="polite" className="sub" style={{ minHeight: 22 }}>
      {TIPS[i]}
    </div>
  );
}

export default function CalculatingPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <CalculatingPageContent />
    </Suspense>
  );
}
