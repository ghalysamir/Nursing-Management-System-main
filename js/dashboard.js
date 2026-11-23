/* ============================================================
   dashboard.js — Head Nurse dashboard with Chart.js
   ============================================================ */
"use strict";

let __charts = {};

function destroyCharts() {
  Object.values(__charts).forEach(c => { try { c.destroy(); } catch {} });
  __charts = {};
}

function chartColors() {
  const dark = document.documentElement.getAttribute("data-theme") === "dark"
    || (document.documentElement.getAttribute("data-theme") === "system"
        && window.matchMedia("(prefers-color-scheme: dark)").matches);
  return {
    text: dark ? "#94a3b8" : "#64748b",
    grid: dark ? "#243448" : "#e2e8f0",
    bg: dark ? "#142235" : "#ffffff"
  };
}

function renderHeadDashboard(container) {
  destroyCharts();

  const patients = DB.data.patients;
  const nurses = DB.data.nurses;
  const tasks = DB.data.tasks;
  const sess = Session.get();

  const completed = tasks.filter(t => t.status === "Completed").length;
  const pending = tasks.filter(t => t.status === "Pending" || t.status === "In Progress").length;
  const overdue = tasks.filter(t => t.status === "Overdue").length;
  const notCompleted = tasks.filter(t => t.status === "Not Completed").length;

  container.innerHTML = `
    <div class="page-header">
      <div>
        <h1>${t("welcome")}, ${esc(sess?.name || "")}</h1>
        <p>${t("dashboard")}</p>
      </div>
    </div>

    <div class="stats-grid">
      ${statCard(t("totalPatients"), patients.length, "blue", "fa-bed-pulse")}
      ${statCard(t("availableNurses"), nurses.filter(n => n.availability === "available").length, "teal", "fa-user-nurse")}
      ${statCard(t("totalTasks"), tasks.length, "purple", "fa-list-check")}
      ${statCard(t("completedTasks"), completed, "green", "fa-circle-check")}
      ${statCard(t("pendingTasks"), pending, "amber", "fa-hourglass-half")}
      ${statCard(t("overdueTasks"), overdue, "red", "fa-triangle-exclamation")}
      ${statCard(t("notCompletedTasks"), notCompleted, "red", "fa-circle-xmark")}
    </div>

    <div class="grid-dash">
      <div class="card">
        <div class="card-title"><i class="fa-solid fa-chart-pie"></i> ${t("taskCompletion")}</div>
        <div class="chart-container"><canvas id="taskChart"></canvas></div>
      </div>
      <div class="card">
        <div class="card-title"><i class="fa-solid fa-bed-pulse"></i> ${t("patients")}</div>
        <div class="chart-container"><canvas id="patientChart"></canvas></div>
      </div>
    </div>
  `;

  setTimeout(() => {
    if (typeof Chart === "undefined") return;
    const c = chartColors();

    const taskCanvas = document.getElementById("taskChart");
    if (taskCanvas) {
      __charts.task = new Chart(taskCanvas, {
        type: "doughnut",
        data: {
          labels: [t("completedTasks"), t("pendingTasks"), t("overdueTasks"), t("notCompletedTasks")],
          datasets: [{
            data: [completed, pending, overdue, notCompleted],
            backgroundColor: ["#16a34a", "#3b82f6", "#dc2626", "#be185d"],
            borderWidth: 0
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { labels: { color: c.text, font: { size: 12 } } }
          },
          cutout: "62%"
        }
      });
    }

    const acuityCounts = { 1: 0, 2: 0, 3: 0, 4: 0 };
    patients.forEach(p => { acuityCounts[p.acuity] = (acuityCounts[p.acuity] || 0) + 1; });

    const patientCanvas = document.getElementById("patientChart");
    if (patientCanvas) {
      __charts.patient = new Chart(patientCanvas, {
        type: "bar",
        data: {
          labels: ["L1 " + t("low"), "L2 " + t("medium"), "L3 " + t("high"), "L4 " + t("critical")],
          datasets: [{
            label: t("patients"),
            data: [acuityCounts[1], acuityCounts[2], acuityCounts[3], acuityCounts[4]],
            backgroundColor: ["#22c55e", "#3b82f6", "#f59e0b", "#dc2626"],
            borderRadius: 8,
            borderSkipped: false
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            y: { beginAtZero: true, ticks: { color: c.text, stepSize: 1 }, grid: { color: c.grid } },
            x: { ticks: { color: c.text }, grid: { display: false } }
          }
        }
      });
    }
  }, 50);
}

function statCard(label, value, color, icon) {
  return `<div class="stat-card">
    <div class="stat-icon ${color}"><i class="fa-solid ${icon}"></i></div>
    <div class="stat-info"><small>${label}</small><strong>${value}</strong></div>
  </div>`;
}