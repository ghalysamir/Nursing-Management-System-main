/* ============================================================
   escalation.js — Escalation Management
   ============================================================ */
"use strict";

const ESCALATION_STATUSES = ["Open", "Acknowledged", "Under Review", "Resolved", "Closed"];

function renderEscalationPage(container) {
  const sess = Session.get();
  const isSupervisor = sess.role === "headnurse" || sess.role === "admin";

  container.innerHTML = `
    <div class="page-header">
      <div>
        <h1>${t("escalation")}</h1>
        <p>${t("escalationDesc")}</p>
      </div>
      <div class="page-actions">
        <button class="btn btn-primary" id="addEscalationBtn"><i class="fa-solid fa-plus"></i> ${t("newEscalation")}</button>
      </div>
    </div>

    <div class="stats-grid">
      ${statCard(t("openEscalations"), DB.data.escalations.filter(e => e.status === "Open").length, "red", "fa-triangle-exclamation")}
      ${statCard(t("acknowledged"), DB.data.escalations.filter(e => e.status === "Acknowledged").length, "amber", "fa-eye")}
      ${statCard(t("underReview"), DB.data.escalations.filter(e => e.status === "Under Review").length, "blue", "fa-magnifying-glass")}
      ${statCard(t("resolved"), DB.data.escalations.filter(e => e.status === "Resolved" || e.status === "Closed").length, "green", "fa-check-circle")}
    </div>

    <div class="card">
      <div id="escalationsList"></div>
    </div>
  `;

  function renderList() {
    const list = $("#escalationsList");
    if (!DB.data.escalations.length) {
      list.innerHTML = `<div class="empty-state"><i class="fa-solid fa-triangle-exclamation"></i><h4>${t("noData")}</h4></div>`;
      return;
    }

    list.innerHTML = `
      <div class="table-wrap"><table class="data-table">
        <thead><tr>
          <th>${t("escalation")}</th>
          <th>${t("patients")}</th>
          <th>${t("priority")}</th>
          <th>${t("status")}</th>
          <th>${t("createdAt")}</th>
          <th></th>
        </tr></thead>
        <tbody>
          ${DB.data.escalations.map(e => {
            const p = e.patientId ? getPatientById(e.patientId) : null;
            const statusCls = e.status.toLowerCase().replace(" ", "");
            return `
              <tr>
                <td class="cell-strong">${esc(e.reason)}<div class="cell-sub">${esc(e.description || "")}</div></td>
                <td>${p ? `${esc(p.code)}<div class="cell-sub">${esc(p.name)}</div>` : "—"}</td>
                <td><span class="badge ${e.priority.toLowerCase()}">${t(e.priority.toLowerCase())}</span></td>
                <td><span class="badge ${statusCls}">${t(e.status.toLowerCase().replace(" ", ""))}</span></td>
                <td class="cell-sub">${fmtDateTime(e.createdAt)}</td>
                <td>
                  <div class="table-actions">
                    <button class="btn btn-sm btn-outline" data-view="${e.id}"><i class="fa-solid fa-eye"></i></button>
                    ${isSupervisor ? `<button class="btn btn-sm btn-outline" data-manage="${e.id}"><i class="fa-solid fa-cog"></i></button>` : ""}
                  </div>
                </td>
              </tr>
            `;
          }).join("")}
        </tbody>
      </table></div>
    `;

    $$("[data-view]", list).forEach(b => b.onclick = () => viewEscalation(b.dataset.view));
    $$("[data-manage]", list).forEach(b => b.onclick = () => manageEscalation(b.dataset.manage));
  }

  $("#addEscalationBtn").onclick = () => openEscalationForm();
  renderList();
}

function openEscalationForm() {
  const patients = DB.data.patients;
  const tasks = DB.data.tasks;

  Modal.open({
    title: t("newEscalation"),
    wide: true,
    body: `
      <form id="escForm" class="form-grid">
        <div class="full">
          <label><small>${t("reason")} *</small></label>
          <input type="text" id="efReason" placeholder="${t("escalationReasonPlaceholder")}" required />
        </div>
        <div>
          <label><small>${t("patients")}</small></label>
          <select id="efPatient">
            <option value="">—</option>
            ${patients.map(p => `<option value="${p.id}">${esc(p.code)} – ${esc(p.name)}</option>`).join("")}
          </select>
        </div>
        <div>
          <label><small>${t("tasks")}</small></label>
          <select id="efTask">
            <option value="">—</option>
            ${tasks.map(tk => `<option value="${tk.id}">${esc(tk.name)}</option>`).join("")}
          </select>
        </div>
        <div>
          <label><small>${t("priority")}</small></label>
          <select id="efPriority">
            <option>Critical</option><option selected>High</option><option>Medium</option><option>Low</option>
          </select>
        </div>
        <div class="full">
          <label><small>${t("description")}</small></label>
          <textarea id="efDesc"></textarea>
        </div>
      </form>
    `,
    footer: `
      <button class="btn btn-outline" id="efCancel">${t("cancel")}</button>
      <button class="btn btn-primary" id="efSave">${t("save")}</button>
    `,
    onMount() {
      $("#efCancel").onclick = () => Modal.close();
      $("#efSave").onclick = () => {
        const reason = $("#efReason").value.trim();
        if (!reason) { toast(t("required"), "error"); return; }
        const sess = Session.get();
        DB.data.escalations.unshift({
          id: uid("esc"),
          reason,
          patientId: $("#efPatient").value || null,
          taskId: $("#efTask").value || null,
          priority: $("#efPriority").value,
          description: $("#efDesc").value.trim(),
          status: "Open",
          createdBy: sess.name,
          createdAt: nowISO(),
          acknowledgedBy: null,
          acknowledgedAt: null,
          resolutionNotes: null,
          resolvedAt: null
        });
        DB.save();
        audit("Escalation created", reason);
        toast(t("dataSaved"), "success");
        Modal.close();
        Router.refresh();
      };
    }
  });
}

function viewEscalation(id) {
  const e = DB.data.escalations.find(x => x.id === id);
  if (!e) return;
  const p = e.patientId ? getPatientById(e.patientId) : null;
  Modal.open({
    title: e.reason,
    wide: true,
    body: `
      <div style="font-size:13px;line-height:1.9">
        <div><strong>${t("status")}:</strong> <span class="badge ${e.status.toLowerCase().replace(" ", "")}">${t(e.status.toLowerCase().replace(" ", ""))}</span></div>
        <div><strong>${t("priority")}:</strong> <span class="badge ${e.priority.toLowerCase()}">${t(e.priority.toLowerCase())}</span></div>
        <div><strong>${t("patients")}:</strong> ${p ? `${esc(p.code)} – ${esc(p.name)}` : "—"}</div>
        <div><strong>${t("createdAt")}:</strong> ${fmtDateTime(e.createdAt)} · ${esc(e.createdBy)}</div>
        ${e.description ? `<div><strong>${t("description")}:</strong> ${esc(e.description)}</div>` : ""}
        ${e.acknowledgedBy ? `<div><strong>${t("acknowledgedBy")}:</strong> ${esc(e.acknowledgedBy)} · ${fmtDateTime(e.acknowledgedAt)}</div>` : ""}
        ${e.resolutionNotes ? `<div><strong>${t("resolutionNotes")}:</strong> ${esc(e.resolutionNotes)}</div>` : ""}
      </div>
    `,
    footer: `<button class="btn btn-outline" onclick="Modal.close()">${t("close")}</button>`
  });
}

function manageEscalation(id) {
  const e = DB.data.escalations.find(x => x.id === id);
  if (!e) return;
  Modal.open({
    title: t("manage") + " – " + e.reason,
    body: `
      <form id="escManageForm">
        <div class="form-group">
          <label><small>${t("status")}</small></label>
          <select id="emStatus">
            ${ESCALATION_STATUSES.map(s => `<option ${e.status === s ? "selected" : ""}>${s}</option>`).join("")}
          </select>
        </div>
        <div class="form-group">
          <label><small>${t("resolutionNotes")}</small></label>
          <textarea id="emNotes">${esc(e.resolutionNotes || "")}</textarea>
        </div>
      </form>
    `,
    footer: `
      <button class="btn btn-outline" id="emCancel">${t("cancel")}</button>
      <button class="btn btn-primary" id="emSave">${t("save")}</button>
    `,
    onMount() {
      $("#emCancel").onclick = () => Modal.close();
      $("#emSave").onclick = () => {
        const sess = Session.get();
        const newStatus = $("#emStatus").value;
        if (e.status === "Open" && newStatus !== "Open") {
          e.acknowledgedBy = sess.name;
          e.acknowledgedAt = nowISO();
        }
        if (newStatus === "Resolved" || newStatus === "Closed") {
          e.resolvedAt = nowISO();
        }
        e.status = newStatus;
        e.resolutionNotes = $("#emNotes").value.trim();
        DB.save();
        audit("Escalation updated", `${e.reason} → ${newStatus}`);
        toast(t("dataSaved"), "success");
        Modal.close();
        Router.refresh();
      };
    }
  });
}