/* ============================================================
   acuity.js — Patient Acuity & Risk Assessment
   ------------------------------------------------------------
   All scoring rules are ILLUSTRATIVE prototype estimates.
   Must be reviewed by nursing specialists before real use.
   ============================================================ */
"use strict";

const DEPENDENCY_LEVELS = [
  { key: "independent",    label: "Independent",            score: 1 },
  { key: "partial",        label: "Requires Partial Help",  score: 2 },
  { key: "significant",    label: "Requires Significant Help", score: 3 },
  { key: "fully",          label: "Fully Dependent",        score: 4 }
];

const MOBILITY_LEVELS = [
  { key: "independent", label: "Independent Mobility", score: 1 },
  { key: "assisted",    label: "Requires Assistance",  score: 2 },
  { key: "limited",     label: "Limited Mobility",     score: 3 },
  { key: "bedridden",   label: "Bedridden",            score: 4 }
];

const RISK_LEVELS = [
  { key: "low",      label: "Low",      score: 1 },
  { key: "moderate", label: "Moderate", score: 2 },
  { key: "high",     label: "High",     score: 3 }
];

const COGNITIVE_LEVELS = [
  { key: "alert",         label: "Alert",               score: 1 },
  { key: "confused",      label: "Confused",            score: 2 },
  { key: "disoriented",   label: "Disoriented",         score: 3 },
  { key: "supervision",   label: "Continuous Supervision", score: 4 }
];

const INFECTION_LEVELS = [
  { key: "standard", label: "Standard Precautions", score: 1 },
  { key: "contact",  label: "Contact Precautions",  score: 2 },
  { key: "droplet",  label: "Droplet Precautions",  score: 3 },
  { key: "airborne", label: "Airborne Precautions", score: 4 }
];

const SPECIAL_REQUIREMENTS = [
  { key: "frequent_monitoring", label: "Frequent Monitoring" },
  { key: "wound_care",          label: "Special Wound Care" },
  { key: "feeding_assistance",  label: "Feeding Assistance" },
  { key: "respiratory_support", label: "Respiratory Support" },
  { key: "repositioning",       label: "Frequent Repositioning" },
  { key: "mobility_assistance", label: "Mobility Assistance" },
  { key: "observation",         label: "Special Observation" }
];

/* Ensure every patient has an assessment object */
function ensureAssessment(patient) {
  if (!patient.assessment) {
    patient.assessment = {
      dependency: "partial",
      mobility: "assisted",
      fallRisk: "moderate",
      pressureRisk: "moderate",
      cognitive: "alert",
      infection: "standard",
      special: []
    };
  }
  return patient.assessment;
}

/* Compute acuity score from assessment (illustrative weights) */
function computeAcuityFromAssessment(assessment) {
  if (!assessment) return 0;
  const dep = DEPENDENCY_LEVELS.find(d => d.key === assessment.dependency)?.score || 1;
  const mob = MOBILITY_LEVELS.find(m => m.key === assessment.mobility)?.score || 1;
  const fall = RISK_LEVELS.find(r => r.key === assessment.fallRisk)?.score || 1;
  const press = RISK_LEVELS.find(r => r.key === assessment.pressureRisk)?.score || 1;
  const cog = COGNITIVE_LEVELS.find(c => c.key === assessment.cognitive)?.score || 1;
  const inf = INFECTION_LEVELS.find(i => i.key === assessment.infection)?.score || 1;
  const specialCount = (assessment.special || []).length;

  // Illustrative weighted sum (configurable)
  return dep + mob + fall + press + cog + inf + specialCount;
}

/* Map raw score → category (illustrative thresholds) */
function scoreToCategory(score) {
  if (score >= 18) return "critical";
  if (score >= 12) return "high";
  if (score >= 7)  return "moderate";
  return "low";
}

function categoryToAcuityLevel(category) {
  return { low: 1, moderate: 2, high: 3, critical: 4 }[category] || 1;
}

/* ---------- Page ---------- */
function renderAcuityPage(container) {
  container.innerHTML = `
    <div class="page-header">
      <div>
        <h1>${t("acuity")} & ${t("riskAssessment") || "Risk Assessment"}</h1>
        <p>${t("acuityDesc")}</p>
      </div>
    </div>

    <div class="card" style="background:#fffbea;border-color:#fde68a;margin-bottom:16px">
      <div style="display:flex;gap:10px;align-items:flex-start">
        <i class="fa-solid fa-triangle-exclamation" style="color:#b45309;font-size:18px;margin-top:2px"></i>
        <div style="font-size:12.5px;color:#78350f;line-height:1.6">
          <strong>${t("important")}:</strong> ${t("acuityDisclaimer")}
        </div>
      </div>
    </div>

    <div class="card">
      <div class="card-title"><i class="fa-solid fa-clipboard-list"></i> ${t("patients")}</div>
      <div class="table-wrap">
        <table class="data-table">
          <thead>
            <tr>
              <th>${t("patients")}</th>
              <th>${t("dependency")}</th>
              <th>${t("mobility")}</th>
              <th>${t("fallRisk")}</th>
              <th>${t("cognitive")}</th>
              <th>${t("acuity")}</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            ${DB.data.patients.map(p => {
              const a = ensureAssessment(p);
              const score = computeAcuityFromAssessment(a);
              const cat = scoreToCategory(score);
              return `
                <tr>
                  <td class="cell-strong">${esc(p.code)}<div class="cell-sub">${esc(p.name)}</div></td>
                  <td><span class="cell-sub">${esc(DEPENDENCY_LEVELS.find(d => d.key === a.dependency)?.label || "—")}</span></td>
                  <td><span class="cell-sub">${esc(MOBILITY_LEVELS.find(m => m.key === a.mobility)?.label || "—")}</span></td>
                  <td><span class="badge ${a.fallRisk === "high" ? "critical" : a.fallRisk === "moderate" ? "high" : "completed"}">${a.fallRisk}</span></td>
                  <td><span class="cell-sub">${esc(COGNITIVE_LEVELS.find(c => c.key === a.cognitive)?.label || "—")}</span></td>
                  <td>
                    <span class="meter">
                      <span class="dot level-${categoryToAcuityLevel(cat)}"></span>
                      ${t(cat)} (${score})
                    </span>
                  </td>
                  <td>
                    <button class="btn btn-sm btn-outline" data-edit-acuity="${p.id}">
                      <i class="fa-solid fa-pen"></i> ${t("edit")}
                    </button>
                  </td>
                </tr>
              `;
            }).join("")}
          </tbody>
        </table>
      </div>
    </div>
  `;

  $$("[data-edit-acuity]", container).forEach(b => {
    b.onclick = () => openAcuityModal(b.dataset.editAcuity);
  });
}

function openAcuityModal(patientId) {
  const patient = getPatientById(patientId);
  if (!patient) return;
  const a = ensureAssessment(patient);
  const score = computeAcuityFromAssessment(a);
  const cat = scoreToCategory(score);

  Modal.open({
    title: `${t("acuity")} — ${patient.name}`,
    wide: true,
    body: `
      <form id="acuityForm" class="form-grid">
        <div>
          <label><small>${t("dependency")}</small></label>
          <select id="afDependency">
            ${DEPENDENCY_LEVELS.map(d => `<option value="${d.key}" ${a.dependency === d.key ? "selected" : ""}>${d.label}</option>`).join("")}
          </select>
        </div>
        <div>
          <label><small>${t("mobility")}</small></label>
          <select id="afMobility">
            ${MOBILITY_LEVELS.map(m => `<option value="${m.key}" ${a.mobility === m.key ? "selected" : ""}>${m.label}</option>`).join("")}
          </select>
        </div>
        <div>
          <label><small>${t("fallRisk")}</small></label>
          <select id="afFall">
            ${RISK_LEVELS.map(r => `<option value="${r.key}" ${a.fallRisk === r.key ? "selected" : ""}>${r.label}</option>`).join("")}
          </select>
        </div>
        <div>
          <label><small>${t("pressureRisk") || "Pressure Injury Risk"}</small></label>
          <select id="afPressure">
            ${RISK_LEVELS.map(r => `<option value="${r.key}" ${a.pressureRisk === r.key ? "selected" : ""}>${r.label}</option>`).join("")}
          </select>
        </div>
        <div>
          <label><small>${t("cognitive")}</small></label>
          <select id="afCognitive">
            ${COGNITIVE_LEVELS.map(c => `<option value="${c.key}" ${a.cognitive === c.key ? "selected" : ""}>${c.label}</option>`).join("")}
          </select>
        </div>
        <div>
          <label><small>${t("infectionPrecautions") || "Infection Precautions"}</small></label>
          <select id="afInfection">
            ${INFECTION_LEVELS.map(i => `<option value="${i.key}" ${a.infection === i.key ? "selected" : ""}>${i.label}</option>`).join("")}
          </select>
        </div>
        <div class="full">
          <label><small>${t("specialRequirements") || "Special Requirements"}</small></label>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-top:6px">
            ${SPECIAL_REQUIREMENTS.map(sr => `
              <label style="display:flex;align-items:center;gap:6px;font-weight:400;font-size:12.5px">
                <input type="checkbox" class="af-special" value="${sr.key}" ${(a.special || []).includes(sr.key) ? "checked" : ""} style="width:auto;margin:0" />
                ${sr.label}
              </label>
            `).join("")}
          </div>
        </div>
        <div class="full" style="background:var(--sky);padding:12px;border-radius:8px;color:var(--navy);font-weight:600">
          <i class="fa-solid fa-calculator"></i> ${t("acuity")}: <span id="afScoreDisplay">${score} → ${t(cat)}</span>
        </div>
      </form>
    `,
    footer: `
      <button class="btn btn-outline" id="afCancel">${t("cancel")}</button>
      <button class="btn btn-primary" id="afSave">${t("save")}</button>
    `,
    onMount() {
      function recalc() {
        const preview = {
          dependency: $("#afDependency").value,
          mobility: $("#afMobility").value,
          fallRisk: $("#afFall").value,
          pressureRisk: $("#afPressure").value,
          cognitive: $("#afCognitive").value,
          infection: $("#afInfection").value,
          special: $$(".af-special").filter(c => c.checked).map(c => c.value)
        };
        const s = computeAcuityFromAssessment(preview);
        const c = scoreToCategory(s);
        $("#afScoreDisplay").textContent = `${s} → ${t(c)}`;
      }
      ["#afDependency", "#afMobility", "#afFall", "#afPressure", "#afCognitive", "#afInfection"].forEach(sel => {
        $(sel).addEventListener("change", recalc);
      });
      $$(".af-special").forEach(cb => cb.addEventListener("change", recalc));

      $("#afCancel").onclick = () => Modal.close();
      $("#afSave").onclick = () => {
        const newAssessment = {
          dependency: $("#afDependency").value,
          mobility: $("#afMobility").value,
          fallRisk: $("#afFall").value,
          pressureRisk: $("#afPressure").value,
          cognitive: $("#afCognitive").value,
          infection: $("#afInfection").value,
          special: $$(".af-special").filter(c => c.checked).map(c => c.value)
        };
        patient.assessment = newAssessment;
        const score = computeAcuityFromAssessment(newAssessment);
        const cat = scoreToCategory(score);
        patient.acuity = categoryToAcuityLevel(cat);
        patient.acuityScore = score;
        DB.save();
        audit("Patient acuity updated", `${patient.code} → ${cat} (score ${score})`);
        toast(t("dataSaved"), "success");
        Modal.close();
        Router.refresh();
      };
    }
  });
}