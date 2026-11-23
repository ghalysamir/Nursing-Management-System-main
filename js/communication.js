/* ============================================================
   communication.js — Internal Communication Center
   ============================================================ */
"use strict";

function renderCommunicationPage(container) {
  const sess = Session.get();
  const canPost = sess.role === "headnurse" || sess.role === "admin";

  container.innerHTML = `
    <div class="page-header">
      <div>
        <h1>${t("communication")}</h1>
        <p>${t("communicationDesc")}</p>
      </div>
      <div class="page-actions">
        ${canPost ? `<button class="btn btn-primary" id="addAnnBtn"><i class="fa-solid fa-plus"></i> ${t("newAnnouncement")}</button>` : ""}
      </div>
    </div>

    <div id="annList"></div>
  `;

  function renderList() {
    const anns = [...(DB.data.announcements || [])].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    const list = $("#annList");
    if (!anns.length) {
      list.innerHTML = `<div class="card"><div class="empty-state"><i class="fa-solid fa-bullhorn"></i><h4>${t("noData")}</h4></div></div>`;
      return;
    }

    list.innerHTML = anns.map(a => `
      <div class="card" style="margin-bottom:12px">
        <div class="card-title" style="justify-content:space-between">
          <span><i class="fa-solid fa-bullhorn"></i> ${esc(a.title)}</span>
          <span class="badge ${a.priority === "High" ? "critical" : a.priority === "Medium" ? "medium" : "low"}">${a.priority}</span>
        </div>
        <p style="font-size:13px;line-height:1.7;color:var(--text-soft)">${esc(a.content)}</p>
        <small style="color:var(--text-muted);font-size:11.5px;display:block;margin-top:8px">
          <i class="fa-solid fa-user"></i> ${esc(a.sender)} · ${fmtDateTime(a.createdAt)}
          ${a.departmentId ? ` · ${esc(getDepartmentById(a.departmentId)?.name || "")}` : ""}
        </small>
      </div>
    `).join("");
  }

  const addBtn = $("#addAnnBtn");
  if (addBtn) addBtn.onclick = () => openAnnouncementForm();
  renderList();
}

function openAnnouncementForm() {
  const sess = Session.get();
  Modal.open({
    title: t("newAnnouncement"),
    wide: true,
    body: `
      <form id="annForm" class="form-grid">
        <div class="full">
          <label><small>${t("title")} *</small></label>
          <input type="text" id="anTitle" required />
        </div>
        <div>
          <label><small>${t("priority")}</small></label>
          <select id="anPriority">
            <option>Low</option><option selected>Medium</option><option>High</option>
          </select>
        </div>
        <div>
          <label><small>${t("department")}</small></label>
          <select id="anDept">
            <option value="">${t("all")}</option>
            ${DB.data.departments.map(d => `<option value="${d.id}">${esc(d.name)}</option>`).join("")}
          </select>
        </div>
        <div class="full">
          <label><small>${t("content")} *</small></label>
          <textarea id="anContent" style="min-height:120px" required></textarea>
        </div>
      </form>
    `,
    footer: `
      <button class="btn btn-outline" id="anCancel">${t("cancel")}</button>
      <button class="btn btn-primary" id="anSave">${t("save")}</button>
    `,
    onMount() {
      $("#anCancel").onclick = () => Modal.close();
      $("#anSave").onclick = () => {
        const title = $("#anTitle").value.trim();
        const content = $("#anContent").value.trim();
        if (!title || !content) { toast(t("required"), "error"); return; }
        if (!DB.data.announcements) DB.data.announcements = [];
        DB.data.announcements.unshift({
          id: uid("ann"),
          title, content,
          priority: $("#anPriority").value,
          departmentId: $("#anDept").value || null,
          sender: sess.name,
          createdAt: nowISO()
        });
        DB.save();
        audit("Announcement posted", title);
        toast(t("dataSaved"), "success");
        Modal.close();
        Router.refresh();
      };
    }
  });
}