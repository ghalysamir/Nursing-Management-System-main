/* ============================================================
   users.js — User management (admin)
   ============================================================ */
"use strict";

function renderAdminPage(container) {
  container.innerHTML = `
    <div class="page-header">
      <div><h1>${t("adminPanel")}</h1><p>${t("users")}</p></div>
    </div>

    <div class="card" style="margin-bottom:16px">
      <div class="card-title"><i class="fa-solid fa-users-gear"></i> ${t("users")}</div>
      <div class="table-wrap">
        <table class="data-table">
          <thead>
            <tr>
              <th>${t("username")}</th>
              <th>${t("welcome")}</th>
              <th>${t("role")}</th>
              <th>${t("active")}</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            ${DB.data.users.map(u => `
              <tr>
                <td class="cell-strong">${esc(u.username)}</td>
                <td>${esc(u.name)}<div class="cell-sub">${esc(u.email || "")}</div></td>
                <td><span class="badge ${u.role === "admin" ? "purple" : u.role === "headnurse" ? "teal" : "medium"}">${t("roles." + u.role)}</span></td>
                <td><span class="badge ${u.active ? "available" : "unavailable"}">${u.active ? t("active") : t("inactive")}</span></td>
                <td>
                  <div class="table-actions">
                    <button class="btn btn-sm btn-outline" data-toggle="${u.id}" title="${t("toggleActive")}"><i class="fa-solid fa-power-off"></i></button>
                    <button class="btn btn-sm btn-outline" data-pw="${u.id}" title="${t("resetPassword")}"><i class="fa-solid fa-key"></i></button>
                  </div>
                </td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      </div>
    </div>

    <div class="card">
      <div class="card-title"><i class="fa-solid fa-building"></i> ${t("departments")}</div>
      <ul style="padding-inline-start:18px;font-size:13px">
        ${DB.data.departments.map(d => `<li>${esc(d.name)}</li>`).join("")}
      </ul>
    </div>
  `;

  $$("[data-toggle]", container).forEach(b => {
    b.onclick = () => {
      const u = DB.data.users.find(x => x.id === b.dataset.toggle);
      if (!u) return;
      u.active = !u.active;
      DB.save();
      audit("User status changed", `${u.username} → ${u.active ? "active" : "inactive"}`);
      toast(t("userStatusChanged"), "success");
      Router.refresh();
    };
  });

  $$("[data-pw]", container).forEach(b => {
    b.onclick = () => {
      const u = DB.data.users.find(x => x.id === b.dataset.pw);
      if (!u) return;
      u.password = "123456";
      DB.save();
      audit("Password reset", u.username);
      toast(t("passwordReset"), "success");
    };
  });
}