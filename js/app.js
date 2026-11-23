/* ============================================================
   app.js — Bootstrap
   ============================================================ */
"use strict";

document.addEventListener("DOMContentLoaded", () => {
  // 1. Load DB
  DB.load();

  // 2. Init language (before theme, since theme uses t())
  initLanguage();

  // 3. Init theme
  initTheme();

  // 4. Init login form
  initLoginScreen();

  // 5. If session exists → enter app
  const sess = Session.get();
  if (sess) {
    enterApp();
  } else {
    showLogin();
  }

  // 6. Re-render on theme change
  window.addEventListener("theme-changed", () => {
    if (Router.current && Router.current === "dashboard") {
      Router.refresh();
    }
  });

  // 7. Re-render on language change (if logged in)
  const originalSetLang = window.setLanguage;
  window.setLanguage = (lang) => {
    originalSetLang(lang);
    if (Session.get()) {
      renderSidebar();
      updateShellUser();
      if (Router.current) Router.go(Router.current);
    }
  };
});