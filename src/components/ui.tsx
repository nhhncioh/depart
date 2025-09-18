import React, { useState } from "react";

// Cards
export function Card({ children, className = "" }: React.PropsWithChildren<{ className?: string }>) {
  return (
    <div
      className={`rounded-3xl border border-white/10 bg-white/5 backdrop-blur supports-[backdrop-filter]:bg-white/7.5 shadow-[0_10px_30px_rgba(0,0,0,0.35)] transition-all duration-200 hover:shadow-[0_15px_40px_rgba(0,0,0,0.4)] ${className}`}
    >
      {children}
    </div>
  );
}

export function CardHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="px-6 sm:px-8 pt-6 pb-4 border-b border-white/10">
      <div className="text-base sm:text-lg font-semibold tracking-[-0.01em] text-white">{title}</div>
      {subtitle ? <div className="text-sm text-zinc-400 mt-1">{subtitle}</div> : null}
    </div>
  );
}

export function CardBody({ children, className = "" }: React.PropsWithChildren<{ className?: string }>) {
  return <div className={`p-6 ${className}`}>{children}</div>;
}

// Buttons
export function Button({ children, onClick, type = "button", variant = "primary", disabled = false }: {
  children: React.ReactNode; onClick?: () => void; type?: "button" | "submit"; variant?: "primary" | "secondary" | "ghost"; disabled?: boolean;
}) {
  const styles = {
    primary: "bg-gradient-to-r from-indigo-500 to-violet-600 text-white hover:to-violet-700",
    secondary: "bg-white/10 text-white hover:bg-white/15",
    ghost: "bg-transparent text-white hover:bg-white/5",
  }[variant];
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`rounded-xl px-4 py-2 text-sm font-medium transition ${styles} disabled:opacity-50`}
    >
      {children}
    </button>
  );
}

// Badge
export function Badge({ children, tone = "default" }: { children: React.ReactNode; tone?: "default" | "good" | "warn" | "bad" | "info" }) {
  const styles = {
    default: "bg-white/10 text-white ring-white/10",
    good: "bg-emerald-500/15 text-emerald-200 ring-emerald-400/25",
    warn: "bg-amber-500/15 text-amber-200 ring-amber-400/25",
    bad: "bg-rose-500/15 text-rose-200 ring-rose-400/25",
    info: "bg-sky-500/15 text-sky-200 ring-sky-400/25",
  }[tone];
  return <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs ring-1 ${styles}`}>{children}</span>;
}

// KPI block
export function Kpi({ label, value, sub }: { label: string; value: React.ReactNode; sub?: string }) {
  return (
    <div className="rounded-xl border border-white/10 p-4">
      <div className="text-xs uppercase tracking-wide text-zinc-400">{label}</div>
      <div className="text-2xl font-semibold text-white">{value}</div>
      {sub ? <div className="text-xs text-zinc-400 mt-1">{sub}</div> : null}
    </div>
  );
}

// Progress meter
export function Meter({ percent }: { percent: number }) {
  const pct = Math.max(0, Math.min(100, Math.round(percent)));
  return (
    <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
      <div className="h-2 bg-indigo-400" style={{ width: `${pct}%` }} />
    </div>
  );
}

// Accordion
export function Accordion({ items }: { items: { title: string; content: React.ReactNode }[] }) {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <div className="divide-y divide-white/10 rounded-xl border border-white/10">
      {items.map((it, i) => (
        <div key={i}>
          <button
            className="w-full flex items-center justify-between p-4 text-left hover:bg-white/5 rounded-xl"
            onClick={() => setOpen(open === i ? null : i)}
          >
            <span className="font-medium text-white">{it.title}</span>
            <span className="text-zinc-400">{open === i ? "-" : "+"}</span>
          </button>
          {open === i && <div className="p-4 pt-0 text-sm text-zinc-300">{it.content}</div>}
        </div>
      ))}
    </div>
  );
}

