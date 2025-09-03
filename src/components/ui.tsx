import React, { useState } from "react";

export function Card({ children, className="" }: React.PropsWithChildren<{className?: string}>) {
  return <div className={`rounded-2xl bg-white shadow-lg ring-1 ring-black/5 ${className}`}>{children}</div>;
}
export function CardHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="px-6 pt-6 pb-4 border-b border-black/5">
      <div className="text-lg font-semibold">{title}</div>
      {subtitle ? <div className="text-sm text-gray-500 mt-0.5">{subtitle}</div> : null}
    </div>
  );
}
export function CardBody({ children, className="" }: React.PropsWithChildren<{className?: string}>) {
  return <div className={`p-6 ${className}`}>{children}</div>;
}

export function Button({ children, onClick, type="button", variant="primary", disabled=false }:{
  children: React.ReactNode; onClick?: () => void; type?: "button"|"submit"; variant?: "primary"|"secondary"|"ghost"; disabled?: boolean;
}) {
  const styles = {
    primary: "bg-gradient-to-r from-indigo-600 to-violet-600 text-white hover:to-violet-700",
    secondary: "bg-black/5 text-gray-900 hover:bg-black/10",
    ghost: "bg-transparent hover:bg-black/5",
  }[variant];
  return (
    <button type={type} onClick={onClick} disabled={disabled}
      className={`rounded-xl px-4 py-2 text-sm font-medium transition ${styles} disabled:opacity-50`}>
      {children}
    </button>
  );
}

export function Badge({ children, tone="default" }:{ children: React.ReactNode; tone?: "default"|"good"|"warn"|"bad"|"info" }) {
  const styles = {
    default: "bg-gray-100 text-gray-700 ring-gray-200",
    good: "bg-green-50 text-green-800 ring-green-200",
    warn: "bg-yellow-50 text-yellow-800 ring-yellow-200",
    bad: "bg-red-50 text-red-800 ring-red-200",
    info: "bg-indigo-50 text-indigo-800 ring-indigo-200",
  }[tone];
  return <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs ring-1 ${styles}`}>{children}</span>;
}

export function Kpi({ label, value, sub }: { label: string; value: React.ReactNode; sub?: string }) {
  return (
    <div className="rounded-xl border border-black/5 p-4">
      <div className="text-xs uppercase tracking-wide text-gray-500">{label}</div>
      <div className="text-2xl font-semibold">{value}</div>
      {sub ? <div className="text-xs text-gray-500 mt-1">{sub}</div> : null}
    </div>
  );
}

export function Meter({ percent }: { percent: number }) {
  const pct = Math.max(0, Math.min(100, Math.round(percent)));
  return (
    <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
      <div className="h-2 bg-indigo-600" style={{width: `${pct}%`}} />
    </div>
  );
}

export function Accordion({ items }:{ items: {title: string; content: React.ReactNode}[] }) {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <div className="divide-y rounded-xl border border-black/5">
      {items.map((it, i) => (
        <div key={i}>
          <button className="w-full flex items-center justify-between p-4 text-left hover:bg-black/5 rounded-xl"
            onClick={()=>setOpen(open===i?null:i)}>
            <span className="font-medium">{it.title}</span>
            <span className="text-gray-500">{open===i ? "−" : "+"}</span>
          </button>
          {open===i && <div className="p-4 pt-0 text-sm text-gray-700">{it.content}</div>}
        </div>
      ))}
    </div>
  );
}
