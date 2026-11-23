/* ============================================================
   skills.js — Skills & Competency Management
   ============================================================ */
"use strict";

const SKILL_CATALOG = [
  { id: "sk_vitals", name: "Vital Signs", category: "Basic" },
  { id: "sk_meds", name: "Medication Administration", category: "Medication" },
  { id: "sk_iv", name: "IV Therapy", category: "Advanced" },
  { id: "sk_wound", name: "Wound Care", category: "Clinical" },
  { id: "sk_monitor", name: "Patient Monitoring", category: "Monitoring" },
  { id: "sk_emergency", name: "Emergency Response", category: "Critical" },
  { id: "sk_icu", name: "ICU Experience", category: "Critical" },
  { id: "sk_peds", name: "Pediatric Nursing", category: "Specialty" },
  { id: "sk_geriatric", name: "Geriatric Care", category: "Specialty" },
  { id: "sk_infection", name: "Infection Control", category: "Safety" },
  { id: "sk_mobility", name: "Patient Mobilization", category: "Basic" },
  { id: "sk_bls", name: "Basic Life Support (BLS)", category: "Certification" },
  { id: "sk_acls", name: "Advanced Cardiovascular Life Support (ACLS)", category: "Certification" }
];

const PROFICIENCY_LEVELS = ["beginner", "intermediate", "advanced", "expert"];

function renderSkillsPage(container) {
  container.innerHTML = `
    <div class="page-header">
      <div>
        <h1>${t("skills")}</h1>
        <p>${t("skillsManagementDesc")}</p>
      </div>
    </div>

    <div class="card" style="margin-bottom:16px">
      <div class="card-title"><i class="fa-solid fa-list-check"></i> ${t("skillCatalog")} (${SKILL_CATALOG.length})</div>
      <div class="table-wrap">
        <table class="data-table">
          <thead>
            <tr>
              <th>${t("skill")}</th>
              <th>${t("category")}</th>
              <th>${t("nurses")}</th>
            </tr>
          </thead>
          <tbody>
            ${SKILL_CATALOG.map(sk => {
              const nursesWith = DB.data.nurses.filter(n => (n.skills || []).includes(sk.name)).length;
              const pct = DB.data.nurses.length ? Math.round((nursesWith / DB.data.nurses.length) * 100) : 0;
              return `
                <tr>
                  <td class="cell-strong">${esc(sk.name)}</td>
                  <td><span class="badge medium">${esc(sk.category)}</span></td>
                  <td>
                    <strong>${nursesWith}</strong> / ${DB.data.nurses.length}
                    <div style="font-size:11px;color:var(--text-muted)">${pct}%</div>
                  </td>
                </tr>
              `;
            }).join("")}
          </tbody>
        </table>
      </div>
    </div>

    <div class="card">
      <div class="card-title"><i class="fa-solid fa-user-nurse"></i> ${t("nurseCompetencies")}</div>
      <div class="table-wrap">
        <table class="data-table">
          <thead>
            <tr>
              <th>${t("nurses")}</th>
              <th>${t("qualification")}</th>
              <th>${t("capability")}</th>
              <th>${t("skills")}</th>
            </tr>
          </thead>
          <tbody>
            ${DB.data.nurses.map(n => `
              <tr>
                <td class="cell-strong">${esc(n.name)}<div class="cell-sub">${esc(n.code)}</div></td>
                <td>${esc(n.qualification)}<div class="cell-sub">${n.experience} ${t("years")}</div></td>
                <td><span class="badge purple">${getNurseCapability(n)}</span></td>
                <td><div>${(n.skills || []).map(s => `<span class="badge teal" style="margin:2px">${esc(s)}</span>`).join("") || `<span class="cell-sub">${t("noData")}</span>`}</div></td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      </div>
    </div>
  `;
}