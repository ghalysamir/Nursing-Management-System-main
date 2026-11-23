/* ============================================================
   audit.js — Audit Trail with Filters
   ============================================================ */
"use strict";

function renderAuditPage(container) {
  container.innerHTML = `
    <div class="page-header">
      <div>
        <h1>${t("audit")}</h1>
        <p>${t("auditDesc")}</p>
      </div>
      <div class="page-actions">
        <button class="btn btn-outline" id="exportAuditBtn"><i class="fa-solid fa-file-csv"></i> ${t("exportCsv")}</button>
      </div>
    </div>

    <div class="stats-grid">
      ${statCard(t("totalEvents"), DB.data.auditTrail.length, "blue", "fa-clipboard-list")}
      ${statCard(t("todayEvents"), DB.data.auditTrail.filter(a => a.at?.startsWith(todayStr())).length, "green", "fa-calendar-check")}
      ${statCard(t("uniqueUsers"), new Set(DB.data.auditTrail.map(a => a.user)).size, "purple", "fa-users")}
    </div>

    <div class="filter-bar">
      <input type="text" id="auditSearch" class="search-input" placeholder="${t("searchAudit")}" />
      <select id="auditUserFilter">
        <option value="">${t("allUsers")}</option>
        ${[...new Set(DB.data.auditTrail.map(a => a.user))].map(u => `<option value="${u}">${esc(u)}</option>`).join("")}
      </select>
    </div>

    <div class="card">
      <div id="auditTableContainer"></div>
    </div>
  `;

  function renderTable() {
    const q = $("#auditSearch").value.trim().toLowerCase();
    const userFilter = $("#auditUserFilter").value;

    const list = DB.data.auditTrail.filter(a => {
      if (userFilter && a.user !== userFilter) return false;
      if (q) {
        const blob = `${a.action} ${a.user} ${a.details} ${a.reason}`.toLowerCase();
        if (!blob.includes(q)) return false;
      }
      return true;
    });

    const wrap = $("#auditTableContainer");
    if (!list.length) {
      wrap.innerHTML = `<div class="empty-state"><i class="fa-solid fa-clipboard-list"></i><h4>${t("noData")}</h4></div>`;
      return;
    }

    wrap.innerHTML = `
      <div class="table-wrap"><table class="data-table">
        <thead><tr>
          <th>${t("action")}</th>
          <th>${t("user")}</th>
          <th>${t("details")}</th>
          <th>${t("reason")}</th>
          <th>${t("when")}</th>
        </tr></thead>
        <tbody>
          ${list.slice(0, 200).map(a => `
            <tr>
              <td class="cell-strong">${esc(a.action)}</td>
              <td>${esc(a.user)}</td>
              <td class="cell-sub">${esc(a.details || "—")}</td>
              <td class="cell-sub">${esc(a.reason || "—")}</td>
              <td class="cell-sub">${fmtDateTime(a.at)}</td>
            </tr>
          `).join("")}
        </tbody>
      </table></div>
      ${list.length > 200 ? `<p style="text-align:center;font-size:12px;color:var(--text-muted);margin-top:10px">${t("showingFirst")} 200 ${t("of")} ${list.length}</p>` : ""}
    `;
  }

  $("#auditSearch").addEventListener("input", renderTable);
  $("#auditUserFilter").addEventListener("change", renderTable);

  $("#exportAuditBtn").onclick = () => {
    const rows = [["Action", "User", "Details", "Reason", "Date"]];
    DB.data.auditTrail.forEach(a => {
      rows.push([a.action, a.user, a.details || "", a.reason || "", fmtDateTime(a.at)]);
    });
    const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    downloadFile(`audit-${todayStr()}.csv`, csv);
    toast(t("csvExported"), "success");
  };

  renderTable();
}