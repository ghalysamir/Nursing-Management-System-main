/* ============================================================
   backup.js — Backup / Restore / Reset
   ============================================================ */
"use strict";

function renderBackupPage(container) {
  container.innerHTML = `
    <div class="page-header">
      <div>
        <h1>${t("dataManagement")}</h1>
        <p>${t("backupDesc")}</p>
      </div>
    </div>

    <div class="grid-2" style="margin-bottom:16px">
      <div class="card">
        <div class="card-title"><i class="fa-solid fa-download"></i> ${t("exportBackup")}</div>
        <p style="font-size:12.5px;color:var(--text-soft);line-height:1.7;margin-bottom:12px">
          ${t("exportBackupDesc")}
        </p>
        <button class="btn btn-primary" id="exportBackupBtn">
          <i class="fa-solid fa-download"></i> ${t("downloadJson")}
        </button>
      </div>

      <div class="card">
        <div class="card-title"><i class="fa-solid fa-upload"></i> ${t("importBackup")}</div>
        <p style="font-size:12.5px;color:var(--text-soft);line-height:1.7;margin-bottom:12px">
          ${t("importBackupDesc")}
        </p>
        <input type="file" id="importFile" accept=".json" style="display:none" />
        <button class="btn btn-outline" id="importBackupBtn">
          <i class="fa-solid fa-upload"></i> ${t("uploadJson")}
        </button>
      </div>
    </div>

    <div class="card" style="background:#fef2f2;border-color:#fecaca;margin-bottom:16px">
      <div class="card-title"><i class="fa-solid fa-triangle-exclamation" style="color:var(--red)"></i> ${t("dangerZone")}</div>
      <p style="font-size:12.5px;color:#7f1d1d;line-height:1.7;margin-bottom:12px">
        ${t("dangerZoneDesc")}
      </p>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        <button class="btn btn-danger" id="resetDemoBtn2">
          <i class="fa-solid fa-rotate"></i> ${t("resetDemo")}
        </button>
        <button class="btn btn-outline" id="clearAllBtn" style="border-color:var(--red);color:var(--red)">
          <i class="fa-solid fa-trash"></i> ${t("clearAll")}
        </button>
      </div>
    </div>

    <div class="card">
      <div class="card-title"><i class="fa-solid fa-chart-simple"></i> ${t("currentData")}</div>
      <div class="stats-grid" style="margin-bottom:0">
        ${statCard(t("nurses"), DB.data.nurses.length, "blue", "fa-user-nurse")}
        ${statCard(t("patients"), DB.data.patients.length, "teal", "fa-bed-pulse")}
        ${statCard(t("totalTasks"), DB.data.tasks.length, "purple", "fa-list-check")}
        ${statCard(t("notifications"), DB.data.notifications.length, "amber", "fa-bell")}
        ${statCard(t("auditEvents"), DB.data.auditTrail.length, "green", "fa-clipboard-list")}
        ${statCard(t("handovers"), (DB.data.handovers || []).length, "purple", "fa-handshake")}
      </div>
    </div>
  `;

  $("#exportBackupBtn").onclick = () => {
    const data = {
      ...DB.data,
      __meta: {
        exportDate: nowISO(),
        version: "v3",
        appName: "Smart Nursing Management System"
      }
    };
    const json = JSON.stringify(data, null, 2);
    downloadFile(`backup-${todayStr()}.json`, json, "application/json");
    toast(t("backupExported"), "success");
    audit("Backup exported", `${DB.data.patients.length} patients, ${DB.data.tasks.length} tasks`);
  };

  $("#importBackupBtn").onclick = () => $("#importFile").click();

  $("#importFile").onchange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target.result);
        if (!data.users || !data.nurses || !data.patients) {
          throw new Error("Invalid backup file structure");
        }
        Modal.confirm({
          title: t("importBackup"),
          message: t("importConfirm"),
          confirmText: t("import"),
          danger: true,
          onConfirm: () => {
            DB.data = data;
            DB.save();
            audit("Backup imported", file.name);
            toast(t("backupImported"), "success");
            setTimeout(() => location.reload(), 800);
          }
        });
      } catch (err) {
        toast(t("invalidBackup"), "error");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  $("#resetDemoBtn2").onclick = () => {
    Modal.confirm({
      title: t("resetDemo"),
      message: t("resetDemoConfirm"),
      confirmText: t("resetDemoBtn"),
      danger: true,
      onConfirm: () => {
        DB.reset();
        Session.clear();
        toast(t("resetDemoDone"), "success");
        setTimeout(() => location.reload(), 600);
      }
    });
  };

  $("#clearAllBtn").onclick = () => {
    Modal.confirm({
      title: t("clearAll"),
      message: t("clearAllDataConfirm"),
      confirmText: t("clearAll"),
      danger: true,
      onConfirm: () => {
        const empty = DB.defaults();
        empty.nurses = [];
        empty.patients = [];
        empty.tasks = [];
        empty.departments = [{ id: "dep_1", name: "Medical Ward", active: true }];
        empty.shifts = [];
        empty.assignments = [];
        empty.assignmentLock = {};
        empty.reassignmentLog = [];
        empty.documentation = [];
        empty.notifications = [];
        empty.auditTrail = [];
        empty.escalations = [];
        empty.handovers = [];
        empty.vitals = [];
        empty.medications = [];
        empty.carePlans = [];
        empty.announcements = [];
        empty.incidents = [];
        DB.data = empty;
        DB.save();
        toast(t("dataCleared"), "success");
        setTimeout(() => location.reload(), 600);
      }
    });
  };
}