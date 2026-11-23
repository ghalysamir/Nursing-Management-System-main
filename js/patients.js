/* ============================================================
   patients.js — Patient CRUD + Acuity + Care Needs
   ============================================================ */
"use strict";

function getPatients() { return DB.data.patients; }
function getPatientById(id) { return DB.data.patients.find(p => p.id === id); }

const PATIENT_CONDITIONS = ["Stable", "Moderate", "Critical"];
const ACUITY_LABELS = { 1: "low", 2: "medium", 3: "high", 4: "critical" };

function isAssignmentLocked() {
  const shift = getActiveShift();
  if (!shift) return false;
  return !!DB.data.assignmentLock[shift.id]?.locked;
}

function getActiveShift() {
  return DB.data.shifts[0] || null;
}

function renderPatientsPage(container) {
  const locked = isAssignmentLocked();

  container.innerHTML = `
    <div class="page-header">
      <div>
        <h1>${t("patients")}</h1>
        <p>${locked ? `<span class="badge purple"><i class="fa-solid fa-lock"></i> ${t("assignmentLocked")}</span>` : t("patientManagementDesc")}</p>
      </div>
      <div class="page-actions">
        <button class="btn btn-primary" id="addPatientBtn" ${locked ? "disabled" : ""}><i class="fa-solid fa-plus"></i> ${t("addPatient")}</button>
      </div>
    </div>

    <div class="filter-bar">
      <input type="text" id="patientSearch" class="search-input" placeholder="${t("searchPatients")}" />
      <select id="patientAcuityFilter">
        <option value="">${t("allAcuity")}</option>
        <option value="1">L1 – ${t("low")}</option>
        <option value="2">L2 – ${t("medium")}</option>
        <option value="3">L3 – ${t("high")}</option>
        <option value="4">L4 – ${t("critical")}</option>
      </select>
      <select id="patientAssignFilter">
        <option value="">${t("all")}</option>
        <option value="assigned">${t("assigned")}</option>
        <option value="unassigned">${t("unassigned")}</option>
      </select>
      <select id="patientDeptFilter">
        <option value="">${t("allDepartments")}</option>
        ${DB.data.departments.map(d => `<option value="${d.id}">${esc(d.name)}</option>`).join("")}
      </select>
    </div>

    <div class="card">
      <div id="patientTableContainer"></div>
    </div>
  `;

  function renderTable() {
    const q = $("#patientSearch").value.trim().toLowerCase();
    const acuity = $("#patientAcuityFilter").value;
    const assign = $("#patientAssignFilter").value;
    const dept = $("#patientDeptFilter").value;

    const list = DB.data.patients.filter(p => {
      if (acuity && String(p.acuity) !== acuity) return false;
      if (dept && p.departmentId !== dept) return false;
      if (assign === "assigned" && !p.assignedNurseId) return false;
      if (assign === "unassigned" && p.assignedNurseId) return false;
      if (q) {
        const blob = `${p.name} ${p.code} ${p.bed} ${p.diagnosis} ${p.condition}`.toLowerCase();
        if (!blob.includes(q)) return false;
      }
      return true;
    });

    const wrap = $("#patientTableContainer");
    if (!list.length) {
      wrap.innerHTML = `<div class="empty-state"><i class="fa-solid fa-bed-pulse"></i><h4>${t("noData")}</h4><p>${t("addPatient")}</p></div>`;
      return;
    }

    wrap.innerHTML = `
      <div class="table-wrap">
        <table class="data-table">
          <thead>
            <tr>
              <th>${t("patients")}</th>
              <th>${t("diagnosis")}</th>
              <th>${t("acuity")}</th>
              <th>${t("careNeeds")}</th>
              <th>${t("assignedNurse")}</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            ${list.map(p => {
              const nurse = p.assignedNurseId ? getNurseById(p.assignedNurseId) : null;
              return `
                <tr>
                  <td class="cell-strong">${esc(p.name)}<div class="cell-sub">${esc(p.code)} · ${esc(p.bed)}</div></td>
                  <td>${esc(p.diagnosis)}<div class="cell-sub">${esc(p.condition)}</div></td>
                  <td><span class="meter"><span class="dot level-${p.acuity}"></span>${t(ACUITY_LABELS[p.acuity])}</span></td>
                  <td><div class="cell-sub">${(p.careNeeds || []).slice(0, 2).map(c => `<span class="badge low" style="margin:1px">${esc(c)}</span>`).join("")}${(p.careNeeds || []).length > 2 ? `<span class="cell-sub"> +${p.careNeeds.length - 2}</span>` : ""}</div></td>
                  <td>${nurse ? `<span class="badge teal"><i class="fa-solid fa-user-nurse"></i> ${esc(nurse.name)}</span>` : `<span class="badge low">${t("unassigned")}</span>`}</td>
                  <td>
                    <div class="table-actions">
                      <button class="btn btn-sm btn-outline" data-view="${p.id}" title="${t("view")}"><i class="fa-solid fa-eye"></i></button>
                      ${!locked ? `<button class="btn btn-sm btn-outline" data-edit="${p.id}" title="${t("edit")}"><i class="fa-solid fa-pen"></i></button>` : ""}
                      ${!locked ? `<button class="btn btn-sm btn-danger" data-del="${p.id}" title="${t("delete")}"><i class="fa-solid fa-trash"></i></button>` : ""}
                    </div>
                  </td>
                </tr>
              `;
            }).join("")}
          </tbody>
        </table>
      </div>
    `;

    $$("[data-view]", wrap).forEach(b => b.onclick = () => viewPatient(b.dataset.view));
    $$("[data-edit]", wrap).forEach(b => b.onclick = () => openPatientForm(b.dataset.edit));
    $$("[data-del]", wrap).forEach(b => b.onclick = () => deletePatient(b.dataset.del));
  }

  $("#patientSearch").addEventListener("input", renderTable);
  $("#patientAcuityFilter").addEventListener("change", renderTable);
  $("#patientAssignFilter").addEventListener("change", renderTable);
  $("#patientDeptFilter").addEventListener("change", renderTable);

  const addBtn = $("#addPatientBtn");
  if (addBtn) addBtn.onclick = () => {
    if (locked) {
      toast(t("assignmentLocked"), "warning");
      return;
    }
    openPatientForm(null);
  };

  renderTable();
}

function openPatientForm(patientId) {
  const editing = patientId ? getPatientById(patientId) : null;
  const nextNum = DB.data.patients.length + 1;

  Modal.open({
    title: editing ? t("editPatient") : t("addPatient"),
    wide: true,
    body: `
      <form id="patientForm" class="form-grid">
        <div>
          <label><small>${t("fullName")} *</small></label>
          <input type="text" id="pfName" value="${esc(editing?.name || "")}" placeholder="${t("fictionalName")}" required />
        </div>
        <div>
          <label><small>${t("patientCode")} *</small></label>
          <input type="text" id="pfCode" value="${esc(editing?.code || `P-${String(nextNum).padStart(3, '0')}`)}" required />
        </div>
        <div>
          <label><small>${t("bed")}</small></label>
          <input type="text" id="pfBed" value="${esc(editing?.bed || `Bed ${100 + nextNum}`)}" />
        </div>
        <div>
          <label><small>${t("mrn")}</small></label>
          <input type="text" id="pfMrn" value="${esc(editing?.mrn || `MRN-${1000 + nextNum}`)}" />
        </div>
        <div>
          <label><small>${t("diagnosis")} *</small></label>
          <input type="text" id="pfDiagnosis" value="${esc(editing?.diagnosis || "")}" required />
        </div>
        <div>
          <label><small>${t("history")}</small></label>
          <input type="text" id="pfHistory" value="${esc(editing?.history || "")}" />
        </div>
        <div>
          <label><small>${t("condition")}</small></label>
          <select id="pfCondition">
            ${PATIENT_CONDITIONS.map(c => `<option value="${c}" ${editing?.condition === c ? "selected" : ""}>${c}</option>`).join("")}
          </select>
        </div>
        <div>
          <label><small>${t("acuity")} *</small></label>
          <select id="pfAcuity">
            <option value="1" ${editing?.acuity === 1 ? "selected" : ""}>1 – ${t("low")}</option>
            <option value="2" ${editing?.acuity === 2 ? "selected" : ""}>2 – ${t("medium")}</option>
            <option value="3" ${editing?.acuity === 3 ? "selected" : ""}>3 – ${t("high")}</option>
            <option value="4" ${editing?.acuity === 4 ? "selected" : ""}>4 – ${t("critical")}</option>
          </select>
        </div>
        <div class="full">
          <label><small>${t("department")}</small></label>
          <select id="pfDept">
            ${DB.data.departments.map(d => `<option value="${d.id}" ${editing?.departmentId === d.id ? "selected" : ""}>${esc(d.name)}</option>`).join("")}
          </select>
        </div>
        <div class="full">
          <label><small>${t("careNeeds")} (comma-separated)</small></label>
          <input type="text" id="pfCareNeeds" value="${esc((editing?.careNeeds || ["Vital Signs Monitoring", "Medication Administration"]).join(", "))}" />
        </div>
        <div class="full">
          <label><small>${t("specialNeeds")}</small></label>
          <input type="text" id="pfSpecial" value="${esc(editing?.specialNeeds || "")}" />
        </div>
        <div class="full" id="pfError" style="color:var(--red);font-size:12px;font-weight:600;display:none"></div>
      </form>
    `,
    footer: `
      <button class="btn btn-outline" id="pfCancel">${t("cancel")}</button>
      <button class="btn btn-primary" id="pfSave">${editing ? t("update") : t("add")}</button>
    `,
    onMount() {
      $("#pfCancel").onclick = () => Modal.close();
      $("#pfSave").onclick = () => {
        const errEl = $("#pfError");
        errEl.style.display = "none";
        const name = $("#pfName").value.trim();
        const code = $("#pfCode").value.trim();
        const diagnosis = $("#pfDiagnosis").value.trim();
        if (!name || !code || !diagnosis) {
          errEl.textContent = t("required");
          errEl.style.display = "block";
          return;
        }
        if (DB.data.patients.some(p => p.code.toLowerCase() === code.toLowerCase() && p.id !== patientId)) {
          errEl.textContent = `${t("patientCode")} ${t("alreadyExists")}`;
          errEl.style.display = "block";
          return;
        }

        const payload = {
          name, code,
          bed: $("#pfBed").value.trim(),
          mrn: $("#pfMrn").value.trim(),
          diagnosis,
          history: $("#pfHistory").value.trim(),
          condition: $("#pfCondition").value,
          acuity: Number($("#pfAcuity").value),
          careNeeds: $("#pfCareNeeds").value.split(",").map(s => s.trim()).filter(Boolean),
          specialNeeds: $("#pfSpecial").value.trim(),
          departmentId: $("#pfDept").value
        };

        if (editing) {
          Object.assign(editing, payload);
          audit("Patient updated", `${name} (${code})`);
          toast(t("dataSaved"), "success");
        } else {
          DB.data.patients.push({ id: uid("pat"), assignedNurseId: null, ...payload });
          audit("Patient added", `${name} (${code})`);
          toast(t("dataSaved"), "success");
        }
        DB.save();
        Modal.close();
        Router.refresh();
      };
    }
  });
}

function viewPatient(id) {
  const p = getPatientById(id);
  if (!p) return;
  const nurse = p.assignedNurseId ? getNurseById(p.assignedNurseId) : null;

  Modal.open({
    title: `${p.name}`,
    wide: true,
    body: `
      <div class="grid-2" style="font-size:13px;line-height:1.9">
        <div>
          <div><strong>${t("patientCode")}:</strong> ${esc(p.code)}</div>
          <div><strong>${t("bed")}:</strong> ${esc(p.bed)}</div>
          <div><strong>${t("mrn")}:</strong> ${esc(p.mrn)}</div>
          <div><strong>${t("diagnosis")}:</strong> ${esc(p.diagnosis)}</div>
        </div>
        <div>
          <div><strong>${t("condition")}:</strong> ${esc(p.condition)}</div>
          <div><strong>${t("acuity")}:</strong> L${p.acuity} – ${t(ACUITY_LABELS[p.acuity])}</div>
          <div><strong>${t("assignedNurse")}:</strong> ${nurse ? esc(nurse.name) : "—"}</div>
          <div><strong>${t("specialNeeds")}:</strong> ${esc(p.specialNeeds || "—")}</div>
        </div>
      </div>
      <hr style="border:none;border-top:1px solid var(--border);margin:14px 0" />
      <div class="card-title"><i class="fa-solid fa-hand-holding-medical"></i> ${t("careNeeds")}</div>
      <div>${(p.careNeeds || []).map(c => `<span class="badge teal" style="margin:3px">${esc(c)}</span>`).join("") || "—"}</div>
    `,
    footer: `<button class="btn btn-outline" onclick="Modal.close()">${t("close")}</button>`
  });
}

function deletePatient(id) {
  const p = getPatientById(id);
  if (!p) return;
  Modal.confirm({
    title: t("delete"),
    message: `${t("deleteConfirmMsg")} (${p.name})`,
    confirmText: t("delete"),
    danger: true,
    onConfirm: () => {
      DB.data.patients = DB.data.patients.filter(x => x.id !== id);
      DB.data.tasks = DB.data.tasks.filter(t => t.patientId !== id);
      audit("Patient deleted", `${p.name} (${p.code})`);
      DB.save();
      toast(t("dataDeleted"), "success");
      Router.refresh();
    }
  });
}