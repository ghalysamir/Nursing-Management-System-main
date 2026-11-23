/* ============================================================
   monitoring-dashboard.js — Head Nurse Real-time Monitoring
   ============================================================ */
"use strict";

function renderMonitorPage(container) {
  const nurses = DB.data.nurses.filter(n => n.availability === "available" || n.availability === "on_duty");
  const allTasks = DB.data.tasks;

  container.innerHTML = `
    <div class="page-header">
      <div>
        <h1>${t("monitor")}</h1>
        <p>${t("monitorDesc")}</p>
      </div>
      <div class="page-actions">
        <button class="btn btn-outline" id="refreshMonitorBtn">
          <i class="fa-solid fa-rotate"></i> ${t("refresh")}
        </button>
      </div>
    </div>

    <div class="grid-2">
      ${nurses.map(n => {
        const myPts = DB.data.patients.filter(p => p.assignedNurseId === n.id);
        const myTasks = allTasks.filter(tk => tk.assignedNurseId === n.id);
        const comp = myTasks.filter(tk => tk.status === "Completed").length;
        const prog = myTasks.filter(tk => tk.status === "In Progress").length;
        const pend = myTasks.filter(tk => tk.status === "Pending").length;
        const over = myTasks.filter(tk => computeTaskStatus(tk) === "Overdue").length;
        const nc = myTasks.filter(tk => tk.status === "Not Completed").length;
        const wl = getActiveShift() ? computeNurseWorkloads(getActiveShift()).find(w => w.nurse.id === n.id) : null;
        const cap = getNurseCapability(n);

        return `
          <div class="card">
            <div class="card-title" style="justify-content:space-between;flex-wrap:wrap;gap:6px">
              <span><i class="fa-solid fa-user-nurse"></i> ${esc(n.name)}</span>
              <div style="display:flex;gap:5px;flex-wrap:wrap">
                <span class="badge purple">Cap: ${cap}</span>
                <span class="badge teal">${myPts.length} ${t("patients")}</span>
              </div>
            </div>
            <div class="cell-sub" style="font-size:11.5px;margin-bottom:10px">${esc(n.qualification)} · ${n.experience} ${t("years")}</div>
            <div style="display:grid;grid-template-columns:repeat(5,1fr);gap:8px;margin-bottom:12px;font-size:11.5px;text-align:center">
              <div><div style="font-size:18px;font-weight:800;color:var(--green)">${comp}</div>${t("completed")}</div>
              <div><div style="font-size:18px;font-weight:800;color:var(--blue)">${prog}</div>${t("inProgress")}</div>
              <div><div style="font-size:18px;font-weight:800;color:var(--amber)">${pend}</div>${t("pending")}</div>
              <div><div style="font-size:18px;font-weight:800;color:var(--red)">${over}</div>${t("overdue")}</div>
              <div><div style="font-size:18px;font-weight:800;color:#be185d">${nc}</div>${t("notCompleted")}</div>
            </div>
            ${wl ? `<div style="font-size:12px;color:var(--text-muted);margin-bottom:8px">
              ${t("workload")}: <strong style="color:var(--navy)">${wl.totalMinutes} min (${wl.utilization}%)</strong>
              · <span class="badge ${wl.level === "overload" ? "critical" : wl.level === "high" ? "high" : "teal"}">${t(wl.level)}</span>
            </div>` : ""}
            <div style="font-size:12px;color:var(--text-muted)">
              <strong>${t("patients")}:</strong> ${myPts.map(p => esc(p.code)).join(", ") || "—"}
            </div>
          </div>
        `;
      }).join("")}
    </div>
  `;

  $("#refreshMonitorBtn").onclick = () => Router.refresh();
}