const MAP: Record<string,string> = {
  JFK:"KJFK", EWR:"KEWR", LGA:"KLGA", DCA:"KDCA", IAD:"KIAD", BOS:"KBOS", ATL:"KATL", LAX:"KLAX", ORD:"KORD",
  DFW:"KDFW", DEN:"KDEN", SFO:"KSFO", SEA:"KSEA", MIA:"KMIA", CLT:"KCLT", PHX:"KPHX", LAS:"KLAS",
  YYZ:"CYYZ", YUL:"CYUL", YVR:"CYVR", YYC:"CYYC", YOW:"CYOW", YEG:"CYEG", YWG:"CYWG"
};

export async function iataToIcao(iata: string): Promise<string | null> {
  const key = iata?.toUpperCase();
  if (!key) return null;
  if (MAP[key]) return MAP[key];

  const rapidKey = process.env.AERODATABOX_RAPIDAPI_KEY;
  if (!rapidKey) return null;

  try {
    const u = `https://aerodatabox.p.rapidapi.com/airports/iata/${encodeURIComponent(key)}`;
    const r = await fetch(u, {
      headers: {
        "X-RapidAPI-Key": rapidKey!,
        "X-RapidAPI-Host": "aerodatabox.p.rapidapi.com",
      },
    });
    const j: any = await r.json();
    // API may return single object or array
    const cand = Array.isArray(j) ? j[0] : j;
    const icao = cand?.icao || cand?.icaoCode || cand?.icao_code;
    return typeof icao === "string" ? icao : null;
  } catch {
    return null;
  }
}
