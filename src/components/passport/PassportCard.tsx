"use client";

import React from "react";
import WorldMap from "./WorldMap";
import { PassportStats } from "@/lib/passport/types";
import { formatKm, formatDuration } from "@/lib/passport/aggregate";

type Route = { fromIata: string; toIata: string; value?: number };

type Props = {
  stats: PassportStats;
  routesForMap: Route[];
  airportsInUse: string[];
  username?: string;
};

const getCountryFlag = (countryCode: string): string => {
  const cc = (countryCode || "").toUpperCase().replace(/[^A-Z]/g, "").slice(0, 2);
  if (cc.length !== 2) return "🏳️";
  const codePoints = cc.split("").map((c) => 0x1f1e6 + (c.charCodeAt(0) - 65));
  return String.fromCodePoint(...codePoints);
};

const formatPassportDate = (isoDate: string): string => {
  const date = new Date(isoDate);
  const day = date.getDate().toString().padStart(2, "0");
  const monthNames = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
  const month = monthNames[date.getMonth()];
  const year = date.getFullYear().toString().slice(-2);
  return `${day} ${month} ${year}`;
};

const generateMRZ = (username: string, firstSeen: string, issued: string, place: string): string => {
  const user = (username || "TRAVELER").toUpperCase().replace(/[^A-Z]/g, "").slice(0, 10);
  const firstSeenFormatted = firstSeen.replace(/-/g, "").slice(2); // YYMMDD
  const issuedFormatted = issued.replace(/-/g, "").slice(2); // YYMMDD
  return `ALLTIME<<${user}<<MEMBER${firstSeenFormatted}<<@DEPART<<ISSUED${issuedFormatted}<<${place}<<DEPART.APP`;
};

export default function PassportCard({ stats, routesForMap, airportsInUse, username }: Props) {
  const mrzLine = generateMRZ(username || "TRAVELER", stats.firstSeenDate, stats.issuedDate, stats.placeOfIssueIata);

  return (
    <>
      {/* Mobile-first clean design */}
      <div className="block md:hidden">
        {/* Simple mobile header */}
        <div className="mb-4">
          <h2 className="text-2xl font-bold text-white mb-2">Travel Statistics</h2>
          <p className="text-white/70 text-sm">Your journey mapped out</p>
        </div>

        {/* Large mobile map */}
        <div className="h-96 mb-6 rounded-xl overflow-hidden bg-black/20">
          <WorldMap routes={routesForMap} airportsInUse={airportsInUse} className="h-full" />
        </div>

        {/* Country flags */}
        <div className="flex gap-2 overflow-x-auto pb-4 mb-6" style={{ scrollbarWidth: "thin" }}>
          {stats.countriesVisited.map((country) => (
            <span key={country} className="text-3xl flex-shrink-0" title={country}>
              {getCountryFlag(country)}
            </span>
          ))}
        </div>

        {/* Clean mobile stats grid */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-white/5 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-white mb-1">{stats.totalFlights.toLocaleString()}</div>
            <div className="text-sm text-white/60">Flights</div>
          </div>
          <div className="bg-white/5 rounded-lg p-4 text-center">
            <div className="text-lg font-bold text-white mb-1">{formatKm(stats.totalDistanceKm)}</div>
            <div className="text-sm text-white/60">Distance</div>
          </div>
          <div className="bg-white/5 rounded-lg p-4 text-center">
            <div className="text-lg font-bold text-white mb-1">{formatDuration(stats.totalFlightTimeMin)}</div>
            <div className="text-sm text-white/60">Flight Time</div>
          </div>
          <div className="bg-white/5 rounded-lg p-4 text-center">
            <div className="text-lg font-bold text-white mb-1">{stats.uniqueAirports}</div>
            <div className="text-sm text-white/60">Airports</div>
          </div>
        </div>

        {/* Simple member info */}
        <div className="bg-white/5 rounded-lg p-4 text-sm text-white/80">
          <div className="text-white font-semibold mb-2">Member Info</div>
          <div className="space-y-1">
            <div>Since: {formatPassportDate(stats.firstSeenDate)}</div>
            <div>Base: {stats.placeOfIssueIata}</div>
          </div>
        </div>
      </div>

      {/* Desktop passport design */}
      <div className="hidden md:block">
        <div
          className="relative overflow-hidden"
          style={{
            background: "linear-gradient(135deg, rgba(255,255,255,0.10) 0%, rgba(255,255,255,0.04) 100%)",
            border: "1px solid rgba(255,255,255,0.14)",
            borderRadius: "1.5rem",
            boxShadow: "0 20px 40px rgba(0,0,0,0.40)",
            isolation: "isolate",
            transform: "translateZ(0)",
            backfaceVisibility: "hidden",
          }}
        >
          {/* Inner border */}
          <div className="absolute inset-2 rounded-2xl border border-white/10 pointer-events-none" />

          <div
            className="p-10 space-y-8"
            style={{ fontFeatureSettings: '"liga" on, "kern" on', WebkitFontSmoothing: "antialiased" as any }}
          >
            {/* Header */}
            <div className="flex justify-between items-start">
              <div>
                <div className="text-2xl font-bold text-white mb-1">MY DEPART PASSPORT</div>
                <div className="text-xs text-white/70 tracking-wide">PASSPORT • PASS • PASAPORTE</div>
              </div>
              <div className="text-right text-sm text-white/80">
                <div className="font-semibold">Authority</div>
                <div className="text-white/60">Depart App</div>
              </div>
            </div>

            {/* World Map */}
            <div className="h-64 mb-6 rounded-xl overflow-hidden">
              <WorldMap routes={routesForMap} airportsInUse={airportsInUse} className="h-full" />
            </div>

            {/* Country flags strip */}
            <div className="flex gap-2 overflow-x-auto pb-2" style={{ scrollbarWidth: "thin" }}>
              {stats.countriesVisited.map((country) => (
                <span key={country} className="text-2xl flex-shrink-0" title={country}>
                  {getCountryFlag(country)}
                </span>
              ))}
            </div>

            {/* Stats and Issuer Grid */}
            <div className="grid grid-cols-2 gap-8">
              {/* Stats Grid */}
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-white mb-1">{stats.totalFlights.toLocaleString()}</div>
                    <div className="text-sm text-white/60 uppercase tracking-wide">Flights</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xl font-bold text-white mb-1">{formatKm(stats.totalDistanceKm)}</div>
                    <div className="text-sm text-white/60 uppercase tracking-wide">Distance</div>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center">
                    <div className="text-lg font-bold text-white mb-1">{formatDuration(stats.totalFlightTimeMin)}</div>
                    <div className="text-xs text-white/60 uppercase tracking-wide">Flight Time</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-white mb-1">{stats.uniqueAirports}</div>
                    <div className="text-xs text-white/60 uppercase tracking-wide">Airports</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-white mb-1">{stats.uniqueAirlines}</div>
                    <div className="text-xs text-white/60 uppercase tracking-wide">Airlines</div>
                  </div>
                </div>
              </div>

              {/* Issuer Block */}
              <div className="text-right space-y-3 text-sm text-white/80">
                <div>
                  <div className="font-semibold text-white mb-1">Place of issue</div>
                  <div>{stats.placeOfIssueIata}</div>
                </div>
                <div>
                  <div className="font-semibold text-white mb-1">Date of issue</div>
                  <div>{formatPassportDate(stats.issuedDate)}</div>
                </div>
                <div>
                  <div className="font-semibold text-white mb-1">Member since</div>
                  <div>{formatPassportDate(stats.firstSeenDate)}</div>
                </div>
              </div>
            </div>

            {/* MRZ Line */}
            <div className="mt-6 pt-4 border-t border-white/10">
              <div className="font-mono text-xs text-white/70 tracking-wider leading-tight break-all">{mrzLine}</div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
