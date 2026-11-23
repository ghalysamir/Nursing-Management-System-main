/* ============================================================
   tasks.js — Nursing Task Management
   ============================================================ */
"use strict";

const PRIORITY_ORDER = { Critical: 0, High: 1, Medium: 2, Low: 3 };

const TASK_CATALOG = [
  "Vital Signs Monitoring", "Medication Administration", "Blood Glucose Monitoring",
  "Patient Repositioning", "Wound Dressing", "Intake & Output Monitoring",
  "Specimen Collection", "Patient Education", "Laboratory Results Follow-up",
  "Patient Preparation for Procedures", "Patient Mobilization", "Feeding Assistance",
  "Patient Hygiene", "Patient Observation", "Documentation", "X-Ray / Radiology"
];

function getTasks() { return DB.data.tasks; }
function getTaskById(id) { return DB.data.tasks.find(t => t.id === id); }

function taskSortComparator(a, b) {
  const pa = PRIORITY_ORDER[a.priority] ?? 9;
  const pb = PRIORITY_ORDER[b.priority] ?? 9;
  if (pa !== pb) return pa - pb;
  const ta = a.dueTime ? timeToMinutes(a.dueTime) : 9999;
  const tb = b.dueTime ? timeToMinutes(b.dueTime) : 9999;
  return ta - tb;
}

function computeTaskStatus(task) {
  if (task.status === "Completed" || task.status === "Not Completed" || task.status === "Cancelled") return task.status;
  if (task.dueTime) {
    const dueMin = timeToMinutes(task.dueTime);
    if (dueMin !== null && minutesNow() > dueMin) return "Overdue";
  }
  return task.status;
}

/* ---------- Head Nurse Task Page ---------- */
function renderTasksPage(container) {
  container.innerHTML = `
    <div class="page-header">
      <div><h1>${t("tasks")}</h1><p>${t("tasksDesc")}</p></div>
      <div class="page-actions">
        <button class="btn btn-primary" id="addTaskBtn"><i class="fa-solid fa-plus"></i> ${t("addTask")}</button>
        <button class="btn btn-outline" id="seedTasksBtn"><i class="fa-solid fa-wand-magic-sparkles"></i> ${t("autoSeed")}</button>
      </div>
    </div>
    <div class="filter-bar">
      <input type="text" id="taskSearch" class="search-input" placeholder="${t("searchTasks")}" />
      <select id="taskPriorityFilter"><option value="">${t("allPriorities")}</option><option>Critical</option><option>High</option><option>Medium</option><option>Low</option></select>
      <select id="taskStatusFilter"><option value="">${t("allStatuses")}</option><option>Pending</option><option>In Progress</option><option>Completed</option><option>Overdue</option><option>Not Completed</option></select>
      <select id="taskNurseFilter"><option value="">${t("allNurses")}</option>${DB.data.nurses.map(n => `<option value="${n.id}">${esc(n.name)}</option>`).join("")}</select>
    </div>
    <div class="card"><div id="taskTableContainer"></div></div>
  `;

  function renderTable() {
    const q = $("#taskSearch").value.trim().toLowerCase();
    const pri = $("#taskPriorityFilter").value;
    const sta = $("#taskStatusFilter").value;
    const nid = $("#taskNurseFilter").value;

    let changed = false;
    DB.data.tasks.forEach(tk => {
      if (tk.status === "Pending" || tk.status === "In Progress") {
        const computed = computeTaskStatus(tk);
        if (computed === "Overdue" && tk.status !== "Overdue") { tk.status = "Overdue"; changed = true; }
      }
    });
    if (changed) DB.save();

    const list = DB.data.tasks.filter(tk => {
      if (pri && tk.priority !== pri) return false;
      if (sta && tk.status !== sta) return false;
      if (nid && tk.assignedNurseId !== nid) return false;
      if (q) {
        const patient = getPatientById(tk.patientId);
        const nurse = getNurseById(tk.assignedNurseId);
        const blob = `${tk.name} ${tk.description || ""} ${patient?.name || ""} ${patient?.code || ""} ${nurse?.name || ""}`.toLowerCase();
        if (!blob.includes(q)) return false;
      }
      return true;
    }).sort(taskSortComparator);

    const wrap = $("#taskTableContainer");
    if (!list.length) {
      wrap.innerHTML = `<div class="empty-state"><i class="fa-solid fa-list-check"></i><h4>${t("noData")}</h4><p>${t("addTask")}</p></div>`;
      return;
    }

    wrap.innerHTML = `
      <div class="table-wrap"><table class="data-table">
        <thead><tr>
          <th>${t("taskName")}</th><th>${t("patients")}</th><th>${t("nurses")}</th>
          <th>${t("priority")}</th><th>${t("dueTime")}</th><th>${t("status")}</th><th></th>
        </tr></thead>
        <tbody>
          ${list.map(tk => {
            const p = getPatientById(tk.patientId);
            const n = getNurseById(tk.assignedNurseId);
            const statusLower = tk.status.toLowerCase().replace(" ", "");
            const createdByNurse = tk.createdByRole === "nurse" ? `<div class="cell-sub" style="color:var(--blue)">Created by: ${esc(tk.createdBy || "Nurse")}</div>` : "";
            return `
              <tr>
                <td class="cell-strong">${esc(tk.name)} ${createdByNurse}<div class="cell-sub">${esc(tk.description || "")}</div></td>
                <td>${p ? `${esc(p.code)}<div class="cell-sub">${esc(p.name)}</div>` : "—"}</td>
                <td>${n ? esc(n.name) : "—"}</td>
                <td><span class="badge ${tk.priority.toLowerCase()}">${t(tk.priority.toLowerCase())}</span></td>
                <td>${esc(tk.dueTime || "—")}</td>
                <td><span class="badge ${statusLower}">${t(statusLower)}</span></td>
                <td>
                  <div class="table-actions">
                    <button class="btn btn-sm btn-outline" data-edit="${tk.id}" title="${t("edit")}"><i class="fa-solid fa-pen"></i></button>
                    <button class="btn btn-sm btn-danger" data-del="${tk.id}" title="${t("delete")}"><i class="fa-solid fa-trash"></i></button>
                  </div>
                </td>
              </tr>
            `;
          }).join("")}
        </tbody>
      </table></div>
    `;

    $$("[data-edit]", wrap).forEach(b => b.onclick = () => openTaskForm(b.dataset.edit));
    $$("[data-del]", wrap).forEach(b => b.onclick = () => deleteTask(b.dataset.del));
  }

  $("#taskSearch").addEventListener("input", renderTable);
  $("#taskPriorityFilter").addEventListener("change", renderTable);
  $("#taskStatusFilter").addEventListener("change", renderTable);
  $("#taskNurseFilter").addEventListener("change", renderTable);
  $("#addTaskBtn").onclick = () => openTaskForm(null);
  $("#seedTasksBtn").onclick = autoSeedTasks;
  renderTable();
}

function openTaskForm(taskId, isNurseCreating = false) {
  const sess = Session.get();
  const editing = taskId ? getTaskById(taskId) : null;
  let patients = DB.data.patients.filter(p => p.assignedNurseId);
  if (isNurseCreating) patients = patients.filter(p => p.assignedNurseId === sess.nurseId);

  if (!patients.length) { toast(t("assignPatientsFirst"), "warning"); return; }

  Modal.open({
    title: editing ? t("editTask") : t("addTask"),
    wide: true,
    body: `
      <form id="taskForm" class="form-grid">
        <div class="full">
          <label><small>${t("patients")} *</small></label>
          <select id="tfPatient">
            ${patients.map(p => `<option value="${p.id}" ${editing?.patientId === p.id ? "selected" : ""}>${esc(p.code)} – ${esc(p.name)}</option>`).join("")}
          </select>
        </div>
        <div>
          <label><small>${t("taskName")} *</small></label>
          <input type="text" id="tfName" list="taskCatalog" value="${esc(editing?.name || "")}" required />
          <datalist id="taskCatalog">${TASK_CATALOG.map(tn => `<option value="${tn}">`).join("")}</datalist>
        </div>
        <div>
          <label><small>${t("priority")} *</small></label>
          <select id="tfPriority">
            ${["Critical", "High", "Medium", "Low"].map(p => `<option ${editing?.priority === p ? "selected" : ""}>${p}</option>`).join("")}
          </select>
        </div>
        <div>
          <label><small>${t("dueTime")}</small></label>
          <input type="time" id="tfDue" value="${esc(editing?.dueTime || "")}" />
        </div>
        <div>
          <label><small>${t("estimatedDuration")} (${t("minutes")})</small></label>
          <input type="number" id="tfDuration" min="1" value="${editing?.estimatedDuration ?? 10}" />
        </div>
        <div class="full">
          <label><small>${t("description")}</small></label>
          <textarea id="tfDesc" placeholder="${t("taskDescriptionPlaceholder")}">${esc(editing?.description || "")}</textarea>
        </div>
        <div class="full">
          <label><small>${t("specialInstructions")}</small></label>
          <input type="text" id="tfInstr" value="${esc(editing?.specialInstructions || "")}" />
        </div>
      </form>
    `,
    footer: `
      <button class="btn btn-outline" id="tfCancel">${t("cancel")}</button>
      <button class="btn btn-primary" id="tfSave">${editing ? t("update") : t("add")}</button>
    `,
    onMount() {
      $("#tfCancel").onclick = () => Modal.close();
      $("#tfSave").onclick = () => {
        const name = $("#tfName").value.trim();
        if (!name) { toast(t("required"), "error"); return; }
        const pid = $("#tfPatient").value;
        const patient = getPatientById(pid);
        if (!patient) { toast(t("required"), "error"); return; }

        const payload = {
          patientId: pid, assignedNurseId: patient.assignedNurseId,
          name, priority: $("#tfPriority").value, dueTime: $("#tfDue").value,
          estimatedDuration: Number($("#tfDuration").value) || 10,
          description: $("#tfDesc").value.trim(), specialInstructions: $("#tfInstr").value.trim()
        };

        if (editing) {
          Object.assign(editing, payload);
          audit("Task updated", `${name}`);
          toast(t("dataSaved"), "success");
        } else {
          const newTask = {
            id: uid("task"), ...payload, status: "Pending", completedAt: null, completedBy: null,
            notCompletedReason: null, handoverStatus: "N/A", receivedBy: null, receivedAt: null,
            handoverNote: null, createdAt: nowISO(), createdBy: sess.name, createdByRole: sess.role
          };
          DB.data.tasks.push(newTask);
          audit("Task created", `${name} for ${patient.code}`);

          if (payload.assignedNurseId) {
            pushNotification({
              key: `newtask-${newTask.id}`, type: "New Task Added",
              priority: payload.priority === "Critical" ? "critical" : payload.priority === "High" ? "high" : "medium",
              title: `${t("newTask")}: ${payload.name}`,
              message: `${t("addedBy")} ${sess.role} · ${patient.code}`,
              taskId: newTask.id, targetNurseId: payload.assignedNurseId, navigateTo: "nurseTasks"
            });
          }
          if (sess.role === "nurse") {
            // Notify Head Nurse
            pushNotification({
              key: `nurseTask-${newTask.id}`, type: "Staff Nurse Alert", priority: "high",
              title: `New Task by ${sess.name}`,
              message: `${patient.code}: ${payload.name} - ${payload.priority}`,
              taskId: newTask.id, navigateTo: "tasks", targetRole: "headnurse"
            });
          }
          toast(t("taskCreatedNotified"), "success");
        }
        DB.save();
        Modal.close();
        Router.refresh();
      };
    }
  });
}

function deleteTask(id) {
  const tk = getTaskById(id);
  if (!tk) return;
  Modal.confirm({
    title: t("delete"), message: `${t("deleteConfirmMsg")} (${tk.name})`, confirmText: t("delete"), danger: true,
    onConfirm: () => {
      DB.data.tasks = DB.data.tasks.filter(x => x.id !== id);
      audit("Task deleted", tk.name);
      DB.save();
      toast(t("dataDeleted"), "success");
      Router.refresh();
    }
  });
}

function autoSeedTasks() {
  const patients = DB.data.patients.filter(p => p.assignedNurseId);
  if (!patients.length) { toast(t("assignPatientsFirst"), "warning"); return; }

  let created = 0;
  patients.forEach(p => {
    (p.careNeeds || []).forEach(care => {
      if (DB.data.tasks.some(tk => tk.patientId === p.id && tk.name.toLowerCase() === care.toLowerCase())) return;
      const priority = p.acuity >= 4 ? "Critical" : p.acuity >= 3 ? "High" : "Medium";
      DB.data.tasks.push({
        id: uid("task"), patientId: p.id, assignedNurseId: p.assignedNurseId,
        name: care, priority, dueTime: defaultDueFor(care), estimatedDuration: taskDuration(care),
        description: t("autoGenerated"), specialInstructions: "", status: "Pending", completedAt: null,
        completedBy: null, notCompletedReason: null, handoverStatus: "N/A", receivedBy: null,
        receivedAt: null, handoverNote: null, createdAt: nowISO(), createdBy: Session.get().name, createdByRole: "headnurse"
      });
      created++;
    });
  });
  DB.save();
  audit("Auto-seed tasks", `${created} tasks created`);
  toast(`${created} ${t("tasksCreated")}`, "success");
  Router.refresh();
}

function defaultDueFor(name) {
  const n = name.toLowerCase();
  if (n.includes("vital")) return "08:00";
  if (n.includes("medication")) return "09:00";
  if (n.includes("glucose")) return "07:30";
  if (n.includes("reposition")) return "10:00";
  if (n.includes("wound")) return "11:00";
  return "10:30";
}