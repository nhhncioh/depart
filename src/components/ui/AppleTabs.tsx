import React, { useState, useEffect, KeyboardEvent } from "react";

export type TabItem = { id: string; label: string; badge?: string | number; disabled?: boolean };

type Variant = "segmented" | "underline";

export interface AppleTabsProps {
  items: TabItem[];
  value?: string;
  defaultValue?: string;
  onChange?: (id: string) => void;
  variant?: Variant;
  fullWidth?: boolean;
  className?: string;
}

function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

export default function AppleTabs({
  items,
  value,
  defaultValue,
  onChange,
  variant = "segmented",
  fullWidth = false,
  className = "",
}: AppleTabsProps) {
  const [internal, setInternal] = useState<string>(() => value ?? defaultValue ?? items[0]?.id ?? "");
  const selected = value ?? internal;

  useEffect(() => {
    if (value !== undefined) return;
    setInternal((prev) => prev || items[0]?.id || "");
  }, [items, value]);

  const select = (id: string) => {
    if (items.find((t) => t.id === id)?.disabled) return;
    if (value === undefined) setInternal(id);
    onChange?.(id);
  };

  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const idx = items.findIndex((t) => t.id === selected);
    if (idx < 0) return;
    if (e.key === "ArrowRight") {
      e.preventDefault();
      for (let i = idx + 1; i < items.length; i++) if (!items[i].disabled) return select(items[i].id);
    }
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      for (let i = idx - 1; i >= 0; i--) if (!items[i].disabled) return select(items[i].id);
    }
  };

  if (variant === "underline") {
    return (
      <div role="tablist" aria-orientation="horizontal" onKeyDown={onKey} className={cx("flex gap-2 border-b border-zinc-200/60", className)}>
        {items.map((t) => {
          const isSel = t.id === selected;
          return (
            <button
              key={t.id}
              role="tab"
              aria-selected={isSel}
              disabled={t.disabled}
              onClick={() => select(t.id)}
              className={cx(
                "relative px-3 sm:px-4 py-2 text-sm sm:text-[0.95rem] font-medium rounded-t-xl transition-colors",
                isSel ? "text-zinc-900" : "text-zinc-500 hover:text-zinc-800",
                t.disabled && "opacity-50 cursor-not-allowed"
              )}
            >
              <span className="inline-flex items-center gap-2">
                {t.label}
                {t.badge !== undefined && (
                  <span className="inline-flex min-w-5 h-5 items-center justify-center rounded-full text-[0.7rem] px-2 ring-1 ring-black/5 bg-zinc-100">
                    {t.badge}
                  </span>
                )}
              </span>
              <span
                className={cx(
                  "pointer-events-none absolute left-0 right-0 -bottom-[1px] h-[2px] rounded-full transition-all",
                  isSel ? "bg-zinc-900" : "bg-transparent"
                )}
              />
            </button>
          );
        })}
      </div>
    );
  }

  // segmented
  return (
    <div
      role="tablist"
      aria-orientation="horizontal"
      onKeyDown={onKey}
      className={cx(
        "inline-flex p-1 rounded-2xl border border-zinc-200/60 bg-white/70 backdrop-blur supports-[backdrop-filter]:bg-white/50 ring-1 ring-black/5 shadow-[0_1px_0_rgba(0,0,0,0.04)]",
        fullWidth && "w-full",
        className
      )}
    >
      {items.map((t) => {
        const isSel = t.id === selected;
        return (
          <button
            key={t.id}
            role="tab"
            aria-selected={isSel}
            disabled={t.disabled}
            onClick={() => select(t.id)}
            className={cx(
              "relative px-3 sm:px-4 py-2 text-sm sm:text-[0.95rem] font-medium rounded-xl transition-all",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2 focus-visible:ring-offset-white",
              isSel ? "bg-zinc-900 text-white shadow" : "text-zinc-700 hover:bg-zinc-100",
              t.disabled && "opacity-50 cursor-not-allowed",
              fullWidth && "flex-1"
            )}
          >
            <span className="inline-flex items-center gap-2">
              {t.label}
              {t.badge !== undefined && (
                <span className={cx(
                  "inline-flex min-w-5 h-5 items-center justify-center rounded-full text-[0.7rem] px-2 ring-1 ring-black/5",
                  isSel ? "bg-white/20 text-white" : "bg-zinc-100 text-zinc-700"
                )}>
                  {t.badge}
                </span>
              )}
            </span>
          </button>
        );
      })}
    </div>
  );
}
