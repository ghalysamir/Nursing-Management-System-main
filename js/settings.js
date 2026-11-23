/* ============================================================
   settings.js — Application settings page
   ============================================================ */
"use strict";

function renderSettingsPage(container) {
  container.innerHTML = `
    <div class="page-header">
      <div>
        <h1>${t("settings")}</h1>
        <p>${t("preferences")}</p>
      </div>
    </div>

    <div class="grid-2">
      <div class="card">
        <div class="card-title"><i class="fa-solid fa-language"></i> ${t("language")}</div>
        <div style="display:flex;flex-direction:column;gap:8px">
          <button class="btn btn-outline" data-setlang="en" style="justify-content:flex-start"><span>🇬🇧</span> English</button>
          <button class="btn btn-outline" data-setlang="ar" style="justify-content:flex-start"><span>🇸🇦</span> العربية</button>
        </div>
      </div>

      <div class="card">
        <div class="card-title"><i class="fa-solid fa-palette"></i> ${t("appearance")}</div>
        <div style="display:flex;flex-direction:column;gap:8px">
          <button class="btn btn-outline" data-settheme="light" style="justify-content:flex-start"><i class="fa-solid fa-sun"></i> ${t("lightMode")}</button>
          <button class="btn btn-outline" data-settheme="dark" style="justify-content:flex-start"><i class="fa-solid fa-moon"></i> ${t("darkMode")}</button>
          <button class="btn btn-outline" data-settheme="system" style="justify-content:flex-start"><i class="fa-solid fa-circle-half-stroke"></i> ${t("systemMode")}</button>
        </div>
      </div>
    </div>
  `;

  $$("[data-setlang]", container).forEach(b => {
    b.onclick = () => setLanguage(b.dataset.setlang);
  });
  $$("[data-settheme]", container).forEach(b => {
    b.onclick = () => applyTheme(b.dataset.settheme);
  });
}