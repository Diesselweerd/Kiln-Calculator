
import {
  APP_VERSION, WORKBOOK_VERSION, DEFAULT_INPUT, GLASS_DATA,
  calculateKiln, validateInput, getSurfaceEquivalentDiameter
} from "./engine-5.3.21.js";

const $ = id => document.getElementById(id);
const FIELD_IDS = [
  "shapeMode","glassType","roundDiameter","length","width","thickness",
  "heatingHistory","process","bubbleSoak","enclosure","ovenType",
  "ceramicMaxRate","transformationHold","topTemperatureHold","description","temperatureUnit"
];

const STATE_KEY = "kilncalc-v5-3-21-current-canonical-cph";
const PROJECTS_KEY = "kilncalc-v5-projects";
const SETTINGS_KEY = "kilncalc-v5-settings";
const HISTORY_LIMIT = 50;
const CERAMIC_RATE_DEFAULT_C = 330;
const CURRENT_STATE_SCHEMA = 2;

let state = structuredClone(DEFAULT_INPUT);
let undoStack = [];
let redoStack = [];
let lastSnapshot = "";
let renderQueued = false;

const clone = obj => JSON.parse(JSON.stringify(obj));
const projectId = () => crypto.randomUUID?.() ||
  `p-${Date.now()}-${Math.random().toString(36).slice(2)}`;

const temperatureUnit = () => $("temperatureUnit")?.value === "F" ? "F" : "C";
const cToF = value => (Number(value) * 1.8) + 32;
const cRateToF = value => Number(value) * 1.8;
const fRateToC = value => Number(value) / 1.8;

// Ceramic mold maximum rate is always stored canonically in °C/hour.
// A rate conversion uses only the scale factor; absolute-temperature offsets never apply.
const canonicalCeramicRateC = value => {
  const numeric = Number(value);
  return Number.isFinite(numeric) && numeric > 0
    ? Math.round(numeric)
    : CERAMIC_RATE_DEFAULT_C;
};
const displayCeramicRate = (celsiusPerHour, unit = temperatureUnit()) =>
  unit === "F"
    ? Math.round(canonicalCeramicRateC(celsiusPerHour) * 1.8)
    : canonicalCeramicRateC(celsiusPerHour);


function formatConverted(value, digits = 1) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return value;
  const rounded = Math.round((numeric + Number.EPSILON) * (10 ** digits)) / (10 ** digits);
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(digits);
}

function displayTemperature(value) {
  const text = String(value ?? "").trim();
  const upper = text.toUpperCase();
  if (upper === "SKIP") return "Skip";
  if (upper === "END") return "End";
  const numeric = Number(text);
  if (!Number.isFinite(numeric)) return text;
  return temperatureUnit() === "F"
    ? formatConverted(cToF(numeric), 1)
    : String(value);
}

function displayScheduleTemperature(value) {
  const text = String(value ?? "").trim();
  const upper = text.toUpperCase();
  if (upper === "SKIP") return "Skip";
  if (upper === "END") return "End";
  const numeric = Number(text);
  if (!Number.isFinite(numeric)) return text;
  return temperatureUnit() === "F"
    ? String(Math.round(cToF(numeric)))
    : String(value);
}

function displayRate(value) {
  const text = String(value ?? "").trim();
  const upper = text.toUpperCase();
  if (upper === "SKIP") return "Skip";
  if (upper === "END") return "End";
  const numeric = Number(text);
  if (!Number.isFinite(numeric)) return text;
  if (numeric === 9999) return "9999";
  return temperatureUnit() === "F"
    ? String(Math.round(cRateToF(numeric)))
    : String(value);
}

function displayTempUnit() {
  return temperatureUnit() === "F" ? "°F" : "°C";
}

function displayRateUnit() {
  return temperatureUnit() === "F" ? "°F/h" : "°C/h";
}

function convertTemperatureText(text) {
  if (temperatureUnit() !== "F") return String(text ?? "");
  return String(text ?? "")
    .replace(/(-?\d+(?:\.\d+)?)\s*°C\s*\/\s*(?:u|h)/gi,
      (_, value) => `${Math.round(cRateToF(value))} °F/h`)
    .replace(/(-?\d+(?:\.\d+)?)\s*°C\b/gi,
      (_, value) => `${formatConverted(cToF(value), 1)} °F`);
}

function updateTemperatureUnitLabels() {
  const tempUnit = displayTempUnit();
  const rateUnit = displayRateUnit();
  [
    "transformationPointUnit","softeningPointUnit","topTemperatureUnit",
    "upperAnnealUnit","lowerAnnealUnit"
  ].forEach(id => { if ($(id)) $(id).textContent = tempUnit; });
  ["firstHeatingRateUnit","bubbleRateUnit","ceramicMaxRateUnit"]
    .forEach(id => { if ($(id)) $(id).textContent = rateUnit; });

  const ceramicRateInput = $("ceramicMaxRate");
  if (ceramicRateInput) {
    ceramicRateInput.step = "1";
    ceramicRateInput.readOnly = temperatureUnit() === "F";
    ceramicRateInput.title = temperatureUnit() === "F"
      ? "Displayed in °F/hour; the calculation model retains the °C/hour value."
      : "";
  }
}

function readForm() {
  return Object.fromEntries(FIELD_IDS.map(id => [id, $(id).value]));
}

function normalizeForm(raw) {
  const normalizedRaw = { ...raw };
  if (normalizedRaw.process === "Slump-Other" || normalizedRaw.process === "Slump-Ceramic") normalizedRaw.process = "Slump";
  if (normalizedRaw.enclosure === "N.v.t." || normalizedRaw.enclosure === "n.v.t.") normalizedRaw.enclosure = "Not applicable";
  return {
    ...DEFAULT_INPUT,
    ...normalizedRaw,
    temperatureUnit: temperatureUnit(),
    roundDiameter: raw.shapeMode === "rectangle"
      ? Math.round(getSurfaceEquivalentDiameter(raw.length, raw.width) ?? 0)
      : (raw.roundDiameter === "" || raw.roundDiameter === null
          ? ""
          : Math.round(Number(raw.roundDiameter))),
    length: raw.shapeMode === "round" ? 0 : Number(raw.length),
    width: raw.shapeMode === "round" ? 0 : Number(raw.width),
    thickness: Number(raw.thickness),
    ceramicMaxRate: temperatureUnit() === "F"
      ? canonicalCeramicRateC($("ceramicMaxRate").dataset.celsiusValue)
      : canonicalCeramicRateC(raw.ceramicMaxRate),
    transformationHold: Number(raw.transformationHold),
    topTemperatureHold: Number(raw.topTemperatureHold)
  };
}

function writeForm(data) {
  FIELD_IDS.forEach(id => {
    if (data[id] !== undefined && $(id)) $(id).value = data[id];
  });

  const ceramicRateInput = $("ceramicMaxRate");
  if (ceramicRateInput) {
    const canonicalCelsius = canonicalCeramicRateC(data.ceramicMaxRate);
    const unit = (data.temperatureUnit || temperatureUnit()) === "F" ? "F" : "C";
    ceramicRateInput.dataset.celsiusValue = String(canonicalCelsius);
    ceramicRateInput.value = String(displayCeramicRate(canonicalCelsius, unit));
  }
}

function snapshot() {
  return JSON.stringify(normalizeForm(readForm()));
}

function pushUndo() {
  const current = snapshot();
  if (current === lastSnapshot) return;
  if (lastSnapshot) undoStack.push(lastSnapshot);
  if (undoStack.length > HISTORY_LIMIT) undoStack.shift();
  lastSnapshot = current;
  redoStack = [];
  updateHistoryButtons();
}

function updateHistoryButtons() {
  $("undoButton").disabled = undoStack.length === 0;
  $("redoButton").disabled = redoStack.length === 0;
}

function restoreSnapshot(json) {
  const data = JSON.parse(json);
  writeForm(data);
  state = data;
  updateShapeUI();
  render(false);
}

function undo() {
  if (!undoStack.length) return;
  redoStack.push(snapshot());
  restoreSnapshot(undoStack.pop());
  lastSnapshot = snapshot();
  updateHistoryButtons();
}

function redo() {
  if (!redoStack.length) return;
  undoStack.push(snapshot());
  restoreSnapshot(redoStack.pop());
  lastSnapshot = snapshot();
  updateHistoryButtons();
}

function loadSettings() {
  try {
    const settings = JSON.parse(localStorage.getItem(SETTINGS_KEY)) || {};
    document.documentElement.dataset.theme = settings.theme || "system";
    $("themeSelect").value = settings.theme || "system";
  } catch {}
}

function saveSettings() {
  const settings = {
    theme: $("themeSelect").value,
  };
  document.documentElement.dataset.theme = settings.theme;
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

function loadCurrent() {
  try {
    const saved = JSON.parse(localStorage.getItem(STATE_KEY));
    if (saved && saved.schema === CURRENT_STATE_SCHEMA && saved.data) {
      state = { ...DEFAULT_INPUT, ...saved.data };
      state.ceramicMaxRate = canonicalCeramicRateC(state.ceramicMaxRate);
    } else {
      // A new schema deliberately starts from verified canonical defaults.
      // This avoids inheriting values saved by older absolute-temperature logic.
      state = { ...DEFAULT_INPUT, ceramicMaxRate: CERAMIC_RATE_DEFAULT_C };
    }
  } catch {
    state = { ...DEFAULT_INPUT, ceramicMaxRate: CERAMIC_RATE_DEFAULT_C };
  }
  writeForm(state);
  lastSnapshot = snapshot();
}

function persistCurrentState(data) {
  localStorage.setItem(STATE_KEY, JSON.stringify({
    schema: CURRENT_STATE_SCHEMA,
    rateBasis: "celsius-per-hour",
    data: { ...data, ceramicMaxRate: canonicalCeramicRateC(data.ceramicMaxRate) }
  }));
}

function getCalculationInput() {
  const raw = normalizeForm(readForm());
  if (raw.shapeMode === "round") {
    return { ...raw, length: 0, width: 0 };
  }
  // Avoid silently using only one side while rectangular mode is incomplete.
  return raw.length > 0 && raw.width > 0
    ? raw
    : { ...raw, length: 0, width: 0 };
}

function updateShapeUI() {
  const mode = $("shapeMode").value;
  const isRound = mode === "round";
  const title = $("diameterFieldTitle");

  $("roundDiameter").disabled = !isRound;
  $("length").disabled = isRound;
  $("width").disabled = isRound;
  $("roundCard").classList.toggle("calculated", !isRound);

  if (title) {
    title.textContent = isRound
      ? "Diameter"
      : "Diameter (surface equivalent)";
  }

  if (!isRound) {
    const equivalentDiameter = getSurfaceEquivalentDiameter(
      $("length").value,
      $("width").value
    );
    $("roundDiameter").value =
      equivalentDiameter === null ? "" : String(Math.round(equivalentDiameter));
  } else {
    // Round glass does not use rectangular dimensions.
    // Clear them visibly and prevent stale rectangular values from remaining.
    $("length").value = "";
    $("width").value = "";

    if (!$("roundDiameter").value) {
      $("roundDiameter").value = state.roundDiameter || 40;
    }
  }
}


function setConditionalInputs(input) {
  const slump = input.process.startsWith("Slump");
  const fullFuse = input.process === "FullFuse";
  const ceramic = input.process === "Slump-Ceramic";

  $("bubbleSoak").disabled = slump;
  if (slump && $("bubbleSoak").value !== "No Bubble Soak") {
    $("bubbleSoak").value = "No Bubble Soak";
  }

  $("enclosure").disabled = !fullFuse;
  if (!fullFuse) $("enclosure").value = "N.v.t.";

  $("ovenType").disabled = !ceramic;
  $("ceramicMaxRate").disabled = !ceramic;
  $("ceramicFields").classList.toggle("inactive", !ceramic);
}

function renderWarnings(validation) {
  const box = $("warnings");
  const items = [
    ...validation.errors.map(text => ({kind:"error", text})),
    ...validation.warnings.map(text => ({kind:"warning", text}))
  ];
  box.hidden = items.length === 0;
  box.innerHTML = items.map(item =>
    `<div class="${item.kind}"><strong>${item.kind === "error" ? "Check" : "Note"}:</strong> ${item.text}</div>`
  ).join("");
}

function renderSchedule(result) {
  $("scheduleBody").innerHTML = result.schedule.map(step => `
    <article class="schedule-card ${step.stageType || ""}">
      <div class="step-number">${step.number}</div>
      <div class="schedule-content">
        <div class="schedule-heading">
          <h3>${step.phase}</h3>
          <span class="stage-label">${
            step.stageType === "heating" ? "Heating" :
            step.stageType === "controlled-cooling" ? "Controlled cooling" :
            step.stageType === "natural-cooling" ? "Natural cooling" : ""
          }</span>
        </div>
        <div class="schedule-metrics">
          <span><small>Rate</small><strong>${displayRate(step.rate)}</strong><em>${Number.isFinite(Number(step.rate)) ? displayRateUnit() : ""}</em></span>
          <span><small>Target</small><strong>${displayScheduleTemperature(step.target)}</strong><em>${Number.isFinite(Number(step.target)) ? displayTempUnit() : ""}</em></span>
          <span><small>Hold</small><strong>${step.hold}</strong><em>min</em></span>
        </div>
        <p>${convertTemperatureText(step.note)}</p>
      </div>
    </article>`).join("");
}

function renderComparison() {
  const process = $("process").value;
  const rows = Object.entries(GLASS_DATA).map(([name, glass]) => {
    const top = process === "TackFuse" ? glass.tack :
      process === "ContourFuse" ? glass.contour :
      process === "FullFuse" ? glass.fullFuse : glass.slump;
    return `<tr><td>${name}</td><td>${displayTemperature(glass.transformation)}</td><td>${displayTemperature(top)}</td>
      <td>${displayTemperature(glass.upperAnneal)}</td><td>${displayTemperature(glass.lowerAnneal)}</td></tr>`;
  }).join("");
  $("comparisonBody").innerHTML = rows;
}

function render(push = true) {
  if (renderQueued) return;
  renderQueued = true;
  requestAnimationFrame(() => {
    renderQueued = false;
    if (push) pushUndo();
    updateShapeUI();

    const raw = normalizeForm(readForm());
    setConditionalInputs(raw);
    updateShapeUI();

    const calcInput = getCalculationInput();
    const validation = validateInput(raw);
    const result = calculateKiln(calcInput);

    const roundedEffectiveSize = Math.round(result.effectiveSize);
    const diameterField = $("roundDiameter");
    const editingEmptyDiameter =
      document.activeElement === diameterField &&
      raw.shapeMode === "round" &&
      diameterField.value === "";

    if (!editingEmptyDiameter &&
        (document.activeElement !== diameterField || raw.shapeMode !== "round")) {
      diameterField.value = roundedEffectiveSize;
    }
    $("effectiveSize").textContent = editingEmptyDiameter ? "—" : roundedEffectiveSize;
    $("topTemperature").textContent = displayTemperature(result.topTemperature);
    $("effectiveThickness").textContent = result.effectiveThickness.toFixed(1);
    $("minutesPerMm").textContent = result.minutesPerMm.toFixed(2);
    $("firstHeatingMinutes").textContent = result.firstHeatingMinutes;
    $("firstHeatingRate").textContent = displayRate(result.firstHeatingRate);
    $("bubbleRate").textContent = displayRate(result.bubbleRate);
    $("bubbleHold").textContent = result.bubbleHold;
    $("annealTime").textContent = result.annealTime;
    $("annealHold").textContent = result.annealHold;
    $("calculatedFinalDiameter").textContent = result.calculatedFinalDiameter.toFixed(1);
    $("totalDurationHours").textContent = result.totalDurationHours.toFixed(1);
    $("transformationPoint").textContent = displayTemperature(result.glass.transformation);
    $("softeningPoint").textContent = displayTemperature(result.glass.softening);
    $("upperAnneal").textContent = displayTemperature(result.glass.upperAnneal);
    $("lowerAnneal").textContent = displayTemperature(result.glass.lowerAnneal);
    updateTemperatureUnitLabels();

    const mode = raw.shapeMode;
    $("effectiveMessage").textContent =
      mode === "round"
        ? "Round mode uses the editable diameter."
        : (Number(raw.length) > 0 && Number(raw.width) > 0)
          ? "The surface-equivalent diameter is calculated from Length × Width and used as the effective diameter."
          : "Enter both length and width to calculate the surface-equivalent diameter.";

    renderWarnings(validation);
    renderSchedule(result);
  renderFiringScheduleGraph(result);
    renderComparison();

    if (!(raw.shapeMode === "round" && raw.roundDiameter === "")) {
      state = raw;
      persistCurrentState(state);
    }
    $("saveStatus").textContent = `Saved locally · App ${APP_VERSION} · Workbook ${WORKBOOK_VERSION}`;
    window.currentResult = result;
    window.currentValidation = validation;
  });
}

function getProjects() {
  try { return JSON.parse(localStorage.getItem(PROJECTS_KEY)) || []; }
  catch { return []; }
}

function putProjects(projects) {
  localStorage.setItem(PROJECTS_KEY, JSON.stringify(projects));
  renderProjectLibrary();
}

function saveProject() {
  const raw = normalizeForm(readForm());
  const validation = validateInput(raw);
  if (!validation.valid) {
    alert("Correct the highlighted input checks before saving the project.");
    return;
  }
  const projects = getProjects();
  const existingId = $("activeProjectId").value;
  const now = new Date().toISOString();
  const item = {
    id: existingId || projectId(),
    name: raw.description.trim() || "Untitled project",
    updatedAt: now,
    rateBasis: "celsius-per-hour",
    data: { ...raw, ceramicMaxRate: canonicalCeramicRateC(raw.ceramicMaxRate) }
  };
  const index = projects.findIndex(p => p.id === item.id);
  if (index >= 0) projects[index] = item;
  else projects.unshift(item);
  $("activeProjectId").value = item.id;
  putProjects(projects);
  toast("Project saved");
}

function newProject() {
  writeForm({ ...DEFAULT_INPUT, ceramicMaxRate: CERAMIC_RATE_DEFAULT_C });
  $("activeProjectId").value = "";
  undoStack = [];
  redoStack = [];
  lastSnapshot = snapshot();
  updateHistoryButtons();
  render(false);
}

function loadProject(id) {
  const item = getProjects().find(p => p.id === id);
  if (!item) return;
  const projectData = { ...DEFAULT_INPUT, ...(item.data || {}) };
  projectData.ceramicMaxRate = item.rateBasis === "celsius-per-hour"
    ? canonicalCeramicRateC(projectData.ceramicMaxRate)
    : CERAMIC_RATE_DEFAULT_C;
  writeForm(projectData);
  $("activeProjectId").value = item.id;
  lastSnapshot = snapshot();
  render(false);
  document.querySelector("main").scrollIntoView({behavior:"smooth"});
}

function deleteProject(id) {
  const item = getProjects().find(p => p.id === id);
  if (!item || !confirm(`Delete "${item.name}"?`)) return;
  putProjects(getProjects().filter(p => p.id !== id));
  if ($("activeProjectId").value === id) $("activeProjectId").value = "";
}

function renderProjectLibrary() {
  const projects = getProjects();
  $("projectCount").textContent = projects.length;
  $("projectList").innerHTML = projects.length
    ? projects.map(p => `
      <article class="project-row">
        <button class="project-main" data-load="${p.id}">
          <strong>${escapeHtml(p.name)}</strong>
          <small>${new Date(p.updatedAt).toLocaleString()}</small>
        </button>
        <button class="icon-button danger" data-delete="${p.id}" aria-label="Delete project">×</button>
      </article>`).join("")
    : `<p class="empty-state">No saved projects yet.</p>`;
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, char => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"
  })[char]);
}

function exportProjects() {
  const payload = {
    format: "KilnCalc-5-projects",
    appVersion: APP_VERSION,
    exportedAt: new Date().toISOString(),
    projects: getProjects()
  };
  downloadBlob(
    new Blob([JSON.stringify(payload, null, 2)], {type:"application/json"}),
    `KilnCalc-projects-${new Date().toISOString().slice(0,10)}.json`
  );
}

function exportCurrentProject() {
  const payload = {
    format: "KilnCalc-5-project",
    appVersion: APP_VERSION,
    exportedAt: new Date().toISOString(),
    project: {
      id: $("activeProjectId").value || projectId(),
      name: $("description").value || "Untitled project",
      updatedAt: new Date().toISOString(),
      data: normalizeForm(readForm())
    }
  };
  downloadBlob(
    new Blob([JSON.stringify(payload, null, 2)], {type:"application/json"}),
    `${safeFilename(payload.project.name)}.kilncalc.json`
  );
}

function safeFilename(value) {
  return String(value).replace(/[^\w\- ]+/g,"").trim().replace(/\s+/g,"-") || "KilnCalc-project";
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function importFile(file) {
  try {
    const payload = JSON.parse(await file.text());
    let imported = [];
    if (payload.format === "KilnCalc-5-projects" && Array.isArray(payload.projects)) {
      imported = payload.projects;
    } else if (payload.format === "KilnCalc-5-project" && payload.project) {
      imported = [payload.project];
    } else {
      throw new Error("Unsupported KilnCalc file.");
    }

    const projects = getProjects();
    for (const incoming of imported) {
      const normalized = {
        id: incoming.id || projectId(),
        name: incoming.name || incoming.data?.description || "Imported project",
        updatedAt: new Date().toISOString(),
        data: { ...DEFAULT_INPUT, ...(incoming.data || {}) }
      };
      const index = projects.findIndex(p => p.id === normalized.id);
      if (index >= 0) projects[index] = normalized;
      else projects.unshift(normalized);
    }
    putProjects(projects);
    toast(`${imported.length} project${imported.length === 1 ? "" : "s"} imported`);
  } catch (error) {
    alert(`Import failed: ${error.message}`);
  } finally {
    $("importFile").value = "";
  }
}

async function shareResult() {
  const result = window.currentResult;
  const text = [
    `KilnCalc — ${result.input.description}`,
    `Shape: ${$("shapeMode").value === "round" ? "Round" : "Rectangular"}`,
    `Glass: ${result.input.glassType}`,
    `Effective size: ${result.effectiveSize.toFixed(1)} cm`,
    `Top temperature: ${result.topTemperature} °C`,
    `First heating rate: ${result.firstHeatingRate} °C/u`,
    `Estimated duration: ${result.totalDurationHours.toFixed(1)} hours`
  ].join("\n");
  if (navigator.share) {
    try { await navigator.share({title:"KilnCalc result", text}); } catch {}
  } else {
    await navigator.clipboard.writeText(text);
    toast("Result copied");
  }
}

function printReport() {
  if (!window.currentValidation.valid) {
    alert("Correct the input checks before printing.");
    return;
  }

  const projectTitle = String($("description").value || "Project").trim() || "Project";
  const previousTitle = document.title;
  const printTitle = $("printProjectTitle");

  document.title = projectTitle;
  if (printTitle) printTitle.textContent = projectTitle;

  const restoreAfterPrint = () => {
    document.title = previousTitle;
    if (printTitle) printTitle.textContent = "";
    window.removeEventListener("afterprint", restoreAfterPrint);
  };

  window.addEventListener("afterprint", restoreAfterPrint, {once:true});
  window.print();

  // Fallback for browsers that do not reliably fire afterprint.
  setTimeout(() => {
    if (document.title === projectTitle) restoreAfterPrint();
  }, 2000);
}

function toast(message) {
  const element = $("toast");
  element.textContent = message;
  element.classList.add("show");
  setTimeout(() => element.classList.remove("show"), 1800);
}

async function checkVersion() {
  try {
    const response = await fetch(`./version.json?ts=${Date.now()}`, {cache:"no-store"});
    if (!response.ok) return;
    const remote = await response.json();
    if (remote.version && remote.version !== APP_VERSION) {
      $("updateNotice").hidden = false;
      $("updateText").textContent = `Version ${remote.version} is available.`;
    } else {
      $("updateNotice").hidden = true;
    }
  } catch {}
}

function setupDetailsPersistence() {
  document.querySelectorAll("details[data-section]").forEach(details => {
    const key = `kilncalc-section-${details.dataset.section}`;
    const saved = localStorage.getItem(key);
    if (saved !== null) details.open = saved === "true";
    details.addEventListener("toggle", () =>
      localStorage.setItem(key, details.open)
    );
  });
}

FIELD_IDS.forEach(id => {
  const element = $(id);
  element.addEventListener("focus", () => { lastSnapshot = snapshot(); });

  // Do not recalculate Diameter / effective size while individual digits
  // are being edited. Re-rendering during input can reinsert the last digit
  // before the browser has completed deleting it.
  if (id !== "roundDiameter") {
    element.addEventListener("input", () => render(true));
  }

  element.addEventListener("change", () => {
    if (id === "roundDiameter") {
      if (element.value === "") {
        const previous = Number(state.roundDiameter);
        element.value = Number.isFinite(previous) && previous > 0
          ? Math.round(previous)
          : Math.round(DEFAULT_INPUT.roundDiameter);
      } else {
        element.value = Math.round(Number(element.value));
      }
    }
    render(true);
  });
});

$("ceramicMaxRate").addEventListener("blur", () => {
  const element = $("ceramicMaxRate");
  if (temperatureUnit() === "C") {
    const canonical = canonicalCeramicRateC(element.value);
    element.dataset.celsiusValue = String(canonical);
    element.value = String(canonical);
  } else {
    const canonical = canonicalCeramicRateC(element.dataset.celsiusValue);
    element.value = String(displayCeramicRate(canonical, "F"));
  }
  render(true);
});

$("roundDiameter").addEventListener("blur", () => {
  const element = $("roundDiameter");
  if (element.value === "") {
    const previous = Number(state.roundDiameter);
    element.value = Number.isFinite(previous) && previous > 0
      ? Math.round(previous)
      : Math.round(DEFAULT_INPUT.roundDiameter);
  } else {
    element.value = Math.round(Number(element.value));
  }
  render(true);
});

$("themeSelect").addEventListener("change", () => { saveSettings(); });
$("temperatureUnit").addEventListener("change", event => {
  const previousUnit = event.target.dataset.previousUnit || "C";
  const nextUnit = event.target.value;
  const rateInput = $("ceramicMaxRate");

  if (previousUnit !== nextUnit) {
    const canonicalCelsius = previousUnit === "C"
      ? canonicalCeramicRateC(rateInput.value)
      : canonicalCeramicRateC(rateInput.dataset.celsiusValue);
    rateInput.dataset.celsiusValue = String(canonicalCelsius);
    rateInput.value = String(displayCeramicRate(canonicalCelsius, nextUnit));
  }

  event.target.dataset.previousUnit = nextUnit;
  updateTemperatureUnitLabels();
  render(true);
});
$("undoButton").addEventListener("click", undo);
$("redoButton").addEventListener("click", redo);
$("newButton").addEventListener("click", newProject);
$("saveProjectButton").addEventListener("click", saveProject);
$("shareButton").addEventListener("click", shareResult);
$("printButton").addEventListener("click", printReport);
$("exportCurrentButton").addEventListener("click", exportCurrentProject);
$("exportAllButton").addEventListener("click", exportProjects);
$("importButton").addEventListener("click", () => $("importFile").click());
$("importFile").addEventListener("change", event => {
  if (event.target.files[0]) importFile(event.target.files[0]);
});
$("projectList").addEventListener("click", event => {
  const load = event.target.closest("[data-load]");
  const del = event.target.closest("[data-delete]");
  if (load) loadProject(load.dataset.load);
  if (del) deleteProject(del.dataset.delete);
});
$("updateButton").addEventListener("click", async () => {
  $("updateButton").disabled = true;
  $("updateButton").textContent = "Updating…";
  try {
    if ("serviceWorker" in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map(registration => registration.unregister()));
    }
    if ("caches" in window) {
      const cacheNames = await caches.keys();
      await Promise.all(cacheNames.filter(name => name.startsWith("kilncalc-")).map(name => caches.delete(name)));
    }
  } catch {}
  const url = new URL(location.href);
  url.searchParams.set("refresh", Date.now().toString());
  location.replace(url.toString());
});

loadSettings();
loadCurrent();
if (!$("ceramicMaxRate").dataset.celsiusValue) {
  $("ceramicMaxRate").dataset.celsiusValue = String(state.ceramicMaxRate);
}
$("temperatureUnit").dataset.previousUnit = temperatureUnit();
setupDetailsPersistence();
updateShapeUI();
render(false);
renderProjectLibrary();
updateHistoryButtons();
checkVersion();

if ("serviceWorker" in navigator) {
  let reloadingForUpdate = false;
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (reloadingForUpdate) return;
    reloadingForUpdate = true;
    location.reload();
  });
  navigator.serviceWorker.register("./service-worker.js")
    .then(registration => registration.update())
    .catch(console.error);
}



function kcNum(value) {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  const cleaned = String(value ?? "").replace(/[^\d.,-]/g, "").replace(",", ".").trim();
  if (cleaned === "" || cleaned === "-" || cleaned === "." || cleaned === "-.") return null;
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : null;
}

function kcHours(value) {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  const text = String(value ?? "").trim().toLowerCase();
  const colon = text.match(/^(\d+):(\d{1,2})$/);
  if (colon) return Number(colon[1]) + Number(colon[2]) / 60;

  let hours = 0;
  const h = text.match(/([\d.,]+)\s*(?:h|hr|hrs|hour|hours)/);
  const m = text.match(/([\d.,]+)\s*(?:m|min|mins|minute|minutes)/);
  if (h) hours += Number(h[1].replace(",", "."));
  if (m) hours += Number(m[1].replace(",", ".")) / 60;

  if (!h && !m) {
    const numeric = Number(text.replace(",", "."));
    if (Number.isFinite(numeric)) return numeric;
  }
  return Number.isFinite(hours) ? hours : 0;
}




function isSkippedGraphStep(step, index, bubbleSoakSelection) {
  const rateText = String(step.rate ?? step.rampRate ?? "").trim().toUpperCase();
  const targetText = String(step.target ?? step.targetTemperature ?? step.temperature ?? "").trim().toUpperCase();
  const holdText = String(step.hold ?? step.holdTime ?? step.soak ?? "").trim().toUpperCase();
  const phaseText = String(step.phase ?? step.name ?? step.stageType ?? "").trim().toLowerCase();
  const selection = String(bubbleSoakSelection ?? "").trim().toUpperCase();

  const explicitlySkipped =
    rateText === "SKIP" ||
    targetText === "SKIP" ||
    holdText === "SKIP" ||
    step.skip === true ||
    step.omitted === true;

  const isBubbleSoakStep =
    Number(step.number) === 2 ||
    phaseText.includes("bubble soak") ||
    phaseText === "bubble";

  const bubbleSoakDisabled =
    selection === "SKIP" ||
    selection === "NO BUBBLE SOAK" ||
    selection === "";

  return explicitlySkipped || (isBubbleSoakStep && bubbleSoakDisabled);
}



function isNaturalCoolingStep(step, fromTemp, targetTemp, rate) {
  const phase = String(step.phase ?? step.name ?? "").trim().toLowerCase();
  return targetTemp < fromTemp && (
    phase === "end" ||
    phase.includes("final natural cooling") ||
    step.isFinalNaturalCooling === true
  );
}

function renderFiringScheduleGraph(result) {
  const svg = document.getElementById("firingScheduleGraph");
  if (!svg || !result || !Array.isArray(result.schedule) || result.schedule.length === 0) return;

  const NS = "http://www.w3.org/2000/svg";
  const W = 1000;
  const H = 520;
  const margin = { left: 88, right: 42, top: 42, bottom: 82 };
  const plotW = W - margin.left - margin.right;
  const plotH = H - margin.top - margin.bottom;

  const startTemperature = kcNum(result.startTemperature ?? result.ambientTemperature) ?? 20;
  let elapsed = 0;
  let currentTemp = startTemperature;
  let naturalCooling = null;

  const bubbleSoakSelection =
    document.getElementById("bubbleSoak")?.value ??
    result.input?.bubbleSoak ??
    "";

  // Remove skipped Bubble Soak from the source sequence before generating
  // any points. This guarantees that no residual line can connect to its
  // skipped target temperature.
  const activeSchedule = result.schedule.filter(
    (step, index) => !isSkippedGraphStep(step, index, bubbleSoakSelection)
  );

  const points = [{ t: 0, temp: startTemperature, kind: "start" }];
  const rampLabels = [];
  const holdLabels = [];

  activeSchedule.forEach((step, activeIndex) => {
    const index = result.schedule.indexOf(step);

    const target = kcNum(step.target ?? step.targetTemperature ?? step.temperature);
    if (target == null) return;

    const rate = kcNum(step.rate ?? step.rampRate);
    const holdHours = kcHours(step.hold ?? step.holdTime ?? step.soak ?? 0);
    const stepNumber = step.number ?? index + 1;

    if (isNaturalCoolingStep(step, currentTemp, target, rate ?? 0)) {
      naturalCooling = {
        startTime: elapsed,
        startTemp: currentTemp,
        targetTemp: target,
        stepNumber
      };
      return;
    }

    const rampStartTime = elapsed;
    const rampStartTemp = currentTemp;

    if (rate != null && rate > 0 && target !== currentTemp) {
      const rampHours = Math.abs(target - currentTemp) / rate;
      elapsed += rampHours;
      points.push({ t: elapsed, temp: target, kind: "ramp", stepNumber });
      rampLabels.push({
        t1: rampStartTime,
        t2: elapsed,
        temp1: rampStartTemp,
        temp2: target,
        text: displayRate(step.rate ?? step.rampRate ?? "")
      });
    } else if (target !== currentTemp) {
      points.push({ t: elapsed, temp: target, kind: "transition", stepNumber });
    }

    if (holdHours > 0) {
      const holdStart = elapsed;
      elapsed += holdHours;
      points.push({ t: elapsed, temp: target, kind: "hold", stepNumber });
      holdLabels.push({
        t1: holdStart,
        t2: elapsed,
        temp: target,
        text: String(step.hold ?? step.holdTime ?? step.soak)
      });
    }

    currentTemp = target;
  });

  const programmedEnd = Math.max(elapsed, 0.01);
  const naturalExtensionHours = naturalCooling ? Math.max(programmedEnd * 0.18, 1) : 0;
  const displayEnd = programmedEnd + naturalExtensionHours;

  const allTemps = points.map(point => point.temp);
  if (naturalCooling) allTemps.push(naturalCooling.targetTemp);

  const rawMin = Math.min(...allTemps, 0);
  const rawMax = Math.max(...allTemps, 100);
  const padding = Math.max(40, (rawMax - rawMin) * 0.08);
  const yMin = Math.max(0, rawMin - padding);
  const yMax = rawMax + padding;

  const x = time => margin.left + (time / displayEnd) * plotW;
  const y = temp => margin.top + ((yMax - temp) / (yMax - yMin)) * plotH;

  svg.innerHTML = "";

  function add(tag, attrs = {}, text = "") {
    const element = document.createElementNS(NS, tag);
    Object.entries(attrs).forEach(([key, value]) => element.setAttribute(key, String(value)));
    if (text) element.textContent = text;
    svg.appendChild(element);
    return element;
  }

  add("rect", { x: 0, y: 0, width: W, height: H, class: "graph-bg" });

  for (let i = 0; i <= 6; i++) {
    const temp = yMin + ((yMax - yMin) * i / 6);
    const yy = y(temp);
    add("line", { x1: margin.left, y1: yy, x2: W - margin.right, y2: yy, class: "graph-grid" });
    add("text", { x: margin.left - 12, y: yy + 4, "text-anchor": "end", class: "graph-tick" }, `${displayTemperature(Math.round(temp))}°`);
  }

  add("line", { x1: margin.left, y1: margin.top, x2: margin.left, y2: H - margin.bottom, class: "graph-axis" });
  add("line", { x1: margin.left, y1: H - margin.bottom, x2: x(programmedEnd), y2: H - margin.bottom, class: "graph-axis" });

  add("text", { x: 20, y: 27, class: "graph-axis-label" }, `Temperature (${displayTempUnit()})`);
  add("path", {
    d: points.map((point, index) => `${index === 0 ? "M" : "L"} ${x(point.t)} ${y(point.temp)}`).join(" "),
    class: "graph-line"
  });

  points.slice(1).forEach(point => {
    add("circle", { cx: x(point.t), cy: y(point.temp), r: 4, class: "graph-point" });
    add("text", {
      x: x(point.t) + 8,
      y: y(point.temp) - 10,
      class: "graph-segment-label"
    }, String(point.stepNumber));
  });

  holdLabels.forEach(label => {
    add("text", {
      x: (x(label.t1) + x(label.t2)) / 2,
      y: y(label.temp) - 15,
      "text-anchor": "middle",
      class: "graph-hold-label"
    }, label.text);
  });

  rampLabels.forEach(label => {
    if (!label.text) return;
    add("text", {
      x: (x(label.t1) + x(label.t2)) / 2,
      y: (y(label.temp1) + y(label.temp2)) / 2 - 8,
      "text-anchor": "middle",
      class: "graph-rate-label"
    }, label.text);
  });

  if (naturalCooling) {
    const x1 = x(programmedEnd);
    const y1 = y(naturalCooling.startTemp);
    const x2 = x(displayEnd);
    const y2 = y(naturalCooling.targetTemp);

    add("line", { x1, y1, x2, y2, class: "graph-natural-line" });
    add("circle", { cx: x1, cy: y1, r: 4, class: "graph-point" });
    add("text", {
      x: (x1 + x2) / 2,
      y: (y1 + y2) / 2 - 12,
      "text-anchor": "middle",
      class: "graph-natural-label"
    }, "Natural cooling");
  }
}

