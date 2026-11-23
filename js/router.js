/* ============================================================
   router.js — simple client-side page router
   ============================================================ */
"use strict";

const Router = {
  current: null,

  go(route) {
    if (!ROUTES[route]) {
      toast(typeof t === "function" ? t("unknownPage") : "Unknown page.", "error");
      return;
    }
    if (!guardRoute(route)) return;

    this.current = route;
    const meta = ROUTES[route];

    // update topbar
    $("#pageTitle").textContent = typeof t === "function" ? t(meta.titleKey || meta.title) : meta.title;
    $("#pageBreadcrumb").textContent = `${meta.section} / ${meta.title}`;

    // update sidebar highlight
    $$(".nav-item").forEach(b => b.classList.toggle("active", b.dataset.route === route));

    // close panels
    $("#notifPanel")?.classList.add("hidden");

    // render page
    const content = $("#pageContent");
    content.innerHTML = "";
    const renderers = {
      dashboard:       () => renderHeadDashboard(content),
      shift:           () => renderShiftPage(content),
      nurses:          () => renderNursesPage(content),
      patients:        () => renderPatientsPage(content),
      workload:        () => renderWorkloadPage(content),
      assignment:      () => renderAssignmentPage(content),
      tasks:           () => renderTasksPage(content),
      monitor:         () => renderMonitorPage(content),
      reports:         () => renderReportsPage(content),
      audit:           () => renderAuditPage(content),
      admin:           () => renderAdminPage(content),

      nurseDashboard:  () => renderNurseDashboard(content),
      nurseTasks:      () => renderNurseTasksPage(content),
      nurseDoc:        () => renderNurseDocPage(content),
      nurseHandover:   () => renderNurseHandoverPage(content),
      nurseSummary:    () => renderNurseSummaryPage(content)
    };

    const fn = renderers[route];
    if (typeof fn === "function") {
      try { fn(); }
      catch (e) {
        console.error(e);
        content.innerHTML = `<div class="empty-state"><i class="fa-solid fa-bug"></i><h4>${typeof t === "function" ? t("pageFailedRender") : "Page failed to render"}</h4><p>${esc(e.message)}</p></div>`;
      }
    } else {
      content.innerHTML = `<div class="empty-state"><i class="fa-solid fa-screwdriver-wrench"></i><h4>${typeof t === "function" ? t("pageComingSoon") : "Coming soon"}</h4><p>${typeof t === "function" ? t("pageComingSoonDesc") : "This module is not implemented yet."}</p></div>`;
    }

    // Apply translations to newly rendered content
    if (typeof applyTranslations === "function") applyTranslations(content);

    if (typeof updateNotifBadge === "function") updateNotifBadge();
  },

  refresh() { if (this.current) this.go(this.current); }
};