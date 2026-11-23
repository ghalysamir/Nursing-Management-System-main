/* ============================================================
   navigation.js — Router + Sidebar (Phase 6 Final)
   ============================================================ */
"use strict";

const ROUTES = {
  /* ---- Head Nurse / Admin ---- */
  dashboard:      { titleKey: "dashboard",       sectionKey: "overview",      roles: ["headnurse"] },
  nurses:         { titleKey: "nurses",          sectionKey: "management",    roles: ["headnurse","admin"] },
  patients:       { titleKey: "patients",        sectionKey: "management",    roles: ["headnurse"] },
  departments:    { titleKey: "departments",     sectionKey: "management",    roles: ["admin","headnurse"] },
  skills:         { titleKey: "skills",          sectionKey: "management",    roles: ["headnurse","admin"] },
  attendance:     { titleKey: "attendance",      sectionKey: "management",    roles: ["headnurse","admin"] },
  shifts:         { titleKey: "shifts",          sectionKey: "management",    roles: ["headnurse","admin"] },
  acuity:         { titleKey: "acuity",          sectionKey: "management",    roles: ["headnurse"] },
  workload:       { titleKey: "workload",        sectionKey: "assignment",    roles: ["headnurse"] },
  assignment:     { titleKey: "assignment",      sectionKey: "assignment",    roles: ["headnurse"] },
  tasks:          { titleKey: "tasks",           sectionKey: "operations",    roles: ["headnurse"] },
  monitor:        { titleKey: "monitor",         sectionKey: "operations",    roles: ["headnurse"] },
  escalation:     { titleKey: "escalation",      sectionKey: "operations",    roles: ["headnurse","admin"] },
  documentation:  { titleKey: "documentation",   sectionKey: "operations",    roles: ["headnurse","admin"] },
  timeline:       { titleKey: "timeline",        sectionKey: "operations",    roles: ["headnurse","admin"] },

  /* ---- Phase 5 — Clinical ---- */
  handover:       { titleKey: "handover",        sectionKey: "clinical",      roles: ["headnurse","admin","nurse"] },
  monitoring:     { titleKey: "vitals",          sectionKey: "clinical",      roles: ["headnurse","nurse"] },
  medication:     { titleKey: "medication",      sectionKey: "clinical",      roles: ["headnurse","nurse"] },
  carePlan:       { titleKey: "carePlan",        sectionKey: "clinical",      roles: ["headnurse","nurse"] },
  communication:  { titleKey: "communication",   sectionKey: "operations",    roles: ["headnurse","admin","nurse"] },
  incidents:      { titleKey: "incidents",       sectionKey: "operations",    roles: ["headnurse","admin"] },

  /* ---- Phase 6 — Reports / Analytics / Backup ---- */
  reports:        { titleKey: "reports",         sectionKey: "reports",       roles: ["headnurse","admin"] },
  analytics:      { titleKey: "analytics",       sectionKey: "reports",       roles: ["headnurse","admin"] },
  audit:          { titleKey: "audit",           sectionKey: "reports",       roles: ["headnurse","admin"] },
  backup:         { titleKey: "backup",          sectionKey: "administration",roles: ["admin"] },
  admin:          { titleKey: "admin",           sectionKey: "administration",roles: ["admin"] },
  settings:       { titleKey: "settings",        sectionKey: "administration",roles: ["headnurse","admin","nurse"] },

  /* ---- Staff Nurse ---- */
  nurseDashboard: { titleKey: "dashboard",       sectionKey: "nurse",         roles: ["nurse"] },
  nurseTasks:     { titleKey: "tasks",           sectionKey: "nurse",         roles: ["nurse"] },
  nurseSummary:   { titleKey: "myShiftSummary",  sectionKey: "nurse",         roles: ["nurse"] },
  nurseDoc:       { titleKey: "documentation",   sectionKey: "nurse",         roles: ["nurse"] }
};

const Router = {
  current: null,

  go(route) {
    if (!ROUTES[route]) { toast(t("unknownPage"), "error"); return; }
    if (!guardRoute(route)) return;

    this.current = route;
    const meta = ROUTES[route];

    $("#pageTitle").textContent = t(meta.titleKey);
    $("#pageBreadcrumb").textContent = `${meta.sectionKey} / ${t(meta.titleKey)}`;

    $$(".nav-item").forEach(b => b.classList.toggle("active", b.dataset.route === route));
    $("#notifPanel")?.classList.add("hidden");

    const content = $("#pageContent");
    content.innerHTML = "";

    const renderers = {
      /* ---- Existing ---- */
      dashboard:      () => renderHeadDashboard(content),
      nurses:         () => renderNursesPage(content),
      patients:       () => renderPatientsPage(content),
      departments:    () => renderDepartmentsPage(content),
      skills:         () => renderSkillsPage(content),
      attendance:     () => renderAttendancePage(content),
      shifts:         () => renderShiftsPage(content),
      acuity:         () => renderAcuityPage(content),
      workload:       () => renderWorkloadPage(content),
      assignment:     () => renderAssignmentPage(content),
      tasks:          () => renderTasksPage(content),
      escalation:     () => renderEscalationPage(content),
      documentation:  () => renderDocumentationPage(content),
      timeline:       () => renderTimelinePage(content),
      admin:          () => renderAdminPage(content),
      settings:       () => renderSettingsPage(content),

      /* ---- Phase 5 ---- */
      handover:       () => renderHandoverPage(content),
      monitoring:     () => renderMonitoringPage(content),
      medication:     () => renderMedicationPage(content),
      carePlan:       () => renderCarePlanPage(content),
      communication:  () => renderCommunicationPage(content),
      incidents:      () => renderIncidentsPage(content),

      /* ---- Phase 6 ---- */
      reports:        () => renderReportsPage(content),
      analytics:      () => renderAnalyticsPage(content),
      audit:          () => renderAuditPage(content),
      backup:         () => renderBackupPage(content),
      monitor:        () => renderMonitorPage(content),

      /* ---- Staff Nurse ---- */
      nurseDashboard: () => renderNurseDashboard(content),
      nurseTasks:     () => renderNurseTasksPage(content),
      nurseSummary:   () => renderNurseSummaryPage(content),
      nurseDoc:       () => renderDocumentationPage(content)
    };

    const fn = renderers[route];
    if (typeof fn === "function") {
      try { fn(); }
      catch (e) {
        console.error(e);
        content.innerHTML = `<div class="empty-state"><i class="fa-solid fa-bug"></i><h4>${t("error")}</h4><p>${esc(e.message)}</p></div>`;
      }
    } else {
      content.innerHTML = `<div class="empty-state"><i class="fa-solid fa-screwdriver-wrench"></i><h4>${t("pageNotFound")}</h4><p>${t("pageNotFoundDesc")}</p></div>`;
    }

    if (typeof updateNotifBadge === "function") updateNotifBadge();
  },

  refresh() { if (this.current) this.go(this.current); }
};

function renderComingSoon(container) {
  container.innerHTML = `
    <div class="page-header">
      <div><h1>${t("comingSoon")}</h1><p>${t("comingSoonDesc")}</p></div>
    </div>
    <div class="card">
      <div class="empty-state">
        <i class="fa-solid fa-screwdriver-wrench"></i>
        <h4>${t("comingSoon")}</h4>
        <p>${t("comingSoonDesc")}</p>
      </div>
    </div>
  `;
}

function renderSidebar() {
  const s = Session.get();
  if (!s) return;
  const nav = $("#sidebarNav");

  const navItems = [];
  const add = (route, icon) => {
    const meta = ROUTES[route];
    if (meta.roles.includes(s.role)) {
      navItems.push(`<button class="nav-item" data-route="${route}"><i class="fa-solid ${icon}"></i>${t(meta.titleKey)}</button>`);
    }
  };
  const section = (label) => navItems.push(`<div class="nav-section-label">${label}</div>`);

  if (s.role === "headnurse") {
    section(t("overview"));
    add("dashboard", "fa-gauge-high");

    section(t("management"));
    add("nurses", "fa-user-nurse");
    add("patients", "fa-bed-pulse");
    add("departments", "fa-building");
    add("skills", "fa-list-check");
    add("attendance", "fa-user-clock");
    add("shifts", "fa-clock");
    add("acuity", "fa-heart-pulse");

    section(t("assignment"));
    add("workload", "fa-scale-balanced");
    add("assignment", "fa-people-arrows");

    section(t("operations"));
    add("tasks", "fa-list-check");
    add("escalation", "fa-triangle-exclamation");
    add("documentation", "fa-file-medical");
    add("timeline", "fa-timeline");
    add("communication", "fa-bullhorn");
    add("incidents", "fa-shield-halved");
    add("monitor", "fa-desktop");

    section(t("clinical"));
  navItems.push(`<button class="nav-item" data-route="monitoring"><i class="fa-solid fa-heart-pulse"></i>${t("vitals")}</button>`);
    add("medication", "fa-pills");
    add("carePlan", "fa-clipboard-list");
    add("handover", "fa-handshake");
    add("settings", "fa-gear");

    section(t("reports"));
    add("reports", "fa-chart-line");
    add("analytics", "fa-chart-pie");
    add("audit", "fa-clipboard-list");
    add("settings", "fa-gear");
  } else if (s.role === "nurse") {
    section(t("nurse"));
    add("nurseDashboard", "fa-gauge-high");
    add("nurseTasks", "fa-list-check");
    add("nurseDoc", "fa-file-medical");
    add("nurseSummary", "fa-clipboard-check");

    section(t("clinical"));
    add("monitoring", "fa-heart-pulse");
    add("medication", "fa-pills");
    add("carePlan", "fa-clipboard-list");
    add("handover", "fa-handshake");

    section(t("operations"));
    add("communication", "fa-bullhorn");

    add("settings", "fa-gear");
  } else if (s.role === "admin") {
    section(t("admin"));
    add("admin", "fa-user-shield");
    add("backup", "fa-database");

    section(t("management"));
    add("nurses", "fa-user-nurse");
    add("departments", "fa-building");
    add("skills", "fa-list-check");
    add("attendance", "fa-user-clock");
    add("shifts", "fa-clock");
    add("acuity", "fa-heart-pulse");

    section(t("operations"));
    add("escalation", "fa-triangle-exclamation");
    add("documentation", "fa-file-medical");
    add("timeline", "fa-timeline");
    add("communication", "fa-bullhorn");
    add("incidents", "fa-shield-halved");

    section(t("clinical"));
    add("handover", "fa-handshake");

    section(t("reports"));
    add("reports", "fa-chart-line");
    add("analytics", "fa-chart-pie");
    add("audit", "fa-clipboard-list");
    add("settings", "fa-gear");
  }

  nav.innerHTML = navItems.join("");

  $$(".nav-item", nav).forEach(b => {
    b.onclick = () => {
      Router.go(b.dataset.route);
      if (window.innerWidth <= 900) $("#sidebar").classList.remove("open");
    };
  });
}

function updateShellUser() {
  const s = Session.get();
  if (!s) return;

  // Update user data in the header
  $("#userNameTop").textContent = s.name;
  $("#userRoleTop").textContent = t(`roles.${s.role}`);
  $("#userAvatar").textContent = s.name.split(" ").map(p => p[0]).slice(0, 2).join("").toUpperCase();

  // Update the browser tab title with the current user and role
  const roleLabel = t(`roles.${s.role}`) || s.role;
  document.title = `${s.name} (${roleLabel}) · Smart Nursing`;
  
  // (Removed the dynamic favicon logic so it stays as the default Heart Pulse icon)
}

function updateShiftBadge() {
  const shift = DB.data.shifts[0];
  const el = $("#sidebarShiftText");
  if (!el) return;
  el.textContent = shift ? `${shift.type} · ${shift.date}` : t("noActiveShift");
}

function bootShell() {
  updateShellUser();
  updateShiftBadge();
  renderSidebar();

  const menuBtn = $("#menuToggle");
  if (menuBtn) menuBtn.onclick = () => $("#sidebar").classList.toggle("open");

  const uBtn = $("#userMenuBtn");
  const uDrop = $("#userDropdown");
  if (uBtn && uDrop) {
    uBtn.onclick = (e) => { e.stopPropagation(); uDrop.classList.toggle("hidden"); };
    document.addEventListener("click", (e) => {
      if (!uDrop.contains(e.target) && !uBtn.contains(e.target)) uDrop.classList.add("hidden");
    });
  }

  const logoutBtn = $("#logoutBtn");
  if (logoutBtn) logoutBtn.onclick = logout;

  const settingsBtn = $("#settingsBtn");
  if (settingsBtn) settingsBtn.onclick = () => { Router.go("settings"); uDrop?.classList.add("hidden"); };

  const resetBtn = $("#resetDemoBtn");
  if (resetBtn) resetBtn.onclick = () => {
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

  const notifBtn = $("#notifBtn");
  if (notifBtn) {
    notifBtn.onclick = (e) => {
      e.stopPropagation();
      $("#notifPanel").classList.toggle("hidden");
      if (typeof renderNotifPanel === "function") renderNotifPanel();
    };
  }
  const closeNotif = $("#closeNotifPanel");
  if (closeNotif) closeNotif.onclick = () => $("#notifPanel").classList.add("hidden");

  const soundBtn = $("#soundToggle");
  if (soundBtn) {
    const enabled = DB.data.settings.soundEnabled;
    soundBtn.classList.toggle("active", enabled);
    soundBtn.innerHTML = `<i class="fa-solid ${enabled ? "fa-volume-high" : "fa-volume-xmark"}"></i>`;
    soundBtn.onclick = () => {
      DB.data.settings.soundEnabled = !DB.data.settings.soundEnabled;
      DB.save();
      soundBtn.classList.toggle("active", DB.data.settings.soundEnabled);
      soundBtn.innerHTML = `<i class="fa-solid ${DB.data.settings.soundEnabled ? "fa-volume-high" : "fa-volume-xmark"}"></i>`;
      toast(`Sound: ${DB.data.settings.soundEnabled ? "ON" : "OFF"}`, "info");
    };
  }

  const modalClose = $("#modalClose");
  if (modalClose) modalClose.onclick = () => Modal.close();
  const overlay = $("#modalOverlay");
  if (overlay) overlay.addEventListener("click", (e) => { if (e.target === overlay) Modal.close(); });

  if (typeof startNotificationEngine === "function") startNotificationEngine();
}