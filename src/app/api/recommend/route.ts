/* eslint-disable */ // @ts-nocheck

function normalize(body: any){
  const airport =
    (body?.airport ?? body?.airportCode ?? body?.iata ?? body?.code ?? "").toString().trim().toUpperCase();

  const depISO =
    body?.departureLocalISO ??
    body?.departureISO ??
    body?.flightDateTime ??
    body?.departure ??
    body?.dateISO ??
    body?.datetime ??
    null;

  let depMs =
    (typeof body?.departureEpochMs === "number" ? body.departureEpochMs : undefined) ??
    (depISO ? Date.parse(depISO) : undefined) ??
    (body?.departureLocal ? Date.parse(body.departureLocal) : undefined);

  if (!depMs || Number.isNaN(depMs)) depMs = undefined;

  const airline         = body?.airline ? String(body.airline) : undefined;
  const checkedBag      = !!(body?.checkedBag ?? body?.hasBag ?? body?.bag ?? false);
  const hasNexus        = !!(body?.hasNexus ?? body?.nexus ?? body?.trustedTraveler ?? false);
  const isInternational = !!(body?.isInternational ?? body?.international ?? body?.intl ?? false);
  const alreadyCheckedIn = !!(body?.alreadyCheckedIn ?? body?.checkedIn ?? false); // NEW FIELD

  return { 
    airport, 
    airline, 
    depMs, 
    depISO: depMs ? new Date(depMs).toISOString() : undefined, 
    checkedBag, 
    hasNexus, 
    isInternational, 
    alreadyCheckedIn, // NEW FIELD
    raw: body 
  };
}

function deriveTraffic(depMs:number){
  const d = new Date(depMs); const hour = d.getHours(); const dow = d.getDay();
  let level = "Moderate"; let reason = "Typical passenger activity for this timeframe.";
  if (hour >= 5 && hour <= 9) { level = "High"; reason = "Morning departure peak with many first-bank flights."; }
  else if (hour >= 10 && hour <= 15) { level = (dow>=1 && dow<=4) ? "Low" : "Moderate"; reason = (dow>=1 && dow<=4) ? "Weekday midday lull—fewer departures than peak times." : "Midday traffic—lighter than peaks."; }
  else if (hour >= 16 && hour <= 20) { level = "High"; reason = "Evening bank—commuter and transcon departures."; }
  else { level = "Low"; reason = "Late-night/early-morning window with reduced schedules."; }
  return { level, reason, summary: `${level} passenger traffic — ${reason}` };
}
function clamp(n:number,min:number,max:number){ return Math.max(min, Math.min(max, n)); }
function minutes(n:number){ return n*60_000; }

function securityFrom(trafficLevel: string, hasNexus: boolean, isInternational: boolean){
  let base = hasNexus ? 10 : 25; let outlook = hasNexus ? "Typical (Expedited)" : "Typical";
  if (trafficLevel === "High"){ base += hasNexus ? 2 : 8; outlook = hasNexus ? "Typical (Expedited)" : "Busy"; }
  else if (trafficLevel === "Low"){ base += hasNexus ? -2 : -5; outlook = hasNexus ? "Light (Expedited)" : "Light"; }
  if (isInternational && !hasNexus) base += 5;
  base = clamp(base, 5, 55);
  return { minutes: base, outlook };
}

function contingencyFrom(depMs:number, trafficLevel:string, checkedBag:boolean, hasNexus:boolean, isInternational:boolean){
  const hr = new Date(depMs).getHours();
  let c = 25;
  if (trafficLevel === "High") c += 10;
  if (trafficLevel === "Low")  c -= 5;
  if (checkedBag)              c += 5;
  if (hasNexus)                c -= 5;
  if (isInternational)         c += 10;
  if (hr >= 17 && hr <= 21)    c += 5;
  if (hr >= 5  && hr <= 8)     c += 5;
  c = clamp(c, 15, 55);

  const reasons:string[] = [];
  reasons.push(trafficLevel === "High" ? "higher terminal traffic" : (trafficLevel === "Low" ? "off-peak terminal traffic" : "typical terminal traffic"));
  if (checkedBag)    reasons.push("checked-bag drop");
  if (hasNexus)      reasons.push("expedited screening");
  if (isInternational) reasons.push("international doc checks");
  if (hr >= 17 && hr <= 21) reasons.push("evening boarding wave");
  if (hr >= 5  && hr <= 8)  reasons.push("early-morning rush");

  const reason = `Sized for ${reasons.join(", ")}. Covers parking/curb, doc checks, walking time, and minor delays.`;
  return { minutes: c, reason };
}

function overallAndConfidence(trafficLevel:string, securityOutlook:string, depMs:number, hasNexus:boolean, isInternational:boolean, source:string){
  const secLevel = /Busy/i.test(securityOutlook) ? "Busy" : (/Light/i.test(securityOutlook) ? "Light" : "Typical");
  let overall = secLevel === "Busy" || trafficLevel === "High" ? "Busy" :
                (secLevel === "Light" && trafficLevel === "Low" ? "Light" : "Typical");
  let score = 0.6;
  if (hasNexus) score += 0.05;
  if (isInternational) score -= 0.1;
  if (trafficLevel === "High") score -= 0.05;
  if (source === "compute") score += 0.05; else score -= 0.05;
  const hoursAhead = Math.max(0, (depMs - Date.now()) / 36e5);
  if (hoursAhead > 36) score -= 0.05;
  score = clamp(score, 0, 1);
  const level = score >= 0.75 ? "High" : (score >= 0.55 ? "Medium" : "Low");
  return { overall, confidence: { level, score } };
}

function buildPlan({ depMs, checkedBag, hasNexus, isInternational, alreadyCheckedIn }){
  const traffic = deriveTraffic(depMs);
  
  // UPDATED LOGIC: Only add check-in time if NOT already checked in, OR if they have a checked bag
  let checkInMinutes = 0;
  if (!alreadyCheckedIn || checkedBag) {
    checkInMinutes = (checkedBag ? 35 : 20) + (isInternational ? 15 : 0);
  }
  // If already checked in AND no checked bag, checkInMinutes stays 0
  
  const sec = securityFrom(traffic.level, hasNexus, isInternational);
  const cont = contingencyFrom(depMs, traffic.level, checkedBag, hasNexus, isInternational);
  const toGateMinutes = 15;

  const total = checkInMinutes + sec.minutes + toGateMinutes + cont.minutes;
  const arriveByMs = depMs - minutes(total);

  const ts = (ms:number) => new Date(ms).toISOString();
  const t_checkInDone  = arriveByMs + minutes(checkInMinutes);
  const t_securityDone = t_checkInDone + minutes(sec.minutes);
  const t_gateBy       = t_securityDone + minutes(toGateMinutes);

  const meta = overallAndConfidence(traffic.level, sec.outlook, depMs, hasNexus, isInternational, "fallback");

  // Updated notes to reflect the new logic
  const notes = [];
  if (alreadyCheckedIn && !checkedBag) {
    notes.push("Already checked in with carry-on only—no check-in time added.");
  } else if (checkedBag) {
    notes.push("Includes time for checked-bag drop and check-in.");
  } else {
    notes.push("Carry-on only, no bag-drop time added.");
  }
  
  notes.push(hasNexus ? "NEXUS expected to shorten security screening." : "Security time based on regular screening.");
  notes.push(isInternational ? "International departure—extra time for passport/visa checks and gate procedures." : "Domestic departure.");

  return {
    arriveBy: new Date(arriveByMs).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    bufferMinutes: total,
    securityOutlook: sec.outlook,
    routeType: isInternational ? "International" : "Domestic",
    components: { checkInMinutes, securityMinutes: sec.minutes, toGateMinutes, contingencyMinutes: cont.minutes },
    explanation: {
      checkedBag, hasNexus, isInternational, alreadyCheckedIn, // Add alreadyCheckedIn to explanation
      contingencyReason: cont.reason,
      notes
    },
    timeline: {
      arriveByISO: ts(arriveByMs),
      checkInDoneISO: ts(t_checkInDone),
      securityDoneISO: ts(t_securityDone),
      gateByISO: ts(t_gateBy)
    },
    traffic,
    overall: meta.overall,
    confidence: meta.confidence
  };
}

async function callExistingCompute(input: { 
  airport: string; 
  depMs: number; 
  depISO: string; 
  airline?: string; 
  checkedBag?: boolean; 
  hasNexus?: boolean; 
  isInternational?: boolean;
  alreadyCheckedIn?: boolean; // NEW PARAMETER
}) {
  let mod: any = null;
  try { mod = await import("../../../lib/compute"); } catch {}
  const candidateFns = ["recommend","getRecommendation","computeRecommendation","makeRecommendation","recommendArrival"];
  const fnName = candidateFns.find(n => mod && typeof mod[n] === "function");
  if (!fnName) return null;

  const args = [
    { 
      airport: input.airport, 
      departureEpochMs: input.depMs, 
      airline: input.airline, 
      checkedBag: input.checkedBag, 
      hasNexus: input.hasNexus, 
      isInternational: input.isInternational,
      alreadyCheckedIn: input.alreadyCheckedIn // ADD THIS
    },
    { 
      airport: input.airport, 
      departureLocalISO: input.depISO, 
      airline: input.airline, 
      checkedBag: input.checkedBag, 
      hasNexus: input.hasNexus, 
      isInternational: input.isInternational,
      alreadyCheckedIn: input.alreadyCheckedIn // ADD THIS
    },
    { 
      airportCode: input.airport, 
      flightDateTime: input.depISO, 
      airline: input.airline, 
      checkedBag: input.checkedBag, 
      hasNexus: input.hasNexus, 
      isInternational: input.isInternational,
      alreadyCheckedIn: input.alreadyCheckedIn // ADD THIS
    },
  ];
  for (const a of args) { try { const out = await mod[fnName](a); if (out) return out; } catch {} }
  return null;
}

export async function POST(req: Request) {
  let body: any = null;
  try { body = await req.json(); }
  catch { return new Response(JSON.stringify({ error: "Invalid JSON body." }), { status: 400 }); }

  const norm = normalize(body);
  if (!norm.airport)  return new Response(JSON.stringify({ error: "Missing airport (airport/airportCode/iata)." }), { status: 400 });
  if (!norm.depMs)    return new Response(JSON.stringify({ error: "Missing/invalid departure time (departureLocalISO/flightDateTime/departureEpochMs)." }), { status: 400 });

  const existing = await callExistingCompute({ 
    airport: norm.airport, 
    depMs: norm.depMs, 
    depISO: norm.depISO!, 
    airline: norm.airline, 
    checkedBag: norm.checkedBag, 
    hasNexus: norm.hasNexus, 
    isInternational: norm.isInternational,
    alreadyCheckedIn: norm.alreadyCheckedIn // ADD THIS
  });
  
  const heuristic = buildPlan({ 
    depMs: norm.depMs, 
    checkedBag: norm.checkedBag, 
    hasNexus: norm.hasNexus, 
    isInternational: norm.isInternational,
    alreadyCheckedIn: norm.alreadyCheckedIn // ADD THIS
  });

  if (existing) {
    const arriveBy =
      existing?.arriveBy ??
      existing?.result?.arriveBy ??
      existing?.recommendation?.arriveBy ??
      existing?.arrival?.recommendedTime ?? heuristic.arriveBy;

    const bufferMinutes =
      (typeof existing?.bufferMinutes === "number" ? existing.bufferMinutes : undefined) ??
      (typeof existing?.minutesBeforeDeparture === "number" ? existing.minutesBeforeDeparture : undefined) ??
      heuristic.bufferMinutes;

    const securityOutlook =
      existing?.securityOutlook ?? existing?.security?.status ?? existing?.queue ?? existing?.wait ?? heuristic.securityOutlook;

    const meta = overallAndConfidence(heuristic.traffic.level, securityOutlook, norm.depMs, norm.hasNexus, norm.isInternational, "compute");

    return Response.json({
      arriveBy,
      bufferMinutes,
      securityOutlook,
      routeType: existing?.routeType ?? heuristic.routeType,
      components: existing?.components ?? heuristic.components,
      explanation: {
        checkedBag: norm.checkedBag, 
        hasNexus: norm.hasNexus, 
        isInternational: norm.isInternational,
        alreadyCheckedIn: norm.alreadyCheckedIn, // ADD THIS
        contingencyReason: heuristic.explanation.contingencyReason,
        notes: (existing?.explanation?.notes ?? []).concat(heuristic.explanation.notes)
      },
      timeline: existing?.timeline ?? heuristic.timeline,
      traffic: existing?.traffic ?? heuristic.traffic,
      overall: meta.overall,
      confidence: meta.confidence,
      departureLocalISO: norm.depISO,
      airport: norm.airport,
      source: "compute",
      original: existing
    });
  }

  return Response.json({
    ...heuristic,
    departureLocalISO: norm.depISO,
    airport: norm.airport,
    source: "fallback"
  });
}