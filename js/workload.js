/* ============================================================
   workload.js — Time-Based Workload Calculator
   ------------------------------------------------------------
   ILLUSTRATIVE weights only — must be validated clinically.
   ============================================================ */
"use strict";

/* Task type → estimated minutes */
function taskDuration(taskName) {
  const n = String(taskName || "").toLowerCase();
  if (n.includes("medication")) return 10;
  if (n.includes("wound")) return 25;
  if (n.includes("vital")) return 8;
  if (n.includes("glucose")) return 6;
  if (n.includes("oxygen") || n.includes("respiratory")) return 10;
  if (n.includes("reposition") || n.includes("positioning")) return 5;
  if (n.includes("intake") || n.includes("output")) return 6;
  if (n.includes("specimen")) return 12;
  if (n.includes("education")) return 15;
  if (n.includes("laboratory") || n.includes("results")) return 5;
  if (n.includes("preparation") || n.includes("procedure")) return 15;
  return 10;
}

/* Task type → frequency factor */
function taskFrequency(taskName) {
  const n = String(taskName || "").toLowerCase();
  if (n.includes("reposition") || n.includes("positioning")) return 6;
  if (n.includes("vital")) return 4;
  if (n.includes("glucose")) return 4;
  if (n.includes("medication")) return 3;
  if (n.includes("intake") || n.includes("output")) return 3;
  return 1;
}

/* Compute patient workload minutes */
function computePatientWorkload(patient) {
  const careList = patient.careNeeds || [];
  const patientTasks = DB.data.tasks.filter(t => t.patientId === patient.id);

  let totalMinutes = 0;
  const seen = new Set();
  const allNames = [...careList, ...patientTasks.map(t => t.name)];

  allNames.forEach(name => {
    const key = name.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    totalMinutes += taskDuration(name) * taskFrequency(name);
  });

  return {
    patientId: patient.id,
    taskCount: seen.size,
    minutes: Math.round(totalMinutes)
  };
}

/* Compute nurse workload */
function computeNurseWorkloads(shift) {
  const shiftHours = shift ? shiftTypeHours(shift.type) : 6;
  const shiftMinutes = shiftHours * 60;
  const breakMinutes = 30;
  const availableMinutes = Math.max(1, shiftMinutes - breakMinutes);

  return DB.data.nurses
    .filter(n => n.availability === "available" || n.availability === "on_duty")
    .map(nurse => {
      const assignedPatients = DB.data.patients.filter(p => p.assignedNurseId === nurse.id);
      const patientScores = assignedPatients.map(p => ({
        patient: p,
        minutes: computePatientWorkload(p).minutes
      }));

      const totalMinutes = patientScores.reduce((s, ps) => s + ps.minutes, 0);
      const utilization = Math.min(200, Math.round((totalMinutes / availableMinutes) * 100));

      let level = "low";
      if (utilization >= 80) level = "overload";
      else if (utilization >= 60) level = "high";
      else if (utilization >= 35) level = "medium";

      return {
        nurse,
        capability: getNurseCapability(nurse),
        assignedPatients,
        patientScores,
        totalMinutes,
        availableMinutes,
        utilization,
        level
      };
    })
    .sort((a, b) => b.utilization - a.utilization);
}

function workloadLevelBadgeClass(level) {
  if (level === "overload") return "critical";
  if (level === "high") return "high";
  if (level === "medium") return "medium";
  return "completed";
}

/* ---------- Page ---------- */
function renderWorkloadPage(container) {
  const shift = getActiveShift();
  if (!shift) {
    container.innerHTML = `
      <div class="page-header"><div><h1>${t("workload")}</h1><p>${t("noShiftDesc")}</p></div></div>
      <div class="card"><div class="empty-state"><i class="fa-solid fa-clock"></i><h4>${t("noShift")}</h4></div></div>
    `;
    return;
  }

  const workloads = computeNurseWorkloads(shift);
  const weights = DB.data.settings.workloadWeights;
  const shiftMinutes = shiftTypeHours(shift.type) * 60;

  container.innerHTML = `
    <div class="page-header">
      <div>
        <h1>${t("workload_calc")}</h1>
        <p>${t("workloadDesc")}</p>
      </div>
      <div class="page-actions">
        <button class="btn btn-outline" id="wlExplainBtn"><i class="fa-solid fa-circle-question"></i> ${t("howCalculated")}</button>
      </div>
    </div>

    <div class="card" style="background:#fffbea;border-color:#fde68a;margin-bottom:16px">
      <div style="display:flex;gap:10px;align-items:flex-start">
        <i class="fa-solid fa-triangle-exclamation" style="color:#b45309;font-size:18px;margin-top:2px"></i>
        <div style="font-size:12.5px;color:#78350f;line-height:1.6">
          <strong>${t("important")}:</strong> ${t("workloadDisclaimer")}
        </div>
      </div>
    </div>

    <div class="card" style="margin-bottom:16px">
      <div class="card-title"><i class="fa-solid fa-palette"></i> ${t("legend")}</div>
      <div class="workload-legend">
        <div class="legend-item"><span class="legend-dot low"></span><div><strong>${t("levelLow")} (0–34%)</strong><small>${t("underCapacity")}</small></div></div>
        <div class="legend-item"><span class="legend-dot medium"></span><div><strong>${t("levelMedium")} (35–59%)</strong><small>${t("balanced")}</small></div></div>
        <div class="legend-item"><span class="legend-dot high"></span><div><strong>${t("levelHigh")} (60–79%)</strong><small>${t("busy")}</small></div></div>
        <div class="legend-item"><span class="legend-dot overload"></span><div><strong>${t("levelOverload")} (80%+)</strong><small>${t("needsRedistribution")}</small></div></div>
      </div>
    </div>

    <div class="card" style="margin-bottom:16px">
      <div class="card-title"><i class="fa-solid fa-scale-balanced"></i> ${t("workloadDistribution")}</div>
      ${workloads.length ? workloads.map(w => renderWorkloadRow(w)).join("") : `<p style="color:var(--text-muted)">${t("noNurses")}</p>`}
    </div>

    <div class="grid-2">
      <div class="card">
        <div class="card-title"><i class="fa-solid fa-people-group"></i> ${t("nurses")}</div>
        <div class="table-wrap">
          <table class="data-table">
            <thead><tr>
              <th>${t("nurses")}</th>
              <th>${t("capability")}</th>
              <th>${t("patients")}</th>
              <th>${t("minutes") || "Minutes"}</th>
              <th>%</th>
              <th>${t("level") || "Level"}</th>
            </tr></thead>
            <tbody>
              ${workloads.map(w => `
                <tr>
                  <td class="cell-strong">${esc(w.nurse.name)}<div class="cell-sub">${esc(w.nurse.qualification)} · ${w.nurse.experience}y</div></td>
                  <td><span class="badge purple">${w.capability}</span></td>
                  <td>${w.assignedPatients.length}</td>
                  <td><strong>${w.totalMinutes}</strong></td>
                  <td><strong>${w.utilization}%</strong></td>
                  <td><span class="badge ${workloadLevelBadgeClass(w.level)}">${t(w.level)}</span></td>
                </tr>
              `).join("")}
            </tbody>
          </table>
        </div>
      </div>

      <div class="card">
        <div class="card-title"><i class="fa-solid fa-users-between-lines"></i> ${t("patients")}</div>
        <div class="table-wrap">
          <table class="data-table">
            <thead><tr>
              <th>${t("patients")}</th>
              <th>${t("acuity")}</th>
              <th>${t("assignedNurse")}</th>
              <th>${t("minutes") || "Minutes"}</th>
            </tr></thead>
            <tbody>
              ${DB.data.patients.map(p => {
                const w = computePatientWorkload(p);
                const nurse = p.assignedNurseId ? getNurseById(p.assignedNurseId) : null;
                return `
                  <tr>
                    <td class="cell-strong">${esc(p.code)}<div class="cell-sub">${esc(p.name)}</div></td>
                    <td><span class="meter"><span class="dot level-${p.acuity}"></span>L${p.acuity}</span></td>
                    <td>${nurse ? esc(nurse.name) : "—"}</td>
                    <td><strong>${w.minutes}</strong></td>
                  </tr>
                `;
              }).join("")}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;

  $("#wlExplainBtn").onclick = () => showWorkloadExplanation(weights, shiftMinutes);
}

function renderWorkloadRow(w) {
  const tooltip = `${w.nurse.name}\nCapability: ${w.capability}\nPatients: ${w.assignedPatients.length}\nRequired minutes: ${w.totalMinutes}\nAvailable: ${w.availableMinutes}\nUtilization: ${w.utilization}% → ${w.level}`;
  return `
    <div class="workload-row" title="${esc(tooltip)}">
      <div class="workload-name">
        ${esc(w.nurse.name)}
        <div style="font-size:10.5px;color:var(--text-muted);font-weight:400">${w.assignedPatients.length} ${t("patients")} · Cap: ${w.capability}</div>
      </div>
      <div class="workload-bar-wrap">
        <div class="workload-bar ${w.level}" style="width:${Math.min(100, w.utilization)}%"></div>
      </div>
      <div class="workload-score">
        <span class="score-value">${w.totalMinutes}m</span>
        <span class="score-pct">(${w.utilization}%)</span>
      </div>
    </div>
  `;
}

function showWorkloadExplanation(weights, shiftMinutes) {
  Modal.open({
    title: t("howCalculated"),
    wide: true,
    body: `
      <div style="font-size:13px;line-height:1.8;color:var(--text-soft)">
        <p style="margin-bottom:12px"><strong>${t("formula") || "Formula"}:</strong></p>
        <pre style="background:var(--gray-bg);padding:14px;border-radius:8px;font-size:12px;overflow-x:auto;color:var(--navy)">Patient Workload (minutes) =
  Σ (Task Duration × Task Frequency)

Nurse Workload (minutes) =
  Σ Patient Workload for assigned patients

Available Nursing Minutes =
  Shift Minutes (${shiftMinutes}) − Break (30)

Utilization % =
  (Nurse Workload / Available Minutes) × 100</pre>
        <p style="margin:12px 0"><strong>${t("example") || "Example"}:</strong></p>
        <p style="font-size:12.5px">Patient needs:
        <br>• Vital Signs: 8 min × 4 = 32
        <br>• Medication: 10 min × 3 = 30
        <br>• Repositioning: 5 min × 6 = 30
        <br><strong>Total = 92 minutes</strong></p>
        <div style="background:#fffbea;padding:12px;border-radius:8px;color:#78350f;margin-top:12px">
          <i class="fa-solid fa-triangle-exclamation"></i>
          ${t("workloadDisclaimer")}
        </div>
      </div>
    `,
    footer: `<button class="btn btn-primary" onclick="Modal.close()">${t("close")}</button>`
  });
}