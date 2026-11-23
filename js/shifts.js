/* ============================================================
   shifts.js — Shift Management
   ============================================================ */
"use strict";

function getActiveShift() {
  return DB.data.shifts[0] || null;
}

function shiftTypeHours(type) {
  const found = DB.data.settings.shiftTypes.find(x => x.key === type);
  return found ? found.hours : 6;
}

function createOrUpdateShift({ id, type, date, start, end, departmentId }) {
  const existing = id ? DB.data.shifts.find(s => s.id === id) : null;
  const shift = existing || {
    id: uid("shift"),
    createdAt: nowISO(),
    approvedAt: null
  };

  Object.assign(shift, { type, date, start, end, departmentId });

  if (!existing) DB.data.shifts.unshift(shift);

  audit(existing ? "Shift updated" : "Shift created", `${type} on ${date} (${start}–${end})`);
  DB.save();
  return shift;
}

function renderShiftsPage(container) {
  const active = getActiveShift();
  const deps = DB.data.departments.filter(d => d.active);
  const { shiftTypes, shiftDefaults } = DB.data.settings;

  const depOptions = deps.map(d =>
    `<option value="${d.id}" ${active && active.departmentId === d.id ? "selected" : ""}>${esc(d.name)}</option>`
  ).join("");

  const typeOptions = shiftTypes.map(st =>
    `<option value="${st.key}" ${active && active.type === st.key ? "selected" : ""}>${t(st.key.toLowerCase() + "Shift") || st.label} (${st.hours}h)</option>`
  ).join("");

  container.innerHTML = `
    <div class="page-header">
      <div>
        <h1>${t("shifts")}</h1>
        <p>${t("shiftManagementDesc")}</p>
      </div>
    </div>

    <div class="grid-2">
      <div class="card">
        <div class="card-title"><i class="fa-solid fa-clock"></i> ${active ? t("updateShift") : t("createShift")}</div>
        <form id="shiftForm">
          <div class="form-grid">
            <div>
              <label><small>${t("department")}</small></label>
              <select id="shiftDept" required>${depOptions}</select>
            </div>
            <div>
              <label><small>${t("shiftType")}</small></label>
              <select id="shiftType" required>${typeOptions}</select>
            </div>
            <div>
              <label><small>${t("date")}</small></label>
              <input type="date" id="shiftDate" value="${active ? active.date : todayStr()}" required />
            </div>
            <div>
              <label><small>${t("startTime")}</small></label>
              <input type="time" id="shiftStart" value="${active ? active.start : "06:00"}" required />
            </div>
            <div>
              <label><small>${t("endTime")}</small></label>
              <input type="time" id="shiftEnd" value="${active ? active.end : "12:00"}" required />
            </div>
          </div>
          <div style="margin-top:16px">
            <button type="submit" class="btn btn-primary">
              <i class="fa-solid fa-floppy-disk"></i> ${active ? t("updateShift") : t("createShift")}
            </button>
          </div>
        </form>
      </div>

      <div class="card">
        <div class="card-title"><i class="fa-solid fa-circle-info"></i> ${t("currentShift")}</div>
        ${active ? `
          <div style="font-size:13px;line-height:2">
            <div><strong>${t("shiftType")}:</strong> ${t(active.type.toLowerCase() + "Shift") || active.type}</div>
            <div><strong>${t("date")}:</strong> ${esc(active.date)}</div>
            <div><strong>${t("startTime")}:</strong> ${esc(active.start)}</div>
            <div><strong>${t("endTime")}:</strong> ${esc(active.end)}</div>
            <div><strong>${t("department")}:</strong> ${esc((DB.data.departments.find(d => d.id === active.departmentId) || {}).name || "—")}</div>
            <div><strong>${t("assignment")}:</strong> ${DB.data.assignmentLock[active.id]?.approvedAt ? `${t("locked")} ${fmtDateTime(DB.data.assignmentLock[active.id].approvedAt)}` : t("notLocked")}</div>
          </div>
        ` : `<div class="empty-state" style="padding:30px 10px"><i class="fa-solid fa-clock-rotate-left"></i><h4>${t("noShift")}</h4><p>${t("noShiftDesc")}</p></div>`}
      </div>
    </div>
  `;

  const typeSel = $("#shiftType");
  const startInp = $("#shiftStart");
  const endInp = $("#shiftEnd");

  typeSel.addEventListener("change", () => {
    const def = shiftDefaults[typeSel.value];
    if (def) { startInp.value = def.start; endInp.value = def.end; }
  });

  $("#shiftForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const type = typeSel.value;
    const date = $("#shiftDate").value;
    const start = startInp.value;
    const end = endInp.value;
    const departmentId = $("#shiftDept").value;

    if (!date || !start || !end) {
      toast(t("required"), "error");
      return;
    }

    createOrUpdateShift({ id: active?.id, type, date, start, end, departmentId });
    toast(t("dataSaved"), "success");
    if (typeof updateShiftBadge === "function") updateShiftBadge();
    Router.refresh();
  });
}