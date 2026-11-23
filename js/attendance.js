/* ============================================================
   attendance.js — Check-in / Check-out / Leave / Overtime
   ============================================================ */
"use strict";

function renderAttendancePage(container) {
  const sess = Session.get();
  const today = todayStr();

  container.innerHTML = `
    <div class="page-header">
      <div>
        <h1>${t("attendance")}</h1>
        <p>${t("attendanceDesc")}</p>
      </div>
      <div class="page-actions">
        <button class="btn btn-outline" id="exportAttendanceBtn"><i class="fa-solid fa-file-csv"></i> CSV</button>
      </div>
    </div>

    <div class="stats-grid">
      ${statCard(t("onDuty"), DB.data.nurses.filter(n => n.availability === "on_duty").length, "green", "fa-user-clock")}
      ${statCard(t("available"), DB.data.nurses.filter(n => n.availability === "available").length, "teal", "fa-check-circle")}
      ${statCard(t("onLeave"), DB.data.nurses.filter(n => n.availability === "on_leave").length, "amber", "fa-plane")}
      ${statCard(t("absent"), DB.data.nurses.filter(n => n.availability === "absent").length, "red", "fa-user-slash")}
    </div>

    <div class="card">
      <div class="card-title"><i class="fa-solid fa-user-clock"></i> ${t("nurses")}</div>
      <div class="table-wrap">
        <table class="data-table">
          <thead>
            <tr>
              <th>${t("nurses")}</th>
              <th>${t("qualification")}</th>
              <th>${t("status")}</th>
              <th>${t("shift")}</th>
              <th>${t("actions")}</th>
            </tr>
          </thead>
          <tbody>
            ${DB.data.nurses.map(n => {
              const status = getNurseDisplayStatus(n);
              return `
                <tr>
                  <td class="cell-strong">${esc(n.name)}<div class="cell-sub">${esc(n.code)}</div></td>
                  <td>${esc(n.qualification)}</td>
                  <td><span class="badge ${status.cls}">${status.label}</span></td>
                  <td>${esc(n.assignedShift || "—")}</td>
                  <td>
                    <div class="table-actions">
                      <button class="btn btn-xs btn-teal" data-checkin="${n.id}">${t("checkIn")}</button>
                      <button class="btn btn-xs btn-outline" data-checkout="${n.id}">${t("checkOut")}</button>
                      <button class="btn btn-xs btn-outline" data-leave="${n.id}">${t("leave")}</button>
                      <button class="btn btn-xs btn-outline" data-absent="${n.id}">${t("absent")}</button>
                    </div>
                  </td>
                </tr>
              `;
            }).join("")}
          </tbody>
        </table>
      </div>
    </div>
  `;

  function setStatus(nurseId, newStatus, label) {
    const n = getNurseById(nurseId);
    if (!n) return;
    n.availability = newStatus;
    n.statusUpdatedAt = nowISO();
    DB.save();
    audit(`Nurse ${label}`, n.name);
    toast(`${n.name} → ${label}`, "success");
    Router.refresh();
  }

  $$("[data-checkin]", container).forEach(b => b.onclick = () => setStatus(b.dataset.checkin, "on_duty", t("onDuty")));
  $$("[data-checkout]", container).forEach(b => b.onclick = () => setStatus(b.dataset.checkout, "off_duty", t("offDuty")));
  $$("[data-leave]", container).forEach(b => b.onclick = () => setStatus(b.dataset.leave, "on_leave", t("onLeave")));
  $$("[data-absent]", container).forEach(b => b.onclick = () => setStatus(b.dataset.absent, "absent", t("absent")));

  $("#exportAttendanceBtn").onclick = () => {
    const rows = [["Nurse", "Code", "Status", "Shift", "Updated"]];
    DB.data.nurses.forEach(n => {
      rows.push([n.name, n.code, n.availability, n.assignedShift || "", n.statusUpdatedAt || ""]);
    });
    const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    downloadFile("attendance.csv", csv);
    toast(t("dataSaved"), "success");
  };
}