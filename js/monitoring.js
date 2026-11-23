/* ============================================================
   monitoring.js — Vital Signs Monitoring (Simulated)
   ------------------------------------------------------------
   Demo thresholds — not clinically validated.
   ============================================================ */
"use strict";

const VITAL_THRESHOLDS = {
  hr:        { low: 60,  high: 100, unit: "bpm" },
  systolic:  { low: 90,  high: 140, unit: "mmHg" },
  diastolic: { low: 60,  high: 90,  unit: "mmHg" },
  spo2:      { low: 94,  high: 100, unit: "%" },
  temp:      { low: 36.1, high: 37.5, unit: "°C" },
  rr:        { low: 12,  high: 20, unit: "/min" },
  glucose:   { low: 70,  high: 180, unit: "mg/dL" }
};

function isVitalAbnormal(type, value) {
  const th = VITAL_THRESHOLDS[type];
  if (!th || value === null || value === undefined || value === "") return false;
  const v = Number(value);
  return v < th.low || v > th.high;
}

function renderMonitoringPage(container) {
  const sess = Session.get();
  const isNurse = sess.role === "nurse";
  const myPatients = isNurse
    ? DB.data.patients.filter(p => p.assignedNurseId === sess.nurseId)
    : DB.data.patients;

  container.innerHTML = `
    <div class="page-header">
      <div>
        <h1>${t("monitoring")}</h1>
        <p>${t("monitoringDesc")}</p>
      </div>
      <div class="page-actions">
        <button class="btn btn-primary" id="addVitalsBtn"><i class="fa-solid fa-plus"></i> ${t("addVitals")}</button>
      </div>
    </div>

    <div class="card" style="background:#fffbea;border-color:#fde68a;margin-bottom:16px">
      <div style="display:flex;gap:10px;align-items:flex-start">
        <i class="fa-solid fa-triangle-exclamation" style="color:#b45309;font-size:18px;margin-top:2px"></i>
        <div style="font-size:12.5px;color:#78350f;line-height:1.6">
          <strong>${t("important")}:</strong> ${t("monitoringDisclaimer")}
        </div>
      </div>
    </div>

    <div class="filter-bar">
      <select id="vitalsPatientFilter">
        <option value="">${t("allPatients")}</option>
        ${myPatients.map(p => `<option value="${p.id}">${esc(p.code)} – ${esc(p.name)}</option>`).join("")}
      </select>
    </div>

    <div class="card">
      <div class="card-title"><i class="fa-solid fa-heart-pulse"></i> ${t("recentVitals")}</div>
      <div id="vitalsList"></div>
    </div>
  `;

  function renderList() {
    const pid = $("#vitalsPatientFilter").value;
    let vitals = DB.data.vitals || [];
    if (pid) vitals = vitals.filter(v => v.patientId === pid);
    if (isNurse) {
      const myPids = myPatients.map(p => p.id);
      vitals = vitals.filter(v => myPids.includes(v.patientId));
    }
    vitals = [...vitals].sort((a, b) => new Date(b.recordedAt) - new Date(a.recordedAt)).slice(0, 50);

    const list = $("#vitalsList");
    if (!vitals.length) {
      list.innerHTML = `<div class="empty-state"><i class="fa-solid fa-heart-pulse"></i><h4>${t("noData")}</h4><p>${t("addVitals")}</p></div>`;
      return;
    }

    list.innerHTML = `
      <div class="table-wrap"><table class="data-table">
        <thead><tr>
          <th>${t("patients")}</th>
          <th>HR</th>
          <th>BP</th>
          <th>SpO2</th>
          <th>${t("temperature")}</th>
          <th>RR</th>
          <th>${t("glucose")}</th>
          <th>${t("recordedAt")}</th>
          <th></th>
        </tr></thead>
        <tbody>
          ${vitals.map(v => {
            const p = getPatientById(v.patientId);
            const abnormal = ["hr", "systolic", "diastolic", "spo2", "temp", "rr", "glucose"].some(k => isVitalAbnormal(k, v[k]));
            return `
              <tr style="${abnormal ? "background:#fffbfb" : ""}">
                <td class="cell-strong">${esc(p?.code || "")}<div class="cell-sub">${esc(p?.name || "")}</div></td>
                <td class="${isVitalAbnormal("hr", v.hr) ? "text-danger" : ""}">${v.hr || "—"}</td>
                <td class="${isVitalAbnormal("systolic", v.systolic) || isVitalAbnormal("diastolic", v.diastolic) ? "text-danger" : ""}">${v.systolic || "—"}/${v.diastolic || "—"}</td>
                <td class="${isVitalAbnormal("spo2", v.spo2) ? "text-danger" : ""}">${v.spo2 || "—"}%</td>
                <td class="${isVitalAbnormal("temp", v.temp) ? "text-danger" : ""}">${v.temp || "—"}°C</td>
                <td class="${isVitalAbnormal("rr", v.rr) ? "text-danger" : ""}">${v.rr || "—"}</td>
                <td class="${isVitalAbnormal("glucose", v.glucose) ? "text-danger" : ""}">${v.glucose || "—"}</td>
                <td class="cell-sub">${fmtDateTime(v.recordedAt)}<div>${esc(v.recordedBy || "")}</div></td>
                <td>
                  <button class="btn btn-sm btn-outline" data-del="${v.id}"><i class="fa-solid fa-trash"></i></button>
                </td>
              </tr>
            `;
          }).join("")}
        </tbody>
      </table></div>
    `;

    $$("[data-del]", list).forEach(b => b.onclick = () => {
      Modal.confirm({
        title: t("delete"),
        message: t("deleteConfirmMsg"),
        confirmText: t("delete"),
        danger: true,
        onConfirm: () => {
          DB.data.vitals = (DB.data.vitals || []).filter(x => x.id !== b.dataset.del);
          DB.save();
          toast(t("dataDeleted"), "success");
          Router.refresh();
        }
      });
    });
  }

  $("#vitalsPatientFilter").addEventListener("change", renderList);

  $("#addVitalsBtn").onclick = () => {
    if (!myPatients.length) { toast(t("noData"), "warning"); return; }
    openVitalsForm();
  };

  renderList();
}

function openVitalsForm() {
  const sess = Session.get();
  const myPatients = sess.role === "nurse"
    ? DB.data.patients.filter(p => p.assignedNurseId === sess.nurseId)
    : DB.data.patients;

  Modal.open({
    title: t("addVitals"),
    wide: true,
    body: `
      <form id="vitalsForm" class="form-grid">
        <div class="full">
          <label><small>${t("patients")} *</small></label>
          <select id="vfPatient">
            ${myPatients.map(p => `<option value="${p.id}">${esc(p.code)} – ${esc(p.name)}</option>`).join("")}
          </select>
        </div>
        <div>
          <label><small>HR (bpm)</small></label>
          <input type="number" id="vfHr" min="0" max="250" />
        </div>
        <div>
          <label><small>SpO2 (%)</small></label>
          <input type="number" id="vfSpo2" min="0" max="100" />
        </div>
        <div>
          <label><small>Systolic (mmHg)</small></label>
          <input type="number" id="vfSys" min="0" max="250" />
        </div>
        <div>
          <label><small>Diastolic (mmHg)</small></label>
          <input type="number" id="vfDia" min="0" max="200" />
        </div>
        <div>
          <label><small>${t("temperature")} (°C)</small></label>
          <input type="number" step="0.1" id="vfTemp" min="30" max="45" />
        </div>
        <div>
          <label><small>RR (/min)</small></label>
          <input type="number" id="vfRr" min="0" max="80" />
        </div>
        <div>
          <label><small>${t("glucose")} (mg/dL)</small></label>
          <input type="number" id="vfGlucose" min="0" max="500" />
        </div>
      </form>
    `,
    footer: `
      <button class="btn btn-outline" id="vfCancel">${t("cancel")}</button>
      <button class="btn btn-primary" id="vfSave">${t("save")}</button>
    `,
    onMount() {
      $("#vfCancel").onclick = () => Modal.close();
      $("#vfSave").onclick = () => {
        if (!DB.data.vitals) DB.data.vitals = [];
        DB.data.vitals.unshift({
          id: uid("vit"),
          patientId: $("#vfPatient").value,
          hr: Number($("#vfHr").value) || null,
          spo2: Number($("#vfSpo2").value) || null,
          systolic: Number($("#vfSys").value) || null,
          diastolic: Number($("#vfDia").value) || null,
          temp: Number($("#vfTemp").value) || null,
          rr: Number($("#vfRr").value) || null,
          glucose: Number($("#vfGlucose").value) || null,
          recordedBy: sess.name,
          recordedAt: nowISO()
        });
        DB.save();
        audit("Vitals recorded", $("#vfPatient").value);
        toast(t("dataSaved"), "success");
        Modal.close();
        Router.refresh();
      };
    }
  });
}