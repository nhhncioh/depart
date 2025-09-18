"use client";
function RiskGauge({ value }: { value: number }) {
  const v = Math.max(0, Math.min(100, Math.round(value)));
  const radius = 44;
  const stroke = 10;
  const circumference = Math.PI * radius; // half circumference (semi-circle)
  const dash = (v / 100) * circumference;
  const color = v >= 70 ? "#ff6b6b" : v >= 40 ? "#fbbc04" : "#51cf66";
  const arcPath = `M ${-radius} 0 A ${radius} ${radius} 0 1 1 ${radius} 0`;
  return (
    <svg width={120} height={70} viewBox="0 0 120 70" aria-label={`Risk ${v}`}>
      <g transform="translate(60,60)">
        <path d={arcPath} fill="none" stroke="rgba(255,255,255,.15)" strokeWidth={stroke} strokeLinecap="round" />
        <path d={arcPath} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeDasharray={`${dash} ${circumference}`} />
      </g>
      <text x="60" y="52" textAnchor="middle" fontSize="12" fill="rgba(255,255,255,.8)">Risk {v}</text>
    </svg>
  );
}
import "./styles.css";
import React, { useMemo, useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";/** ---------- tiny helpers (safe, self-contained) ---------- */

function fmtTimeISO(iso?: string | null, timeZone?: string) { return fmtTimeISOStable(iso, timeZone); }

function fmtTimeISOStable(iso?: string | null, timeZone?: string) {
  if (!iso) return "";
  const d = new Date(iso);

  const opts: Intl.DateTimeFormatOptions = {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true
  };
  if (timeZone) (opts as any).timeZone = timeZone;

  const parts = new Intl.DateTimeFormat("en-US", opts).formatToParts(d);
  const get = (t: any) => parts.find(p => p.type === t)?.value ?? "\u2014";

  const hour = String(get("hour")).padStart(2, "0");
  const minute = String(get("minute")).padStart(2, "0");
  const ap = String(get("dayPeriod") || "").toUpperCase();

  return `${hour}:${minute} ${ap}`;
}

function parseDataParam(param: string | null) {
  if (!param) return null;

  const tryJSON = (s: string) => { try { return JSON.parse(s); } catch { return null; } };

  // Try Base64URL -> JSON
  try {
    const b64 = param.replace(/-/g, '+').replace(/_/g, '/');
    const padded = b64 + '='.repeat((4 - (b64.length % 4)) % 4);
    const bin = typeof atob === 'function' ? atob(padded) : Buffer.from(padded, 'base64').toString('binary');
    const bytes = Uint8Array.from(bin, c => c.charCodeAt(0));
    const json = new TextDecoder().decode(bytes);
    const o = tryJSON(json);
    if (o) return o;
  } catch {}

  // Try URI decoding once/twice -> JSON
  try {
    const once = decodeURIComponent(param);
    const o1 = tryJSON(once);
    if (o1) return o1;
    const twice = decodeURIComponent(once);
    const o2 = tryJSON(twice);
    if (o2) return o2;
  } catch {}

  // Fallback: direct JSON
  return tryJSON(param);
}
function generateComfortLevels(result: any) {
  const fmt = (iso?: string | null) => iso ? fmtTimeISO(iso) : "\u00C3\u0192\u00C6\u2019\u00C3\u2020\u00E2\u20AC\u2122\u00C3\u0192\u00E2\u20AC\u00A0\u00C3\u00A2\u00E2\u201A\u00AC\u00E2\u201E\u00A2\u00C3\u0192\u00C6\u2019\u00C3\u00A2\u00E2\u201A\u00AC\u00C5\u00A1\u00C3\u0192\u00E2\u20AC\u0161\u00C3\u201A\u00C2\u00A2\u00C3\u0192\u00C6\u2019\u00C3\u2020\u00E2\u20AC\u2122\u00C3\u0192\u00E2\u20AC\u0161\u00C3\u201A\u00C2\u00A2\u00C3\u0192\u00C6\u2019\u00C3\u201A\u00C2\u00A2\u00C3\u0192\u00C2\u00A2\u00C3\u00A2\u00E2\u201A\u00AC\u00C5\u00A1\u00C3\u201A\u00C2\u00AC\u00C3\u0192\u00E2\u20AC\u00A6\u00C3\u201A\u00C2\u00A1\u00C3\u0192\u00C6\u2019\u00C3\u00A2\u00E2\u201A\u00AC\u00C5\u00A1\u00C3\u0192\u00E2\u20AC\u0161\u00C3\u201A\u00C2\u00AC\u00C3\u0192\u00C6\u2019\u00C3\u2020\u00E2\u20AC\u2122\u00C3\u0192\u00E2\u20AC\u0161\u00C3\u201A\u00C2\u00A2\u00C3\u0192\u00C6\u2019\u00C3\u201A\u00C2\u00A2\u00C3\u0192\u00C2\u00A2\u00C3\u00A2\u00E2\u20AC\u0161\u00C2\u00AC\u00C3\u2026\u00C2\u00A1\u00C3\u0192\u00E2\u20AC\u0161\u00C3\u201A\u00C2\u00AC\u00C3\u0192\u00C6\u2019\u00C3\u00A2\u00E2\u201A\u00AC\u00C5\u00A1\u00C3\u0192\u00E2\u20AC\u0161\u00C3\u201A\u00C2\u009D";

  const riskyISO    = result?.bands?.aggressiveLeaveLocalISO ?? result?.leaveByLocalISO ?? null;
  const moderateISO = result?.bands?.normalLeaveLocalISO     ?? result?.leaveByLocalISO ?? null;
  const cautiousISO = result?.bands?.cautiousLeaveLocalISO   ?? result?.leaveByLocalISO ?? null;

  return {
    risky:    { time: fmt(riskyISO),    description: "Tight window; best for light travelers or PreCheck." },
    moderate: { time: fmt(moderateISO), description: "Balanced timing for most travelers." },
    cautious: { time: fmt(cautiousISO), description: "Extra buffer for peace of mind and unexpected delays." },
    _iso: { riskyISO, moderateISO, cautiousISO }
  };
}
function generateAnalysis(result: any) {
  const bd = result?.breakdown ?? {};
  const n = (v: any, d: number) => (typeof v === "number" && isFinite(v) ? v : d);

  // Dynamic defaults based on airport capacity & busyness
  const isIntl = !!(result?.flags?.isInternational ?? result?.isInternational ?? (result?.flightType === "international"));
  const capacity = (result?.meta?.busyness?.capacityTier ?? "medium").toString().toLowerCase();
  const tierMul = capacity === "mega" ? 1.35 : (capacity === "large" ? 1.20 : (capacity === "small" ? 0.90 : 1.00));
  const score = (typeof result?.meta?.busyness?.score === "number") ? result.meta.busyness.score : 0;
  const busyAdd = score >= 60 ? 10 : (score >= 30 ? 5 : 0); // minutes
  const baseCheck = isIntl ? 45 : 30;   // baseline mins
  const baseSec   = isIntl ? 10 : 5;
  const intlImmigrationAdd = isIntl ? ((capacity === "large" || capacity === "mega") ? 10 : 5) : 0;
  const chkDef = Math.round(baseCheck * tierMul + busyAdd + intlImmigrationAdd);
  const secDef = Math.round(baseSec   * tierMul + Math.round(busyAdd / 2));

  // Skip check-in if already checked in and no checked bag
  const checkedIn = !!(result?.flags?.alreadyCheckedIn ?? result?.flags?.checkedIn ?? result?.inputs?.checkedIn);
  const hasBag    = !!(result?.flags?.hasCheckedBag ?? result?.flags?.checkedBag ?? result?.inputs?.hasCheckedBag ?? result?.inputs?.bags);
  const skipCheckIn = !!(checkedIn && !hasBag);
  const checkInEff  = skipCheckIn ? 0 : n((bd as any).checkInMin, chkDef);
  const reasonCheck = skipCheckIn ? "Already checked in and no checked bag." : "Airline counters & baggage drop at this hour.";

  const items = [
    { factor: "Check-in / bag-drop", time: checkInEff, reason: reasonCheck },
    { factor: "Security screening",  time: n((bd as any).securityWaitMin, secDef), reason: (result?.meta?.securityDetail ?? "Typical security wait for this timeslot.") },
    { factor: "Walk to gate",        time: n((bd as any).walkBufferMin, 12), reason: "Distance and terminal layout." },
    { factor: "Contingency",         time: n(((bd as any).contingencyMin ?? result?.meta?.airportMiscBufferMin), 8), reason: "Buffer for minor slowdowns." }
  ];

  const windowMinutes =
    (typeof result?.meta?.busyness?.windowMin === "number")
      ? Math.max(15, Math.min(240, Math.round(result.meta.busyness.windowMin)))
      : (typeof result?.meta?.horizonHours === "number")
        ? Math.max(15, Math.min(240, Math.round(result.meta.horizonHours * 60)))
        : 90;

  const bus = (result?.meta?.busyness ?? result?.meta?.business) as any;
  const count = (typeof bus?.count === "number") ? bus.count : null;

  const activityLevel =
    (typeof bus?.score === "number")
      ? (bus.score >= 60 ? "High" : (bus.score >= 30 ? "Moderate" : "Typical"))
      : "Typical";

  return {
    activityLevel,
    departuresInWindow: count,
    windowMinutes,
    departureContext: (result?.meta?.securityDetail ?? "Based on schedule load and typical patterns."),
    extendedContext: (result?.meta?.securitySource ? ("Source: " + result.meta.securitySource) : null),
    breakdown: items
  };
}

// Dynamic holiday calculation functions
function getHolidayDates(year: number) {
  // Utility functions
  const getNthWeekday = (year: number, month: number, weekday: number, n: number): Date => {
    const firstDay = new Date(year, month - 1, 1);
    const firstWeekday = firstDay.getDay();
    const daysToAdd = (weekday - firstWeekday + 7) % 7 + (n - 1) * 7;
    return new Date(year, month - 1, 1 + daysToAdd);
  };
  
  const getLastWeekday = (year: number, month: number, weekday: number): Date => {
    const lastDay = new Date(year, month, 0);
    const lastWeekday = lastDay.getDay();
    const daysToSubtract = (lastWeekday - weekday + 7) % 7;
    return new Date(year, month - 1, lastDay.getDate() - daysToSubtract);
  };
  
  const addDays = (date: Date, days: number): Date => {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  };
  
  const getEaster = (year: number): Date => {
    const a = year % 19;
    const b = Math.floor(year / 100);
    const c = year % 100;
    const d = Math.floor(b / 4);
    const e = b % 4;
    const f = Math.floor((b + 8) / 25);
    const g = Math.floor((b - f + 1) / 3);
    const h = (19 * a + b - d - g + 15) % 30;
    const i = Math.floor(c / 4);
    const k = c % 4;
    const l = (32 + 2 * e + 2 * i - h - k) % 7;
    const m = Math.floor((a + 11 * h + 22 * l) / 451);
    const month = Math.floor((h + l - 7 * m + 114) / 31);
    const day = ((h + l - 7 * m + 114) % 31) + 1;
    return new Date(year, month - 1, day);
  };

  // Calculate all major travel surge dates
  const holidays = {
    // Top 10 busiest
    thanksgivingWed: addDays(getNthWeekday(year, 11, 4, 4), -1), // Wed before Thanksgiving
    thanksgivingTue: addDays(getNthWeekday(year, 11, 4, 4), -2), // Tue before Thanksgiving  
    postThanksgivingSun: addDays(getNthWeekday(year, 11, 4, 4), 3), // Sun after Thanksgiving
    memorialFri: addDays(getLastWeekday(year, 5, 1), -2), // Fri before Memorial Day
    july4Sun: (() => {
      const july4 = new Date(year, 6, 4);
      const july4Day = july4.getDay();
      return july4Day === 0 ? july4 : addDays(july4, (7 - july4Day) % 7);
    })(), // Sunday after July 4th
    christmasEveEve: new Date(year, 11, 23), // Dec 23
    postChristmas: new Date(year, 11, 26), // Dec 26
    christmasWeekFri: (() => {
      const christmas = new Date(year, 11, 25);
      const christmasDay = christmas.getDay();
      // Find Friday of Christmas week (Dec 19-22 range)
      const fridayOffset = (5 - christmasDay + 7) % 7;
      return addDays(christmas, fridayOffset - 7);
    })(),
    laborFri: addDays(getNthWeekday(year, 9, 1, 1), -3), // Fri before Labor Day
    laborMon: getNthWeekday(year, 9, 1, 1), // Labor Day Monday
    
    // Other high-traffic dates (11-30)
    july4Thu: (() => {
      const july4 = new Date(year, 6, 4);
      return addDays(july4, july4.getDay() === 4 ? 0 : (4 - july4.getDay() + 7) % 7 - 7);
    })(), // Thu before July 4
    christmasWeekSat: new Date(year, 11, 20), // Sat starting Christmas week
    christmasWeekSun: new Date(year, 11, 21), // Sun before Christmas
    christmasWeekMon: new Date(year, 11, 22), // Mon of Christmas week
    postChristmasFri: new Date(year, 11, 27), // Fri after Christmas
    postChristmasSun: new Date(year, 11, 28), // Sun after Christmas
    postChristmasMon: new Date(year, 11, 29), // Mon after Christmas
    dec30: new Date(year, 11, 30), // Dec 30 returns
    presidentsWeekFri: addDays(getNthWeekday(year, 2, 1, 3), -3), // Fri before Presidents Day
    presidentsWeekSun: addDays(getNthWeekday(year, 2, 1, 3), -1), // Sun of Presidents weekend
    presidentsMon: getNthWeekday(year, 2, 1, 3), // Presidents Day Monday
    easterThu: addDays(getEaster(year), -3), // Thu before Easter
    goodFriday: addDays(getEaster(year), -2), // Good Friday
    easterMon: addDays(getEaster(year), 1), // Easter Monday
    
    // Canadian holidays
    canadianThanksgivingFri: addDays(getNthWeekday(year, 10, 1, 2), -3), // Fri before Canadian Thanksgiving
    canadianThanksgivingMon: getNthWeekday(year, 10, 1, 2), // Canadian Thanksgiving Monday
    victoriaMon: getNthWeekday(year, 5, 1, -1), // Victoria Day (last Mon before May 25)
  };
  
  return holidays;
}

function getHolidaySurge(departureDate: Date): { factor: number; description: string; severity: string } {
  const year = departureDate.getFullYear();
  const holidays = getHolidayDates(year);
  const depTime = departureDate.getTime();
  
  // Check for exact matches and nearby dates
  const checkDate = (holidayDate: Date, name: string, points: number, description: string) => {
    const holidayTime = holidayDate.getTime();
    const dayDiff = Math.abs(depTime - holidayTime) / (1000 * 60 * 60 * 24);
    
    if (dayDiff < 0.5) return { factor: points, description, severity: points >= 30 ? "Extreme" : points >= 20 ? "Very High" : "High" };
    if (dayDiff < 1.5) return { factor: Math.round(points * 0.7), description: `Near ${description}`, severity: "High" };
    if (dayDiff < 3) return { factor: Math.round(points * 0.4), description: `${name} week`, severity: "Moderate" };
    return null;
  };
  
  // Top 10 busiest (extreme surge)
  const extremeSurge = [
    [holidays.postThanksgivingSun, "Post-Thanksgiving Sunday", 35, "Busiest travel day of the year"],
    [holidays.thanksgivingWed, "Thanksgiving Wednesday", 32, "Pre-Thanksgiving exodus"],
    [holidays.thanksgivingTue, "Thanksgiving Tuesday", 30, "Thanksgiving week travel begins"],
    [holidays.memorialFri, "Memorial Day Friday", 28, "Summer travel season kickoff"],
    [holidays.july4Sun, "July 4th Sunday", 28, "Post-Independence Day returns"],
    [holidays.postChristmas, "Day after Christmas", 26, "Post-holiday departures spike"],
    [holidays.christmasWeekFri, "Christmas week Friday", 25, "Pre-Christmas travel rush"],
    [holidays.laborFri, "Labor Day Friday", 24, "End of summer getaway rush"],
    [holidays.laborMon, "Labor Day Monday", 23, "Labor Day return travel"],
    [holidays.christmasEveEve, "December 23rd", 22, "Christmas Eve Eve travel"]
  ];
  
  // High traffic days (11-30)
  const highSurge = [
    [holidays.july4Thu, "July 4th Thursday", 20, "Pre-July 4th departures"],
    [holidays.christmasWeekSat, "Christmas week Saturday", 19, "Christmas week begins"],
    [holidays.christmasWeekSun, "Christmas week Sunday", 18, "Pre-Christmas Sunday"],
    [holidays.christmasWeekMon, "Christmas week Monday", 17, "Christmas week Monday"],
    [holidays.postChristmasFri, "Post-Christmas Friday", 16, "Extended holiday travel"],
    [holidays.postChristmasSun, "Post-Christmas Sunday", 15, "Holiday return travel"],
    [holidays.postChristmasMon, "Post-Christmas Monday", 14, "Back to work travel"],
    [holidays.dec30, "December 30th", 13, "Year-end return travel"],
    [holidays.presidentsWeekFri, "Presidents Week Friday", 12, "Presidents Day weekend begins"],
    [holidays.presidentsWeekSun, "Presidents Weekend Sunday", 11, "Presidents Day weekend"],
    [holidays.presidentsMon, "Presidents Day", 10, "Presidents Day holiday"],
    [holidays.easterThu, "Easter Thursday", 10, "Pre-Easter travel"],
    [holidays.goodFriday, "Good Friday", 9, "Easter weekend begins"],
    [holidays.easterMon, "Easter Monday", 8, "Easter return travel"]
  ];
  
  // Canadian-specific
  const canadianSurge = [
    [holidays.canadianThanksgivingFri, "Canadian Thanksgiving Friday", 15, "Canadian Thanksgiving weekend"],
    [holidays.canadianThanksgivingMon, "Canadian Thanksgiving", 12, "Canadian Thanksgiving returns"],
    [holidays.victoriaMon, "Victoria Day", 10, "Victoria Day long weekend"]
  ];
  
  // Check all surge periods
  for (const [date, name, points, desc] of extremeSurge) {
    const result = checkDate(new Date(date), String(name), Number(points), String(desc));
    if (result) return result;
  }
  
  for (const [date, name, points, desc] of highSurge) {
    const result = checkDate(new Date(date), String(name), Number(points), String(desc));
    if (result) return result;
  }
  
  for (const [date, name, points, desc] of canadianSurge) {
    const result = checkDate(new Date(date), String(name), Number(points), String(desc));
    if (result) return result;
  }
  
  return { factor: 0, description: "Regular travel day", severity: "None" };
}

// Airline reliability database (based on 2023-2024 industry data)
function getAirlineReliability(airlineCode: string): { points: number; description: string; reliability: string } {
  const airlines: Record<string, { points: number; description: string; reliability: string }> = {
    // North American - Worst Performers
    "AC": { points: 20, description: "Air Canada - frequent delays and cancellations", reliability: "Poor" },
    "WS": { points: 18, description: "WestJet - above-average delay rates", reliability: "Below Average" },
    "F9": { points: 22, description: "Frontier - budget airline with high delay rates", reliability: "Poor" },
    "NK": { points: 25, description: "Spirit Airlines - lowest reliability in US", reliability: "Very Poor" },
    "B6": { points: 16, description: "JetBlue - moderate delay issues", reliability: "Below Average" },
    "UA": { points: 14, description: "United Airlines - moderate reliability issues", reliability: "Below Average" },
    "AA": { points: 12, description: "American Airlines - some delay issues", reliability: "Average" },
    
    // North American - Better Performers  
    "DL": { points: 8, description: "Delta Airlines - above-average reliability", reliability: "Good" },
    "AS": { points: 7, description: "Alaska Airlines - excellent punctuality", reliability: "Excellent" },
    "WN": { points: 10, description: "Southwest - generally reliable", reliability: "Good" },
    "TS": { points: 12, description: "Air Transat - seasonal reliability issues", reliability: "Average" },
    
    // International - European
    "LH": { points: 6, description: "Lufthansa - excellent German efficiency", reliability: "Excellent" },
    "KL": { points: 7, description: "KLM - very reliable Dutch carrier", reliability: "Excellent" },
    "AF": { points: 10, description: "Air France - generally punctual", reliability: "Good" },
    "BA": { points: 12, description: "British Airways - moderate reliability", reliability: "Average" },
    "VS": { points: 8, description: "Virgin Atlantic - good reliability", reliability: "Good" },
    "FR": { points: 15, description: "Ryanair - budget airline delays common", reliability: "Below Average" },
    "U2": { points: 14, description: "easyJet - typical budget airline issues", reliability: "Below Average" },
    
    // International - Asian
    "SQ": { points: 3, description: "Singapore Airlines - world-class reliability", reliability: "Outstanding" },
    "NH": { points: 4, description: "ANA - exceptional Japanese punctuality", reliability: "Outstanding" },
    "JL": { points: 4, description: "Japan Airlines - excellent reliability", reliability: "Outstanding" },
    "CX": { points: 6, description: "Cathay Pacific - very reliable", reliability: "Excellent" },
    "TG": { points: 8, description: "Thai Airways - good reliability", reliability: "Good" },
    
    // International - Middle Eastern
    "EK": { points: 7, description: "Emirates - generally very reliable", reliability: "Excellent" },
    "QR": { points: 6, description: "Qatar Airways - excellent punctuality", reliability: "Excellent" },
    "EY": { points: 8, description: "Etihad Airways - good reliability", reliability: "Good" },
    
    // International - Other
    "QF": { points: 9, description: "Qantas - good but some delays", reliability: "Good" },
    "NZ": { points: 7, description: "Air New Zealand - very reliable", reliability: "Excellent" },
    "LX": { points: 5, description: "Swiss International - excellent reliability", reliability: "Outstanding" }
  };
  
  const airlineData = airlines[airlineCode?.toUpperCase()];
  return airlineData || { points: 0, description: "Airline reliability data not available", reliability: "Unknown" };
}

// Group size delay factors
function getGroupSizeDelay(groupSize: number): { points: number; description: string; impact: string } {
  if (groupSize <= 2) {
    return { points: 0, description: "Small group - no additional delays expected", impact: "None" };
  } else if (groupSize <= 5) {
    return { points: 8, description: "Medium group - coordination and check-in delays likely", impact: "Moderate" };
  } else if (groupSize <= 10) {
    return { points: 15, description: "Large group - significant coordination delays expected", impact: "High" };
  } else {
    return { points: 25, description: "Very large group - major delays for coordination and processing", impact: "Very High" };
  }
}

function generateDelayRisk(result: any) {
  const airport = result?.airport || "";
  const departureISO = result?.departureLocalISO || "";
  const isIntl = !!(result?.flags?.isInternational ?? result?.isInternational ?? (result?.flightType === "international"));
  const airline = result?.airline || "";
  const groupSize = result?.groupSize || result?.travelers || 1;
  
  if (!departureISO) {
    return {
      overallRisk: "Unknown",
      riskScore: 0,
      factors: [],
      recommendations: ["Verify departure time for accurate delay prediction."]
    };
  }

  // Use the provided departure time to avoid hydration mismatch
  const depDate = new Date(departureISO);
  if (isNaN(depDate.getTime())) {
    return {
      overallRisk: "Unknown", 
      riskScore: 0,
      factors: [],
      recommendations: ["Invalid departure time provided."]
    };
  }
  
  const hour = depDate.getHours();
  const dayOfWeek = depDate.getDay(); // 0 = Sunday, 6 = Saturday
  const month = depDate.getMonth(); // 0 = January
  
  let riskScore = 0;
  const factors = [];
  
  // Airport busyness factor (0-40 points)
  const bus = result?.meta?.busyness;
  if (bus?.score) {
    const busynessPoints = Math.round(bus.score * 0.4); // 0-40 points
    riskScore += busynessPoints;
    factors.push({
      factor: "Airport Traffic",
      impact: bus.score >= 70 ? "High" : bus.score >= 40 ? "Moderate" : "Low",
      description: `${bus.count || 0} departures in Â±${bus.windowMin || 90} min window (${bus.score}% capacity)`,
      points: busynessPoints
    });
  }
  
  // Time of day factor (0-25 points)
  let timeRisk = 0;
  let timeDesc = "";
  if (hour >= 6 && hour < 9) {
    timeRisk = 25;
    timeDesc = "Morning rush hour - peak delay period";
  } else if (hour >= 17 && hour < 20) {
    timeRisk = 20;
    timeDesc = "Evening rush hour - high delay risk";
  } else if (hour >= 12 && hour < 17) {
    timeRisk = 10;
    timeDesc = "Afternoon - moderate delay risk";
  } else if (hour >= 21 || hour < 6) {
    timeRisk = 5;
    timeDesc = "Off-peak hours - low delay risk";
  } else {
    timeRisk = 8;
    timeDesc = "Mid-morning - moderate delay risk";
  }
  riskScore += timeRisk;
  factors.push({
    factor: "Departure Time",
    impact: timeRisk >= 20 ? "High" : timeRisk >= 10 ? "Moderate" : "Low",
    description: timeDesc,
    points: timeRisk
  });
  
  // Day of week factor (0-15 points)
  let dayRisk = 0;
  let dayDesc = "";
  if (dayOfWeek === 1) { // Monday
    dayRisk = 15;
    dayDesc = "Monday - highest delay risk day";
  } else if (dayOfWeek === 5) { // Friday  
    dayRisk = 12;
    dayDesc = "Friday - high delay risk";
  } else if (dayOfWeek === 4) { // Thursday
    dayRisk = 10;
    dayDesc = "Thursday - moderate delay risk";
  } else if (dayOfWeek === 0 || dayOfWeek === 6) { // Weekend
    dayRisk = 5;
    dayDesc = "Weekend - lower delay risk";
  } else {
    dayRisk = 8;
    dayDesc = "Mid-week - moderate delay risk";
  }
  riskScore += dayRisk;
  factors.push({
    factor: "Day of Week",
    impact: dayRisk >= 12 ? "High" : dayRisk >= 8 ? "Moderate" : "Low",
    description: dayDesc,
    points: dayRisk
  });
  
  // Airport-specific factor (0-20 points)
  const delayProneAirports = {
    "LGA": { points: 20, desc: "LaGuardia - historically high delays" },
    "EWR": { points: 18, desc: "Newark - frequent ATC delays" },
    "JFK": { points: 15, desc: "JFK - large hub with congestion issues" },
    "ORD": { points: 17, desc: "O'Hare - weather and volume delays common" },
    "ATL": { points: 12, desc: "Atlanta - busiest airport, moderate delays" },
    "LAX": { points: 14, desc: "LAX - traffic and runway constraints" },
    "SFO": { points: 16, desc: "San Francisco - fog and traffic delays" },
    "BOS": { points: 13, desc: "Boston - weather and congestion" },
    "DCA": { points: 15, desc: "Reagan National - slot restrictions" },
    "YYZ": { points: 10, desc: "Toronto Pearson - moderate delay risk" },
    "YVR": { points: 8, desc: "Vancouver - weather delays possible" },
    "YUL": { points: 9, desc: "Montreal - seasonal weather delays" }
  };
  
  const airportFactor = delayProneAirports[airport as keyof typeof delayProneAirports];
  if (airportFactor) {
    riskScore += airportFactor.points;
    factors.push({
      factor: "Airport History",
      impact: airportFactor.points >= 15 ? "High" : airportFactor.points >= 10 ? "Moderate" : "Low",
      description: airportFactor.desc,
      points: airportFactor.points
    });
  } else {
    factors.push({
      factor: "Airport History",
      impact: "Low",
      description: "No significant historical delay patterns",
      points: 0
    });
  }
  
  // International flight factor (0-10 points)
  if (isIntl) {
    riskScore += 10;
    factors.push({
      factor: "Flight Type",
      impact: "Moderate",
      description: "International flight - additional processing delays possible",
      points: 10
    });
  }
  
  // Weather/seasonal factor (0-15 points)
  let weatherRisk = 0;
  let weatherDesc = "";
  if (month >= 11 || month <= 2) { // Winter months
    weatherRisk = 15;
    weatherDesc = "Winter season - snow and ice delays likely";
  } else if (month >= 5 && month <= 8) { // Summer months
    weatherRisk = 8;
    weatherDesc = "Summer season - thunderstorm delays possible";
  } else {
    weatherRisk = 5;
    weatherDesc = "Mild season - minimal weather delays expected";
  }
  riskScore += weatherRisk;
  factors.push({
    factor: "Seasonal Weather",
    impact: weatherRisk >= 12 ? "High" : weatherRisk >= 8 ? "Moderate" : "Low",
    description: weatherDesc,
    points: weatherRisk
  });
  
  // Holiday travel surge factor (0-35 points) 
  const holidaySurge = getHolidaySurge(depDate);
  if (holidaySurge.factor > 0) {
    riskScore += holidaySurge.factor;
    factors.push({
      factor: "Holiday Travel Surge",
      impact: holidaySurge.severity === "Extreme" ? "Extreme" : 
              holidaySurge.severity === "Very High" ? "Very High" :
              holidaySurge.severity === "High" ? "High" : "Moderate",
      description: holidaySurge.description,
      points: holidaySurge.factor
    });
  }
  
  // Airline reliability factor (0-25 points)
  if (airline) {
    const airlineReliability = getAirlineReliability(airline);
    if (airlineReliability.points > 0) {
      riskScore += airlineReliability.points;
      factors.push({
        factor: "Airline Reliability",
        impact: airlineReliability.reliability === "Very Poor" ? "Very High" :
                airlineReliability.reliability === "Poor" ? "High" :
                airlineReliability.reliability === "Below Average" ? "Moderate" :
                airlineReliability.reliability === "Average" ? "Low" : "Very Low",
        description: airlineReliability.description,
        points: airlineReliability.points
      });
    } else if (airlineReliability.points === 0 && airlineReliability.reliability === "Unknown") {
      factors.push({
        factor: "Airline Reliability",
        impact: "Unknown",
        description: airlineReliability.description,
        points: 0
      });
    }
  }
  
  // Group size factor (0-25 points)
  const groupSizeDelay = getGroupSizeDelay(groupSize);
  if (groupSizeDelay.points > 0) {
    riskScore += groupSizeDelay.points;
    factors.push({
      factor: "Travel Group Size",
      impact: groupSizeDelay.impact,
      description: `${groupSize} travelers - ${groupSizeDelay.description}`,
      points: groupSizeDelay.points
    });
  }
  
  // Calculate overall risk level and recommendations (adjusted for new factors)
  let overallRisk = "";
  let recommendations = [];
  
  if (riskScore >= 120) {
    overallRisk = "Extreme";
    recommendations = [
      "Arrive at airport 3+ hours early",
      "Strongly consider travel insurance",
      "Have multiple backup travel plans", 
      "Monitor conditions hourly before departure",
      "Consider postponing non-essential travel"
    ];
  } else if (riskScore >= 90) {
    overallRisk = "Very High";
    recommendations = [
      "Arrive at the airport extra early (2.5+ hours)",
      "Consider travel insurance for this flight",
      "Monitor weather and airport conditions closely",
      "Have backup travel plans ready",
      airline && getAirlineReliability(airline).points > 15 ? "Consider alternative airlines for future travel" : ""
    ].filter(Boolean);
  } else if (riskScore >= 60) {
    overallRisk = "High";
    recommendations = [
      "Add extra buffer time to your schedule",
      "Check in online and get mobile boarding passes", 
      "Monitor flight status regularly",
      "Consider earlier connections if applicable",
      groupSize > 5 ? "Coordinate group arrival and check-in process in advance" : ""
    ].filter(Boolean);
  } else if (riskScore >= 35) {
    overallRisk = "Moderate";
    recommendations = [
      "Follow standard arrival recommendations",
      "Check flight status before leaving",
      "Keep some flexibility in your schedule"
    ];
  } else {
    overallRisk = "Low";
    recommendations = [
      "Standard procedures should be sufficient",
      "Minimal risk of significant delays expected"
    ];
  }
  
  return {
    overallRisk,
    riskScore,
    factors,
    recommendations
  };
}


function fmtDateTimeISO(iso?: string | null) {
  if (!iso) return "\u2014";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "\u2014";
  return new Intl.DateTimeFormat(undefined, {
    weekday: "short", month: "short", day: "numeric",
    hour: "numeric", minute: "2-digit", hour12: true
  }).format(d);
}


function bufferTextFor(_: string | null) {
  return "Includes check-in, security, walk, and contingency.";
}

function formatFlightDetails(result: any) {
  const flightNumber = result?.flightNumber;
  const airline = result?.airline;
  const route = result?.route;
  const departureTime = result?.departureLocalISO;

  if (!flightNumber || !route?.departure?.airport || !route?.arrival?.airport) {
    // Fallback to original display if no flight details
    return null;
  }

  const depAirport = route.departure.airport;
  const arrAirport = route.arrival.airport;
  // Parse the time string - if it has 'Z' treat it as the literal time in the string
  let depTime = '';
  let depDate = '';

  if (departureTime) {
    // Extract time directly from the ISO string without timezone conversion
    const timeMatch = departureTime.match(/T(\d{2}):(\d{2})/);
    if (timeMatch) {
      const hours = parseInt(timeMatch[1]);
      const minutes = timeMatch[2];
      if (hours === 0) {
        depTime = `12:${minutes} AM`;
      } else if (hours < 12) {
        depTime = `${hours}:${minutes} AM`;
      } else if (hours === 12) {
        depTime = `12:${minutes} PM`;
      } else {
        depTime = `${hours - 12}:${minutes} PM`;
      }
    }

    // Extract date directly from ISO string
    const dateMatch = departureTime.match(/^(\d{4}-\d{2}-\d{2})/);
    if (dateMatch) {
      const date = new Date(dateMatch[1] + 'T12:00:00'); // noon to avoid timezone issues
      depDate = date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    }
  }


  return {
    flightNumber,
    airline: airline || flightNumber.match(/^[A-Z]{2}/)?.[0] || '',
    route: `${depAirport} → ${arrAirport}`,
    time: depTime,
    date: depDate
  };
}




function ResultPageContent() {
  const sp = useSearchParams();
  const [showRaw, setShowRaw] = useState(false);

  const result = useMemo(() => parseDataParam(sp.get("data")), [sp]);

  const headerISO  = result?.departureLocalISO || result?.departLocalISO || result?.leaveByLocalISO || null;
  const heroISO    = result?.leaveByLocalISO || result?.bands?.aggressiveLeaveLocalISO || result?.arriveByLocalISO || headerISO;
  let timeline   = (result?.timeline as any) || {};
  // --- Fill timeline fields from available data if missing ---
  {
    const bd = (result?.breakdown as any) || {};
    const checkedIn = !!(result?.flags?.alreadyCheckedIn ?? result?.flags?.checkedIn ?? result?.inputs?.checkedIn);
    const hasBag    = !!(result?.flags?.hasCheckedBag ?? result?.flags?.checkedBag ?? result?.inputs?.hasCheckedBag ?? result?.inputs?.bags);
    const skipCheckIn = !!(checkedIn && !hasBag);
    const numCheck = skipCheckIn ? 0 : ((typeof bd.checkInMin === "number" && isFinite(bd.checkInMin)) ? bd.checkInMin : 30);
    const num = (v: any, d: number) => (typeof v === "number" && isFinite(v) ? v : d);
    const addMinISO = (iso?: string | null, min?: number) => {
      if (!iso || typeof min !== "number" || !isFinite(min)) return null;
      const d = new Date(iso); if (Number.isNaN(d.getTime())) return null;
      d.setMinutes(d.getMinutes() + Math.round(min));
      return d.toISOString();
    };
    const totalBack = numCheck + num(bd.securityWaitMin, 5) + num(bd.walkBufferMin, 12) + num(bd.contingencyMin, 8);
    const arriveComp   = (timeline as any).arriveByISO ?? (result as any)?.arriveByLocalISO ?? (result as any)?.arriveAirportLocalISO ?? (result?.departureLocalISO ? addMinISO(result.departureLocalISO, -totalBack) : null);
    const checkInComp  = (timeline as any).checkInDoneISO ?? (arriveComp ? addMinISO(arriveComp,   numCheck) : null);
    const securityComp = (timeline as any).securityDoneISO ?? (arriveComp ? addMinISO(arriveComp,   numCheck + num(bd.securityWaitMin, 5)) : null);
    const gateComp     = (timeline as any).gateByISO       ?? (result?.departureLocalISO ? addMinISO(result.departureLocalISO, -25) : null); // Fixed: 25 minutes before departure
    timeline = { ...timeline,
      arriveByISO:    (timeline as any).arriveByISO    ?? arriveComp,
      checkInDoneISO: (timeline as any).checkInDoneISO ?? checkInComp,
      securityDoneISO:(timeline as any).securityDoneISO?? securityComp,
      gateByISO:      (timeline as any).gateByISO      ?? gateComp,
    };
  }
  let traffic    = (result?.traffic as any) || {};
  // --- Auto-fill traffic when not provided (derive from meta.busyness) ---
  if (!traffic.level) {
    const bus = (result?.meta?.busyness ?? result?.meta?.business) as any;
    if (bus) {
      const score = Number.isFinite(bus?.score) ? Number(bus.score) : 0;
      const level = score >= 60 ? "Heavy" : (score >= 30 ? "Moderate" : (score > 0 ? "Light" : "Typical"));
      const count = (typeof bus?.count === "number") ? bus.count : null;
      const windowMin =
  (typeof bus?.windowMin === "number")
    ? Math.max(15, Math.min(240, Math.round(bus.windowMin)))
    : (typeof result?.meta?.horizonHours === "number")
      ? Math.max(15, Math.min(240, Math.round(result.meta.horizonHours * 60)))
      : 90;
      traffic = { level, reason: `${score}% \u00B7 ${count ?? "\u2014"} deps in \u00B1${windowMin}m` };
    }
  }
  const routeType  = result?.routeType || (result?.explanation?.isInternational ? "International" : "Domestic");
  const overall    = result?.overall || null;
  const confidence = result?.confidence || { level: "Medium" };
  const changed    = result?.changed || null;
  const depISO     = result?.departureLocalISO || null;

  const comfortLevels = useMemo(() => generateComfortLevels(result || {}), [result]);
  const analysis      = useMemo(() => generateAnalysis(result || {}), [result]);
  const delayRisk     = useMemo(() => generateDelayRisk(result || {}), [result]);
  const buffers       = "Includes check-in, security, walk, and contingency.";

  if (!result) {
    return (
      <main className="app-shell">
        <div className="container">

        {/* Executive Summary */}
        {result && (
          <section className="card card-lg" style={{ marginBottom: 14 }}>
            <div className="card-inner">
              <div className="kicker">Executive summary</div>
              {(() => {
                const normalArr = result?.bands?.normalArriveLocalISO || result?.arriveAirportLocalISO;
                const aggrArr = result?.bands?.aggressiveArriveLocalISO || normalArr;
                const cautArr = result?.bands?.cautiousArriveLocalISO || normalArr;
                const normalLbl = fmtTimeISOStable(normalArr);
                const rangeLbl = `${fmtTimeISOStable(aggrArr)}–${fmtTimeISOStable(cautArr)}`;
                const securityMin = Number(result?.breakdown?.securityWaitMin ?? 0);
                const busyScore = Number(result?.meta?.busyness?.score ?? 0);
                const risk = Math.max(0, Math.min(100, Math.round(busyScore * 0.6 + Math.min(securityMin, 90) / 90 * 40)));
                const busySrc = result?.meta?.securitySource || 'estimate';
                return (
                  <>
                    <h2 className="time-big" suppressHydrationWarning style={{ fontSize: 36, marginBottom: 6 }}>Arrive at {rangeLbl}</h2>
                    <div className="help" style={{ marginBottom: 12 }}>Normal window: <strong suppressHydrationWarning>{normalLbl}</strong></div>
                    <div className="row" style={{ gap: 8, marginBottom: 10 }}>
                      <div className="chip" title="Faster, tighter window" suppressHydrationWarning>Aggressive: <strong>{fmtTimeISOStable(aggrArr)}</strong></div>
                      <div className="chip" style={{ borderColor: 'var(--accent, #6ee7ff)' }} title="Recommended" suppressHydrationWarning>Normal: <strong>{normalLbl}</strong></div>
                      <div className="chip" title="Extra buffer" suppressHydrationWarning>Cautious: <strong>{fmtTimeISOStable(cautArr)}</strong></div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                      <RiskGauge value={risk} />
                      <div className="help" suppressHydrationWarning>
                        Risk level reflects busyness ({busyScore}%) and security wait ({securityMin} min, {busySrc}).
                      </div>
                    </div>
                  </>
                );
              })()}
            </div>
          </section>
        )}
          <div className="card card-lg">
            <div className="card-inner" style={{ textAlign: "center" }}>
              <h1 suppressHydrationWarning data-hero-title>{fmtTimeISOStable(headerISO) ?? "\u2014"}</h1>
              <p className="sub">Let&apos;s try that again.</p>
              <div className="footer-row" style={{ justifyContent: "center" }}>
                <Link className="btn" href="/">Start over</Link>
              </div>
            </div>
          </div>
        </div>
      </main>
    );
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
          <div className="badge">results</div>
        </div>

        <div className="grid">
          <section className="card card-lg">
            <div className="card-inner">
              <div className="kicker">Suggested arrival</div>
              {(() => {
                const flightDetails = formatFlightDetails(result);
                if (flightDetails) {
                  return (
                    <div style={{ marginTop: 4, marginBottom: 12 }}>
                      <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--accent)', marginBottom: 4 }} suppressHydrationWarning>
                        {flightDetails.airline} {flightDetails.flightNumber}
                      </div>
                      <div style={{ fontSize: 18, fontWeight: 500, marginBottom: 2 }} suppressHydrationWarning>
                        {flightDetails.route}
                      </div>
                      <div className="help" suppressHydrationWarning>
                        {flightDetails.time} • {flightDetails.date}
                      </div>
                    </div>
                  );
                } else if (result?.airport || result?.departureLocalISO) {
                  return (
                    <div className="help" style={{ marginTop: 4 }} suppressHydrationWarning>
                      {result?.airport}
                      {result?.airport && result?.departureLocalISO ? " \u00B7 " : ""}
                      {fmtDateTimeISO(result?.departureLocalISO)}
                    </div>
                  );
                }
                return null;
              })()}

              <div className="time-big" suppressHydrationWarning>{fmtTimeISOStable(heroISO) ?? "\u2014"}</div>
              <p className="help" style={{ marginTop: 8 }} suppressHydrationWarning>{buffers}</p>

              <div className="row" style={{ justifyContent: "space-between", marginTop: 8, flexWrap: "wrap" }}>
                <div className="row" style={{ gap: 8 }}>
                  {overall && <div className="chip" suppressHydrationWarning>Overall: <strong>{overall}</strong></div>}
                  {confidence?.level && <div className="chip" suppressHydrationWarning>Confidence: <strong>{confidence.level}</strong></div>}
                  <div className="chip" suppressHydrationWarning>{routeType} flight</div>
                </div>
                {changed?.minutes ? (
                  <div className={"chip " + (changed.direction === "later" ? "bad" : "good")} suppressHydrationWarning>
                    {changed.direction === "later" ? "Later by" : "Earlier by"} {changed.minutes} min
                  </div>
                ) : null}
              </div>

              <div className="footer-row">
                <button className="btn btn-secondary" onClick={() => setShowRaw(v => !v)}>
                  {showRaw ? "Hide raw output" : "View raw output"}
                </button>
                <button className="btn btn-secondary" onClick={() => {
                  // Save flight to profile
                  const flightData = {
                    id: `${result?.flightNumber || 'unknown'}-${new Date(result?.departureLocalISO || Date.now()).toISOString().split('T')[0]}`,
                    flightNumber: result?.flightNumber || '',
                    airline: result?.airline || result?.airlineName || '',
                    departure: {
                      airport: result?.route?.departure?.airport || result?.airport || '',
                      city: result?.route?.departure?.city || '',
                      time: result?.route?.departure?.scheduledLocalISO || result?.departureLocalISO || '',
                      terminal: result?.route?.departure?.terminal || '',
                      gate: result?.route?.departure?.gate || ''
                    },
                    arrival: {
                      airport: result?.route?.arrival?.airport || '',
                      city: result?.route?.arrival?.city || '',
                      time: result?.route?.arrival?.scheduledLocalISO || '',
                      terminal: result?.route?.arrival?.terminal || '',
                      gate: result?.route?.arrival?.gate || ''
                    },
                    status: new Date(result?.departureLocalISO || Date.now()) > new Date() ? 'upcoming' : 'completed',
                    aircraft: result?.aircraft?.type || '',
                    isInternational: result?.isInternational || false,
                    savedAt: Date.now(),
                    // Save the arrival calculation results
                    arrivalRecommendation: {
                      suggested: result?.leaveByLocalISO || result?.bands?.normalArriveLocalISO,
                      risky: result?.bands?.aggressiveArriveLocalISO,
                      moderate: result?.bands?.normalArriveLocalISO,
                      cautious: result?.bands?.cautiousArriveLocalISO
                    }
                  };

                  try {
                    const existing = localStorage.getItem('depart:savedFlights');
                    const flights = existing ? JSON.parse(existing) : [];

                    // Remove any existing flight with same ID
                    const filtered = flights.filter((f: any) => f.id !== flightData.id);

                    // Add the new flight
                    filtered.unshift(flightData);

                    // Keep only the most recent 20 flights
                    const limited = filtered.slice(0, 20);

                    localStorage.setItem('depart:savedFlights', JSON.stringify(limited));

                    // Show success feedback
                    const btn = event?.target as HTMLButtonElement;
                    if (btn) {
                      const originalText = btn.textContent;
                      btn.textContent = '✓ Saved!';
                      btn.style.backgroundColor = 'rgba(81,207,102,0.2)';
                      btn.style.borderColor = 'rgba(81,207,102,0.4)';
                      setTimeout(() => {
                        btn.textContent = originalText;
                        btn.style.backgroundColor = '';
                        btn.style.borderColor = '';
                      }, 2000);
                    }
                  } catch (error) {
                    console.error('Failed to save flight:', error);
                    // Show error feedback
                    const btn = event?.target as HTMLButtonElement;
                    if (btn) {
                      const originalText = btn.textContent;
                      btn.textContent = '❌ Failed';
                      setTimeout(() => {
                        btn.textContent = originalText;
                      }, 2000);
                    }
                  }
                }}>
                  Save to Profile
                </button>
                <Link className="btn" href="/">Plan another flight</Link>
              </div>
            </div>
          </section>

          {/* Comfort Level Cards */}
          {comfortLevels && (
            <section className="grid grid-3">
              {/* Risky Card - Red Theme */}
              <div className="card" style={{
                background: "linear-gradient(180deg, rgba(255,107,107,0.12), rgba(255,107,107,0.08))",
                border: "1px solid rgba(255,107,107,0.25)",
                boxShadow: "0 10px 30px rgba(255,107,107,0.15), 0 0 0 1px rgba(255,107,107,0.1) inset"
              }}>
                <div className="card-inner">
                  <div className="kicker" style={{ color: "#ff6b6b", fontWeight: 600 }}>⚡ Risky</div>
                  <div className="time-big" suppressHydrationWarning style={{
                    fontSize: "32px",
                    background: "linear-gradient(135deg, #ff6b6b, #ff5252)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    backgroundClip: "text"
                  }}>{comfortLevels.risky.time}</div>
                  <p className="help" style={{ marginTop: 4 }} suppressHydrationWarning>{bufferTextFor(heroISO)}</p>
                  <p className="help" style={{ fontSize: "12px", marginTop: 8 }}>{comfortLevels.risky.description}</p>
                </div>
              </div>

              {/* Moderate Card - Blue Theme (Recommended) */}
              <div className="card" style={{
                background: "linear-gradient(180deg, rgba(110,231,255,0.15), rgba(110,231,255,0.10))",
                border: "2px solid var(--accent)",
                boxShadow: "0 10px 30px rgba(110,231,255,0.25), 0 0 0 1px rgba(110,231,255,0.2) inset",
                position: "relative"
              }}>
                <div className="card-inner">
                  <div className="kicker" style={{ color: "var(--accent)", fontWeight: 600 }}>⭐ Moderate</div>
                  <div className="time-big" suppressHydrationWarning style={{
                    fontSize: "32px",
                    background: "linear-gradient(135deg, var(--accent), var(--accent-2))",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    backgroundClip: "text"
                  }}>{comfortLevels.moderate.time}</div>
                  <p className="help" style={{ marginTop: 4 }} suppressHydrationWarning>{bufferTextFor(heroISO)}</p>
                  <p className="help" style={{ fontSize: "12px", marginTop: 8 }}>{comfortLevels.moderate.description}</p>
                  {/* Recommended badge */}
                  <div style={{
                    position: "absolute",
                    top: "-8px",
                    right: "12px",
                    background: "linear-gradient(135deg, var(--accent), var(--accent-2))",
                    color: "#001118",
                    fontSize: "10px",
                    fontWeight: 700,
                    padding: "4px 8px",
                    borderRadius: "12px",
                    textTransform: "uppercase",
                    letterSpacing: "0.5px"
                  }}>
                    Recommended
                  </div>
                </div>
              </div>

              {/* Cautious Card - Green Theme */}
              <div className="card" style={{
                background: "linear-gradient(180deg, rgba(81,207,102,0.12), rgba(81,207,102,0.08))",
                border: "1px solid rgba(81,207,102,0.25)",
                boxShadow: "0 10px 30px rgba(81,207,102,0.15), 0 0 0 1px rgba(81,207,102,0.1) inset"
              }}>
                <div className="card-inner">
                  <div className="kicker" style={{ color: "#51cf66", fontWeight: 600 }}>🛡️ Cautious</div>
                  <div className="time-big" suppressHydrationWarning style={{
                    fontSize: "32px",
                    background: "linear-gradient(135deg, #51cf66, #40c057)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    backgroundClip: "text"
                  }}>{comfortLevels.cautious.time}</div>
                  <p className="help" style={{ marginTop: 4 }} suppressHydrationWarning>{bufferTextFor(heroISO)}</p>
                  <p className="help" style={{ fontSize: "12px", marginTop: 8 }}>{comfortLevels.cautious.description}</p>
                </div>
              </div>
            </section>
          )}

          {/* Analysis */}
          {analysis && (
            <section className="card">
              <div className="card-inner">
                <div className="kicker">Detailed Analysis</div>
                <h3 style={{ margin: "6px 0 16px", fontSize: "18px" }}>Why This Timing</h3>

                <div style={{
                  background: "rgba(110,231,255,0.1)",
                  border: "1px solid rgba(110,231,255,0.2)",
                  borderRadius: "12px",
                  padding: "20px",
                  marginBottom: "16px"
                }}>
                  <div className="row" style={{ justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px" }}>
                    <div>
                      <div style={{ color: "var(--accent)", fontWeight: 600, fontSize: "14px" }}>Airport Traffic</div>
                      <div style={{ color: "var(--text)", fontWeight: 700, fontSize: "20px", marginTop: "4px" }}>{analysis.activityLevel}</div>
                    </div>
                    {analysis.departuresInWindow !== null && (
                      <div style={{ textAlign: "right" }}>
                        <div style={{ color: "var(--accent)", fontWeight: 700, fontSize: "28px" }}>{analysis.departuresInWindow}</div>
                        <div style={{ color: "var(--muted)", fontSize: "12px" }}>flights in {"\u00B1"}{analysis.windowMinutes} min</div>
                      </div>
                    )}
                  </div>

                  {/* Activity Level Bar */}
                  {(() => {
                    const bus = (result?.meta?.busyness ?? result?.meta?.business) as any;
                    const score = (typeof bus?.score === "number") ? bus.score : 0;
                    const getActivityColor = (score: number) => {
                      if (score >= 60) return "#ff6b6b";
                      if (score >= 30) return "#feca57";
                      return "#48dbfb";
                    };
                    const activityColor = getActivityColor(score);
                    
                    return (
                      <div style={{ marginBottom: "16px" }}>
                        <div className="row" style={{ justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                          <span style={{ fontSize: "13px", fontWeight: 600, color: "var(--text)" }}>Activity Level</span>
                          <span style={{ fontSize: "13px", fontWeight: 600, color: activityColor }}>{score}%</span>
                        </div>
                        <div style={{
                          width: "100%",
                          height: "8px",
                          background: "rgba(255,255,255,0.1)",
                          borderRadius: "4px",
                          overflow: "hidden"
                        }}>
                          <div style={{
                            width: `${Math.max(2, score)}%`,
                            height: "100%",
                            background: `linear-gradient(90deg, ${activityColor}, ${activityColor}dd)`,
                            borderRadius: "4px",
                            transition: "width 0.3s ease"
                          }}></div>
                        </div>
                        <div className="row" style={{ justifyContent: "space-between", marginTop: "4px", fontSize: "11px", color: "var(--muted)" }}>
                          <span>Quiet</span>
                          <span>Busy</span>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Flight Timeline Visualization */}
                  {analysis.departuresInWindow !== null && analysis.departuresInWindow > 0 && (
                    <div style={{ marginBottom: "16px" }}>
                      <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--text)", marginBottom: "20px" }}>
                        Flight Distribution
                      </div>
                      <div style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "2px",
                        height: "16px",
                        background: "rgba(255,255,255,0.05)",
                        borderRadius: "8px",
                        padding: "2px",
                        position: "relative",
                        marginTop: "8px"
                      }}>
                        {/* Time markers */}
                        <div style={{
                          position: "absolute",
                          top: "-16px",
                          left: "0",
                          right: "0",
                          display: "flex",
                          justifyContent: "space-between",
                          fontSize: "10px",
                          color: "var(--muted)"
                        }}>
                          <span>-{analysis.windowMinutes}m</span>
                          <span>your departure</span>
                          <span>+{analysis.windowMinutes}m</span>
                        </div>
                        
                        {/* Flight dots - scaled representation */}
                        {(() => {
                          const totalFlights = analysis.departuresInWindow;
                          const maxDots = 50; // Increased maximum for better representation
                          const minDots = Math.min(totalFlights, 8); // Always show at least some dots for small numbers
                          
                          // Calculate how many dots to show
                          let dotsToShow;
                          if (totalFlights <= maxDots) {
                            dotsToShow = totalFlights; // Show all if manageable
                          } else {
                            // For large numbers, show a representative sample
                            dotsToShow = Math.max(minDots, Math.min(maxDots, Math.round(totalFlights * 0.4)));
                          }
                          
                          return Array.from({ length: dotsToShow }, (_, i) => {
                            // Distribute dots across the timeline with some clustering for realism
                            const basePosition = 5 + (i * (90 / dotsToShow));
                            const clusterVariation = ((i * 13) % 20) - 10; // -10 to +10 variation
                            const position = Math.max(2, Math.min(98, basePosition + clusterVariation));
                            
                            // Vary dot sizes slightly for visual interest (larger = closer departure times)
                            const dotSize = totalFlights > 30 ? (3 + (i % 3)) : 4;
                            
                            return (
                              <div
                                key={i}
                                style={{
                                  position: "absolute",
                                  left: `${position}%`,
                                  width: `${dotSize}px`,
                                  height: `${dotSize}px`,
                                  background: "var(--accent)",
                                  borderRadius: "50%",
                                  boxShadow: "0 0 3px rgba(110,231,255,0.4)",
                                  opacity: totalFlights > 40 ? 0.8 : 1
                                }}
                                title={`Departure (${Math.round((position - 5) / 90 * analysis.windowMinutes * 2 - analysis.windowMinutes)}min from your flight)`}
                              />
                            );
                          });
                        })()}
                        
                        {/* Current time indicator */}
                        <div style={{
                          position: "absolute",
                          left: "50%",
                          top: "-2px",
                          bottom: "-2px",
                          width: "2px",
                          background: "#ff6b6b",
                          borderRadius: "1px",
                          transform: "translateX(-50%)"
                        }} />
                      </div>
                      {(() => {
                        const totalFlights = analysis.departuresInWindow;
                        const maxDots = 50;
                        const dotsShown = totalFlights <= maxDots ? totalFlights : Math.max(8, Math.min(maxDots, Math.round(totalFlights * 0.4)));
                        
                        if (totalFlights > maxDots) {
                          return (
                            <div style={{ fontSize: "10px", color: "var(--muted)", marginTop: "4px", textAlign: "center" }}>
                              Showing {dotsShown} representative flights of {totalFlights} total
                            </div>
                          );
                        } else if (totalFlights !== dotsShown) {
                          return (
                            <div style={{ fontSize: "10px", color: "var(--muted)", marginTop: "4px", textAlign: "center" }}>
                              Showing {dotsShown} of {totalFlights} flights
                            </div>
                          );
                        }
                        return null;
                      })()}
                    </div>
                  )}

                  <p className="help" style={{ marginBottom: analysis.extendedContext ? "8px" : "0", fontSize: "13px" }} suppressHydrationWarning>
                    {analysis.departureContext}
                  </p>
                  {analysis.extendedContext && (
                    <p className="help" style={{ fontSize: "11px", color: "var(--accent)", margin: 0 }} suppressHydrationWarning>
                      {analysis.extendedContext}
                    </p>
                  )}
                </div>

                <div className="grid grid-2" style={{ gap: "12px" }}>
                  {analysis.breakdown.map((item: any, i: number) => (
                    <div key={i} style={{
                      background: "rgba(255,255,255,0.04)",
                      border: "1px solid rgba(255,255,255,0.08)",
                      borderRadius: "12px",
                      padding: "14px"
                    }}>
                      <div className="row" style={{ justifyContent: "space-between", marginBottom: "6px" }}>
                        <span style={{ fontWeight: 600, fontSize: "14px" }}>{item.factor}</span>
                        <span style={{ color: "var(--accent)", fontWeight: 600 }}>{item.time} min</span>
                      </div>
                      <p className="help" style={{ fontSize: "12px", margin: 0 }}>{item.reason}</p>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          )}

          {/* Delay Risk Assessment */}
          {delayRisk && (
            <section className="card">
              <div className="card-inner">
                <div className="kicker">Delay Risk Assessment</div>
                <h3 style={{ margin: "6px 0 16px", fontSize: "18px" }}>Flight Delay Probability</h3>

                <div style={{
                  background: (() => {
                    const risk = delayRisk.overallRisk.toLowerCase();
                    if (risk.includes("extreme")) return "rgba(139, 0, 0, 0.2)";
                    if (risk.includes("very high")) return "rgba(255, 107, 107, 0.15)";
                    if (risk.includes("high")) return "rgba(255, 202, 87, 0.15)";  
                    if (risk.includes("moderate")) return "rgba(110, 231, 255, 0.15)";
                    return "rgba(72, 219, 251, 0.1)";
                  })(),
                  border: (() => {
                    const risk = delayRisk.overallRisk.toLowerCase();
                    if (risk.includes("extreme")) return "1px solid rgba(139, 0, 0, 0.4)";
                    if (risk.includes("very high")) return "1px solid rgba(255, 107, 107, 0.3)";
                    if (risk.includes("high")) return "1px solid rgba(255, 202, 87, 0.3)";  
                    if (risk.includes("moderate")) return "1px solid rgba(110, 231, 255, 0.3)";
                    return "1px solid rgba(72, 219, 251, 0.2)";
                  })(),
                  borderRadius: "12px",
                  padding: "20px",
                  marginBottom: "16px"
                }}>
                  <div className="row" style={{ justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                    <div>
                      <div style={{ 
                        color: (() => {
                          const risk = delayRisk.overallRisk.toLowerCase();
                          if (risk.includes("extreme")) return "#8b0000";
                          if (risk.includes("very high")) return "#ff6b6b";
                          if (risk.includes("high")) return "#feca57";  
                          if (risk.includes("moderate")) return "var(--accent)";
                          return "#48dbfb";
                        })(), 
                        fontWeight: 700, 
                        fontSize: "24px" 
                      }}>
                        {delayRisk.overallRisk} Risk
                      </div>
                      <div style={{ color: "var(--muted)", fontSize: "14px", marginTop: "4px" }}>
                        Risk Score: {delayRisk.riskScore}/100
                      </div>
                    </div>
                    <div style={{
                      width: "80px",
                      height: "80px",
                      borderRadius: "50%",
                      background: `conic-gradient(${(() => {
                        const risk = delayRisk.overallRisk.toLowerCase();
                        if (risk.includes("extreme")) return "#8b0000";
                        if (risk.includes("very high")) return "#ff6b6b";
                        if (risk.includes("high")) return "#feca57";  
                        if (risk.includes("moderate")) return "var(--accent)";
                        return "#48dbfb";
                      })()} ${delayRisk.riskScore * 3.6}deg, rgba(255,255,255,0.1) 0deg)`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "white",
                      fontWeight: 700,
                      fontSize: "16px"
                    }}>
                      {delayRisk.riskScore}
                    </div>
                  </div>

                  {/* Risk Factors */}
                  <div style={{ marginBottom: "16px" }}>
                    <div style={{ fontSize: "14px", fontWeight: 600, color: "var(--text)", marginBottom: "12px" }}>
                      Contributing Factors
                    </div>
                    <div className="grid grid-2" style={{ gap: "8px" }}>
                      {delayRisk.factors.map((factor: any, i: number) => (
                        <div key={i} style={{
                          background: "rgba(255,255,255,0.05)",
                          border: "1px solid rgba(255,255,255,0.1)",
                          borderRadius: "8px",
                          padding: "12px"
                        }}>
                          <div className="row" style={{ justifyContent: "space-between", alignItems: "flex-start", marginBottom: "4px" }}>
                            <span style={{ fontWeight: 600, fontSize: "13px" }}>{factor.factor}</span>
                            <div style={{ textAlign: "right" }}>
                              <div style={{ 
                                color: factor.impact === "Extreme" ? "#8b0000" :
                                       factor.impact === "Very High" ? "#cc0000" :
                                       factor.impact === "High" ? "#ff6b6b" : 
                                       factor.impact === "Moderate" ? "#feca57" : "#48dbfb",
                                fontWeight: 600,
                                fontSize: "11px"
                              }}>
                                {factor.impact}
                              </div>
                              <div style={{ color: "var(--muted)", fontSize: "10px" }}>
                                +{factor.points}
                              </div>
                            </div>
                          </div>
                          <p style={{ fontSize: "11px", color: "var(--muted)", margin: 0, lineHeight: 1.3 }}>
                            {factor.description}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Recommendations */}
                  <div>
                    <div style={{ fontSize: "14px", fontWeight: 600, color: "var(--text)", marginBottom: "8px" }}>
                      Recommendations
                    </div>
                    <ul style={{ margin: "0", paddingLeft: "16px", color: "var(--muted)", fontSize: "13px" }}>
                      {delayRisk.recommendations.map((rec: string, i: number) => (
                        <li key={i} style={{ marginBottom: "4px" }}>{rec}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </section>
          )}

          <section className="grid grid-2">
            <div className="card">
              <div className="card-inner">
                <div className="kicker">Your flight</div>
                <h3 style={{ margin: "6px 0 10px", fontSize: "18px" }}>Departure</h3>
                <p className="help" suppressHydrationWarning>{traffic?.reason ?? "\u2014"}</p>

                <div className="divider"></div>
                <div className="kicker">Why this time</div>
                <ul style={{ margin: "10px 0", paddingLeft: "18px", color: "var(--muted)" }}>
                  <li>Check-in / bag-drop: <strong suppressHydrationWarning>{analysis.breakdown[0]?.time ?? "\u2014"} min</strong></li>
                  <li>Security screening:  <strong suppressHydrationWarning>{analysis.breakdown[1]?.time ?? "\u2014"} min</strong></li>
                  <li>Walk to gate:        <strong suppressHydrationWarning>{analysis.breakdown[2]?.time ?? "\u2014"} min</strong></li>
                  <li>Contingency:         <strong suppressHydrationWarning>{analysis.breakdown[3]?.time ?? "\u2014"} min</strong></li>
                </ul>
                {result?.explanation?.contingencyReason && (
                  <p className="help" style={{ marginTop: -6 }} suppressHydrationWarning>
                    Why contingency? {result.explanation.contingencyReason}
                  </p>
                )}
                {Array.isArray(result?.explanation?.notes) && result.explanation.notes.length > 0 && (
                  <>
                    <div className="kicker" style={{ marginTop: 12 }}>Notes</div>
                    <ul style={{ margin: "10px 0", paddingLeft: "18px", color: "var(--muted)" }}>
                      {result.explanation.notes.map((n: string, i: number) => <li key={i}>{n}</li>)}
                    </ul>
                  </>
                )}
              </div>
            </div>

            <div className="card">
              <div className="card-inner">
                <div className="kicker">Security & traffic</div>
                <h3 style={{ margin: "6px 0 10px", fontSize: "18px" }}>
                  <span suppressHydrationWarning>{result?.security ?? "\u2014"}</span>
                  <span style={{ opacity: .5 }}>{" \u00B7 "}</span>
                  <span suppressHydrationWarning>Terminal traffic: {traffic?.level ?? "\u2014"}</span>
                </h3>
                <p className="help" suppressHydrationWarning>{traffic?.reason ?? "\u2014"}</p>

                <div className="divider"></div>
                <div className="kicker">Timeline</div>
                <div className="timeline" style={{ marginTop: 8 }}>
                  <div className="item" suppressHydrationWarning><span className="dot"></span> Arrive: <strong suppressHydrationWarning>{fmtTimeISOStable(timeline?.arriveByISO)}</strong></div>
                  {(() => {
                    const checkedIn = !!(result?.flags?.alreadyCheckedIn ?? result?.flags?.checkedIn ?? result?.inputs?.checkedIn);
                    const hasBag = !!(result?.flags?.hasCheckedBag ?? result?.flags?.checkedBag ?? result?.inputs?.hasCheckedBag ?? result?.inputs?.bags);
                    const skipCheckIn = !!(checkedIn && !hasBag);
                    return !skipCheckIn ? (
                      <div className="item" suppressHydrationWarning><span className="dot"></span> Check-in done: <strong suppressHydrationWarning>{fmtTimeISOStable(timeline?.checkInDoneISO)}</strong></div>
                    ) : null;
                  })()}
                  <div className="item" suppressHydrationWarning><span className="dot"></span> Security done: <strong suppressHydrationWarning>{fmtTimeISOStable(timeline?.securityDoneISO)}</strong></div>
                  <div className="item" suppressHydrationWarning><span className="dot"></span> At gate by: <strong suppressHydrationWarning>{fmtTimeISOStable(timeline?.gateByISO)}</strong></div>
                  <div className="item" suppressHydrationWarning><span className="dot"></span> Departure: <strong suppressHydrationWarning>{fmtTimeISOStable(depISO)}</strong></div>
                </div>
              </div>
            </div>
          </section>

          {/* Flight Details Card */}
          {(() => {
            const route = result?.route;
            const departure = route?.departure;
            const arrival = route?.arrival;
            const aircraft = result?.aircraft;
            const status = result?.status;
            const flightNumber = result?.flightNumber;
            const airline = result?.airline || result?.airlineName;

            if (!flightNumber) return null;

            return (
              <section className="card">
                <div className="card-inner">
                  <div className="kicker">Flight Details</div>
                  <h3 style={{ margin: "6px 0 16px", fontSize: "18px" }}>
                    {airline} {flightNumber}
                  </h3>

                  <div className="grid grid-2" style={{ gap: "16px" }}>
                    {/* Departure Info */}
                    <div style={{
                      background: "rgba(110,231,255,0.08)",
                      border: "1px solid rgba(110,231,255,0.2)",
                      borderRadius: "12px",
                      padding: "16px"
                    }}>
                      <div className="kicker" style={{ color: "var(--accent)", marginBottom: "8px" }}>Departure</div>
                      <div style={{ fontSize: "20px", fontWeight: 600, marginBottom: "8px" }}>
                        {departure?.airport || result?.airport || "—"}
                      </div>
                      <div style={{ marginBottom: "12px" }}>
                        <div style={{ fontSize: "16px", fontWeight: 500, marginBottom: "4px" }}>
                          {departure?.scheduledLocalISO ? fmtTimeISOStable(departure.scheduledLocalISO) : "—"}
                        </div>
                        <div className="help" style={{ fontSize: "13px" }}>
                          {departure?.scheduledLocalISO ? fmtDateTimeISO(departure.scheduledLocalISO) : "—"}
                        </div>
                      </div>
                      {departure?.terminal && (
                        <div className="row" style={{ gap: "12px", fontSize: "13px" }}>
                          <div>
                            <span style={{ color: "var(--muted)" }}>Terminal:</span>
                            <span style={{ fontWeight: 600, marginLeft: "4px" }}>{departure.terminal}</span>
                          </div>
                          {departure?.gate && (
                            <div>
                              <span style={{ color: "var(--muted)" }}>Gate:</span>
                              <span style={{ fontWeight: 600, marginLeft: "4px" }}>{departure.gate}</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Arrival Info */}
                    <div style={{
                      background: "rgba(255,255,255,0.04)",
                      border: "1px solid rgba(255,255,255,0.08)",
                      borderRadius: "12px",
                      padding: "16px"
                    }}>
                      <div className="kicker" style={{ marginBottom: "8px" }}>Arrival</div>
                      <div style={{ fontSize: "20px", fontWeight: 600, marginBottom: "8px" }}>
                        {arrival?.airport || "—"}
                      </div>
                      <div style={{ marginBottom: "12px" }}>
                        <div style={{ fontSize: "16px", fontWeight: 500, marginBottom: "4px" }}>
                          {arrival?.scheduledLocalISO ? fmtTimeISOStable(arrival.scheduledLocalISO) : "—"}
                        </div>
                        <div className="help" style={{ fontSize: "13px" }}>
                          {arrival?.scheduledLocalISO ? fmtDateTimeISO(arrival.scheduledLocalISO) : "—"}
                        </div>
                      </div>
                      {arrival?.terminal && (
                        <div className="row" style={{ gap: "12px", fontSize: "13px" }}>
                          <div>
                            <span style={{ color: "var(--muted)" }}>Terminal:</span>
                            <span style={{ fontWeight: 600, marginLeft: "4px" }}>{arrival.terminal}</span>
                          </div>
                          {arrival?.gate && (
                            <div>
                              <span style={{ color: "var(--muted)" }}>Gate:</span>
                              <span style={{ fontWeight: 600, marginLeft: "4px" }}>{arrival.gate}</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Additional Flight Info */}
                  <div style={{ marginTop: "16px" }}>
                    <div className="row" style={{ gap: "16px", flexWrap: "wrap" }}>
                      {status && (
                        <div className="chip" style={{
                          backgroundColor: status.toLowerCase() === 'scheduled' ? 'rgba(110,231,255,0.1)' :
                                          status.toLowerCase() === 'delayed' ? 'rgba(255,107,107,0.1)' :
                                          status.toLowerCase() === 'cancelled' ? 'rgba(255,107,107,0.15)' :
                                          'rgba(255,255,255,0.05)',
                          borderColor: status.toLowerCase() === 'scheduled' ? 'rgba(110,231,255,0.3)' :
                                      status.toLowerCase() === 'delayed' ? 'rgba(255,107,107,0.3)' :
                                      status.toLowerCase() === 'cancelled' ? 'rgba(255,107,107,0.4)' :
                                      'rgba(255,255,255,0.1)'
                        }}>
                          Status: <strong style={{ textTransform: 'capitalize' }}>{status}</strong>
                        </div>
                      )}
                      {aircraft?.type && (
                        <div className="chip">
                          Aircraft: <strong>{aircraft.type}</strong>
                        </div>
                      )}
                      {(() => {
                        const depTime = departure?.scheduledLocalISO ? new Date(departure.scheduledLocalISO) : null;
                        const arrTime = arrival?.scheduledLocalISO ? new Date(arrival.scheduledLocalISO) : null;
                        if (depTime && arrTime) {
                          const durationMs = arrTime.getTime() - depTime.getTime();
                          const hours = Math.floor(durationMs / (1000 * 60 * 60));
                          const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));
                          return (
                            <div className="chip">
                              Duration: <strong>{hours}h {minutes}m</strong>
                            </div>
                          );
                        }
                        return null;
                      })()}
                    </div>
                  </div>
                </div>
              </section>
            );
          })()}

          {showRaw && (
            <section className="card">
              <div className="card-inner">
                <div className="kicker">Raw output</div>
                <pre className="code">{JSON.stringify(result, null, 2)}</pre>
              </div>
            </section>
          )}
        </div>
      </div>
    </main>
  );
}

export default function ResultPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ResultPageContent />
    </Suspense>
  );
}













