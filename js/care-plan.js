/* ============================================================
   care-plan.js — Nursing Care Plans
   ============================================================ */
"use strict";

function renderCarePlanPage(container) {
  const sess = Session.get();
  const isNurse = sess.role === "nurse";

  container.innerHTML = `
    <div class="page-header">
      <div>
        <h1>${t("carePlan")}</h1>
        <p>${t("carePlanDesc")}</p>
      </div>
      <div class="page-actions">
        ${!isNurse ? `<button class="btn btn-primary" id="addPlanBtn"><i class="fa-solid fa-plus"></i> ${t("addCarePlan")}</button>` : ""}
      </div>
    </div>

    <div class="card">
      <div id="carePlanList"></div>
    </div>
  `;

  function renderList() {
    let plans = DB.data.carePlans || [];
    if (isNurse) {
      const myPts = DB.data.patients.filter(p => p.assignedNurseId === sess.nurseId).map(p => p.id);
      plans = plans.filter(cp => myPts.includes(cp.patientId));
    }

    const list = $("#carePlanList");
    if (!plans.length) {
      list.innerHTML = `<div class="empty-state"><i class="fa-solid fa-clipboard-list"></i><h4>${t("noData")}</h4></div>`;
      return;
    }

    list.innerHTML = plans.map(cp => {
      const p = getPatientById(cp.patientId);
      return `
        <div class="card" style="margin-bottom:12px">
          <div class="card-title" style="justify-content:space-between">
            <span><i class="fa-solid fa-clipboard-list"></i> ${esc(p?.code || "")} – ${esc(p?.name || "")}</span>
            <span class="badge ${cp.progress === "Achieved" ? "completed" : cp.progress === "In Progress" ? "inprogress" : "pending"}">${cp.progress}</span>
          </div>
          <div style="font-size:12.5px;line-height:1.8">
            <div><strong>${t("nursingProblem")}:</strong> ${esc(cp.problem)}</div>
            <div><strong>${t("goal")}:</strong> ${esc(cp.goal)}</div>
            <div><strong>${t("interventions")}:</strong> ${esc(cp.interventions)}</div>
            <div><strong>${t("expectedOutcome")}:</strong> ${esc(cp.outcome)}</div>
          </div>
          ${!isNurse ? `<div style="margin-top:10px"><button class="btn btn-sm btn-outline" data-edit="${cp.id}"><i class="fa-solid fa-pen"></i> ${t("update")}</button></div>` : ""}
        </div>
      `;
    }).join("");

    $$("[data-edit]", list).forEach(b => b.onclick = () => openCarePlanForm(b.dataset.edit));
  }

  const addBtn = $("#addPlanBtn");
  if (addBtn) addBtn.onclick = () => openCarePlanForm();
  renderList();
}

function openCarePlanForm(planId) {
  const editing = planId ? (DB.data.carePlans || []).find(x => x.id === planId) : null;
  const patients = DB.data.patients;

  Modal.open({
    title: editing ? t("editCarePlan") : t("addCarePlan"),
    wide: true,
    body: `
      <form id="cpForm" class="form-grid">
        <div class="full">
          <label><small>${t("patients")} *</small></label>
          <select id="cpPatient">
            ${patients.map(p => `<option value="${p.id}" ${editing?.patientId === p.id ? "selected" : ""}>${esc(p.code)} – ${esc(p.name)}</option>`).join("")}
          </select>
        </div>
        <div class="full">
          <label><small>${t("nursingProblem")} *</small></label>
          <input type="text" id="cpProblem" value="${esc(editing?.problem || "")}" required />
        </div>
        <div class="full">
          <label><small>${t("goal")}</small></label>
          <textarea id="cpGoal">${esc(editing?.goal || "")}</textarea>
        </div>
        <div class="full">
          <label><small>${t("interventions")}</small></label>
          <textarea id="cpInterventions">${esc(editing?.interventions || "")}</textarea>
        </div>
        <div class="full">
          <label><small>${t("expectedOutcome")}</small></label>
          <input type="text" id="cpOutcome" value="${esc(editing?.outcome || "")}" />
        </div>
        <div>
          <label><small>${t("progress")}</small></label>
          <select id="cpProgress">
            <option ${editing?.progress === "Not Started" ? "selected" : ""}>Not Started</option>
            <option ${editing?.progress === "In Progress" ? "selected" : ""}>In Progress</option>
            <option ${editing?.progress === "Achieved" ? "selected" : ""}>Achieved</option>
          </select>
        </div>
      </form>
    `,
    footer: `
      <button class="btn btn-outline" id="cpCancel">${t("cancel")}</button>
      <button class="btn btn-primary" id="cpSave">${t("save")}</button>
    `,
    onMount() {
      $("#cpCancel").onclick = () => Modal.close();
      $("#cpSave").onclick = () => {
        const problem = $("#cpProblem").value.trim();
        if (!problem) { toast(t("required"), "error"); return; }
        if (!DB.data.carePlans) DB.data.carePlans = [];
        const payload = {
          patientId: $("#cpPatient").value,
          problem,
          goal: $("#cpGoal").value.trim(),
          interventions: $("#cpInterventions").value.trim(),
          outcome: $("#cpOutcome").value.trim(),
          progress: $("#cpProgress").value,
          updatedAt: nowISO()
        };
        if (editing) {
          Object.assign(editing, payload);
        } else {
          DB.data.carePlans.unshift({ id: uid("cp"), createdAt: nowISO(), ...payload });
        }
        DB.save();
        audit(editing ? "Care plan updated" : "Care plan created", problem);
        toast(t("dataSaved"), "success");
        Modal.close();
        Router.refresh();
      };
    }
  });
}