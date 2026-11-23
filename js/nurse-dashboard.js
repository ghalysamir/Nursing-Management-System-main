/* ============================================================
   nurse-dashboard.js — Staff Nurse Dashboard + Tasks + Summary
   ============================================================ */
"use strict";

function renderNurseDashboard(container) {
  const sess = Session.get();
  const nurseId = sess.nurseId;
  const myPts = DB.data.patients.filter(p => p.assignedNurseId === nurseId);
  const myTasks = DB.data.tasks.filter(tk => tk.assignedNurseId === nurseId);

  const completed = myTasks.filter(tk => tk.status === "Completed").length;
  const pending = myTasks.filter(tk => tk.status === "Pending" || tk.status === "In Progress").length;
  const overdue = myTasks.filter(tk => computeTaskStatus(tk) === "Overdue").length;
  const pendingHandover = myTasks.filter(tk => tk.handoverStatus === "Pending").length;

  container.innerHTML = `
    <div class="page-header">
      <div><h1>${t("welcome")}, ${esc(sess.name)}</h1><p>${t("nurseDashboardDesc")}</p></div>
      <div class="page-actions">
        <button class="btn btn-primary" id="nurseCreateTaskBtn"><i class="fa-solid fa-plus"></i> ${t("createNewTask")}</button>
      </div>
    </div>

    <div class="stats-grid">
      ${statCard(t("myPatients"), myPts.length, "blue", "fa-bed-pulse")}
      ${statCard(t("myTasks"), myTasks.length, "purple", "fa-list-check")}
      ${statCard(t("completed"), completed, "green", "fa-circle-check")}
      ${statCard(t("pending"), pending, "amber", "fa-hourglass-half")}
      ${statCard(t("overdue"), overdue, "red", "fa-triangle-exclamation")}
    </div>

    <div class="card" style="margin-bottom:16px">
      <div class="card-title"><i class="fa-solid fa-bed-pulse"></i> ${t("myPatients")}</div>
      ${myPts.length === 0 ? `<div class="empty-state"><i class="fa-solid fa-bed"></i><h4>${t("noData")}</h4></div>` : `
        <div class="table-wrap"><table class="data-table">
          <thead><tr><th>${t("patientCode")}</th><th>${t("bed")}</th><th>${t("diagnosis")}</th><th>${t("acuity")}</th><th>${t("careNeeds")}</th></tr></thead>
          <tbody>${myPts.map(p => `
            <tr>
              <td class="cell-strong">${esc(p.code)}</td>
              <td>${esc(p.bed)}</td>
              <td>${esc(p.diagnosis)}</td>
              <td><span class="meter"><span class="dot level-${p.acuity}"></span>L${p.acuity}</span></td>
              <td class="cell-sub">${(p.careNeeds || []).slice(0, 3).join(", ")}</td>
            </tr>
          `).join("")}</tbody>
        </table></div>
      `}
    </div>

    <div class="card">
      <div class="card-title"><i class="fa-solid fa-list-check"></i> ${t("myTaskQueue")}</div>
      <div id="myTasksContainer"></div>
    </div>
  `;

  $("#nurseCreateTaskBtn").onclick = () => openTaskForm(null, true);
  renderTaskCards($("#myTasksContainer"), myTasks);
}

function renderTaskCards(root, tasks) {
  if (!tasks.length) {
    root.innerHTML = `<div class="empty-state"><i class="fa-solid fa-list"></i><h4>${t("noData")}</h4></div>`;
    return;
  }
  const sorted = [...tasks].sort(taskSortComparator);
  root.innerHTML = `<div class="task-list">${sorted.map(tk => {
    const p = getPatientById(tk.patientId);
    const st = computeTaskStatus(tk);
    const statusLower = st.toLowerCase().replace(" ", "");
    return `
      <div class="task-card priority-${tk.priority.toLowerCase()} status-${statusLower}" data-task-id="${tk.id}">
        <div class="task-main">
          <strong>${esc(tk.name)}</strong>
          <div class="task-meta">
            <span><i class="fa-solid fa-bed-pulse"></i> ${esc(p?.code || "")} ${p ? `· ${esc(p.bed)}` : ""}</span>
            <span><i class="fa-solid fa-clock"></i> ${t("dueTime")} ${esc(tk.dueTime || "—")}</span>
            <span><i class="fa-solid fa-hourglass"></i> ~${tk.estimatedDuration} min</span>
          </div>
        </div>
        <div class="task-side">
          <span class="badge ${tk.priority.toLowerCase()}">${t(tk.priority.toLowerCase())}</span>
          <span class="badge ${statusLower}">${t(statusLower)}</span>
          <div class="task-buttons">
            ${st !== "Completed" && st !== "Not Completed" ? `<button class="btn btn-xs btn-teal" data-start="${tk.id}">${t("start")}</button>` : ""}
            ${st !== "Completed" && st !== "Not Completed" ? `<button class="btn btn-xs btn-primary" data-complete="${tk.id}">${t("complete")}</button>` : ""}
            ${st !== "Completed" && st !== "Not Completed" ? `<button class="btn btn-xs btn-danger" data-nc="${tk.id}">${t("notDone")}</button>` : ""}
          </div>
        </div>
      </div>
    `;
  }).join("")}</div>`;

  $$("[data-start]", root).forEach(b => b.onclick = () => updateTaskStatus(b.dataset.start, "In Progress"));
  $$("[data-complete]", root).forEach(b => b.onclick = () => completeTask(b.dataset.complete));
  $$("[data-nc]", root).forEach(b => b.onclick = () => markNotCompleted(b.dataset.nc));
}

function renderNurseTasksPage(container) {
  const sess = Session.get();
  const myTasks = DB.data.tasks.filter(tk => tk.assignedNurseId === sess.nurseId);

  container.innerHTML = `
    <div class="page-header">
      <div><h1>${t("myTasks")}</h1><p>${t("tasksDesc")}</p></div>
      <div class="page-actions">
        <button class="btn btn-primary" id="nurseAddTaskBtn"><i class="fa-solid fa-plus"></i> ${t("createNewTask")}</button>
      </div>
    </div>
    <div class="filter-bar">
      <select id="ntStatus"><option value="">${t("allStatuses")}</option><option>Pending</option><option>In Progress</option><option>Completed</option><option>Overdue</option><option>Not Completed</option></select>
      <select id="ntPriority"><option value="">${t("allPriorities")}</option><option>Critical</option><option>High</option><option>Medium</option><option>Low</option></select>
    </div>
    <div id="ntContainer"></div>
  `;

  function renderList() {
    const s = $("#ntStatus").value;
    const p = $("#ntPriority").value;
    const filtered = myTasks.filter(tk => {
      if (s && computeTaskStatus(tk) !== s) return false;
      if (p && tk.priority !== p) return false;
      return true;
    });
    renderTaskCards($("#ntContainer"), filtered);
  }
  $("#ntStatus").addEventListener("change", renderList);
  $("#ntPriority").addEventListener("change", renderList);
  $("#nurseAddTaskBtn").onclick = () => openTaskForm(null, true);
  renderList();
}

function updateTaskStatus(taskId, newStatus) {
  const tk = getTaskById(taskId);
  if (!tk) return;
  tk.status = newStatus;
  DB.save();
  audit("Task status updated", `${tk.name} → ${newStatus}`);
  toast(`${t("status")}: ${newStatus}`, "info");
  Router.refresh();
}

function completeTask(taskId) {
  const tk = getTaskById(taskId);
  if (!tk) return;
  const sess = Session.get();
  tk.status = "Completed";
  tk.completedAt = nowISO();
  tk.completedBy = sess.name;
  tk.notCompletedReason = null;
  if (tk.handoverStatus === "Pending") tk.handoverStatus = "Received";
  DB.save();
  audit("Task completed", tk.name);
  toast(t("taskCompleted"), "success");
  Router.refresh();
}

function markNotCompleted(taskId) {
  const tk = getTaskById(taskId);
  if (!tk) return;
  Modal.open({
    title: t("markNotCompleted"),
    body: `
      <p style="font-size:13px;color:var(--text-soft);margin-bottom:10px">${t("markNotCompletedDesc")}</p>
      <select id="ncReasonSelect" style="margin-bottom:10px">
        <option>${t("reasonChanged")}</option><option>${t("reasonRefused")}</option>
        <option>${t("reasonSupplies")}</option><option>${t("reasonEmergency")}</option>
        <option>${t("reasonOther")}</option>
      </select>
      <textarea id="ncReasonText" placeholder="${t("additionalDetails")}"></textarea>
    `,
    footer: `<button class="btn btn-outline" onclick="Modal.close()">${t("cancel")}</button><button class="btn btn-danger" id="ncConfirm">${t("confirm")}</button>`,
    onMount() {
      $("#ncConfirm").onclick = () => {
        const reason = $("#ncReasonSelect").value + ($("#ncReasonText").value ? ` – ${$("#ncReasonText").value}` : "");
        tk.status = "Not Completed"; tk.notCompletedReason = reason; tk.handoverStatus = "Pending";
        DB.save();
        audit("Task marked Not Completed", tk.name, reason);
        toast(t("taskMarkedNC"), "warning");
        Modal.close();
        Router.refresh();
      };
    }
  });
}

function renderNurseSummaryPage(container) {
  const sess = Session.get();
  const myTasks = DB.data.tasks.filter(tk => tk.assignedNurseId === sess.nurseId);
  const myPts = DB.data.patients.filter(p => p.assignedNurseId === sess.nurseId);
  const shift = getActiveShift();

  container.innerHTML = `
    <div class="page-header"><div><h1>${t("myShiftSummary")}</h1><p>${shift ? `${esc(shift.type)} · ${esc(shift.date)}` : t("noShift")}</p></div></div>
    <div class="stats-grid">
      ${statCard(t("myPatients"), myPts.length, "blue", "fa-bed-pulse")}
      ${statCard(t("myTasks"), myTasks.length, "purple", "fa-list-check")}
      ${statCard(t("completed"), myTasks.filter(tk => tk.status === "Completed").length, "green", "fa-circle-check")}
      ${statCard(t("pending"), myTasks.filter(tk => tk.status === "Pending" || tk.status === "In Progress").length, "amber", "fa-hourglass")}
    </div>
    <div class="card">
      <div class="card-title"><i class="fa-solid fa-clipboard-list"></i> ${t("taskDetails")}</div>
      <div class="table-wrap"><table class="data-table">
        <thead><tr><th>${t("taskName")}</th><th>${t("patients")}</th><th>${t("priority")}</th><th>${t("status")}</th><th>${t("completedAt")}</th></tr></thead>
        <tbody>${myTasks.map(tk => {
          const p = getPatientById(tk.patientId);
          return `<tr>
            <td class="cell-strong">${esc(tk.name)}</td><td>${esc(p?.code || "")}</td>
            <td><span class="badge ${tk.priority.toLowerCase()}">${t(tk.priority.toLowerCase())}</span></td>
            <td><span class="badge ${computeTaskStatus(tk).toLowerCase().replace(" ", "")}">${t(computeTaskStatus(tk).toLowerCase().replace(" ", ""))}</span></td>
            <td>${tk.completedAt ? fmtTime(tk.completedAt) : "—"}</td>
          </tr>`;
        }).join("")}</tbody>
      </table></div>
    </div>
  `;
}