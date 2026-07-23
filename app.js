
import {
  APP_VERSION, WORKBOOK_VERSION, DEFAULT_INPUT, GLASS_DATA,
  calculateKiln, validateInput, getDiagonal
} from "./engine.js";

const $ = id => document.getElementById(id);
const FIELD_IDS = [
  "shapeMode","glassType","roundDiameter","length","width","thickness",
  "heatingHistory","process","bubbleSoak","enclosure","ovenType",
  "ceramicMaxRate","transformationHold","topTemperatureHold","description"
];

const STATE_KEY = "kilncalc-v5-current";
const PROJECTS_KEY = "kilncalc-v5-projects";
const SETTINGS_KEY = "kilncalc-v5-settings";
const HISTORY_LIMIT = 50;

let state = structuredClone(DEFAULT_INPUT);
let undoStack = [];
let redoStack = [];
let lastSnapshot = "";
let renderQueued = false;

const clone = obj => JSON.parse(JSON.stringify(obj));
const projectId = () => crypto.randomUUID?.() ||
  `p-${Date.now()}-${Math.random().toString(36).slice(2)}`;

function readForm() {
  return Object.fromEntries(FIELD_IDS.map(id => [id, $(id).value]));
}

function normalizeForm(raw) {
  return {
    ...DEFAULT_INPUT,
    ...raw,
    roundDiameter: Number(raw.roundDiameter),
    length: Number(raw.length),
    width: Number(raw.width),
    thickness: Number(raw.thickness),
    ceramicMaxRate: Number(raw.ceramicMaxRate),
    transformationHold: Number(raw.transformationHold),
    topTemperatureHold: Number(raw.topTemperatureHold)
  };
}

function writeForm(data) {
  FIELD_IDS.forEach(id => {
    if (data[id] !== undefined && $(id)) $(id).value = data[id];
  });
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
    $("autoShape").checked = settings.autoShape !== false;
  } catch {}
}

function saveSettings() {
  const settings = {
    theme: $("themeSelect").value,
    autoShape: $("autoShape").checked
  };
  document.documentElement.dataset.theme = settings.theme;
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

function loadCurrent() {
  try {
    const saved = JSON.parse(localStorage.getItem(STATE_KEY));
    state = { ...DEFAULT_INPUT, ...(saved || {}) };
  } catch {
    state = clone(DEFAULT_INPUT);
  }
  writeForm(state);
  lastSnapshot = snapshot();
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
  $("roundDiameter").disabled = !isRound;
  $("length").disabled = isRound;
  $("width").disabled = isRound;
  $("roundCard").classList.toggle("calculated", !isRound);
  $("rectangleHelp").hidden = isRound;

  if (!isRound) {
    const diagonal = getDiagonal($("length").value, $("width").value);
    $("roundDiameter").value = diagonal === null ? "" : diagonal.toFixed(1);
  } else if (!$("roundDiameter").value) {
    $("roundDiameter").value = state.roundDiameter || 40;
  }
}

function autoSelectShape(changedId) {
  if (!$("autoShape").checked) return;
  if ((changedId === "length" || changedId === "width") &&
      (Number($("length").value) > 0 || Number($("width").value) > 0)) {
    $("shapeMode").value = "rectangle";
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
          <span><small>Rate</small><strong>${step.rate}</strong><em>°C/u</em></span>
          <span><small>Target</small><strong>${step.target}</strong><em>°C</em></span>
          <span><small>Hold</small><strong>${step.hold}</strong><em>min</em></span>
        </div>
        <p>${step.note}</p>
      </div>
    </article>`).join("");
}

function renderComparison() {
  const process = $("process").value;
  const rows = Object.entries(GLASS_DATA).map(([name, glass]) => {
    const top = process === "TackFuse" ? glass.tack :
      process === "ContourFuse" ? glass.contour :
      process === "FullFuse" ? glass.fullFuse : glass.slump;
    return `<tr><td>${name}</td><td>${glass.transformation}</td><td>${top}</td>
      <td>${glass.upperAnneal}</td><td>${glass.lowerAnneal}</td></tr>`;
  }).join("");
  $("comparisonBody").innerHTML = rows;
}

function render(push = true) {
  if (renderQueued) return;
  renderQueued = true;
  requestAnimationFrame(() => {
    renderQueued = false;
    if (push) pushUndo();

    autoSelectShape(document.activeElement?.id);
    updateShapeUI();

    const raw = normalizeForm(readForm());
    setConditionalInputs(raw);
    updateShapeUI();

    const calcInput = getCalculationInput();
    const validation = validateInput(raw);
    const result = calculateKiln(calcInput);

    $("effectiveSize").textContent = result.effectiveSize.toFixed(1);
    $("diagonal").textContent = result.diagonal === null ? "—" : result.diagonal.toFixed(1);
    $("topTemperature").textContent = result.topTemperature;
    $("effectiveThickness").textContent = result.effectiveThickness.toFixed(1);
    $("minutesPerMm").textContent = result.minutesPerMm.toFixed(2);
    $("firstHeatingMinutes").textContent = result.firstHeatingMinutes;
    $("firstHeatingRate").textContent = result.firstHeatingRate;
    $("bubbleRate").textContent = result.bubbleRate;
    $("bubbleHold").textContent = result.bubbleHold;
    $("annealTime").textContent = result.annealTime;
    $("annealHold").textContent = result.annealHold;
    $("calculatedFinalDiameter").textContent = result.calculatedFinalDiameter.toFixed(1);
    $("totalDurationHours").textContent = result.totalDurationHours.toFixed(1);
    $("transformationPoint").textContent = result.glass.transformation;
    $("softeningPoint").textContent = result.glass.softening;
    $("upperAnneal").textContent = result.glass.upperAnneal;
    $("lowerAnneal").textContent = result.glass.lowerAnneal;

    const mode = raw.shapeMode;
    $("effectiveMessage").textContent =
      mode === "round"
        ? "Round mode uses the editable diameter."
        : result.diagonal !== null
          ? "The calculated diagonal automatically replaces and locks the diameter."
          : "Enter both length and width to calculate and lock the diameter.";

    renderWarnings(validation);
    renderSchedule(result);
    renderComparison();

    state = raw;
    localStorage.setItem(STATE_KEY, JSON.stringify(state));
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
    data: raw
  };
  const index = projects.findIndex(p => p.id === item.id);
  if (index >= 0) projects[index] = item;
  else projects.unshift(item);
  $("activeProjectId").value = item.id;
  putProjects(projects);
  toast("Project saved");
}

function newProject() {
  writeForm(DEFAULT_INPUT);
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
  writeForm(item.data);
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
  document.title = `KilnCalc - ${$("description").value || "Project"}`;
  window.print();
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
  element.addEventListener("input", () => render(true));
  element.addEventListener("change", () => render(true));
});

$("themeSelect").addEventListener("change", () => { saveSettings(); });
$("autoShape").addEventListener("change", saveSettings);
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
      const registration = await navigator.serviceWorker.getRegistration();
      if (registration) await registration.update();
    }
    const cacheNames = await caches.keys();
    await Promise.all(
      cacheNames
        .filter(name => name.startsWith("kilncalc-"))
        .map(name => caches.delete(name))
    );
  } catch {}
  const url = new URL(location.href);
  url.searchParams.set("appVersion", APP_VERSION);
  location.replace(url.toString());
});

loadSettings();
loadCurrent();
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
