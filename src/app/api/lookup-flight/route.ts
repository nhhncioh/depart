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
  const out = derive(f, dateISO);
  if(!out) return new Response(JSON.stringify({error:'Flight not found in demo lookup.'}), {status:404});
  return Response.json(out);
}
