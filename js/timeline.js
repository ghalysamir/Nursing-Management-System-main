/* ============================================================
   timeline.js — Patient Timeline
   ============================================================ */
"use strict";

function renderTimelinePage(container) {
  container.innerHTML = `
    <div class="page-header">
      <div>
        <h1>${t("timeline")}</h1>
        <p>${t("timelineDesc")}</p>
      </div>
    </div>

    <div class="filter-bar">
      <select id="timelinePatient">
        <option value="">${t("allPatients")}</option>
        ${DB.data.patients.map(p => `<option value="${p.id}">${esc(p.code)} – ${esc(p.name)}</option>`).join("")}
      </select>
    </div>

    <div class="card">
      <div id="timelineContainer"></div>
    </div>
  `;

  function renderTimeline() {
    const pid = $("#timelinePatient").value;
    let events = [];

    // Collect events from all sources
    DB.data.patients.forEach(p => {
      if (pid && p.id !== pid) return;
      events.push({
        type: "Patient Added",
        icon: "fa-bed-pulse",
        color: "blue",
        at: p.createdAt || nowISO(),
        patientId: p.id,
        description: `${p.code} – ${p.name} (${p.diagnosis})`
      });
    });

    DB.data.tasks.forEach(tk => {
      if (pid && tk.patientId !== pid) return;
      const p = getPatientById(tk.patientId);
      events.push({
        type: "Task Created",
        icon: "fa-plus-circle",
        color: "purple",
        at: tk.createdAt || nowISO(),
        patientId: tk.patientId,
        description: `${tk.name} (${p?.code || ""}) — ${tk.priority}`
      });
      if (tk.completedAt) {
        events.push({
          type: "Task Completed",
          icon: "fa-check-circle",
          color: "green",
          at: tk.completedAt,
          patientId: tk.patientId,
          description: `${tk.name} by ${tk.completedBy || ""}`
        });
      }
    });

    DB.data.documentation.forEach(d => {
      if (pid && d.patientId !== pid) return;
      const p = getPatientById(d.patientId);
      events.push({
        type: "Documentation",
        icon: "fa-file-medical",
        color: "teal",
        at: d.at,
        patientId: d.patientId,
        description: `${d.type} — ${d.note.substring(0, 60)}...`
      });
    });

    DB.data.escalations.forEach(e => {
      if (pid && e.patientId !== pid) return;
      events.push({
        type: "Escalation",
        icon: "fa-triangle-exclamation",
        color: "red",
        at: e.createdAt,
        patientId: e.patientId,
        description: `${e.reason} (${e.status})`
      });
    });

    events.sort((a, b) => new Date(b.at) - new Date(a.at));

    const tc = $("#timelineContainer");
    if (!events.length) {
      tc.innerHTML = `<div class="empty-state"><i class="fa-solid fa-timeline"></i><h4>${t("noData")}</h4></div>`;
      return;
    }

    tc.innerHTML = `<div class="timeline">${events.map(e => `
      <div class="timeline-item">
        <div class="timeline-icon ${e.color}"><i class="fa-solid ${e.icon}"></i></div>
        <div class="timeline-content">
          <strong>${esc(e.type)}</strong>
          <p>${esc(e.description)}</p>
          <small>${fmtDateTime(e.at)}</small>
        </div>
      </div>
    `).join("")}</div>`;
  }

  $("#timelinePatient").addEventListener("change", renderTimeline);
  renderTimeline();
}