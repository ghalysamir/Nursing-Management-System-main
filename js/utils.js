/* ============================================================
   utils.js — Helpers, formatters, DOM helpers
   ============================================================ */
"use strict";

const $  = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

function uid(prefix = "id") {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

function nowISO() { return new Date().toISOString(); }
function todayStr() { return new Date().toISOString().slice(0, 10); }

function fmtDate(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString(Store.getSetting("dateFormat") || "en-GB", {
    day: "2-digit", month: "short", year: "numeric"
  });
}

function fmtTime(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString("en-GB", {
    hour: "2-digit", minute: "2-digit"
  });
}

function fmtDateTime(iso) {
  if (!iso) return "—";
  return `${fmtDate(iso)} ${fmtTime(iso)}`;
}

function timeToMinutes(t) {
  if (!t) return null;
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

function minutesNow() {
  const d = new Date();
  return d.getHours() * 60 + d.getMinutes();
}

function esc(str) {
  return String(str ?? "").replace(/[&<>"']/g, c => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[c]));
}

function downloadFile(filename, content, type = "text/csv") {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function debounce(fn, wait = 250) {
  let timeout;
  return function(...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => fn.apply(this, args), wait);
  };
}

function playBeep() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = 880;
    gain.gain.value = 0.06;
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    setTimeout(() => { osc.stop(); ctx.close(); }, 140);
  } catch { /* ignore */ }
}

/* Toast */
function toast(message, type = "info") {
  const root = $("#toastRoot");
  if (!root) return;
  const icons = {
    success: "fa-circle-check",
    error: "fa-circle-xmark",
    warning: "fa-triangle-exclamation",
    info: "fa-circle-info"
  };
  const el = document.createElement("div");
  el.className = `toast ${type}`;
  el.innerHTML = `<i class="fa-solid ${icons[type] || icons.info}"></i><span>${esc(message)}</span>`;
  root.appendChild(el);
  setTimeout(() => {
    el.style.opacity = "0";
    el.style.transform = "translateX(30px)";
    el.style.transition = "all .25s";
    setTimeout(() => el.remove(), 260);
  }, 3200);
}

/* Modal */
const Modal = {
  open({ title, body, footer, wide = false, onMount }) {
    $("#modalTitle").textContent = title;
    $("#modalBody").innerHTML = body;
    $("#modalFooter").innerHTML = footer || "";
    $("#modalBox").classList.toggle("wide", wide);
    $("#modalOverlay").classList.remove("hidden");
    if (typeof onMount === "function") onMount($("#modalBody"), $("#modalFooter"));
  },
  close() {
    $("#modalOverlay").classList.add("hidden");
    $("#modalBody").innerHTML = "";
    $("#modalFooter").innerHTML = "";
  },
  confirm({ title = "Confirm", message, confirmText = "Confirm", danger = false, onConfirm }) {
    this.open({
      title,
      body: `<p style="font-size:13.5px;color:var(--text-soft);line-height:1.6">${esc(message)}</p>`,
      footer: `
        <button class="btn btn-outline" id="modalCancelBtn">${t("cancel")}</button>
        <button class="btn ${danger ? "btn-danger" : "btn-primary"}" id="modalConfirmBtn">${esc(confirmText)}</button>
      `,
      onMount() {
        $("#modalCancelBtn").onclick = () => Modal.close();
        $("#modalConfirmBtn").onclick = () => {
          Modal.close();
          if (typeof onConfirm === "function") onConfirm();
        };
      }
    });
  }
};