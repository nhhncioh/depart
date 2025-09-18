"use client";
import { use } from "react";

type Params = { id?: string };

export default function TripPage({ params }: { params: Promise<Params> }) {
  const resolved = use(params);
  const id = resolved?.id || "";

  return (
    <main className="app-shell">
      <div className="container">
        <div className="card card-lg">
          <div className="card-inner">
            <div className="kicker">Demo</div>
            <h1>Flight tracking</h1>
            <p className="sub">This demo page is under construction. Trip id: {id}</p>
          </div>
        </div>
      </div>
    </main>
  );
}
