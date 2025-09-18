/* eslint-disable */ // @ts-nocheck

// Simple deterministic demo "lookup" so the UI works offline.
// Given AC/WS/UA/DL/AA + number + dateISO, returns airline, airport guess, and a plausible time.

const carriers:any = {
  AC: { name: 'Air Canada',     bases: ['YYZ','YUL','YVR','YOW'] },
  WS: { name: 'WestJet',        bases: ['YYC','YYZ','YVR'] },
  UA: { name: 'United',         bases: ['ORD','DEN','IAH','EWR','IAD','SFO','LAX'] },
  DL: { name: 'Delta',          bases: ['ATL','DTW','MSP','SLC','JFK','LAX','BOS','SEA'] },
  AA: { name: 'American',       bases: ['DFW','CLT','PHL','MIA','PHX','ORD','LAX'] },
};

function derive(flight:string, dateISO?:string){
  const m = /^([A-Za-z]{2})(\d{1,4})$/.exec(flight.replace(/\s+/g,''));
  if(!m) return null;
  const carrier = (m[1] || '').toUpperCase();
  const num = parseInt(m[2],10);
  const meta = carriers[carrier];
  if(!meta) return null;

  // deterministic but plausible
  const base = meta.bases[num % meta.bases.length];
  const d = dateISO ? new Date(dateISO) : new Date();
  if (isNaN(d.getTime())) return null;

  const hour = 6 + (num % 12); // 06:00..17:00
  const minute = (num % 2) ? 30 : 0;
  d.setHours(hour, minute, 0, 0);

  // naive "international" guess: non-CA base for AC/WS, non-US base for UA/DL/AA
  const isCA = ['Y','C','M'].includes(base[0]); // rough
  const isInternational =
    (carrier==='AC'||carrier==='WS') ? !isCA :
    (carrier==='UA'||carrier==='DL'||carrier==='AA') ? isCA : false;

  return {
    airline: meta.name,
    airport: base,
    departureLocalISO: d.toISOString(),
    isInternational,
    demo: true
  };
}

export async function POST(req:Request){
  let body:any=null;
  try{ body = await req.json(); }catch{ return new Response(JSON.stringify({error:'Invalid JSON'}),{status:400}); }
  const f = String(body?.flight||'').trim();
  const dateISO = body?.dateISO || body?.departureLocalISO;
  const dateRaw = (body?.date || body?.dateYYYYMMDD || '').toString();
  // Attempt Aerodatabox (if key configured)
  const datePart = (/^\d{4}-\d{2}-\d{2}$/.test(dateRaw) ? dateRaw : (dateISO && new Date(dateISO).toISOString().slice(0,10))) || undefined;
  let adb: any = null;
  try {
    if (datePart) {
      const mod = await import("@/lib/aerodatabox");
      if (mod && typeof mod.fetchFlightByNumberOnDate === 'function') {
        adb = await mod.fetchFlightByNumberOnDate(f, datePart);
      }
    }
  } catch {}

  function normalizeISO(s?: string): string | undefined {
    if (!s) return undefined;
    let t = String(s).trim();
    t = t.replace(/^([0-9]{4}-[0-9]{2}-[0-9]{2})\s+/, '$1T');
    if (/^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}$/.test(t)) t += ':00';
    const d = new Date(t);
    return isFinite(d.getTime()) ? d.toISOString() : undefined;
  }

  if (adb) {
    const depAp = adb?.departure?.airport?.iata || adb?.departure?.airport?.icao || adb?.departure?.airport || undefined;
    const arrAp = adb?.arrival?.airport?.iata || adb?.arrival?.airport?.icao || adb?.arrival?.airport || undefined;
    const depLocalISO = normalizeISO(adb?.departure?.scheduledTimeLocal) || normalizeISO(adb?.departure?.scheduledTime) || normalizeISO(adb?.departure?.scheduledTimeUtc) || (datePart ? `${datePart}T12:00:00.000Z` : undefined);
    const arrLocalISO = normalizeISO(adb?.arrival?.scheduledTimeLocal) || normalizeISO(adb?.arrival?.scheduledTime) || normalizeISO(adb?.arrival?.scheduledTimeUtc);
    const airlineName = adb?.airline?.name || adb?.airline?.code || undefined;
    const airlineCode = adb?.airline?.code || (f.match(/^[A-Za-z]{2,3}/)?.[0]?.toUpperCase()) || undefined;
    const status = (adb?.status || adb?.statusText || 'scheduled') as string;
    const termGateDep = { terminal: adb?.departure?.terminal, gate: adb?.departure?.gate }; 
    const termGateArr = { terminal: adb?.arrival?.terminal, gate: adb?.arrival?.gate };
    const aircraftType = adb?.aircraft?.model || adb?.aircraft?.type || undefined;
    const isIntl = (!!depAp && !!arrAp) ? !String(depAp).startsWith('Y') !== !String(arrAp).startsWith('Y') : false;

    return Response.json({
      flight: f,
      airline: airlineName,
      airlineCode,
      airlineName,
      airport: depAp,
      departureLocalISO: depLocalISO,
      isInternational: isIntl,
      departure: { airport: depAp, scheduledLocalISO: depLocalISO, ...termGateDep },
      arrival: { airport: arrAp, scheduledLocalISO: arrLocalISO, ...termGateArr },
      status,
      aircraft: { type: aircraftType },
    });
  }

  // Anchor fallback derivation to local midnight of the requested date (avoid UTC shifting)
  const baseDateISO = datePart ? `${datePart}T00:00:00` : dateISO;
  let out = derive(f, baseDateISO);
  if(!out){
    if (datePart) {
      // If user provided an explicit date and ADB didn't match, avoid returning wrong-day demo fallback
      return new Response(JSON.stringify({ error: 'Flight not found for selected departure date.' }), { status: 404 });
    }
    // Lenient fallback: accept unknown carriers and still provide a mock flight so UI works
    const m = /^([A-Za-z]{2,3})\s?(\d{1,4})$/.exec(f.replace(/\s+/g,''));
    if (m) {
      const carrier = (m[1] || '').toUpperCase();
      const num = parseInt(m[2],10);
      const d = baseDateISO ? new Date(baseDateISO) : (dateISO ? new Date(dateISO) : new Date());
      if (!isNaN(d.getTime())) {
        const hour = 6 + (num % 12); // 06:00..17:00
        const minute = (num % 2) ? 30 : 0;
        d.setHours(hour, minute, 0, 0);
        out = {
          airline: carrier, // unknown carrier label
          airport: 'YYZ',
          departureLocalISO: d.toISOString(),
          isInternational: false,
          demo: true,
        } as any;
      }
    }
    if(!out){
      return new Response(JSON.stringify({error:'Flight not found in demo lookup.'}), {status:404});
    }
  }
  // Extend with richer demo fields for flight detail view
  const carrier = (f.match(/^([A-Za-z]{2})/)?.[1] || '').toUpperCase();
  const num = parseInt((f.match(/[0-9]{1,4}/)?.[0] || '0'), 10);
  const meta = carriers[carrier];
  const depISO = out.departureLocalISO;
  const depAirport = out.airport;
  // Simple dest guess: rotate through bases
  const bases = meta?.bases || [];
  const depIdx = Math.max(0, bases.indexOf(depAirport));
  const arrAirport = bases.length ? bases[(depIdx + 1 + (num % bases.length)) % bases.length] : (depAirport || 'YYZ');
  const isIntl = !!out.isInternational;
  const durationMin = isIntl ? 540 : 75; // demo durations
  const arrISO = depISO ? new Date(new Date(depISO).getTime() + durationMin * 60000).toISOString() : undefined;
  const aircraftType = (carrier === 'AC') ? 'Boeing 737-800' : (carrier === 'WS') ? 'Boeing 787-9' : 'Airbus A320';
  const terminalGate = (code: string) => ({ terminal: (code === 'YYZ' || code === 'YUL') ? '1' : 'Main', gate: `B${(num % 25) + 1}` });

  return Response.json({
    ...out,
    flight: f,
    airlineCode: carrier,
    airlineName: meta?.name || out.airline,
    departureLocalISO: out.departureLocalISO, // Ensure this is always present for frontend consistency
    departure: { airport: depAirport, scheduledLocalISO: depISO, ...terminalGate(depAirport) },
    arrival: { airport: arrAirport, scheduledLocalISO: arrISO, ...terminalGate(arrAirport) },
    status: 'scheduled',
    aircraft: { type: aircraftType },
  });
}
