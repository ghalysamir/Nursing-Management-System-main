/* ============================================================
   incidents.js — Incident Reporting
   ============================================================ */
"use strict";

const INCIDENT_STATUSES = ["Reported", "Under Review", "Action Required", "Resolved", "Closed"];
const INCIDENT_CATEGORIES = ["Patient Fall", "Medication Incident", "Missed Nursing Care", "Documentation Error", "Equipment Problem", "Communication Issue", "Patient Safety Concern"];
const SEVERITIES = ["Low", "Moderate", "High", "Critical"];

function renderIncidentsPage(container) {
  const sess = Session.get();

  container.innerHTML = `
    <div class="page-header">
      <div>
        <h1>${t("incidents")}</h1>
        <p>${t("incidentsDesc")}</p>
      </div>
      <div class="page-actions">
        <button class="btn btn-primary" id="addIncidentBtn"><i class="fa-solid fa-plus"></i> ${t("reportIncident")}</button>
      </div>
    </div>

    <div class="stats-grid">
      ${statCard(t("reported"), (DB.data.incidents || []).filter(i => i.status === "Reported").length, "red", "fa-triangle-exclamation")}
      ${statCard(t("underReview"), (DB.data.incidents || []).filter(i => i.status === "Under Review").length, "amber", "fa-eye")}
      ${statCard(t("actionRequired"), (DB.data.incidents || []).filter(i => i.status === "Action Required").length, "high", "fa-wrench")}
      ${statCard(t("resolved"), (DB.data.incidents || []).filter(i => i.status === "Resolved" || i.status === "Closed").length, "green", "fa-check-circle")}
    </div>

    <div class="card">
      <div class="card-title"><i class="fa-solid fa-shield-halved"></i> ${t("incidentReports")}</div>
      <div id="incidentsList"></div>
    </div>
  `;

  function renderList() {
    const list = $("#incidentsList");
    const incidents = [...(DB.data.incidents || [])].sort((a, b) => new Date(b.reportedAt) - new Date(a.reportedAt));
    if (!incidents.length) {
      list.innerHTML = `<div class="empty-state"><i class="fa-solid fa-shield-halved"></i><h4>${t("noData")}</h4></div>`;
      return;
    }

    list.innerHTML = `
      <div class="table-wrap"><table class="data-table">
        <thead><tr>
          <th>${t("category")}</th>
          <th>${t("severity")}</th>
          <th>${t("status")}</th>
          <th>${t("reportedBy")}</th>
          <th>${t("date")}</th>
          <th></th>
        </tr></thead>
        <tbody>
          ${incidents.map(i => {
            const statusCls = i.status.toLowerCase().replace(/ /g, "");
            return `
              <tr>
                <td class="cell-strong">${esc(i.category)}<div class="cell-sub">${esc(i.description?.substring(0, 60) || "")}...</div></td>
                <td><span class="badge ${i.severity.toLowerCase()}">${i.severity}</span></td>
                <td><span class="badge ${statusCls}">${i.status}</span></td>
                <td>${esc(i.reportedBy)}</td>
                <td class="cell-sub">${fmtDateTime(i.reportedAt)}</td>
                <td>
                  <button class="btn btn-sm btn-outline" data-view="${i.id}"><i class="fa-solid fa-eye"></i></button>
                </td>
              </tr>
            `;
          }).join("")}
        </tbody>
      </table></div>
    `;

    $$("[data-view]", list).forEach(b => b.onclick = () => viewIncident(b.dataset.view));
  }

  $("#addIncidentBtn").onclick = () => openIncidentForm();
  renderList();
}

function openIncidentForm() {
  const sess = Session.get();
  const patients = DB.data.patients;

  Modal.open({
    title: t("reportIncident"),
    wide: true,
    body: `
      <form id="incForm" class="form-grid">
        <div>
          <label><small>${t("category")} *</small></label>
          <select id="inCategory">
            ${INCIDENT_CATEGORIES.map(c => `<option>${c}</option>`).join("")}
          </select>
        </div>
        <div>
          <label><small>${t("severity")}</small></label>
          <select id="inSeverity">
            ${SEVERITIES.map(s => `<option>${s}</option>`).join("")}
          </select>
        </div>
        <div>
          <label><small>${t("patients")}</small></label>
          <select id="inPatient">
            <option value="">—</option>
            ${patients.map(p => `<option value="${p.id}">${esc(p.code)} – ${esc(p.name)}</option>`).join("")}
          </select>
        </div>
        <div>
          <label><small>${t("department")}</small></label>
          <select id="inDept">
            ${DB.data.departments.map(d => `<option value="${d.id}">${esc(d.name)}</option>`).join("")}
          </select>
        </div>
        <div class="full">
          <label><small>${t("description")} *</small></label>
          <textarea id="inDesc" required style="min-height:100px"></textarea>
        </div>
        <div class="full">
          <label><small>${t("immediateAction")}</small></label>
          <input type="text" id="inAction" />
        </div>
      </form>
    `,
    footer: `
      <button class="btn btn-outline" id="inCancel">${t("cancel")}</button>
      <button class="btn btn-primary" id="inSave">${t("save")}</button>
    `,
    onMount() {
      $("#inCancel").onclick = () => Modal.close();
      $("#inSave").onclick = () => {
        const desc = $("#inDesc").value.trim();
        if (!desc) { toast(t("required"), "error"); return; }
        if (!DB.data.incidents) DB.data.incidents = [];
        DB.data.incidents.unshift({
          id: uid("inc"),
          category: $("#inCategory").value,
          severity: $("#inSeverity").value,
          patientId: $("#inPatient").value || null,
          departmentId: $("#inDept").value,
          description: desc,
          immediateAction: $("#inAction").value.trim(),
          status: "Reported",
          reportedBy: sess.name,
          reportedAt: nowISO(),
          reviewedBy: null,
          reviewedAt: null,
          resolutionNotes: null
        });
        DB.save();
        audit("Incident reported", `${$("#inCategory").value} — ${$("#inSeverity").value}`);
        toast(t("dataSaved"), "success");
        Modal.close();
        Router.refresh();
      };
    }
  });
}

function viewIncident(id) {
  const i = (DB.data.incidents || []).find(x => x.id === id);
  if (!i) return;
  const p = i.patientId ? getPatientById(i.patientId) : null;
  const canManage = Session.get().role !== "nurse";

  Modal.open({
    title: i.category,
    wide: true,
    body: `
      <div style="font-size:13px;line-height:1.9">
        <div><strong>${t("severity")}:</strong> <span class="badge ${i.severity.toLowerCase()}">${i.severity}</span></div>
        <div><strong>${t("status")}:</strong> <span class="badge ${i.status.toLowerCase().replace(/ /g, "")}">${i.status}</span></div>
        ${p ? `<div><strong>${t("patients")}:</strong> ${esc(p.code)} – ${esc(p.name)}</div>` : ""}
        <div><strong>${t("reportedBy")}:</strong> ${esc(i.reportedBy)} · ${fmtDateTime(i.reportedAt)}</div>
        <div><strong>${t("description")}:</strong> ${esc(i.description)}</div>
        ${i.immediateAction ? `<div><strong>${t("immediateAction")}:</strong> ${esc(i.immediateAction)}</div>` : ""}
        ${canManage && i.status !== "Closed" ? `
          <div class="form-group" style="margin-top:14px">
            <label><small>${t("status")}</small></label>
            <select id="incNewStatus">${INCIDENT_STATUSES.map(s => `<option ${i.status === s ? "selected" : ""}>${s}</option>`).join("")}</select>
          </div>
          <div class="form-group">
            <label><small>${t("resolutionNotes")}</small></label>
            <textarea id="incNotes">${esc(i.resolutionNotes || "")}</textarea>
          </div>
        ` : (i.resolutionNotes ? `<div><strong>${t("resolutionNotes")}:</strong> ${esc(i.resolutionNotes)}</div>` : "")}
      </div>
    `,
    footer: canManage && i.status !== "Closed"
      ? `<button class="btn btn-outline" onclick="Modal.close()">${t("close")}</button>
         <button class="btn btn-primary" id="incSaveBtn">${t("update")}</button>`
      : `<button class="btn btn-outline" onclick="Modal.close()">${t("close")}</button>`,
    onMount() {
      const saveBtn = $("#incSaveBtn");
      if (saveBtn) saveBtn.onclick = () => {
        const sess = Session.get();
        i.status = $("#incNewStatus").value;
        i.resolutionNotes = $("#incNotes").value.trim();
        if (!i.reviewedBy) { i.reviewedBy = sess.name; i.reviewedAt = nowISO(); }
        DB.save();
        audit("Incident updated", `${i.category} → ${i.status}`);
        toast(t("dataSaved"), "success");
        Modal.close();
        Router.refresh();
      };
    }
  });
}