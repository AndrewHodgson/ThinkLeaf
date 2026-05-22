"use client";

import { useEffect, useId, useRef, useState, type FormEvent, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";

const RECENT_COLORS_STORAGE_KEY = "thinkleaf.recentCustomColors.v1";
const COLOR_PICKER_OPEN_EVENT = "thinkleaf-color-picker-open";
const maxRecentColors = 12;

type ColorPickerProps = {
  currentValue: string;
  disabled?: boolean;
  icon?: ReactNode;
  label: string;
  onSelect: (value: string) => void;
  presets: Array<{ label: string; value: string }>;
};

export function ColorPicker({ currentValue, disabled = false, icon, label, onSelect, presets }: ColorPickerProps) {
  const pickerId = useId();
  const pickerRef = useRef<HTMLDivElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [hexValue, setHexValue] = useState("");
  const [recentColors, setRecentColors] = useState<string[]>(() => loadRecentColors());

  useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      if (!pickerRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    function handlePickerOpen(event: Event) {
      const nextPickerId = (event as CustomEvent<string>).detail;
      if (nextPickerId !== pickerId) {
        setIsOpen(false);
      }
    }

    function handleRecentColorsChange() {
      setRecentColors(loadRecentColors());
    }

    document.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener(COLOR_PICKER_OPEN_EVENT, handlePickerOpen);
    window.addEventListener("storage", handleRecentColorsChange);
    window.addEventListener("thinkleaf-recent-colors-change", handleRecentColorsChange);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener(COLOR_PICKER_OPEN_EVENT, handlePickerOpen);
      window.removeEventListener("storage", handleRecentColorsChange);
      window.removeEventListener("thinkleaf-recent-colors-change", handleRecentColorsChange);
    };
  }, [pickerId]);

  function toggleOpen() {
    if (disabled) {
      return;
    }

    const nextIsOpen = !isOpen;
    setIsOpen(nextIsOpen);

    if (nextIsOpen) {
      window.dispatchEvent(new CustomEvent(COLOR_PICKER_OPEN_EVENT, { detail: pickerId }));
    }
  }

  function selectColor(value: string) {
    onSelect(value);
    setIsOpen(false);
  }

  function submitCustomColor(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalizedHex = normalizeHexColor(hexValue);
    if (!normalizedHex) {
      return;
    }

    saveRecentColor(normalizedHex);
    setRecentColors(loadRecentColors());
    setHexValue("");
    selectColor(normalizedHex);
  }

  return (
    <div ref={pickerRef} className="relative">
      <button
        aria-expanded={isOpen}
        aria-label={label}
        className={[
          "inline-flex h-8 cursor-pointer items-center justify-center gap-1 rounded-md border px-2 transition",
          disabled
            ? "pointer-events-none cursor-not-allowed opacity-40"
            : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50",
        ].join(" ")}
        title={label}
        type="button"
        onClick={toggleOpen}
      >
        {icon}
        <span
          className="h-4 w-4 rounded-sm border border-slate-300"
          style={{ background: getSwatchBackground(currentValue) }}
        />
        <ChevronDown aria-hidden="true" className="h-3.5 w-3.5" />
      </button>

      {isOpen ? (
        <div className="absolute left-0 top-10 z-40 w-64 rounded-md border border-slate-200 bg-white p-3 shadow-soft">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</div>
          <div className="mt-2 grid grid-cols-6 gap-1.5">
            {presets.map((preset) => (
              <ColorSwatch
                key={`${label}-${preset.label}`}
                isSelected={currentValue === preset.value}
                label={`${label}: ${preset.label}`}
                value={preset.value}
                onSelect={selectColor}
              />
            ))}
          </div>

          {recentColors.length > 0 ? (
            <>
              <div className="mt-3 text-xs font-semibold uppercase tracking-wide text-slate-400">Recent</div>
              <div className="mt-2 grid grid-cols-6 gap-1.5">
                {recentColors.map((color) => (
                  <ColorSwatch
                    key={`${label}-recent-${color}`}
                    isSelected={currentValue.toLowerCase() === color.toLowerCase()}
                    label={`${label}: ${color}`}
                    value={color}
                    onSelect={selectColor}
                  />
                ))}
              </div>
            </>
          ) : null}

          <form className="mt-3 flex items-center gap-2" onSubmit={submitCustomColor}>
            <input
              aria-label={`${label} custom HEX`}
              className="h-8 min-w-0 flex-1 rounded-md border border-slate-200 px-2 text-xs font-medium text-slate-700 outline-none focus:border-leaf-500"
              placeholder="#238157"
              value={hexValue}
              onChange={(event) => setHexValue(event.target.value)}
            />
            <button
              className="h-8 rounded-md border border-slate-200 px-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
              type="submit"
            >
              Add
            </button>
          </form>
        </div>
      ) : null}
    </div>
  );
}

function ColorSwatch({
  isSelected,
  label,
  onSelect,
  value,
}: {
  isSelected?: boolean;
  label: string;
  onSelect: (value: string) => void;
  value: string;
}) {
  return (
    <button
      aria-label={label}
      className={[
        "h-7 w-7 rounded-sm border transition",
        isSelected ? "border-slate-950 ring-2 ring-leaf-200" : "border-slate-300 hover:border-slate-500",
      ].join(" ")}
      style={{ background: getSwatchBackground(value) }}
      title={label}
      type="button"
      onClick={(event) => {
        event.stopPropagation();
        if (event.detail === 0) {
          onSelect(value);
        }
      }}
      onPointerDown={(event) => {
        event.preventDefault();
        event.stopPropagation();
        onSelect(value);
      }}
    />
  );
}

export function getSwatchBackground(value: string) {
  return value === "transparent"
    ? "linear-gradient(135deg, transparent 0 45%, #cbd5e1 45% 55%, transparent 55% 100%)"
    : value;
}

function normalizeHexColor(value: string) {
  const trimmed = value.trim();
  const withHash = trimmed.startsWith("#") ? trimmed : `#${trimmed}`;
  const shortHex = /^#[0-9a-fA-F]{3}$/;
  const longHex = /^#[0-9a-fA-F]{6}$/;

  if (longHex.test(withHash)) {
    return withHash.toUpperCase();
  }

  if (shortHex.test(withHash)) {
    const [, r, g, b] = withHash;
    return `#${r}${r}${g}${g}${b}${b}`.toUpperCase();
  }

  return null;
}

function loadRecentColors() {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const parsed = JSON.parse(window.localStorage.getItem(RECENT_COLORS_STORAGE_KEY) ?? "[]");
    return Array.isArray(parsed)
      ? parsed.filter((value): value is string => typeof value === "string" && /^#[0-9A-F]{6}$/.test(value))
      : [];
  } catch {
    return [];
  }
}

function saveRecentColor(color: string) {
  if (typeof window === "undefined") {
    return;
  }

  const nextColors = [color, ...loadRecentColors().filter((recentColor) => recentColor !== color)].slice(
    0,
    maxRecentColors,
  );
  window.localStorage.setItem(RECENT_COLORS_STORAGE_KEY, JSON.stringify(nextColors));
  window.dispatchEvent(new Event("thinkleaf-recent-colors-change"));
}
