/* ============================================================
   theme.js — Light/Dark/System theme manager
   ============================================================ */
"use strict";

const THEMES = ["light", "dark", "system"];
let currentTheme = "light";

function applyTheme(theme) {
  if (!THEMES.includes(theme)) theme = "light";
  currentTheme = theme;
  document.documentElement.setAttribute("data-theme", theme);
  Store.setTheme(theme);
  updateThemeIcons();

  // dispatch event for charts to re-render
  window.dispatchEvent(new CustomEvent("theme-changed", { detail: { theme } }));
}

function updateThemeIcons() {
  const iconClass = currentTheme === "dark"
    ? "fa-sun"
    : currentTheme === "system"
    ? "fa-circle-half-stroke"
    : "fa-moon";
  $$("#themeToggle i, #loginThemeToggle i").forEach(i => {
    i.className = `fa-solid ${iconClass}`;
  });
}

function cycleTheme() {
  const idx = THEMES.indexOf(currentTheme);
  const next = THEMES[(idx + 1) % THEMES.length];
  applyTheme(next);
  const labels = { light: "Light", dark: "Dark", system: "System" };
  toast(`${t("theme")}: ${labels[next]}`, "info");
}

function initTheme() {
  const saved = Store.getTheme() || "light";
  applyTheme(saved);

  const toggle = $("#themeToggle");
  if (toggle) toggle.onclick = cycleTheme;

  const loginToggle = $("#loginThemeToggle");
  if (loginToggle) loginToggle.onclick = cycleTheme;
}