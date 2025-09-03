export function iataToIcao(iata?: string | null): string | null {
  if (!iata) return null;
  const code = iata.trim().toUpperCase();
  const TABLE: Record<string, string> = {
    YYZ: "CYYZ", YOW: "CYOW", YUL: "CYUL", YVR: "CYVR", YYC: "CYYC",
    YEG: "CYEG", YHZ: "CYHZ", YWG: "CYWG"
  };
  if (TABLE[code]) return TABLE[code];

  // Canada: most IATA start with Y -> ICAO is C + IATA
  if (/^Y[A-Z]{2}$/.test(code)) return "C" + code;

  // Generic US fallback (e.g., LAX -> KLAX, JFK -> KJFK, etc.)
  if (/^[A-Z]{3}$/.test(code)) return "K" + code;

  return null;
}
