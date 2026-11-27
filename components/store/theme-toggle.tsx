"use client";
import { useSyncExternalStore } from "react";
const key = "rip-theme";
function read() {
  try {
    const value = localStorage.getItem(key);
    return value === "system" || value === "light" ? value : "dark";
  } catch {
    return "dark";
  }
}
function subscribe(listener: () => void) {
  window.addEventListener("storage", listener);
  window.addEventListener("rip-theme-change", listener);
  return () => {
    window.removeEventListener("storage", listener);
    window.removeEventListener("rip-theme-change", listener);
  };
}
export function useCustomerTheme() {
  return useSyncExternalStore(subscribe, read, () => "dark");
}
export function ThemeToggle() {
  const theme = useCustomerTheme();
  return (
    <label className="rip-theme-control">
      <span>Appearance</span>
      <select
        aria-label="Colour theme"
        value={theme}
        onChange={(event) => {
          try {
            localStorage.setItem(key, event.target.value);
            window.dispatchEvent(new Event("rip-theme-change"));
          } catch {
            document
              .querySelector(".rr-store-shell")
              ?.setAttribute("data-theme", event.target.value);
          }
        }}
      >
        <option value="system">System</option>
        <option value="light">Light</option>
        <option value="dark">Dark</option>
      </select>
    </label>
  );
}
