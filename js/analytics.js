/* ============================================================
   analytics.js — Analytics Dashboard with Charts
   ============================================================ */
"use strict";

let __analyticsCharts = {};

function destroyAnalyticsCharts() {
  Object.values(__analyticsCharts).forEach(c => { try { c.destroy(); } catch {} });
  __analyticsCharts = {};
}

function getChartColors() {
  const dark = document.documentElement.getAttribute("data-theme") === "dark"
    || (document.documentElement.getAttribute("data-theme") === "system"
        && window.matchMedia("(prefers-color-scheme: dark)").matches);
  return {
    text: dark ? "#94a3b8" : "#64748b",
    grid: dark ? "#243448" : "#e2e8f0",
    bg: dark ? "#142235" : "#ffffff"
  };
}

function renderAnalyticsPage(container) {
  destroyAnalyticsCharts();

  container.innerHTML = `
    <div class="page-header">
      <div>
        <h1>${t("analytics")}</h1>
        <p>${t("analyticsDesc")}</p>
      </div>
    </div>

    <div class="stats-grid">
      ${statCard(t("taskCompletionRate"), calculateCompletionRate() + "%", "green", "fa-percent")}
      ${statCard(t("avgTaskDelay"), calculateAvgDelay(), "amber", "fa-clock")}
      ${statCard(t("workloadBalance"), calculateWorkloadBalance(), "blue", "fa-balance-scale")}
      ${statCard(t("documentationTime"), calculateDocRate(), "purple", "fa-file-medical")}
    </div>

    <div class="grid-2" style="margin-bottom:16px">
      <div class="card">
        <div class="card-title"><i class="fa-solid fa-chart-pie"></i> ${t("taskCompletion")}</div>
        <div class="chart-container"><canvas id="acTaskChart"></canvas></div>
      </div>
      <div class="card">
        <div class="card-title"><i class="fa-solid fa-chart-bar"></i> ${t("workloadDistribution")}</div>
        <div class="chart-container"><canvas id="acWorkloadChart"></canvas></div>
      </div>
    </div>

    <div class="grid-2" style="margin-bottom:16px">
      <div class="card">
        <div class="card-title"><i class="fa-solid fa-chart-line"></i> ${t("patientAcuity")}</div>
        <div class="chart-container"><canvas id="acAcuityChart"></canvas></div>
      </div>
      <div class="card">
        <div class="card-title"><i class="fa-solid fa-handshake"></i> ${t("handoverStatus")}</div>
        <div class="chart-container"><canvas id="acHandoverChart"></canvas></div>
      </div>
    </div>

    <div class="card">
      <div class="card-title"><i class="fa-solid fa-chart-bar"></i> ${t("tasksPerNurse")}</div>
      <div class="chart-container" style="height:300px"><canvas id="acPerNurseChart"></canvas></div>
    </div>
  `;

  setTimeout(() => {
    if (typeof Chart === "undefined") return;
    const c = getChartColors();

    // 1. Task Completion
    const tasks = DB.data.tasks;
    const completed = tasks.filter(tk => tk.status === "Completed").length;
    const pending = tasks.filter(tk => tk.status === "Pending" || tk.status === "In Progress").length;
    const overdue = tasks.filter(tk => computeTaskStatus(tk) === "Overdue").length;
    const nc = tasks.filter(tk => tk.status === "Not Completed").length;

    const c1 = document.getElementById("acTaskChart");
    if (c1) {
      __analyticsCharts.task = new Chart(c1, {
        type: "doughnut",
        data: {
          labels: [t("completed"), t("pending"), t("overdue"), t("notCompleted")],
          datasets: [{
            data: [completed, pending, overdue, nc],
            backgroundColor: ["#16a34a", "#3b82f6", "#dc2626", "#be185d"],
            borderWidth: 0
          }]
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          plugins: { legend: { labels: { color: c.text } } },
          cutout: "62%"
        }
      });
    }

    // 2. Workload Distribution
    const nurses = DB.data.nurses.filter(n => n.availability === "available" || n.availability === "on_duty");
    const workloads = nurses.map(n => {
      const myTasks = tasks.filter(tk => tk.assignedNurseId === n.id);
      const minutes = myTasks.reduce((s, tk) => s + (tk.estimatedDuration || 10), 0);
      return { name: n.name, minutes };
    });

    const c2 = document.getElementById("acWorkloadChart");
    if (c2) {
      __analyticsCharts.workload = new Chart(c2, {
        type: "bar",
        data: {
          labels: workloads.map(w => w.name),
          datasets: [{
            label: t("minutes"),
            data: workloads.map(w => w.minutes),
            backgroundColor: workloads.map(w => {
              if (w.minutes >= 200) return "#dc2626";
              if (w.minutes >= 150) return "#f59e0b";
              if (w.minutes >= 80) return "#3b82f6";
              return "#22c55e";
            }),
            borderRadius: 8
          }]
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            y: { beginAtZero: true, ticks: { color: c.text }, grid: { color: c.grid } },
            x: { ticks: { color: c.text, maxRotation: 45, minRotation: 0 }, grid: { display: false } }
          }
        }
      });
    }

    // 3. Patient Acuity
    const acuityCounts = { 1: 0, 2: 0, 3: 0, 4: 0 };
    DB.data.patients.forEach(p => { acuityCounts[p.acuity] = (acuityCounts[p.acuity] || 0) + 1; });

    const c3 = document.getElementById("acAcuityChart");
    if (c3) {
      __analyticsCharts.acuity = new Chart(c3, {
        type: "polarArea",
        data: {
          labels: ["L1 " + t("low"), "L2 " + t("medium"), "L3 " + t("high"), "L4 " + t("critical")],
          datasets: [{
            data: [acuityCounts[1], acuityCounts[2], acuityCounts[3], acuityCounts[4]],
            backgroundColor: ["rgba(34,197,94,0.6)", "rgba(59,130,246,0.6)", "rgba(245,158,11,0.6)", "rgba(220,38,38,0.6)"],
            borderColor: ["#22c55e", "#3b82f6", "#f59e0b", "#dc2626"],
            borderWidth: 2
          }]
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          plugins: { legend: { labels: { color: c.text } } },
          scales: { r: { ticks: { color: c.text, backdropColor: "transparent" } } }
        }
      });
    }

    // 4. Handover Status
    const handovers = DB.data.handovers || [];
    const hDraft = handovers.filter(h => h.status === "Draft").length;
    const hSubmitted = handovers.filter(h => h.status === "Submitted").length;
    const hAwaiting = handovers.filter(h => h.status === "Awaiting Acceptance").length;
    const hAccepted = handovers.filter(h => h.status === "Accepted").length;

    const c4 = document.getElementById("acHandoverChart");
    if (c4) {
      __analyticsCharts.handover = new Chart(c4, {
        type: "bar",
        data: {
          labels: [t("draft"), t("submitted"), t("awaitingAcceptance"), t("accepted")],
          datasets: [{
            data: [hDraft, hSubmitted, hAwaiting, hAccepted],
            backgroundColor: ["#94a3b8", "#3b82f6", "#f59e0b", "#16a34a"],
            borderRadius: 8
          }]
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            y: { beginAtZero: true, ticks: { color: c.text, stepSize: 1 }, grid: { color: c.grid } },
            x: { ticks: { color: c.text }, grid: { display: false } }
          }
        }
      });
    }

    // 5. Tasks per Nurse
    const perNurseData = DB.data.nurses.map(n => ({
      name: n.name,
      completed: tasks.filter(tk => tk.assignedNurseId === n.id && tk.status === "Completed").length,
      pending: tasks.filter(tk => tk.assignedNurseId === n.id && (tk.status === "Pending" || tk.status === "In Progress")).length,
      overdue: tasks.filter(tk => tk.assignedNurseId === n.id && computeTaskStatus(tk) === "Overdue").length
    }));

    const c5 = document.getElementById("acPerNurseChart");
    if (c5) {
      __analyticsCharts.perNurse = new Chart(c5, {
        type: "bar",
        data: {
          labels: perNurseData.map(n => n.name),
          datasets: [
            { label: t("completed"), data: perNurseData.map(n => n.completed), backgroundColor: "#16a34a", borderRadius: 6 },
            { label: t("pending"), data: perNurseData.map(n => n.pending), backgroundColor: "#3b82f6", borderRadius: 6 },
            { label: t("overdue"), data: perNurseData.map(n => n.overdue), backgroundColor: "#dc2626", borderRadius: 6 }
          ]
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          plugins: { legend: { labels: { color: c.text } } },
          scales: {
            y: { beginAtZero: true, stacked: true, ticks: { color: c.text }, grid: { color: c.grid } },
            x: { stacked: true, ticks: { color: c.text, maxRotation: 45 }, grid: { display: false } }
          }
        }
      });
    }
  }, 100);
}

function calculateCompletionRate() {
  const tasks = DB.data.tasks;
  if (!tasks.length) return 0;
  const completed = tasks.filter(tk => tk.status === "Completed").length;
  return Math.round((completed / tasks.length) * 100);
}

function calculateAvgDelay() {
  const overdue = DB.data.tasks.filter(tk => computeTaskStatus(tk) === "Overdue");
  if (!overdue.length) return "0 " + t("minutes");
  const totalDelay = overdue.reduce((sum, tk) => {
    if (!tk.dueTime) return sum;
    const delay = minutesNow() - timeToMinutes(tk.dueTime);
    return sum + Math.max(0, delay);
  }, 0);
  return Math.round(totalDelay / overdue.length) + " " + t("minutes");
}

function calculateWorkloadBalance() {
  const shift = getActiveShift();
  if (!shift) return "—";
  const workloads = computeNurseWorkloads(shift);
  if (!workloads.length) return "—";
  const utilizations = workloads.map(w => w.utilization);
  const variance = Math.max(...utilizations) - Math.min(...utilizations);
  if (variance < 20) return "Excellent";
  if (variance < 40) return "Good";
  if (variance < 60) return "Fair";
  return "Poor";
}

function calculateDocRate() {
  const tasks = DB.data.tasks.filter(tk => tk.status === "Completed");
  if (!tasks.length) return 0;
  const withDoc = DB.data.documentation.length;
  return Math.round((withDoc / tasks.length) * 100) + "%";
}