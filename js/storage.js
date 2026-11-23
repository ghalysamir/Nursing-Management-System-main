/* ============================================================
   storage.js — LocalStorage wrapper + Database + Session + Audit
   ============================================================ */
"use strict";

const STORE_KEY = "smartNursingDB_v5"; // Upgraded to v5 for new rules

const DB = {
  data: null,

  defaults() {
    return {
      users: [
        { id: "u_admin", username: "admin", password: "123456", name: "System Administrator",
          role: "admin", active: true, email: "admin@hospital.demo" },
        { id: "u_head", username: "headnurse", password: "123456", name: "Sarah Ahmed",
          role: "headnurse", active: true, email: "headnurse@hospital.demo" },
        { id: "u_n1", username: "nurse1", password: "123456", name: "Mona Khalil",
          role: "nurse", nurseId: "nur_1", active: true, email: "nurse1@hospital.demo" },
        { id: "u_n2", username: "nurse2", password: "123456", name: "Huda Salem",
          role: "nurse", nurseId: "nur_2", active: true, email: "nurse2@hospital.demo" },
        { id: "u_n3", username: "nurse3", password: "123456", name: "Laila Fares",
          role: "nurse", nurseId: "nur_3", active: true, email: "nurse3@hospital.demo" }
      ],
      departments: [
        { id: "dep_1", name: "Medical Ward", active: true },
        { id: "dep_2", name: "Surgical Ward", active: true },
        { id: "dep_3", name: "ICU", active: true },
        { id: "dep_4", name: "Emergency", active: true },
        { id: "dep_5", name: "Pediatrics", active: true }
      ],
      shifts: [],
      nurses: [
        { id: "nur_1", code: "N-01", name: "Mona Khalil", qualification: "BSN", experience: 5,
          skills: ["Vital Signs", "Medication Administration", "Wound Care"], departmentId: "dep_1",
          availability: "available", assignedShift: "Morning" },
        { id: "nur_2", code: "N-02", name: "Huda Salem", qualification: "BSN", experience: 8,
          skills: ["Vital Signs", "Medication Administration", "IV Therapy", "Patient Education"], departmentId: "dep_1",
          availability: "available", assignedShift: "Morning" },
        { id: "nur_3", code: "N-03", name: "Laila Fares", qualification: "Technical Diploma", experience: 2,
          skills: ["Vital Signs", "Patient Repositioning", "Specimen Collection"], departmentId: "dep_1",
          availability: "available", assignedShift: "Morning" }
      ],
      patients: [
        { id: "pat_1", code: "P-001", name: "Patient Alpha", bed: "Bed 101", mrn: "MRN-1001",
          diagnosis: "Pneumonia", history: "Hypertension", condition: "Moderate", acuity: 3,
          careNeeds: ["Oxygen monitoring", "Medication administration", "Positioning"],
          specialNeeds: "Oxygen therapy", assignedNurseId: null, departmentId: "dep_1" },
        { id: "pat_2", code: "P-002", name: "Patient Bravo", bed: "Bed 102", mrn: "MRN-1002",
          diagnosis: "Post-op recovery", history: "None", condition: "Critical", acuity: 4,
          careNeeds: ["Wound dressing", "Pain management", "Vital signs monitoring"],
          specialNeeds: "Post-operative monitoring", assignedNurseId: null, departmentId: "dep_1" },
        { id: "pat_3", code: "P-003", name: "Patient Charlie", bed: "Bed 103", mrn: "MRN-1003",
          diagnosis: "Diabetes Type 2", history: "Obesity", condition: "Stable", acuity: 2,
          careNeeds: ["Blood glucose monitoring", "Patient education", "Diet advice"],
          specialNeeds: "Insulin administration", assignedNurseId: null, departmentId: "dep_1" },
        { id: "pat_4", code: "P-004", name: "Patient Delta", bed: "Bed 104", mrn: "MRN-1004",
          diagnosis: "Fracture – right leg", history: "Osteoporosis", condition: "Stable", acuity: 2,
          careNeeds: ["Positioning", "Pain assessment", "Vital signs"],
          specialNeeds: "Immobility care", assignedNurseId: null, departmentId: "dep_1" },
        { id: "pat_5", code: "P-005", name: "Patient Echo", bed: "Bed 105", mrn: "MRN-1005",
          diagnosis: "COPD exacerbation", history: "Smoking", condition: "Critical", acuity: 4,
          careNeeds: ["Respiratory monitoring", "Oxygen therapy", "Medication administration", "Frequent repositioning"],
          specialNeeds: "High dependency", assignedNurseId: null, departmentId: "dep_1" }
      ],
      tasks: [],
      assignments: [],
      assignmentLock: {},
      reassignmentLog: [],
      documentation: [],
      escalations: [],
      handovers: [],
      vitals: [],
      medications: [],
      carePlans: [],
      announcements: [],
      incidents: [],
      notifications: [],
      auditTrail: [],
      settings: {
        workloadWeights: {
          acuityWeight: 10, taskTypeWeight: 2, durationWeight: 0.35, frequencyWeight: 1.2, competencyBonus: 3
        },
        assignmentRules: {
          maxPatientsPerNurse: 5,
          maxCriticalPerNurse: 1,
          maxHighPerNurse: 2,
          workloadHardLimitPct: 95,
          balanceThreshold: { highPct: 80, lowPct: 40 },
          technicalDiplomaMaxPatients: 2, // 🔥 New rule
          restrictCriticalToBSN: true     // 🔥 New rule
        },
        soundEnabled: true,
        notificationLeadMinutes: 15,
        shiftDefaults: {
          Morning:  { start: "06:00", end: "12:00" },
          Evening:  { start: "12:00", end: "18:00" },
          Night:    { start: "18:00", end: "06:00" },
          Long:     { start: "06:00", end: "18:00" }
        },
        shiftTypes: [
          { key: "Morning", label: "Morning Shift", hours: 6 },
          { key: "Evening", label: "Evening Shift", hours: 6 },
          { key: "Night",   label: "Night Shift",   hours: 12 },
          { key: "Long",    label: "Long Shift",    hours: 12 }
        ]
      },
      preferences: { lang: "en", theme: "light", dateFormat: "en-GB" }
    };
  },

  load() {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (raw) {
        this.data = JSON.parse(raw);
        const def = this.defaults();

        for (const k of Object.keys(def)) {
          if (!(k in this.data)) this.data[k] = def[k];
        }
        if (!this.data.settings) this.data.settings = def.settings;
        for (const k of Object.keys(def.settings)) {
          if (!(k in this.data.settings)) this.data.settings[k] = def.settings[k];
        }
        if (!this.data.settings.assignmentRules) {
          this.data.settings.assignmentRules = def.settings.assignmentRules;
        } else {
          if (this.data.settings.assignmentRules.technicalDiplomaMaxPatients === undefined) {
            this.data.settings.assignmentRules.technicalDiplomaMaxPatients = 2;
          }
          if (this.data.settings.assignmentRules.restrictCriticalToBSN === undefined) {
            this.data.settings.assignmentRules.restrictCriticalToBSN = true;
          }
        }

        if (!this.data.preferences) this.data.preferences = def.preferences;

        const arrayFields = ["users", "departments", "shifts", "nurses", "patients", "tasks", "assignments", "reassignmentLog", "documentation", "escalations", "handovers", "vitals", "medications", "carePlans", "announcements", "incidents", "notifications", "auditTrail"];
        arrayFields.forEach(f => { if (!Array.isArray(this.data[f])) this.data[f] = []; });

        if (typeof this.data.assignmentLock !== "object" || this.data.assignmentLock === null || Array.isArray(this.data.assignmentLock)) {
          this.data.assignmentLock = {};
        }
        this.save();
      } else {
        this.data = this.defaults();
        this.save();
      }
    } catch (e) {
      console.error("DB load failed:", e);
      this.data = this.defaults();
      this.save();
    }
    return this.data;
  },

  save() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(this.data)); }
    catch (e) { console.error("DB save failed:", e); }
  },

  reset() {
    localStorage.removeItem(STORE_KEY);
    this.data = this.defaults();
    this.save();
  }
};

const Session = {
  key: "smartNursingSession_v5",
  get() { try { return JSON.parse(sessionStorage.getItem(this.key)); } catch { return null; } },
  set(user) {
    sessionStorage.setItem(this.key, JSON.stringify({
      id: user.id, username: user.username, name: user.name,
      role: user.role, email: user.email || "", nurseId: user.nurseId || null
    }));
  },
  clear() { sessionStorage.removeItem(this.key); }
};

function audit(action, details = "", reason = "") {
  const s = Session.get();
  if (!DB.data.auditTrail) DB.data.auditTrail = [];
  DB.data.auditTrail.unshift({ id: uid("aud"), action, user: s ? s.name : "system", userId: s ? s.id : null, details, reason, at: nowISO() });
  if (DB.data.auditTrail.length > 500) DB.data.auditTrail.length = 500;
  DB.save();
}

const Store = {
  getSetting(key) { return DB.data?.preferences?.[key] ?? null; },
  setSetting(key, value) { if (!DB.data.preferences) DB.data.preferences = {}; DB.data.preferences[key] = value; DB.save(); },
  getLang() { return this.getSetting("lang") || "en"; },
  setLang(lang) { this.setSetting("lang", lang); },
  getTheme() { return this.getSetting("theme") || "light"; },
  setTheme(theme) { this.setSetting("theme", theme); }
};