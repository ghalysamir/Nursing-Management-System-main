/* ============================================================
   medication.js — Medication Administration Record (MAR)
   ------------------------------------------------------------
   Demo only — does NOT prescribe or calculate doses.
   ============================================================ */
"use strict";

const MAR_STATUSES = ["Scheduled", "Administered", "Not Administered", "Delayed", "Held", "Cancelled"];

function renderMedicationPage(container) {
  const sess = Session.get();
  const isNurse = sess.role === "nurse";

  container.innerHTML = `
    <div class="page-header">
      <div>
        <h1>${t("medication")}</h1>
        <p>${t("medicationDesc")}</p>
      </div>
      <div class="page-actions">
        ${sess.role !== "nurse" ? `<button class="btn btn-primary" id="addMedBtn"><i class="fa-solid fa-plus"></i> ${t("addMedication")}</button>` : ""}
      </div>
    </div>

    <div class="card" style="background:#fef2f2;border-color:#fecaca;margin-bottom:16px">
      <div style="display:flex;gap:10px;align-items:flex-start">
        <i class="fa-solid fa-triangle-exclamation" style="color:var(--red);font-size:18px;margin-top:2px"></i>
        <div style="font-size:12.5px;color:#7f1d1d;line-height:1.6">
          <strong>${t("important")}:</strong> ${t("medicationDisclaimer")}
        </div>
      </div>
    </div>

    <div class="filter-bar">
      <select id="marStatusFilter">
        <option value="">${t("allStatuses")}</option>
        ${MAR_STATUSES.map(s => `<option value="${s}">${s}</option>`).join("")}
      </select>
    </div>

    <div class="card">
      <div class="card-title"><i class="fa-solid fa-pills"></i> ${t("medicationRecords")}</div>
      <div id="marList"></div>
    </div>
  `;

  function renderList() {
    const staFilter = $("#marStatusFilter").value;
    let records = DB.data.medications || [];
    if (isNurse) {
      const myPts = DB.data.patients.filter(p => p.assignedNurseId === sess.nurseId).map(p => p.id);
      records = records.filter(m => myPts.includes(m.patientId));
    }
    if (staFilter) records = records.filter(m => m.status === staFilter);

    const list = $("#marList");
    if (!records.length) {
      list.innerHTML = `<div class="empty-state"><i class="fa-solid fa-pills"></i><h4>${t("noData")}</h4></div>`;
      return;
    }

    list.innerHTML = `
      <div class="table-wrap"><table class="data-table">
        <thead><tr>
          <th>${t("medicationName")}</th>
          <th>${t("patients")}</th>
          <th>${t("scheduledTime")}</th>
          <th>${t("nurses")}</th>
          <th>${t("status")}</th>
          <th></th>
        </tr></thead>
        <tbody>
          ${records.map(m => {
            const p = getPatientById(m.patientId);
            const n = m.assignedNurseId ? getNurseById(m.assignedNurseId) : null;
            const statusCls = m.status.toLowerCase().replace(/ /g, "");
            return `
              <tr>
                <td class="cell-strong">${esc(m.name)}<div class="cell-sub">${esc(m.dose || "")}</div></td>
                <td>${esc(p?.code || "")}<div class="cell-sub">${esc(p?.name || "")}</div></td>
                <td>${esc(m.scheduledTime || "—")}</td>
                <td>${n ? esc(n.name) : "—"}</td>
                <td><span class="badge ${statusCls}">${t(m.status.toLowerCase().replace(/ /g, "")) || m.status}</span></td>
                <td>
                  ${isNurse && m.status === "Scheduled"
                    ? `<button class="btn btn-sm btn-teal" data-admin="${m.id}">${t("administer")}</button>`
                    : `<button class="btn btn-sm btn-outline" data-view="${m.id}"><i class="fa-solid fa-eye"></i></button>`}
                </td>
              </tr>
            `;
          }).join("")}
        </tbody>
      </table></div>
    `;

    $$("[data-admin]", list).forEach(b => b.onclick = () => openAdministerModal(b.dataset.admin));
    $$("[data-view]", list).forEach(b => b.onclick = () => viewMedication(b.dataset.view));
  }

  $("#marStatusFilter").addEventListener("change", renderList);

  const addBtn = $("#addMedBtn");
  if (addBtn) addBtn.onclick = () => openMedicationForm();

  renderList();
}

function openMedicationForm() {
  const patients = DB.data.patients.filter(p => p.assignedNurseId);
  if (!patients.length) { toast(t("assignPatientsFirst"), "warning"); return; }

  Modal.open({
    title: t("addMedication"),
    wide: true,
    body: `
      <form id="marForm" class="form-grid">
        <div class="full">
          <label><small>${t("patients")} *</small></label>
          <select id="mfPatient">
            ${patients.map(p => `<option value="${p.id}">${esc(p.code)} – ${esc(p.name)}</option>`).join("")}
          </select>
        </div>
        <div>
          <label><small>${t("medicationName")} *</small></label>
          <input type="text" id="mfName" required />
        </div>
        <div>
          <label><small>${t("dose")}</small></label>
          <input type="text" id="mfDose" placeholder="e.g., 500 mg" />
        </div>
        <div>
          <label><small>${t("scheduledTime")}</small></label>
          <input type="time" id="mfTime" />
        </div>
        <div>
          <label><small>${t("route")}</small></label>
          <select id="mfRoute">
            <option>Oral</option><option>IV</option><option>IM</option><option>SC</option><option>Topical</option><option>Inhalation</option>
          </select>
        </div>
        <div class="full">
          <label><small>${t("notes")}</small></label>
          <textarea id="mfNotes"></textarea>
        </div>
      </form>
    `,
    footer: `
      <button class="btn btn-outline" id="mfCancel">${t("cancel")}</button>
      <button class="btn btn-primary" id="mfSave">${t("save")}</button>
    `,
    onMount() {
      $("#mfCancel").onclick = () => Modal.close();
      $("#mfSave").onclick = () => {
        const name = $("#mfName").value.trim();
        if (!name) { toast(t("required"), "error"); return; }
        const patient = getPatientById($("#mfPatient").value);
        if (!DB.data.medications) DB.data.medications = [];
        DB.data.medications.unshift({
          id: uid("med"),
          patientId: patient.id,
          assignedNurseId: patient.assignedNurseId,
          name,
          dose: $("#mfDose").value.trim(),
          route: $("#mfRoute").value,
          scheduledTime: $("#mfTime").value,
          notes: $("#mfNotes").value.trim(),
          status: "Scheduled",
          administeredAt: null,
          administeredBy: null,
          createdAt: nowISO()
        });
        DB.save();
        audit("Medication added", `${name} for ${patient.code}`);
        toast(t("dataSaved"), "success");
        Modal.close();
        Router.refresh();
      };
    }
  });
}

function openAdministerModal(medId) {
  const med = (DB.data.medications || []).find(m => m.id === medId);
  if (!med) return;
  const sess = Session.get();

  Modal.open({
    title: t("administer") + " – " + med.name,
    body: `
      <form id="admForm">
        <div class="form-group">
          <label><small>${t("status")} *</small></label>
          <select id="admStatus">
            <option value="Administered">${t("administered")}</option>
            <option value="Not Administered">${t("notAdministered")}</option>
            <option value="Delayed">${t("delayed")}</option>
            <option value="Held">${t("held")}</option>
          </select>
        </div>
        <div class="form-group">
          <label><small>${t("notes")}</small></label>
          <textarea id="admNotes"></textarea>
        </div>
      </form>
    `,
    footer: `
      <button class="btn btn-outline" id="admCancel">${t("cancel")}</button>
      <button class="btn btn-primary" id="admSave">${t("save")}</button>
    `,
    onMount() {
      $("#admCancel").onclick = () => Modal.close();
      $("#admSave").onclick = () => {
        med.status = $("#admStatus").value;
        med.notes = (med.notes || "") + "\n" + $("#admNotes").value.trim();
        if (med.status === "Administered") {
          med.administeredAt = nowISO();
          med.administeredBy = sess.name;
        }
        DB.save();
        audit("Medication status", `${med.name} → ${med.status}`);
        toast(t("dataSaved"), "success");
        Modal.close();
        Router.refresh();
      };
    }
  });
}

function viewMedication(medId) {
  const med = (DB.data.medications || []).find(m => m.id === medId);
  if (!med) return;
  const p = getPatientById(med.patientId);
  Modal.open({
    title: med.name,
    body: `
      <div style="font-size:13px;line-height:1.9">
        <div><strong>${t("patients")}:</strong> ${esc(p?.code || "")} – ${esc(p?.name || "")}</div>
        <div><strong>${t("dose")}:</strong> ${esc(med.dose || "—")}</div>
        <div><strong>${t("route")}:</strong> ${esc(med.route)}</div>
        <div><strong>${t("scheduledTime")}:</strong> ${esc(med.scheduledTime || "—")}</div>
        <div><strong>${t("status")}:</strong> <span class="badge ${med.status.toLowerCase().replace(/ /g, "")}">${med.status}</span></div>
        ${med.administeredAt ? `<div><strong>${t("administeredAt")}:</strong> ${fmtDateTime(med.administeredAt)} · ${esc(med.administeredBy)}</div>` : ""}
        ${med.notes ? `<div><strong>${t("notes")}:</strong> ${esc(med.notes)}</div>` : ""}
      </div>
    `,
    footer: `<button class="btn btn-outline" onclick="Modal.close()">${t("close")}</button>`
  });
}