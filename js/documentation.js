/* ============================================================
   documentation.js — Nursing Documentation
   ============================================================ */
"use strict";

function renderDocumentationPage(container) {
  const sess = Session.get();
  const isNurse = sess.role === "nurse";
  const relevantDocs = isNurse
    ? DB.data.documentation.filter(d => d.nurseId === sess.nurseId)
    : DB.data.documentation;

  container.innerHTML = `
    <div class="page-header">
      <div>
        <h1>${t("documentation")}</h1>
        <p>${t("documentationDesc")}</p>
      </div>
      <div class="page-actions">
        ${(isNurse || sess.role === "headnurse") ? `<button class="btn btn-primary" id="addDocBtn"><i class="fa-solid fa-plus"></i> ${t("addNote")}</button>` : ""}
      </div>
    </div>

    <div class="filter-bar">
      <input type="text" id="docSearch" class="search-input" placeholder="${t("search")}" />
      <select id="docPatientFilter">
        <option value="">${t("allPatients")}</option>
        ${DB.data.patients.map(p => `<option value="${p.id}">${esc(p.code)} – ${esc(p.name)}</option>`).join("")}
      </select>
    </div>

    <div class="card">
      <div class="card-title"><i class="fa-solid fa-file-medical"></i> ${t("recentDocumentation")} (${relevantDocs.length})</div>
      <div id="docsList"></div>
    </div>
  `;

  function renderList() {
    const q = $("#docSearch").value.trim().toLowerCase();
    const pid = $("#docPatientFilter").value;
    const filtered = relevantDocs.filter(d => {
      if (pid && d.patientId !== pid) return false;
      if (q) {
        const blob = `${d.note} ${d.type} ${d.nurseName}`.toLowerCase();
        if (!blob.includes(q)) return false;
      }
      return true;
    });

    const list = $("#docsList");
    if (!filtered.length) {
      list.innerHTML = `<div class="empty-state"><i class="fa-solid fa-file-medical"></i><h4>${t("noData")}</h4><p>${t("addNote")}</p></div>`;
      return;
    }

    list.innerHTML = filtered.map(d => {
      const p = getPatientById(d.patientId);
      const tk = d.taskId ? DB.data.tasks.find(x => x.id === d.taskId) : null;
      return `
        <div class="doc-entry">
          <strong>${esc(p ? `${p.code} – ${p.name}` : "Unknown patient")} ${tk ? ` · ${esc(tk.name)}` : ""}</strong>
          <div>${esc(d.note)}</div>
          <small><i class="fa-solid fa-user"></i> ${esc(d.nurseName)} · ${fmtDateTime(d.at)} · ${esc(d.type)}</small>
        </div>
      `;
    }).join("");
  }

  $("#docSearch").addEventListener("input", renderList);
  $("#docPatientFilter").addEventListener("change", renderList);

  const addBtn = $("#addDocBtn");
  if (addBtn) addBtn.onclick = () => openDocForm();
  renderList();
}

function openDocForm() {
  const sess = Session.get();
  const myPatients = sess.role === "nurse"
    ? DB.data.patients.filter(p => p.assignedNurseId === sess.nurseId)
    : DB.data.patients;
  if (!myPatients.length) { toast(t("assignPatientsFirst"), "warning"); return; }

  Modal.open({
    title: t("addNote"),
    body: `
      <form id="docForm">
        <div class="form-group">
          <label><small>${t("patients")}</small></label>
          <select id="docPatient">${myPatients.map(p => `<option value="${p.id}">${esc(p.code)} – ${esc(p.name)}</option>`).join("")}</select>
        </div>
        <div class="form-group">
          <label><small>${t("type")}</small></label>
          <select id="docType">
            <option>Observation</option>
            <option>Task Execution</option>
            <option>Patient Complaint</option>
            <option>Handover</option>
          </select>
        </div>
        <div class="form-group">
          <label><small>${t("note")}</small></label>
          <textarea id="docNote" placeholder="${t("notePlaceholder")}" style="min-height:100px"></textarea>
        </div>
      </form>
    `,
    footer: `
      <button class="btn btn-outline" id="docCancel">${t("cancel")}</button>
      <button class="btn btn-primary" id="docSave">${t("save")}</button>
    `,
    onMount() {
      $("#docCancel").onclick = () => Modal.close();
      $("#docSave").onclick = () => {
        const note = $("#docNote").value.trim();
        if (!note) { toast(t("required"), "error"); return; }
        DB.data.documentation.unshift({
          id: uid("doc"),
          patientId: $("#docPatient").value,
          taskId: null,
          nurseId: sess.nurseId || null,
          nurseName: sess.name,
          type: $("#docType").value,
          note,
          at: nowISO()
        });
        DB.save();
        audit("Documentation created", note.substring(0, 50));
        toast(t("dataSaved"), "success");
        Modal.close();
        Router.refresh();
      };
    }
  });
}