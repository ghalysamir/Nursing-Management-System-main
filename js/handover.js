/* ============================================================
   handover.js — Structured Shift Handover
   ============================================================ */
"use strict";

const HANDOVER_STATUSES = ["Draft", "Submitted", "Awaiting Acceptance", "Accepted", "Requires Clarification"];

function renderHandoverPage(container) {
  const sess = Session.get();
  const isNurse = sess.role === "nurse";

  if (isNurse) {
    return renderNurseHandoverPage(container);
  }

  // Head Nurse view — all handovers
  container.innerHTML = `
    <div class="page-header">
      <div>
        <h1>${t("handover")}</h1>
        <p>${t("handoverDesc")}</p>
      </div>
    </div>

    <div class="stats-grid">
      ${statCard(t("draft"), DB.data.handovers.filter(h => h.status === "Draft").length, "blue", "fa-file")}
      ${statCard(t("submitted"), DB.data.handovers.filter(h => h.status === "Submitted").length, "amber", "fa-paper-plane")}
      ${statCard(t("awaitingAcceptance"), DB.data.handovers.filter(h => h.status === "Awaiting Acceptance").length, "purple", "fa-hourglass")}
      ${statCard(t("accepted"), DB.data.handovers.filter(h => h.status === "Accepted").length, "green", "fa-check-circle")}
    </div>

    <div class="card">
      <div class="card-title"><i class="fa-solid fa-handshake"></i> ${t("handoverRecords")} (${DB.data.handovers.length})</div>
      <div id="handoverList"></div>
    </div>
  `;

  function renderList() {
    const list = $("#handoverList");
    if (!DB.data.handovers.length) {
      list.innerHTML = `<div class="empty-state"><i class="fa-solid fa-handshake"></i><h4>${t("noData")}</h4></div>`;
      return;
    }

    list.innerHTML = `
      <div class="table-wrap"><table class="data-table">
        <thead><tr>
          <th>${t("fromNurse")}</th>
          <th>${t("toNurse")}</th>
          <th>${t("patients")}</th>
          <th>${t("status")}</th>
          <th>${t("date")}</th>
          <th></th>
        </tr></thead>
        <tbody>
          ${DB.data.handovers.map(h => {
            const from = getNurseById(h.fromNurseId);
            const to = getNurseById(h.toNurseId);
            const statusCls = h.status.toLowerCase().replace(" ", "");
            return `
              <tr>
                <td class="cell-strong">${esc(from?.name || "—")}<div class="cell-sub">${fmtDateTime(h.createdAt)}</div></td>
                <td>${esc(to?.name || "—")}</td>
                <td>${(h.patientIds || []).length}</td>
                <td><span class="badge ${statusCls}">${t(h.status.toLowerCase().replace(/ /g, "")) || h.status}</span></td>
                <td class="cell-sub">${fmtDateTime(h.createdAt)}</td>
                <td>
                  <button class="btn btn-sm btn-outline" data-view="${h.id}"><i class="fa-solid fa-eye"></i></button>
                </td>
              </tr>
            `;
          }).join("")}
        </tbody>
      </table></div>
    `;

    $$("[data-view]", list).forEach(b => b.onclick = () => viewHandover(b.dataset.view));
  }

  renderList();
}

function renderNurseHandoverPage(container) {
  const sess = Session.get();
  const nurseId = sess.nurseId;

  const incoming = DB.data.handovers.filter(h => h.toNurseId === nurseId && h.status === "Awaiting Acceptance");
  const mine = DB.data.handovers.filter(h => h.fromNurseId === nurseId);
  const accepted = DB.data.handovers.filter(h => h.toNurseId === nurseId && h.status === "Accepted");

  container.innerHTML = `
    <div class="page-header">
      <div>
        <h1>${t("handover")}</h1>
        <p>${t("handoverDesc")}</p>
      </div>
      <div class="page-actions">
        <button class="btn btn-primary" id="createHandoverBtn">
          <i class="fa-solid fa-paper-plane"></i> ${t("createHandover")}
        </button>
      </div>
    </div>

    ${incoming.length ? `
      <div class="card" style="background:#fffbea;border-color:#fde68a;margin-bottom:16px">
        <div class="card-title"><i class="fa-solid fa-inbox"></i> ${t("incomingHandovers")} (${incoming.length})</div>
        ${incoming.map(h => renderHandoverCard(h, "incoming")).join("")}
      </div>
    ` : ""}

    <div class="card" style="margin-bottom:16px">
      <div class="card-title"><i class="fa-solid fa-paper-plane"></i> ${t("mySubmittedHandovers")} (${mine.length})</div>
      ${mine.length ? mine.map(h => renderHandoverCard(h, "outgoing")).join("") : `<p style="color:var(--text-muted);font-size:12.5px">${t("noData")}</p>`}
    </div>

    <div class="card">
      <div class="card-title"><i class="fa-solid fa-check-circle"></i> ${t("acceptedHandovers")} (${accepted.length})</div>
      ${accepted.length ? accepted.map(h => renderHandoverCard(h, "accepted")).join("") : `<p style="color:var(--text-muted);font-size:12.5px">${t("noData")}</p>`}
    </div>
  `;

  $("#createHandoverBtn").onclick = () => openCreateHandover();

  $$("[data-accept]", container).forEach(b => b.onclick = () => acceptHandover(b.dataset.accept));
  $$("[data-view]", container).forEach(b => b.onclick = () => viewHandover(b.dataset.view));
}

function renderHandoverCard(h, mode) {
  const from = getNurseById(h.fromNurseId);
  const to = getNurseById(h.toNurseId);
  const statusCls = h.status.toLowerCase().replace(/ /g, "");
  return `
    <div class="handover-card">
      <div class="handover-card-header">
        <div>
          <strong>${esc(from?.name || "—")} → ${esc(to?.name || "—")}</strong>
          <div class="cell-sub">${fmtDateTime(h.createdAt)}</div>
        </div>
        <span class="badge ${statusCls}">${h.status}</span>
      </div>
      <div class="handover-card-body">
        <div><strong>${t("patients")}:</strong> ${(h.patientIds || []).length}</div>
        <div><strong>${t("pendingTasks")}:</strong> ${h.pendingTaskIds?.length || 0}</div>
        ${h.notes ? `<div class="cell-sub" style="margin-top:6px">${esc(h.notes.substring(0, 120))}...</div>` : ""}
      </div>
      <div class="handover-card-actions">
        <button class="btn btn-sm btn-outline" data-view="${h.id}"><i class="fa-solid fa-eye"></i> ${t("view")}</button>
        ${mode === "incoming" ? `<button class="btn btn-sm btn-teal" data-accept="${h.id}"><i class="fa-solid fa-check"></i> ${t("accept")}</button>` : ""}
      </div>
    </div>
  `;
}

function openCreateHandover() {
  const sess = Session.get();
  const myPatients = DB.data.patients.filter(p => p.assignedNurseId === sess.nurseId);
  if (!myPatients.length) { toast(t("noData"), "warning"); return; }

  const myPendingTasks = DB.data.tasks.filter(tk =>
    tk.assignedNurseId === sess.nurseId &&
    (tk.status === "Pending" || tk.status === "In Progress" || tk.status === "Overdue" || tk.status === "Not Completed")
  );

  const otherNurses = DB.data.nurses.filter(n => n.id !== sess.nurseId && (n.availability === "available" || n.availability === "on_duty"));

  if (!otherNurses.length) {
    toast(t("noNurses"), "warning");
    return;
  }

  Modal.open({
    title: t("createHandover"),
    wide: true,
    body: `
      <div style="background:#f0f9ff;padding:12px;border-radius:8px;font-size:12.5px;color:#075985;margin-bottom:14px;line-height:1.6">
        <i class="fa-solid fa-circle-info"></i> ${t("handoverCreateHint")}
      </div>
      <form id="handoverForm">
        <div class="form-group">
          <label><small>${t("toNurse")} *</small></label>
          <select id="hofTo">
            ${otherNurses.map(n => `<option value="${n.id}">${esc(n.name)}</option>`).join("")}
          </select>
        </div>
        <div class="form-group">
          <label><small>${t("patients")} (${myPatients.length})</small></label>
          <div style="max-height:120px;overflow-y:auto;border:1px solid var(--border);border-radius:8px;padding:8px">
            ${myPatients.map(p => `<div style="font-size:12px;padding:3px 0">• ${esc(p.code)} – ${esc(p.name)}</div>`).join("")}
          </div>
        </div>
        <div class="form-group">
          <label><small>${t("pendingTasks")} (${myPendingTasks.length})</small></label>
          <div style="max-height:120px;overflow-y:auto;border:1px solid var(--border);border-radius:8px;padding:8px">
            ${myPendingTasks.length ? myPendingTasks.map(tk => `<div style="font-size:12px;padding:3px 0">• ${esc(tk.name)} (${tk.status})</div>`).join("") : `<div style="font-size:12px;color:var(--text-muted)">${t("noData")}</div>`}
          </div>
        </div>
        <div class="form-group">
          <label><small>${t("handoverNotes")}</small></label>
          <textarea id="hofNotes" placeholder="${t("handoverNotesPlaceholder")}" style="min-height:100px"></textarea>
        </div>
      </form>
    `,
    footer: `
      <button class="btn btn-outline" id="hofCancel">${t("cancel")}</button>
      <button class="btn btn-primary" id="hofSubmit">${t("submitHandover")}</button>
    `,
    onMount() {
      $("#hofCancel").onclick = () => Modal.close();
      $("#hofSubmit").onclick = () => {
        const toNurseId = $("#hofTo").value;
        const notes = $("#hofNotes").value.trim();
        if (!toNurseId) { toast(t("required"), "error"); return; }

        const handover = {
          id: uid("hov"),
          fromNurseId: sess.nurseId,
          toNurseId,
          patientIds: myPatients.map(p => p.id),
          pendingTaskIds: myPendingTasks.map(tk => tk.id),
          notes,
          status: "Awaiting Acceptance",
          createdAt: nowISO(),
          acceptedAt: null
        };

        DB.data.handovers.unshift(handover);
        DB.save();
        audit("Handover submitted", `${myPatients.length} patients → ${getNurseById(toNurseId)?.name}`);

        // Notify receiving nurse
        if (typeof pushNotification === "function") {
          pushNotification({
            key: `handover-${handover.id}`,
            type: "Handover",
            priority: "high",
            title: t("newHandover"),
            message: `${sess.name} → ${getNurseById(toNurseId)?.name}`,
            targetNurseId: toNurseId,
            navigateTo: "handover"
          });
        }

        toast(t("handoverSubmitted"), "success");
        Modal.close();
        Router.refresh();
      };
    }
  });
}

function acceptHandover(handoverId) {
  const h = DB.data.handovers.find(x => x.id === handoverId);
  if (!h) return;
  const sess = Session.get();

  Modal.confirm({
    title: t("acceptHandover"),
    message: t("acceptHandoverConfirm"),
    confirmText: t("accept"),
    onConfirm: () => {
      h.status = "Accepted";
      h.acceptedAt = nowISO();
      DB.save();
      audit("Handover accepted", h.id);
      toast(t("handoverAccepted"), "success");
      Router.refresh();
    }
  });
}

function viewHandover(handoverId) {
  const h = DB.data.handovers.find(x => x.id === handoverId);
  if (!h) return;
  const from = getNurseById(h.fromNurseId);
  const to = getNurseById(h.toNurseId);

  Modal.open({
    title: t("handover") + " – " + (from?.name || "?") + " → " + (to?.name || "?"),
    wide: true,
    body: `
      <div style="font-size:13px;line-height:1.9">
        <div><strong>${t("status")}:</strong> <span class="badge ${h.status.toLowerCase().replace(/ /g, "")}">${h.status}</span></div>
        <div><strong>${t("createdAt")}:</strong> ${fmtDateTime(h.createdAt)}</div>
        ${h.acceptedAt ? `<div><strong>${t("accepted")}:</strong> ${fmtDateTime(h.acceptedAt)}</div>` : ""}
      </div>
      <hr style="border:none;border-top:1px solid var(--border);margin:14px 0" />
      <div class="card-title"><i class="fa-solid fa-bed-pulse"></i> ${t("patients")} (${(h.patientIds || []).length})</div>
      <ul style="font-size:13px;padding-inline-start:18px">
        ${(h.patientIds || []).map(pid => {
          const p = getPatientById(pid);
          return p ? `<li>${esc(p.code)} – ${esc(p.name)}</li>` : "";
        }).join("")}
      </ul>
      <hr style="border:none;border-top:1px solid var(--border);margin:14px 0" />
      <div class="card-title"><i class="fa-solid fa-list-check"></i> ${t("pendingTasks")} (${h.pendingTaskIds?.length || 0})</div>
      <ul style="font-size:13px;padding-inline-start:18px">
        ${(h.pendingTaskIds || []).map(tid => {
          const tk = DB.data.tasks.find(x => x.id === tid);
          return tk ? `<li>${esc(tk.name)} — ${tk.status}</li>` : "";
        }).join("")}
      </ul>
      ${h.notes ? `
        <hr style="border:none;border-top:1px solid var(--border);margin:14px 0" />
        <div class="card-title"><i class="fa-solid fa-note-sticky"></i> ${t("handoverNotes")}</div>
        <p style="font-size:13px;color:var(--text-soft);line-height:1.7">${esc(h.notes)}</p>
      ` : ""}
    `,
    footer: `<button class="btn btn-outline" onclick="Modal.close()">${t("close")}</button>`
  });
}