'use client';

import React, { useEffect, useRef, useState } from 'react';
import { geoEqualEarth, geoPath } from 'd3-geo';
import { getAirportInfo } from '@/lib/passport/airports';

type Route = { fromIata: string; toIata: string; value?: number };
type Props = {
  routes: Route[];
  airportsInUse: string[];
  className?: string;
};

export default function WorldMap({ routes, airportsInUse, className = '' }: Props) {
  const [worldData, setWorldData] = useState<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Load world map data
    fetch('/maps/world-110m.json')
      .then(res => res.json())
      .then(data => setWorldData(data))
      .catch(err => console.error('Failed to load world map:', err));
  }, []);

  if (!worldData) {
    return (
      <div className={`flex items-center justify-center h-64 ${className}`}>
        <div className="text-muted">Loading world map...</div>
      </div>
    );
  }

  // Set up projection and path
  const width = 800;
  const height = 400;

  const projection = geoEqualEarth()
    .scale(130)
    .translate([width / 2, height / 2]);

  const pathGenerator = geoPath().projection(projection);

  // Generate paths for countries
  const landPaths = worldData.features?.map((feature: any, i: number) => (
    <path
      key={i}
      d={pathGenerator(feature) || ''}
      fill="rgba(255,255,255,0.08)"
      stroke="rgba(255,255,255,0.05)"
      strokeWidth="0.5"
    />
  )) || [];

  // Generate great circle arcs
  const routePaths = routes
    .filter(route => {
      const fromAirport = getAirportInfo(route.fromIata);
      const toAirport = getAirportInfo(route.toIata);
      return fromAirport && toAirport;
    })
    .map((route, i) => {
      const fromAirport = getAirportInfo(route.fromIata);
      const toAirport = getAirportInfo(route.toIata);

      if (!fromAirport || !toAirport) return null;

      const fromCoords = projection([fromAirport.lon, fromAirport.lat]);
      const toCoords = projection([toAirport.lon, toAirport.lat]);

      if (!fromCoords || !toCoords) return null;

      const strokeWidth = Math.max(1, Math.min(4, (route.value || 1) * 0.8));
      const opacity = Math.max(0.3, Math.min(0.8, (route.value || 1) * 0.15));

      return (
        <path
          key={`route-${i}`}
          d={`M ${fromCoords[0]} ${fromCoords[1]} Q ${(fromCoords[0] + toCoords[0]) / 2} ${Math.min(fromCoords[1], toCoords[1]) - 30} ${toCoords[0]} ${toCoords[1]}`}
          fill="none"
          stroke="var(--accent, #7ab8ff)"
          strokeWidth={strokeWidth}
          opacity={opacity}
          className="pointer-events-none"
        />
      );
    })
    .filter(Boolean);

  // Generate airport dots
  const airportDots = airportsInUse
    .filter(iata => getAirportInfo(iata))
    .map(iata => {
      const airport = getAirportInfo(iata);
      if (!airport) return null;

      const coords = projection([airport.lon, airport.lat]);
      if (!coords) return null;

      return (
        <circle
          key={`airport-${iata}`}
          cx={coords[0]}
          cy={coords[1]}
          r="2.5"
          fill="var(--accent, #7ab8ff)"
          stroke="rgba(0,0,0,0.3)"
          strokeWidth="1"
          opacity="0.9"
        />
      );
    })
    .filter(Boolean);

  return (
    <div ref={containerRef} className={`w-full ${className}`}>
      <svg
        width="100%"
        height="100%"
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-auto"
        style={{ pointerEvents: "none" }}
        role="img"
        aria-label="World map with your flight routes"
      >
        {/* Land masses */}
        <g className="lands">
          {landPaths}
        </g>

        {/* Flight routes */}
        <g className="routes">
          {routePaths}
        </g>

        {/* Airport dots */}
        <g className="airports">
          {airportDots}
        </g>
      </svg>
    </div>
  );
}


