/* ============================================================
   departments.js — Department CRUD + Stats
   ============================================================ */
"use strict";

function getDepartmentById(id) { return DB.data.departments.find(d => d.id === id); }

function renderDepartmentsPage(container) {
  container.innerHTML = `
    <div class="page-header">
      <div>
        <h1>${t("departments")}</h1>
        <p>${t("departmentManagementDesc")}</p>
      </div>
      <div class="page-actions">
        <button class="btn btn-primary" id="addDeptBtn"><i class="fa-solid fa-plus"></i> ${t("addDepartment")}</button>
      </div>
    </div>

    <div id="deptGrid" class="grid-3"></div>
  `;

  function renderCards() {
    const grid = $("#deptGrid");
    if (!DB.data.departments.length) {
      grid.innerHTML = `<div class="card" style="grid-column:1/-1"><div class="empty-state"><i class="fa-solid fa-building"></i><h4>${t("noData")}</h4></div></div>`;
      return;
    }

    grid.innerHTML = DB.data.departments.map(d => {
      const nurses = DB.data.nurses.filter(n => n.departmentId === d.id);
      const patients = DB.data.patients.filter(p => p.departmentId === d.id);
      return `
        <div class="card">
          <div class="card-title" style="justify-content:space-between">
            <span><i class="fa-solid fa-building"></i> ${esc(d.name)}</span>
            <span class="badge ${d.active ? "available" : "unavailable"}">${d.active ? t("active") : t("inactive")}</span>
          </div>
          <div style="font-size:12.5px;line-height:2">
            <div><i class="fa-solid fa-user-nurse" style="color:var(--teal)"></i> ${nurses.length} ${t("nurses")}</div>
            <div><i class="fa-solid fa-bed-pulse" style="color:var(--blue)"></i> ${patients.length} ${t("patients")}</div>
          </div>
          <div style="margin-top:12px;display:flex;gap:5px">
            <button class="btn btn-sm btn-outline" data-edit="${d.id}"><i class="fa-solid fa-pen"></i> ${t("edit")}</button>
            <button class="btn btn-sm btn-outline" data-view="${d.id}"><i class="fa-solid fa-eye"></i> ${t("view")}</button>
            <button class="btn btn-sm btn-danger" data-del="${d.id}"><i class="fa-solid fa-trash"></i></button>
          </div>
        </div>
      `;
    }).join("");

    $$("[data-edit]", grid).forEach(b => b.onclick = () => openDepartmentForm(b.dataset.edit));
    $$("[data-view]", grid).forEach(b => b.onclick = () => viewDepartment(b.dataset.view));
    $$("[data-del]", grid).forEach(b => b.onclick = () => deleteDepartment(b.dataset.del));
  }

  $("#addDeptBtn").onclick = () => openDepartmentForm(null);
  renderCards();
}

function openDepartmentForm(deptId) {
  const editing = deptId ? getDepartmentById(deptId) : null;

  Modal.open({
    title: editing ? t("editDepartment") : t("addDepartment"),
    body: `
      <form id="deptForm">
        <div class="form-group">
          <label><small>${t("departmentName")} *</small></label>
          <input type="text" id="dfName" value="${esc(editing?.name || "")}" required />
        </div>
        <div class="form-group">
          <label><small>${t("status")}</small></label>
          <select id="dfActive">
            <option value="true" ${editing?.active ? "selected" : ""}>${t("active")}</option>
            <option value="false" ${!editing?.active ? "selected" : ""}>${t("inactive")}</option>
          </select>
        </div>
      </form>
    `,
    footer: `
      <button class="btn btn-outline" id="dfCancel">${t("cancel")}</button>
      <button class="btn btn-primary" id="dfSave">${editing ? t("update") : t("add")}</button>
    `,
    onMount() {
      $("#dfCancel").onclick = () => Modal.close();
      $("#dfSave").onclick = () => {
        const name = $("#dfName").value.trim();
        if (!name) { toast(t("required"), "error"); return; }

        const payload = {
          name,
          active: $("#dfActive").value === "true"
        };

        if (editing) {
          Object.assign(editing, payload);
          audit("Department updated", name);
        } else {
          DB.data.departments.push({ id: uid("dep"), ...payload });
          audit("Department added", name);
        }
        DB.save();
        toast(t("dataSaved"), "success");
        Modal.close();
        Router.refresh();
      };
    }
  });
}

function viewDepartment(id) {
  const d = getDepartmentById(id);
  if (!d) return;
  const nurses = DB.data.nurses.filter(n => n.departmentId === id);
  const patients = DB.data.patients.filter(p => p.departmentId === id);

  Modal.open({
    title: d.name,
    wide: true,
    body: `
      <div class="grid-2">
        <div>
          <div class="card-title"><i class="fa-solid fa-user-nurse"></i> ${t("nurses")} (${nurses.length})</div>
          ${nurses.length ? `<ul style="font-size:13px;padding-inline-start:18px;line-height:1.9">${nurses.map(n => `<li>${esc(n.name)} – ${esc(n.qualification)}</li>`).join("")}</ul>` : `<p style="color:var(--text-muted)">${t("noData")}</p>`}
        </div>
        <div>
          <div class="card-title"><i class="fa-solid fa-bed-pulse"></i> ${t("patients")} (${patients.length})</div>
          ${patients.length ? `<ul style="font-size:13px;padding-inline-start:18px;line-height:1.9">${patients.map(p => `<li>${esc(p.code)} – ${esc(p.name)} (L${p.acuity})</li>`).join("")}</ul>` : `<p style="color:var(--text-muted)">${t("noData")}</p>`}
        </div>
      </div>
    `,
    footer: `<button class="btn btn-outline" onclick="Modal.close()">${t("close")}</button>`
  });
}

function deleteDepartment(id) {
  const d = getDepartmentById(id);
  if (!d) return;

  const nursesCount = DB.data.nurses.filter(n => n.departmentId === id).length;
  const patientsCount = DB.data.patients.filter(p => p.departmentId === id).length;

  if (nursesCount || patientsCount) {
    toast(`${t("cannotDelete")}: ${nursesCount} ${t("nurses")}, ${patientsCount} ${t("patients")}`, "error");
    return;
  }

  Modal.confirm({
    title: t("delete"),
    message: `${t("deleteConfirmMsg")} (${d.name})`,
    confirmText: t("delete"),
    danger: true,
    onConfirm: () => {
      DB.data.departments = DB.data.departments.filter(x => x.id !== id);
      audit("Department deleted", d.name);
      DB.save();
      toast(t("dataDeleted"), "success");
      Router.refresh();
    }
  });
}