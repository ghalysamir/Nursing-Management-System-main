/* ============================================================
   reports.js — Comprehensive Reports
   ============================================================ */
"use strict";

function renderReportsPage(container) {
  const sess = Session.get();

  container.innerHTML = `
    <div class="page-header">
      <div>
        <h1>${t("reports")}</h1>
        <p>${t("reportsDesc")}</p>
      </div>
      <div class="page-actions">
        <button class="btn btn-outline" id="printReportsBtn"><i class="fa-solid fa-print"></i> ${t("print")}</button>
        <button class="btn btn-primary" id="exportReportsBtn"><i class="fa-solid fa-file-csv"></i> ${t("exportCsv")}</button>
      </div>
    </div>

    <!-- Filters -->
    <div class="card" style="margin-bottom:16px">
      <div class="filter-bar" style="margin-bottom:0">
        <select id="reportDeptFilter">
          <option value="">${t("allDepartments")}</option>
          ${DB.data.departments.map(d => `<option value="${d.id}">${esc(d.name)}</option>`).join("")}
        </select>
        <select id="reportNurseFilter">
          <option value="">${t("allNurses")}</option>
          ${DB.data.nurses.map(n => `<option value="${n.id}">${esc(n.name)}</option>`).join("")}
        </select>
        <select id="reportShiftFilter">
          <option value="">${t("allShifts")}</option>
          ${DB.data.settings.shiftTypes.map(s => `<option value="${s.key}">${s.label}</option>`).join("")}
        </select>
        <button class="btn btn-outline btn-sm" id="clearReportFilters">${t("clear")}</button>
      </div>
    </div>

    <div id="reportsBody"></div>
  `;

  function renderBody() {
    const body = $("#reportsBody");
    const deptFilter = $("#reportDeptFilter").value;
    const nurseFilter = $("#reportNurseFilter").value;

    // Filtered data
    let patients = DB.data.patients;
    let nurses = DB.data.nurses;
    let tasks = DB.data.tasks;

    if (deptFilter) {
      patients = patients.filter(p => p.departmentId === deptFilter);
      nurses = nurses.filter(n => n.departmentId === deptFilter);
    }
    if (nurseFilter) {
      nurses = nurses.filter(n => n.id === nurseFilter);
      const nursePids = patients.filter(p => p.assignedNurseId === nurseFilter).map(p => p.id);
      tasks = tasks.filter(tk => nursePids.includes(tk.patientId));
    }

    const completed = tasks.filter(tk => tk.status === "Completed").length;
    const pending = tasks.filter(tk => tk.status === "Pending" || tk.status === "In Progress").length;
    const overdue = tasks.filter(tk => computeTaskStatus(tk) === "Overdue").length;
    const notCompleted = tasks.filter(tk => tk.status === "Not Completed").length;
    const completionRate = tasks.length ? Math.round((completed / tasks.length) * 100) : 0;

    body.innerHTML = `
      <!-- Summary Cards -->
      <div class="stats-grid">
        ${statCard(t("totalPatients"), patients.length, "blue", "fa-bed-pulse")}
        ${statCard(t("nurses"), nurses.length, "teal", "fa-user-nurse")}
        ${statCard(t("totalTasks"), tasks.length, "purple", "fa-list-check")}
        ${statCard(t("taskCompletionRate"), `${completionRate}%`, "green", "fa-percent")}
      </div>

      <!-- Task Report -->
      <div class="card" style="margin-bottom:16px">
        <div class="card-title"><i class="fa-solid fa-list-check"></i> ${t("taskReport")}</div>
        <div class="table-wrap"><table class="data-table">
          <thead><tr>
            <th>${t("status")}</th>
            <th>${t("count")}</th>
            <th>${t("percentage")}</th>
          </tr></thead>
          <tbody>
            <tr><td><span class="badge completed">${t("completed")}</span></td><td><strong>${completed}</strong></td><td>${tasks.length ? Math.round((completed/tasks.length)*100) : 0}%</td></tr>
            <tr><td><span class="badge pending">${t("pending")}</span></td><td><strong>${pending}</strong></td><td>${tasks.length ? Math.round((pending/tasks.length)*100) : 0}%</td></tr>
            <tr><td><span class="badge overdue">${t("overdue")}</span></td><td><strong>${overdue}</strong></td><td>${tasks.length ? Math.round((overdue/tasks.length)*100) : 0}%</td></tr>
            <tr><td><span class="badge notcompleted">${t("notCompleted")}</span></td><td><strong>${notCompleted}</strong></td><td>${tasks.length ? Math.round((notCompleted/tasks.length)*100) : 0}%</td></tr>
          </tbody>
        </table></div>
      </div>

      <!-- Nurse Performance -->
      <div class="card" style="margin-bottom:16px">
        <div class="card-title"><i class="fa-solid fa-users"></i> ${t("nursePerformance")}</div>
        <div class="table-wrap"><table class="data-table">
          <thead><tr>
            <th>${t("nurses")}</th>
            <th>${t("qualification")}</th>
            <th>${t("capability")}</th>
            <th>${t("patients")}</th>
            <th>${t("totalTasks")}</th>
            <th>${t("completed")}</th>
            <th>${t("overdue")}</th>
            <th>${t("completionRate")}</th>
          </tr></thead>
          <tbody>
            ${nurses.map(n => {
              const myTasks = tasks.filter(tk => tk.assignedNurseId === n.id);
              const comp = myTasks.filter(tk => tk.status === "Completed").length;
              const over = myTasks.filter(tk => computeTaskStatus(tk) === "Overdue").length;
              const rate = myTasks.length ? Math.round((comp / myTasks.length) * 100) : 0;
              const nursePts = patients.filter(p => p.assignedNurseId === n.id);
              return `
                <tr>
                  <td class="cell-strong">${esc(n.name)}<div class="cell-sub">${esc(n.code)}</div></td>
                  <td>${esc(n.qualification)}<div class="cell-sub">${n.experience} ${t("years")}</div></td>
                  <td><span class="badge purple">${getNurseCapability(n)}</span></td>
                  <td>${nursePts.length}</td>
                  <td>${myTasks.length}</td>
                  <td>${comp}</td>
                  <td>${over}</td>
                  <td><strong>${rate}%</strong></td>
                </tr>
              `;
            }).join("")}
          </tbody>
        </table></div>
      </div>

      <!-- Acuity Distribution -->
      <div class="card" style="margin-bottom:16px">
        <div class="card-title"><i class="fa-solid fa-heart-pulse"></i> ${t("acuityDistribution")}</div>
        <div class="table-wrap"><table class="data-table">
          <thead><tr>
            <th>${t("acuity")}</th>
            <th>${t("patients")}</th>
            <th>${t("percentage")}</th>
          </tr></thead>
          <tbody>
            ${[1, 2, 3, 4].map(lvl => {
              const count = patients.filter(p => p.acuity === lvl).length;
              const pct = patients.length ? Math.round((count / patients.length) * 100) : 0;
              return `<tr>
                <td><span class="meter"><span class="dot level-${lvl}"></span>L${lvl} – ${t(ACUITY_LABELS[lvl])}</span></td>
                <td><strong>${count}</strong></td>
                <td>${pct}%</td>
              </tr>`;
            }).join("")}
          </tbody>
        </table></div>
      </div>

      <!-- Handover Report -->
      <div class="card" style="margin-bottom:16px">
        <div class="card-title"><i class="fa-solid fa-handshake"></i> ${t("handoverReport")}</div>
        <div class="stats-grid" style="margin-bottom:0">
          ${statCard(t("pendingHandovers"), DB.data.handovers.filter(h => h.status === "Awaiting Acceptance").length, "amber", "fa-hourglass")}
          ${statCard(t("acceptedHandovers"), DB.data.handovers.filter(h => h.status === "Accepted").length, "green", "fa-check-circle")}
          ${statCard(t("incompleteTasksTransferred"), DB.data.tasks.filter(tk => tk.handoverStatus === "Pending").length, "red", "fa-exclamation-triangle")}
          ${statCard(t("receivedTasks"), DB.data.tasks.filter(tk => tk.handoverStatus === "Received").length, "teal", "fa-check")}
        </div>
      </div>

      <!-- Incidents Report -->
      <div class="card">
        <div class="card-title"><i class="fa-solid fa-shield-halved"></i> ${t("incidentReport")}</div>
        <div class="table-wrap"><table class="data-table">
          <thead><tr>
            <th>${t("status")}</th>
            <th>${t("count")}</th>
          </tr></thead>
          <tbody>
            ${["Reported", "Under Review", "Action Required", "Resolved", "Closed"].map(st => {
              const count = (DB.data.incidents || []).filter(i => i.status === st).length;
              return `<tr><td><span class="badge ${st.toLowerCase().replace(/ /g, "")}">${st}</span></td><td><strong>${count}</strong></td></tr>`;
            }).join("")}
          </tbody>
        </table></div>
      </div>
    `;
  }

  $("#reportDeptFilter").addEventListener("change", renderBody);
  $("#reportNurseFilter").addEventListener("change", renderBody);
  $("#clearReportFilters").onclick = () => {
    $("#reportDeptFilter").value = "";
    $("#reportNurseFilter").value = "";
    $("#reportShiftFilter").value = "";
    renderBody();
  };

  $("#printReportsBtn").onclick = () => window.print();
  $("#exportReportsBtn").onclick = () => exportReportsCSV();

  renderBody();
}

function exportReportsCSV() {
  const rows = [
    ["Report", "Metric", "Value"]
  ];

  rows.push(["Summary", "Total Patients", DB.data.patients.length]);
  rows.push(["Summary", "Total Nurses", DB.data.nurses.length]);
  rows.push(["Summary", "Total Tasks", DB.data.tasks.length]);
  rows.push(["Summary", "Completed Tasks", DB.data.tasks.filter(tk => tk.status === "Completed").length]);
  rows.push(["Summary", "Overdue Tasks", DB.data.tasks.filter(tk => computeTaskStatus(tk) === "Overdue").length]);
  rows.push(["Summary", "Not Completed Tasks", DB.data.tasks.filter(tk => tk.status === "Not Completed").length]);
  rows.push(["Summary", "Pending Handovers", DB.data.handovers.filter(h => h.status === "Awaiting Acceptance").length]);
  rows.push(["Summary", "Total Incidents", (DB.data.incidents || []).length]);
  rows.push([]);

  rows.push(["Nurse Performance", "Nurse", "Capability", "Patients", "Tasks", "Completed", "Overdue", "Completion %"]);
  DB.data.nurses.forEach(n => {
    const myTasks = DB.data.tasks.filter(tk => tk.assignedNurseId === n.id);
    const comp = myTasks.filter(tk => tk.status === "Completed").length;
    const over = myTasks.filter(tk => computeTaskStatus(tk) === "Overdue").length;
    const rate = myTasks.length ? Math.round((comp / myTasks.length) * 100) : 0;
    rows.push(["", n.name, getNurseCapability(n), DB.data.patients.filter(p => p.assignedNurseId === n.id).length, myTasks.length, comp, over, rate + "%"]);
  });

  const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
  downloadFile(`reports-${todayStr()}.csv`, csv);
  toast(t("csvExported"), "success");
}