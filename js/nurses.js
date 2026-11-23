/* ============================================================
   nurses.js — Nurse CRUD + Profile + Capability
   ============================================================ */
"use strict";

function getNurses() { return DB.data.nurses; }
function getNurseById(id) { return DB.data.nurses.find(n => n.id === id); }

const QUALIFICATIONS = [
  { value: "Doctorate",         rank: 4 },
  { value: "Master",            rank: 4 },
  { value: "BSN",               rank: 3 },
  { value: "Higher Diploma",    rank: 2 },
  { value: "Technical Diploma", rank: 1 }
];

const NURSE_AVAILABILITY = ["available", "on_duty", "off_duty", "on_leave", "absent", "unavailable"];

function getQualificationRank(qualification) {
  const found = QUALIFICATIONS.find(q => q.value === qualification);
  return found ? found.rank : 1;
}

function getNurseCapability(nurse) {
  if (!nurse) return 0;
  const qual = getQualificationRank(nurse.qualification);
  const exp = Number(nurse.experience) || 0;
  return (qual * 10) + (exp * 2);
}

function getNurseDisplayStatus(nurse) {
  if (!nurse) return { label: "—", cls: "unavailable" };
  const map = {
    available:   { label: t("available"),   cls: "available" },
    on_duty:     { label: t("onDuty"),      cls: "completed" },
    off_duty:    { label: t("offDuty"),     cls: "pending" },
    on_leave:    { label: t("onLeave"),     cls: "notcompleted" },
    absent:      { label: t("absent"),      cls: "overdue" },
    unavailable: { label: t("unavailable"), cls: "unavailable" }
  };
  return map[nurse.availability] || map.unavailable;
}

/* ---------- Page ---------- */
function renderNursesPage(container) {
  const sess = Session.get();
  const isAdmin = sess.role === "admin";
  const isHead = sess.role === "headnurse";
  const canEdit = isAdmin || isHead;

  container.innerHTML = `
    <div class="page-header">
      <div>
        <h1>${t("nurses")}</h1>
        <p>${t("nurseManagementDesc")}</p>
      </div>
      <div class="page-actions">
        ${canEdit ? `<button class="btn btn-primary" id="addNurseBtn"><i class="fa-solid fa-plus"></i> ${t("addNurse")}</button>` : ""}
      </div>
    </div>

    <div class="filter-bar">
      <input type="text" id="nurseSearch" class="search-input" placeholder="${t("searchNurses")}" />
      <select id="nurseAvailFilter">
        <option value="">${t("allAvailability")}</option>
        ${NURSE_AVAILABILITY.map(a => `<option value="${a}">${t(a.replace(/_([a-z])/g, (_, c) => c.toUpperCase())) || a}</option>`).join("")}
      </select>
      <select id="nurseDeptFilter">
        <option value="">${t("allDepartments")}</option>
        ${DB.data.departments.map(d => `<option value="${d.id}">${esc(d.name)}</option>`).join("")}
      </select>
      <select id="nurseShiftFilter">
        <option value="">${t("allShifts")}</option>
        ${DB.data.settings.shiftTypes.map(s => `<option value="${s.key}">${t(s.key.toLowerCase() + "Shift") || s.label}</option>`).join("")}
      </select>
    </div>

    <div class="card">
      <div id="nurseTableContainer"></div>
    </div>
  `;

  function renderTable() {
    const q = $("#nurseSearch").value.trim().toLowerCase();
    const avail = $("#nurseAvailFilter").value;
    const dept = $("#nurseDeptFilter").value;
    const shift = $("#nurseShiftFilter").value;

    const list = DB.data.nurses.filter(n => {
      if (avail && n.availability !== avail) return false;
      if (dept && n.departmentId !== dept) return false;
      if (shift && n.assignedShift !== shift) return false;
      if (q) {
        const blob = `${n.name} ${n.code} ${(n.skills || []).join(" ")} ${n.qualification}`.toLowerCase();
        if (!blob.includes(q)) return false;
      }
      return true;
    }).sort((a, b) => getNurseCapability(b) - getNurseCapability(a));

    const wrap = $("#nurseTableContainer");
    if (!list.length) {
      wrap.innerHTML = `<div class="empty-state"><i class="fa-solid fa-user-slash"></i><h4>${t("noNurses")}</h4><p>${t("addNurse")}</p></div>`;
      return;
    }

    wrap.innerHTML = `
      <div class="table-wrap">
        <table class="data-table">
          <thead>
            <tr>
              <th>${t("nurses")}</th>
              <th>${t("qualification")}</th>
              <th>${t("capability")}</th>
              <th>${t("skills")}</th>
              <th>${t("status")}</th>
              <th>${t("shift")}</th>
              <th>${t("patients")}</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            ${list.map(n => {
              const patientsCount = DB.data.patients.filter(p => p.assignedNurseId === n.id).length;
              const cap = getNurseCapability(n);
              const status = getNurseDisplayStatus(n);
              const dept = DB.data.departments.find(d => d.id === n.departmentId);
              return `
                <tr>
                  <td class="cell-strong">${esc(n.name)}<div class="cell-sub">${esc(n.code)} · ${esc(dept?.name || "")}</div></td>
                  <td>${esc(n.qualification)}<div class="cell-sub">${n.experience} ${t("years")}</div></td>
                  <td><span class="badge purple" title="${t("capability")} = (Rank × 10) + (Years × 2)">${cap}</span></td>
                  <td><div class="cell-sub">${(n.skills || []).slice(0, 2).map(s => `<span class="badge teal" style="margin:2px">${esc(s)}</span>`).join("")}${(n.skills || []).length > 2 ? `<span class="cell-sub"> +${n.skills.length - 2}</span>` : ""}</div></td>
                  <td><span class="badge ${status.cls}">${status.label}</span></td>
                  <td>${esc(n.assignedShift || "—")}</td>
                  <td><strong>${patientsCount}</strong></td>
                  <td>
                    <div class="table-actions">
                      <button class="btn btn-sm btn-outline" data-view="${n.id}" title="${t("view")}"><i class="fa-solid fa-eye"></i></button>
                      ${canEdit ? `<button class="btn btn-sm btn-outline" data-edit="${n.id}" title="${t("edit")}"><i class="fa-solid fa-pen"></i></button>` : ""}
                      ${isAdmin ? `<button class="btn btn-sm btn-danger" data-del="${n.id}" title="${t("delete")}"><i class="fa-solid fa-trash"></i></button>` : ""}
                    </div>
                  </td>
                </tr>
              `;
            }).join("")}
          </tbody>
        </table>
      </div>
    `;

    $$("[data-view]", wrap).forEach(b => b.onclick = () => viewNurse(b.dataset.view));
    $$("[data-edit]", wrap).forEach(b => b.onclick = () => openNurseForm(b.dataset.edit));
    $$("[data-del]", wrap).forEach(b => b.onclick = () => deleteNurse(b.dataset.del));
  }

  $("#nurseSearch").addEventListener("input", renderTable);
  $("#nurseAvailFilter").addEventListener("change", renderTable);
  $("#nurseDeptFilter").addEventListener("change", renderTable);
  $("#nurseShiftFilter").addEventListener("change", renderTable);

  const addBtn = $("#addNurseBtn");
  if (addBtn) addBtn.onclick = () => openNurseForm(null);

  renderTable();
}

/* ---------- Form ---------- */
function openNurseForm(nurseId) {
  const editing = nurseId ? getNurseById(nurseId) : null;
  const { shiftTypes } = DB.data.settings;
  const currentQual = editing?.qualification || "BSN";
  const nextNum = DB.data.nurses.length + 1;

  Modal.open({
    title: editing ? t("editNurse") : t("addNurse"),
    wide: true,
    body: `
      <form id="nurseForm" class="form-grid">
        <div>
          <label><small>${t("fullName")} *</small></label>
          <input type="text" id="nfName" value="${esc(editing?.name || "")}" required />
        </div>
        <div>
          <label><small>${t("nurseCode")} *</small></label>
          <input type="text" id="nfCode" value="${esc(editing?.code || `N-${String(nextNum).padStart(2, '0')}`)}" required />
        </div>
        <div>
          <label><small>${t("email")}</small></label>
          <input type="email" id="nfEmail" value="${esc(editing?.email || "")}" placeholder="nurse@hospital.demo" />
        </div>
        <div>
          <label><small>${t("phone")}</small></label>
          <input type="text" id="nfPhone" value="${esc(editing?.phone || "")}" />
        </div>
        <div>
          <label><small>${t("qualification")} *</small></label>
          <select id="nfQual">
            ${QUALIFICATIONS.map(q => `<option value="${q.value}" ${currentQual === q.value ? "selected" : ""}>${q.value}</option>`).join("")}
          </select>
        </div>
        <div>
          <label><small>${t("experience")} (${t("years")})</small></label>
          <input type="number" id="nfExp" min="0" max="50" value="${editing?.experience ?? 0}" />
        </div>
        <div class="full">
          <div id="nfCapabilityDisplay" style="background:var(--sky);padding:10px;border-radius:8px;font-size:12.5px;color:var(--navy);font-weight:600">
            <i class="fa-solid fa-calculator"></i> ${t("capability")}: <span id="nfCapValue">—</span>
          </div>
        </div>
        <div class="full">
          <label><small>${t("skills")} (comma-separated)</small></label>
          <input type="text" id="nfSkills" value="${esc((editing?.skills || ["Vital Signs"]).join(", "))}" />
        </div>
        <div>
          <label><small>${t("department")}</small></label>
          <select id="nfDept">
            ${DB.data.departments.map(d => `<option value="${d.id}" ${editing?.departmentId === d.id ? "selected" : ""}>${esc(d.name)}</option>`).join("")}
          </select>
        </div>
        <div>
          <label><small>${t("availability")}</small></label>
          <select id="nfAvail">
            ${NURSE_AVAILABILITY.map(a => `<option value="${a}" ${editing?.availability === a ? "selected" : ""}>${t(a.replace(/_([a-z])/g, (_, c) => c.toUpperCase())) || a}</option>`).join("")}
          </select>
        </div>
        <div class="full">
          <label><small>${t("shift")}</small></label>
          <select id="nfShift">
            ${shiftTypes.map(s => `<option value="${s.key}" ${editing?.assignedShift === s.key ? "selected" : ""}>${s.label}</option>`).join("")}
          </select>
        </div>
        <div class="full" id="nfError" style="color:var(--red);font-size:12px;font-weight:600;display:none"></div>
      </form>
    `,
    footer: `
      <button class="btn btn-outline" id="nfCancel">${t("cancel")}</button>
      <button class="btn btn-primary" id="nfSave">${editing ? t("update") : t("add")}</button>
    `,
    onMount() {
      function updateCap() {
        const qual = $("#nfQual").value;
        const exp = Number($("#nfExp").value) || 0;
        const cap = getQualificationRank(qual) * 10 + exp * 2;
        $("#nfCapValue").textContent = `${cap} (Rank ${getQualificationRank(qual)} × 10 + ${exp} × 2)`;
      }
      $("#nfQual").addEventListener("change", updateCap);
      $("#nfExp").addEventListener("input", updateCap);
      updateCap();

      $("#nfCancel").onclick = () => Modal.close();
      $("#nfSave").onclick = () => {
        const errEl = $("#nfError");
        errEl.style.display = "none";
        const name = $("#nfName").value.trim();
        const code = $("#nfCode").value.trim();
        if (!name || !code) {
          errEl.textContent = t("required");
          errEl.style.display = "block";
          return;
        }
        if (DB.data.nurses.some(n => n.code.toLowerCase() === code.toLowerCase() && n.id !== nurseId)) {
          errEl.textContent = `${t("nurseCode")} ${t("alreadyExists")}`;
          errEl.style.display = "block";
          return;
        }

        const payload = {
          name, code,
          email: $("#nfEmail").value.trim(),
          phone: $("#nfPhone").value.trim(),
          qualification: $("#nfQual").value,
          experience: Number($("#nfExp").value) || 0,
          skills: $("#nfSkills").value.split(",").map(s => s.trim()).filter(Boolean),
          availability: $("#nfAvail").value,
          assignedShift: $("#nfShift").value,
          departmentId: $("#nfDept").value
        };

        if (editing) {
          Object.assign(editing, payload);
          audit("Nurse updated", `${name} (${code})`);
          toast(t("dataSaved"), "success");
        } else {
          DB.data.nurses.push({ id: uid("nur"), ...payload });
          audit("Nurse added", `${name} (${code})`);
          toast(t("dataSaved"), "success");
        }
        DB.save();
        Modal.close();
        Router.refresh();
      };
    }
  });
}

function viewNurse(id) {
  const n = getNurseById(id);
  if (!n) return;
  const pts = DB.data.patients.filter(p => p.assignedNurseId === n.id);
  const cap = getNurseCapability(n);
  const status = getNurseDisplayStatus(n);
  const dept = DB.data.departments.find(d => d.id === n.departmentId);

  Modal.open({
    title: `${n.name}`,
    wide: true,
    body: `
      <div class="grid-2" style="font-size:13px;line-height:2">
        <div>
          <div><strong>${t("nurseCode")}:</strong> ${esc(n.code)}</div>
          <div><strong>${t("qualification")}:</strong> ${esc(n.qualification)} (Rank ${getQualificationRank(n.qualification)})</div>
          <div><strong>${t("experience")}:</strong> ${n.experience} ${t("years")}</div>
          <div><strong>${t("capability")}:</strong> <span class="badge purple">${cap}</span></div>
        </div>
        <div>
          <div><strong>${t("department")}:</strong> ${esc(dept?.name || "—")}</div>
          <div><strong>${t("status")}:</strong> <span class="badge ${status.cls}">${status.label}</span></div>
          <div><strong>${t("shift")}:</strong> ${esc(n.assignedShift || "—")}</div>
          <div><strong>${t("email")}:</strong> ${esc(n.email || "—")}</div>
        </div>
      </div>
      <hr style="border:none;border-top:1px solid var(--border);margin:14px 0" />
      <div class="card-title"><i class="fa-solid fa-hand-holding-medical"></i> ${t("skills")}</div>
      <div>${(n.skills || []).map(s => `<span class="badge teal" style="margin:3px">${esc(s)}</span>`).join("") || "—"}</div>
      <hr style="border:none;border-top:1px solid var(--border);margin:14px 0" />
      <div class="card-title"><i class="fa-solid fa-bed-pulse"></i> ${t("patients")} (${pts.length})</div>
      ${pts.length ? `<ul style="font-size:13px;padding-inline-start:18px">${pts.map(p => `<li>${esc(p.code)} – ${esc(p.name)} (${esc(p.bed)}) · Acuity L${p.acuity}</li>`).join("")}</ul>` : `<p style="padding:10px;color:var(--text-muted)">${t("noData")}</p>`}
    `,
    footer: `<button class="btn btn-outline" onclick="Modal.close()">${t("close")}</button>`
  });
}

function deleteNurse(id) {
  const n = getNurseById(id);
  if (!n) return;
  Modal.confirm({
    title: t("delete"),
    message: `${t("deleteConfirmMsg")} (${n.name})`,
    confirmText: t("delete"),
    danger: true,
    onConfirm: () => {
      DB.data.nurses = DB.data.nurses.filter(x => x.id !== id);
      DB.data.users = DB.data.users.filter(u => u.nurseId !== id);
      DB.data.patients.forEach(p => { if (p.assignedNurseId === id) p.assignedNurseId = null; });
      audit("Nurse deleted", `${n.name} (${n.code})`);
      DB.save();
      toast(t("dataDeleted"), "success");
      Router.refresh();
    }
  });
}