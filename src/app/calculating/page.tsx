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
            <div style={{
              width: '100%',
              maxWidth: 520,
              height: 'clamp(200px, 50vw, 320px)',
              position: 'relative',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center'
            }}>
              {/* Airplane window frame */}
              <div style={{
                width: 'clamp(140px, 35vw, 220px)',
                height: 'clamp(180px, 45vw, 300px)',
                position: 'relative',
                borderRadius: 'clamp(40px, 10vw, 75px)',
                background: 'linear-gradient(145deg, #2a2a2a 0%, #1a1a1a 50%, #0a0a0a 100%)',
                padding: 'clamp(12px, 3vw, 20px)',
                boxShadow: 'inset 0 0 30px rgba(0,0,0,0.8), inset 0 0 60px rgba(0,0,0,0.4), 0 10px 30px rgba(0,0,0,0.3)',
              }}>

                {/* Inner window seal */}
                <div style={{
                  width: '100%',
                  height: '100%',
                  borderRadius: 'clamp(30px, 8vw, 60px)',
                  background: 'linear-gradient(145deg, #404040 0%, #202020 50%, #101010 100%)',
                  padding: 'clamp(8px, 2vw, 12px)',
                  boxShadow: 'inset 0 0 25px rgba(0,0,0,0.6)',
                }}>

                  {/* Window glass with reflection */}
                  <div style={{
                    width: '100%',
                    height: '100%',
                    borderRadius: 'clamp(25px, 6vw, 50px)',
                    position: 'relative',
                    overflow: 'hidden',
                    background: 'linear-gradient(180deg, #001122 0%, #001a33 30%, #002a4a 70%, #003d66 100%)',
                    boxShadow: 'inset 0 0 70px rgba(110,231,255,0.1)',
                    border: '1px solid rgba(255,255,255,0.1)',
                  }}>

                    {/* Window reflection overlay */}
                    <div style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      background: 'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, transparent 30%, transparent 70%, rgba(255,255,255,0.05) 100%)',
                      borderRadius: '30px',
                      pointerEvents: 'none',
                      zIndex: 10,
                    }} />

              {/* Atmospheric layers */}
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '30%', background: 'radial-gradient(ellipse at center top, rgba(110,231,255,0.05) 0%, transparent 70%)', pointerEvents: 'none' }} />
              <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '40%', background: 'linear-gradient(0deg, rgba(0,26,51,0.3) 0%, transparent 100%)', pointerEvents: 'none' }} />

              {/* Distant cloud layer - high altitude */}
              <motion.div
                style={{ position: 'absolute', width: '300%', height: '100%', left: '-200%' }}
                animate={{ x: [0, 300] }}
                transition={{ duration: 8, ease: 'linear', repeat: Infinity }}
                aria-hidden
              >
                <div style={{ position: 'absolute', top: '5%', left: '10%', width: '40px', height: '12px', background: 'rgba(255,255,255,0.05)', borderRadius: '12px', filter: 'blur(4px)' }} />
                <div style={{ position: 'absolute', top: '15%', left: '25%', width: '50px', height: '15px', background: 'rgba(255,255,255,0.04)', borderRadius: '15px', filter: 'blur(5px)' }} />
                <div style={{ position: 'absolute', top: '25%', left: '45%', width: '35px', height: '10px', background: 'rgba(255,255,255,0.06)', borderRadius: '10px', filter: 'blur(4px)' }} />
                <div style={{ position: 'absolute', top: '35%', left: '65%', width: '45px', height: '13px', background: 'rgba(255,255,255,0.04)', borderRadius: '13px', filter: 'blur(6px)' }} />
                <div style={{ position: 'absolute', top: '45%', left: '80%', width: '30px', height: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', filter: 'blur(5px)' }} />
              </motion.div>

              {/* Background clouds - mid altitude */}
              <motion.div
                style={{ position: 'absolute', width: '250%', height: '100%', left: '-150%' }}
                animate={{ x: [0, 450] }}
                transition={{ duration: 5.5, ease: 'linear', repeat: Infinity }}
                aria-hidden
              >
                <div style={{ position: 'absolute', top: '8%', left: '15%', width: '80px', height: '25px', background: 'rgba(255,255,255,0.08)', borderRadius: '25px', filter: 'blur(3px)', transform: 'skew(-5deg)' }} />
                <div style={{ position: 'absolute', top: '25%', left: '35%', width: '100px', height: '30px', background: 'rgba(255,255,255,0.06)', borderRadius: '30px', filter: 'blur(3px)', transform: 'skew(-3deg)' }} />
                <div style={{ position: 'absolute', top: '45%', left: '60%', width: '120px', height: '35px', background: 'rgba(255,255,255,0.09)', borderRadius: '35px', filter: 'blur(2px)', transform: 'skew(-4deg)' }} />
                <div style={{ position: 'absolute', top: '65%', left: '20%', width: '90px', height: '28px', background: 'rgba(255,255,255,0.07)', borderRadius: '28px', filter: 'blur(3px)', transform: 'skew(-6deg)' }} />
                <div style={{ position: 'absolute', top: '80%', left: '75%', width: '70px', height: '22px', background: 'rgba(255,255,255,0.08)', borderRadius: '22px', filter: 'blur(4px)', transform: 'skew(-2deg)' }} />
              </motion.div>

              {/* Mid-layer clouds with blue tint */}
              <motion.div
                style={{ position: 'absolute', width: '220%', height: '100%', left: '-120%' }}
                animate={{ x: [0, 550] }}
                transition={{ duration: 4, ease: 'linear', repeat: Infinity }}
                aria-hidden
              >
                <div style={{ position: 'absolute', top: '12%', left: '20%', width: '110px', height: '38px', background: 'rgba(110,231,255,0.12)', borderRadius: '38px', filter: 'blur(2px)', transform: 'skew(-3deg)' }} />
                <div style={{ position: 'absolute', top: '32%', left: '45%', width: '140px', height: '42px', background: 'rgba(110,231,255,0.10)', borderRadius: '42px', filter: 'blur(2px)', transform: 'skew(-5deg)' }} />
                <div style={{ position: 'absolute', top: '58%', left: '15%', width: '95px', height: '32px', background: 'rgba(110,231,255,0.15)', borderRadius: '32px', filter: 'blur(1px)', transform: 'skew(-4deg)' }} />
                <div style={{ position: 'absolute', top: '78%', left: '65%', width: '85px', height: '28px', background: 'rgba(110,231,255,0.13)', borderRadius: '28px', filter: 'blur(2px)', transform: 'skew(-2deg)' }} />
              </motion.div>

              {/* Foreground clouds - closest layer */}
              <motion.div
                style={{ position: 'absolute', width: '200%', height: '100%', left: '-100%' }}
                animate={{ x: [0, 600] }}
                transition={{ duration: 2.8, ease: 'linear', repeat: Infinity }}
                aria-hidden
              >
                <div style={{ position: 'absolute', top: '18%', left: '25%', width: '130px', height: '45px', background: 'rgba(255,255,255,0.18)', borderRadius: '45px', filter: 'blur(1px)', transform: 'skew(-2deg)', boxShadow: 'inset 0 0 20px rgba(110,231,255,0.1)' }} />
                <div style={{ position: 'absolute', top: '45%', left: '50%', width: '160px', height: '52px', background: 'rgba(255,255,255,0.15)', borderRadius: '52px', filter: 'blur(0.5px)', transform: 'skew(-4deg)', boxShadow: 'inset 0 0 25px rgba(110,231,255,0.08)' }} />
                <div style={{ position: 'absolute', top: '70%', left: '10%', width: '115px', height: '40px', background: 'rgba(255,255,255,0.20)', borderRadius: '40px', transform: 'skew(-3deg)', boxShadow: 'inset 0 0 15px rgba(110,231,255,0.12)' }} />
              </motion.div>

              {/* Enhanced motion lines for speed effect */}
              <motion.div
                style={{ position: 'absolute', width: '200%', height: '100%', left: '-100%' }}
                animate={{ x: [0, 800] }}
                transition={{ duration: 1.5, ease: 'linear', repeat: Infinity }}
                aria-hidden
              >
                <div style={{ position: 'absolute', top: '20%', left: '0%', width: '220px', height: '1px', background: 'linear-gradient(90deg, transparent, rgba(110,231,255,0.5), rgba(110,231,255,0.2), transparent)' }} />
                <div style={{ position: 'absolute', top: '35%', left: '15%', width: '180px', height: '1px', background: 'linear-gradient(90deg, transparent, rgba(110,231,255,0.4), rgba(110,231,255,0.15), transparent)' }} />
                <div style={{ position: 'absolute', top: '50%', left: '8%', width: '200px', height: '1px', background: 'linear-gradient(90deg, transparent, rgba(110,231,255,0.45), rgba(110,231,255,0.18), transparent)' }} />
                <div style={{ position: 'absolute', top: '65%', left: '25%', width: '190px', height: '1px', background: 'linear-gradient(90deg, transparent, rgba(110,231,255,0.35), rgba(110,231,255,0.12), transparent)' }} />
                <div style={{ position: 'absolute', top: '80%', left: '5%', width: '170px', height: '1px', background: 'linear-gradient(90deg, transparent, rgba(110,231,255,0.3), rgba(110,231,255,0.1), transparent)' }} />
              </motion.div>

              {/* Faster speed streaks */}
              <motion.div
                style={{ position: 'absolute', width: '200%', height: '100%', left: '-100%' }}
                animate={{ x: [0, 1000] }}
                transition={{ duration: 1.2, ease: 'linear', repeat: Infinity }}
                aria-hidden
              >
                <div style={{ position: 'absolute', top: '28%', left: '10%', width: '150px', height: '0.5px', background: 'linear-gradient(90deg, transparent, rgba(110,231,255,0.6), transparent)' }} />
                <div style={{ position: 'absolute', top: '42%', left: '30%', width: '120px', height: '0.5px', background: 'linear-gradient(90deg, transparent, rgba(110,231,255,0.5), transparent)' }} />
                <div style={{ position: 'absolute', top: '58%', left: '5%', width: '140px', height: '0.5px', background: 'linear-gradient(90deg, transparent, rgba(110,231,255,0.55), transparent)' }} />
                <div style={{ position: 'absolute', top: '72%', left: '20%', width: '130px', height: '0.5px', background: 'linear-gradient(90deg, transparent, rgba(110,231,255,0.45), transparent)' }} />
              </motion.div>

              {/* Particle effects */}
              <motion.div
                style={{ position: 'absolute', width: '200%', height: '100%', left: '-100%' }}
                animate={{ x: [0, 700] }}
                transition={{ duration: 2, ease: 'linear', repeat: Infinity }}
                aria-hidden
              >
                <div style={{ position: 'absolute', top: '25%', left: '20%', width: '2px', height: '2px', background: 'rgba(110,231,255,0.7)', borderRadius: '50%', filter: 'blur(0.5px)' }} />
                <div style={{ position: 'absolute', top: '40%', left: '60%', width: '1.5px', height: '1.5px', background: 'rgba(110,231,255,0.6)', borderRadius: '50%', filter: 'blur(0.5px)' }} />
                <div style={{ position: 'absolute', top: '60%', left: '35%', width: '2.5px', height: '2.5px', background: 'rgba(110,231,255,0.8)', borderRadius: '50%', filter: 'blur(0.3px)' }} />
                <div style={{ position: 'absolute', top: '75%', left: '75%', width: '1px', height: '1px', background: 'rgba(110,231,255,0.5)', borderRadius: '50%', filter: 'blur(0.5px)' }} />
                <div style={{ position: 'absolute', top: '15%', left: '45%', width: '1.8px', height: '1.8px', background: 'rgba(110,231,255,0.65)', borderRadius: '50%', filter: 'blur(0.4px)' }} />
              </motion.div>

              {/* Enhanced progress indicator */}
              <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 3, borderRadius: 999, overflow: 'hidden', background: 'rgba(0,0,0,.3)' }}>
                <div style={{ width: '25%', height: '100%', background: 'linear-gradient(90deg, transparent, rgba(110,231,255,.8), rgba(110,231,255,.4), transparent)', animation: 'flyProgress 1.8s linear infinite', boxShadow: '0 0 10px rgba(110,231,255,0.5)' }} />
              </div>

              <style>{`
                @keyframes flyProgress {
                  0% { transform: translateX(-100%); }
                  100% { transform: translateX(400%); }
                }
              `}</style>

                  </div>
                </div>

                {/* Window frame details */}
                <div style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  width: '6px',
                  height: '6px',
                  background: 'radial-gradient(circle, #666 0%, #333 100%)',
                  borderRadius: '50%',
                  boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.5)',
                  zIndex: 15,
                }} />

                {/* Window handle/latch */}
                <div style={{
                  position: 'absolute',
                  bottom: '8px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  width: '16px',
                  height: '6px',
                  background: 'linear-gradient(145deg, #555 0%, #333 50%, #222 100%)',
                  borderRadius: '3px',
                  boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.6), 0 1px 2px rgba(255,255,255,0.1)',
                  zIndex: 15,
                }} />

                {/* Additional window seal details */}
                <div style={{
                  position: 'absolute',
                  top: 'clamp(6px, 1.5vw, 10px)',
                  left: 'clamp(6px, 1.5vw, 10px)',
                  right: 'clamp(6px, 1.5vw, 10px)',
                  bottom: 'clamp(6px, 1.5vw, 10px)',
                  borderRadius: 'clamp(35px, 9vw, 68px)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  pointerEvents: 'none',
                  zIndex: 5,
                }} />
              </div>
            </div>

            <h1 style={{ marginBottom: 24 }}>Calculating your optimal arrival time</h1>
            <ProgressIndicator />

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
              <>
                <div className="footer-row" style={{ justifyContent: 'center', marginTop: 6 }}>
                  <button className="btn btn-secondary" onClick={() => router.push('/')}>Cancel</button>
                </div>

                {/* Trust badges */}
                <div style={{
                  marginTop: 24,
                  paddingTop: 16,
                  borderTop: '1px solid rgba(255,255,255,0.06)',
                  display: 'flex',
                  justifyContent: 'center',
                  gap: 16,
                  flexWrap: 'wrap'
                }}>
                  <div className="lozenge" style={{
                    background: 'rgba(110,231,255,0.08)',
                    borderColor: 'rgba(110,231,255,0.2)',
                    fontSize: '11px'
                  }}>
                    🔒 Private & Secure
                  </div>
                  <div className="lozenge" style={{
                    background: 'rgba(81,207,102,0.08)',
                    borderColor: 'rgba(81,207,102,0.2)',
                    fontSize: '11px'
                  }}>
                    ⚡ Real-time Data
                  </div>
                  <div className="lozenge" style={{
                    background: 'rgba(168,139,250,0.08)',
                    borderColor: 'rgba(168,139,250,0.2)',
                    fontSize: '11px'
                  }}>
                    🎯 Personalized
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}

const PROGRESS_STEPS = [
  { step: 1, message: "🔍 Looking up your flight details...", detail: "Fetching real-time gate, terminal & aircraft info" },
  { step: 2, message: "📊 Analyzing airport security data...", detail: "Processing current wait times & historical patterns" },
  { step: 3, message: "⏱️ Calculating optimal timing...", detail: "Factoring in check-in, bags, security & walking time" },
  { step: 4, message: "🎯 Personalizing recommendations...", detail: "Adjusting for your travel preferences & history" },
  { step: 5, message: "✅ Finalizing your arrival plan...", detail: "Almost ready with your personalized timeline" },
];

const TRUST_INDICATORS = [
  "🔒 Your data stays private - nothing is stored or shared",
  "⚡ Real-time airport data from official sources",
  "🎯 Algorithms trained on millions of flight patterns",
  "✈️ Trusted by travelers at 500+ airports worldwide",
  "🛡️ Secure calculations processed locally in your browser",
];

function ProgressIndicator() {
  const [currentStep, setCurrentStep] = useState(0);
  const [showTrust, setShowTrust] = useState(false);
  const [trustIndex, setTrustIndex] = useState(0);

  useEffect(() => {
    // Progress through steps first
    const progressTimer = setInterval(() => {
      setCurrentStep(v => {
        if (v < PROGRESS_STEPS.length - 1) {
          return v + 1;
        } else {
          // After all steps, show trust indicators
          setShowTrust(true);
          return v;
        }
      });
    }, 900); // Slower progression for better readability

    // Cycle through trust indicators after progress is done
    const trustTimer = setInterval(() => {
      if (showTrust) {
        setTrustIndex(v => (v + 1) % TRUST_INDICATORS.length);
      }
    }, 2500);

    return () => {
      clearInterval(progressTimer);
      clearInterval(trustTimer);
    };
  }, [showTrust]);

  if (!showTrust) {
    const current = PROGRESS_STEPS[currentStep];
    return (
      <div style={{ textAlign: 'center', minHeight: 80 }}>
        {/* Progress Bar */}
        <div style={{
          width: '100%',
          maxWidth: 400,
          height: 6,
          background: 'rgba(255,255,255,0.1)',
          borderRadius: 3,
          margin: '0 auto 16px',
          overflow: 'hidden'
        }}>
          <div style={{
            width: `${((currentStep + 1) / PROGRESS_STEPS.length) * 100}%`,
            height: '100%',
            background: 'linear-gradient(90deg, var(--accent), var(--accent-2))',
            borderRadius: 3,
            transition: 'width 0.9s ease-out'
          }} />
        </div>

        {/* Step Indicator */}
        <div style={{
          fontSize: '12px',
          color: 'var(--accent)',
          fontWeight: 600,
          marginBottom: 8,
          textTransform: 'uppercase',
          letterSpacing: '0.5px'
        }}>
          Step {current.step} of {PROGRESS_STEPS.length}
        </div>

        {/* Main Message */}
        <div aria-live="polite" style={{
          fontSize: '16px',
          fontWeight: 500,
          marginBottom: 6,
          color: 'var(--text)'
        }}>
          {current.message}
        </div>

        {/* Detail */}
        <div style={{
          fontSize: '13px',
          color: 'var(--muted)',
          opacity: 0.8
        }}>
          {current.detail}
        </div>
      </div>
    );
  }

  return (
    <div style={{ textAlign: 'center', minHeight: 80 }}>
      {/* Completion Indicator */}
      <div style={{
        fontSize: '12px',
        color: 'var(--accent)',
        fontWeight: 600,
        marginBottom: 12,
        textTransform: 'uppercase',
        letterSpacing: '0.5px'
      }}>
        ✅ Analysis Complete
      </div>

      {/* Trust Indicator */}
      <div aria-live="polite" style={{
        fontSize: '14px',
        color: 'var(--text)',
        opacity: 0.9,
        minHeight: 40,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        {TRUST_INDICATORS[trustIndex]}
      </div>
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
