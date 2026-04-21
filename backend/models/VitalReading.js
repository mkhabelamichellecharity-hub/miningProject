const mongoose = require("mongoose");

const VitalReadingSchema = new mongoose.Schema(
  {
    workerId:   { type: String, required: true, trim: true },
    workerName: { type: String, required: true, trim: true },
    checkType: {
      type: String,
      enum: ["check-in", "check-out"],
      required: true,
    },

    // ── Vital signs ──────────────────────────────────────
    heartRate: {
      value:  { type: Number, default: null },
      status: { type: String, enum: ["normal", "warning", "critical"], default: "normal" },
    },
    temperature: {
      value:  { type: Number, default: null },
      status: { type: String, enum: ["normal", "warning", "critical"], default: "normal" },
    },
    bloodOxygen: {
      value:  { type: Number, default: null },
      status: { type: String, enum: ["normal", "warning", "critical"], default: "normal" },
    },
    bloodPressure: {
      systolic:  { type: Number, default: null },
      diastolic: { type: Number, default: null },
      status:    { type: String, enum: ["normal", "warning", "critical"], default: "normal" },
    },

    // ── Substance screening ──────────────────────────────
    alcoholTest: {
      value:      { type: Number, default: null },
      status:     { type: String, enum: ["pass", "warning", "fail", "not-tested"], default: "not-tested" },
      testMethod: { type: String, enum: ["breathalyser", "blood", "not-tested"], default: "not-tested" },
    },
    drugTest: {
      result:     { type: String, enum: ["negative", "positive", "not-tested"], default: "not-tested" },
      substances: { type: [String], default: [] },
      status:     { type: String, enum: ["pass", "fail", "not-tested"], default: "not-tested" },
      testMethod: { type: String, enum: ["urine", "saliva", "blood", "not-tested"], default: "not-tested" },
    },

    // ── Decision ─────────────────────────────────────────
    overallStatus:  { type: String, enum: ["fit", "caution", "unfit"], default: "fit" },
    clearedForWork: { type: Boolean, default: true },
    blockReason:    { type: String, default: null },

    // ── Supervisor notification ───────────────────────────
    supervisorNotified:   { type: Boolean, default: false },
    supervisorNotifiedAt: { type: Date, default: null },
    supervisorName:       { type: String, default: null },

    // ── Override ──────────────────────────────────────────
    overriddenBy:   { type: String, default: null },
    overriddenAt:   { type: Date, default: null },
    overrideReason: { type: String, default: null },

    notes: { type: String, default: "" },
  },
  { timestamps: true }
);

// ── Pre-save: auto-calculate all statuses ─────────────────
VitalReadingSchema.pre("save", function (next) {
  const blockReasons = [];

  if (this.heartRate.value !== null) {
    const hr = this.heartRate.value;
    if (hr < 50 || hr > 120)      this.heartRate.status = "critical";
    else if (hr < 60 || hr > 100) this.heartRate.status = "warning";
    else                           this.heartRate.status = "normal";
    if (this.heartRate.status === "critical")
      blockReasons.push("Critical heart rate: " + hr + " BPM");
  }

  if (this.temperature.value !== null) {
    const t = this.temperature.value;
    if (t > 38.1 || t < 35.5)      this.temperature.status = "critical";
    else if (t > 37.2 || t < 36.1) this.temperature.status = "warning";
    else                             this.temperature.status = "normal";
    if (this.temperature.status === "critical")
      blockReasons.push("Critical temperature: " + t + "C");
  }

  if (this.bloodOxygen.value !== null) {
    const s = this.bloodOxygen.value;
    if (s < 90)      this.bloodOxygen.status = "critical";
    else if (s < 95) this.bloodOxygen.status = "warning";
    else             this.bloodOxygen.status = "normal";
    if (this.bloodOxygen.status === "critical")
      blockReasons.push("Critical SpO2: " + s + "%");
  }

  if (this.bloodPressure.systolic !== null && this.bloodPressure.diastolic !== null) {
    const sys = this.bloodPressure.systolic;
    const dia = this.bloodPressure.diastolic;
    if (sys > 180 || sys < 80 || dia > 120 || dia < 50)
      this.bloodPressure.status = "critical";
    else if (sys > 130 || sys < 90 || dia > 90 || dia < 60)
      this.bloodPressure.status = "warning";
    else
      this.bloodPressure.status = "normal";
    if (this.bloodPressure.status === "critical")
      blockReasons.push("Critical BP: " + sys + "/" + dia + " mmHg");
  }

  if (this.alcoholTest.value !== null) {
    const bac = this.alcoholTest.value;
    if (bac > 0.04) {
      this.alcoholTest.status = "fail";
      blockReasons.push("Alcohol over limit: " + bac + " mg/100ml");
    } else if (bac > 0.02) {
      this.alcoholTest.status = "warning";
    } else {
      this.alcoholTest.status = "pass";
    }
  }

  if (this.drugTest.result === "positive") {
    this.drugTest.status = "fail";
    const subs = this.drugTest.substances.length > 0
      ? this.drugTest.substances.join(", ")
      : "unspecified";
    blockReasons.push("Positive drug test: " + subs);
  } else if (this.drugTest.result === "negative") {
    this.drugTest.status = "pass";
  }

  const vitalStatuses = [
    this.heartRate.status,
    this.temperature.status,
    this.bloodOxygen.status,
    this.bloodPressure.status,
  ];

  const hasCritical     = vitalStatuses.includes("critical");
  const hasWarning      = vitalStatuses.includes("warning");
  const alcoholFail     = this.alcoholTest.status === "fail";
  const alcoholWarning  = this.alcoholTest.status === "warning";
  const drugFail        = this.drugTest.status === "fail";

  if (hasCritical || alcoholFail || drugFail) {
    this.overallStatus  = "unfit";
    this.clearedForWork = false;
    this.blockReason    = blockReasons.join("; ");
  } else if (hasWarning || alcoholWarning) {
    this.overallStatus  = "caution";
    this.clearedForWork = true;
    this.blockReason    = null;
  } else {
    this.overallStatus  = "fit";
    this.clearedForWork = true;
    this.blockReason    = null;
  }

  next();
});

module.exports = mongoose.model("VitalReading", VitalReadingSchema);
