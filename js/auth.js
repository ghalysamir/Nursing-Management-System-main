/* ============================================================
   auth.js — Login, session, role guard
   ============================================================ */
"use strict";

function attemptLogin(username, password) {
  const user = DB.data.users.find(u =>
    u.username.toLowerCase() === String(username).trim().toLowerCase() && u.active
  );
  if (!user) return { ok: false, message: t("invalidLogin") };
  if (user.password !== password) return { ok: false, message: t("invalidLogin") };

  Session.set(user);
  audit("Login", `User ${user.username} logged in`);
  return { ok: true, user };
}

function initLoginScreen() {
  const form = $("#loginForm");
  if (!form) return;

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const username = $("#loginUsername").value.trim();
    const password = $("#loginPassword").value;
    const errEl = $("#loginError");
    errEl.classList.add("hidden");

    if (!username || !password) {
      errEl.textContent = t("required");
      errEl.classList.remove("hidden");
      return;
    }

    const res = attemptLogin(username, password);
    if (!res.ok) {
      errEl.textContent = res.message;
      errEl.classList.remove("hidden");
      return;
    }

    toast(`${t("loginSuccess")}, ${res.user.name}`, "success");
    enterApp();
  });

  $$(".demo-chip").forEach(chip => {
    chip.addEventListener("click", () => {
      $("#loginUsername").value = chip.dataset.user;
      $("#loginPassword").value = chip.dataset.pass;
    });
  });
}

function enterApp() {
  const sess = Session.get();
  if (!sess) { showLogin(); return; }

  $("#loginScreen").classList.add("hidden");
  $("#appShell").classList.remove("hidden");

  bootShell();

  if (sess.role === "headnurse") Router.go("dashboard");
  else if (sess.role === "nurse") Router.go("nurseDashboard");
  else if (sess.role === "admin") Router.go("admin");
}

function showLogin() {
  $("#appShell").classList.add("hidden");
  $("#loginScreen").classList.remove("hidden");
  
  document.title = "Smart Nursing Management System";
}

function guardRoute(route) {
  const sess = Session.get();
  if (!sess) { showLogin(); return false; }
  const meta = ROUTES[route];
  if (!meta) return false;
  if (!meta.roles.includes(sess.role)) {
    toast(t("accessDenied"), "error");
    return false;
  }
  return true;
}

function logout() {
  audit("Logout", "");
  Session.clear();
  document.title = "Smart Nursing Management System"; 
  location.reload();
}