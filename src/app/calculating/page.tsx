'use client';

import "../ui.css";
import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

function decodeB64(b64: string){ try { return JSON.parse(decodeURIComponent(escape(atob(b64)))); } catch { return null; } }
function encodeB64(obj: any){ try { return btoa(unescape(encodeURIComponent(JSON.stringify(obj)))); } catch { return ""; } }

export default function CalculatingPage(){
  const sp = useSearchParams();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const kicked = useRef(false);

  const payloadFromQuery = useMemo(()=>{
    const raw = sp.get("payload");
    if(!raw) return null;
    return decodeB64(raw);
  }, [sp]);

  useEffect(()=>{
    if(kicked.current) return;
    kicked.current = true;

    const stored = (()=>{ try { return JSON.parse(sessionStorage.getItem("depart:lastPayload") || "null"); } catch { return null; }})();
    const payload = payloadFromQuery || stored;
    if(!payload){ setError("Missing flight details. Please start again."); return; }

    const depISO = payload?.departureLocalISO || (payload?.departureEpochMs ? new Date(payload.departureEpochMs).toISOString() : undefined);
    const common = { checkedBag: payload.checkedBag, hasNexus: payload.hasNexus, isInternational: payload.isInternational, airline: payload.airline };

    const candidates = [
      { ...payload },
      { airport: payload.airport, departureLocalISO: depISO, ...common },
      { airport: payload.airport, flightDateTime: depISO, ...common },
      { airport: payload.airport, departureEpochMs: payload.departureEpochMs, ...common },
    ];

    (async ()=>{
      let lastErr: any = null;
      for(const body of candidates){
        try{
          const res = await fetch("/api/recommend", { method:"POST", headers:{ "Content-Type":"application/json" }, body: JSON.stringify(body) });
          if(res.ok){
            const data = await res.json();

            // Delta vs previous result
            try{
              const prevRaw = sessionStorage.getItem("depart:lastResult");
              if(prevRaw){
                const prev = JSON.parse(prevRaw);
                const a = Date.parse(prev?.timeline?.arriveByISO || prev?.departureLocalISO || "");
                const b = Date.parse(data?.timeline?.arriveByISO || data?.departureLocalISO || "");
                if(!isNaN(a) && !isNaN(b)){
                  const diffMin = Math.round((b - a)/60000);
                  if(diffMin !== 0){
                    data.changed = { minutes: Math.abs(diffMin), direction: diffMin > 0 ? "later" : "earlier" };
                  }
                }
              }
              sessionStorage.setItem("depart:lastResultPrev", prevRaw || "null");
            }catch{}

            try { sessionStorage.setItem("depart:lastResult", JSON.stringify(data)); } catch {}
            const b64 = encodeB64(data);
            await new Promise(r=>setTimeout(r, 450));
            router.replace("/result?data=" + encodeURIComponent(b64));
            return;
          } else {
            let detail = "";
            try { const txt = await res.text(); try { detail = JSON.parse(txt)?.error ?? txt; } catch { detail = txt; } } catch {}
            lastErr = new Error("HTTP " + res.status + (detail ? " — " + String(detail) : ""));
          }
        }catch(e:any){ lastErr = e; }
      }
      setError((lastErr?.message || "Unknown error") + " — please go back and try again.");
    })();

  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [payloadFromQuery]);

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
          <div className="badge">calculating…</div>
        </div>

        <div className="card card-lg">
          <div className="card-inner" style={{display:"grid", placeItems:"center", textAlign:"center", gap:16}}>
            <div className="spinner" aria-label="loading"></div>
            <h1>Calculating…</h1>
            <p className="sub">We’re fetching your recommendation.</p>

            {error && (
              <div style={{marginTop:18}}>
                <div className="lozenge" style={{borderColor:"rgba(255,0,0,.25)", color:"#ffd1d1"}}>Error</div>
                <p className="help" style={{marginTop:8}}>{error}</p>
                <div className="footer-row" style={{justifyContent:"center"}}>
                  <button className="btn btn-secondary" onClick={()=>history.back()}>Go back</button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
