"use client";
import React, { useEffect, useMemo, useRef, useState, useLayoutEffect } from "react";
import { createPortal } from "react-dom";

type Option = { value: string; label: string; disabled?: boolean };
interface SelectProps {
  id?: string;
  label?: string;
  helpText?: string;
  error?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  options: Option[];
  className?: string;
  required?: boolean;
  disabled?: boolean;
}

function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

export default function Select({
  id,
  label,
  helpText,
  error,
  value,
  onChange,
  placeholder = "Select…",
  options,
  className = "",
  required,
  disabled,
}: SelectProps) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);
  const [activeIndex, setActiveIndex] = useState<number>(-1);
  const [menuRect, setMenuRect] = useState<{ top: number; left: number; width: number } | null>(null);

  const current = useMemo(() => options.find(o => o.value === value), [options, value]);
  const labelId = id ? `${id}-label` : undefined;
  const helpId  = id ? `${id}-help` : undefined;

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!open) return;
      const t = e.target as Node;
      if (triggerRef.current?.contains(t)) return;
      if (listRef.current?.contains(t)) return;
      setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (!open) return;
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const focusActive = () => {
    const el = listRef.current?.querySelector<HTMLElement>(`[data-idx="${activeIndex}"]`);
    el?.focus();
  };

  // Position popover to the trigger via portal (robust against stacking contexts)
  useLayoutEffect(() => {
    if (!open) return;
    const update = () => {
      const el = triggerRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      setMenuRect({ top: Math.round(r.bottom + 8), left: Math.round(r.left), width: Math.round(r.width) });
    };
    update();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [open]);

  const onTriggerKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (disabled) return;
    if (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      setOpen(true);
      setActiveIndex(Math.max(0, options.findIndex(o => !o.disabled)));
      setTimeout(focusActive, 0);
    }
  };

  const onOptionKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      for (let i = activeIndex + 1; i < options.length; i++) {
        if (!options[i].disabled) { setActiveIndex(i); return; }
      }
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      for (let i = activeIndex - 1; i >= 0; i--) {
        if (!options[i].disabled) { setActiveIndex(i); return; }
      }
    } else if (e.key === "Home") {
      e.preventDefault();
      const i = options.findIndex(o => !o.disabled);
      if (i >= 0) setActiveIndex(i);
    } else if (e.key === "End") {
      e.preventDefault();
      for (let i = options.length - 1; i >= 0; i--) {
        if (!options[i].disabled) { setActiveIndex(i); return; }
      }
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      const opt = options[activeIndex];
      if (opt && !opt.disabled) {
        onChange(opt.value);
        setOpen(false);
        triggerRef.current?.focus();
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
      triggerRef.current?.focus();
    }
  };

  return (
    <div className={cx("select-modern", className)}>
      {label && (
        <label id={labelId} htmlFor={id} className="label">{label}{required ? " *" : ""}</label>
      )}

      <div className={cx("select-trigger", disabled && "is-disabled")}>
        <button
          id={id}
          ref={triggerRef}
          type="button"
          className="select-display"
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-labelledby={labelId}
          aria-describedby={helpId}
          style={{ pointerEvents: 'auto', zIndex: 1 }}
          onClick={()=>{
            !disabled && setOpen(v=>!v);
          }}
          onKeyDown={onTriggerKeyDown}
          disabled={disabled}
        >
          <span className={cx("value", !current && "is-placeholder")}>
            {current ? current.label : placeholder}
          </span>
          <svg className="caret" width="16" height="16" viewBox="0 0 20 20" aria-hidden="true">
            <path d="M5.5 7l4.5 5 4.5-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        {open && typeof window !== "undefined" && createPortal(
          <>
            {/* Fullscreen overlay captures clicks and closes */}
            <div className="popover-overlay" onMouseDown={() => setOpen(false)} aria-hidden />
            <div
              ref={listRef}
              role="listbox"
              className="popover-menu"
              style={{ position: "fixed", top: menuRect?.top ?? 0, left: menuRect?.left ?? 0, width: menuRect?.width ?? undefined }}
              tabIndex={-1}
              aria-activedescendant={activeIndex>=0 ? `${id}-opt-${activeIndex}` : undefined}
            >
              {options.map((opt, i) => {
                const selected = value === opt.value;
                return (
                  <button
                    key={opt.value}
                    id={`${id}-opt-${i}`}
                    data-idx={i}
                    role="option"
                    aria-selected={selected}
                    className={cx("option", selected && "is-selected", opt.disabled && "is-disabled")}
                    onClick={() => { if (!opt.disabled) { onChange(opt.value); setOpen(false); triggerRef.current?.focus(); } }}
                    onKeyDown={onOptionKeyDown}
                    disabled={opt.disabled}
                  >
                    <span className="option-label">{opt.label}</span>
                    {selected && <span className="option-check" aria-hidden="true">✓</span>}
                  </button>
                );
              })}
            </div>
          </>, document.body)
        }
      </div>

      {helpText && <div id={helpId} className="help" style={{ marginTop: 6 }}>{helpText}</div>}
      {error && <div className="error" role="alert">{error}</div>}
    </div>
  );
}
