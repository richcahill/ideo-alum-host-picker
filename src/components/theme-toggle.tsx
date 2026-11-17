"use client";

import { useSyncExternalStore } from "react";

type Theme = "light" | "dark";

const KEY = "theme";
const CHANGE = "theme-change";

function subscribe(onChange: () => void) {
  window.addEventListener(CHANGE, onChange);
  return () => window.removeEventListener(CHANGE, onChange);
}

const read = (): Theme =>
  document.documentElement.dataset.theme === "dark" ? "dark" : "light";

function choose(theme: Theme) {
  document.documentElement.dataset.theme = theme;
  try {
    localStorage.setItem(KEY, theme);
  } catch {
    // Private windows can refuse storage; the choice then lasts for this page.
  }
  window.dispatchEvent(new Event(CHANGE));
}

/**
 * "Light / Dark" in text. The active one is at full strength; the slash and
 * the other sit at half, and come up to full on hover.
 */
export function ThemeToggle({ className = "" }: { className?: string }) {
  // The server can't know the theme, so neither is marked until hydration.
  const theme = useSyncExternalStore<Theme | null>(subscribe, read, () => null);

  return (
    <span role="group" aria-label="Colour theme" className={className}>
      {(["light", "dark"] as const).map((option, index) => (
        <span key={option}>
          {index > 0 && (
            <span aria-hidden className="px-1.5 opacity-50">
              /
            </span>
          )}
          <button
            type="button"
            aria-pressed={theme === option}
            onClick={() => choose(option)}
            className="uppercase opacity-50 transition-opacity duration-150 ease-out hover:opacity-100 focus-visible:opacity-100 aria-pressed:opacity-100"
          >
            {option}
          </button>
        </span>
      ))}
    </span>
  );
}
