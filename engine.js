
export const APP_VERSION = "5.1.4";
export const WORKBOOK_VERSION = "V 22 juli 2026";

export const GLASS_DATA = {
  "System96": {
    transformation: 566, softening: 677, tack: 738, contour: 770,
    fullFuse: 796, slump: 663, upperAnneal: 510, lowerAnneal: 427,
    note: "Kitty KilnCalc / Oceanside"
  },
  "Bullseye-COE90": {
    transformation: 516, softening: 677, tack: 732, contour: 760,
    fullFuse: 804, slump: 663, upperAnneal: 482, lowerAnneal: 371,
    note: "Bullseye guideline values"
  },
  "COE-90 experimental": {
    transformation: 516, softening: 677, tack: 732, contour: 760,
    fullFuse: 804, slump: 663, upperAnneal: 482, lowerAnneal: 371,
    note: "Perform a test firing first"
  }
};

export const PARAMETERS = {
  startTemperature: 20,
  baseTransformationTime: 17,
  diameterFactorPer10cm: 0.08,
  laterFiringFactor: 1.2,
  oldFuseNewLayerFactor: 1.35,
  annealHeatingShare: 0.6667,
  upperAnnealHoldShare: 0.3333,
  lowerAnnealHoldShare: 0.3333,
  bubbleSlowRate: 139,
  tackHold: 10,
  contourHold: 10,
  fullFuseHold: 10,
  slumpCeramicHold: 20,
  slumpOtherHold: 20,
  ceramicTopRate: 300,
  ceramicSideRate: 200,
  maxDiameter: 60,
  maxThickness: 50
};

export const DEFAULT_INPUT = {
  shapeMode: "round",
  glassType: "Bullseye-COE90",
  roundDiameter: 40,
  length: 0,
  width: 0,
  thickness: 6,
  heatingHistory: "1e-heating",
  process: "FullFuse",
  bubbleSoak: "No Bubble Soak",
  enclosure: "N.v.t.",
  ovenType: "Top-Firing",
  ceramicMaxRate: 330,
  transformationHold: 30,
  topTemperatureHold: 10,
  description: "Proefstuk"
};

const number = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

// Excel ROUND for the positive values used by this workbook.
export const xlRound = (value, digits = 0) => {
  const factor = 10 ** digits;
  return Math.round((Number(value) + Number.EPSILON) * factor) / factor;
};

export function getDiagonal(length, width) {
  const l = number(length, 0);
  const w = number(width, 0);
  return l > 0 && w > 0 ? xlRound(Math.sqrt(l ** 2 + w ** 2), 1) : null;
}

export function calculateKiln(rawInput = {}) {
  const input = { ...DEFAULT_INPUT, ...rawInput };
  const glass = GLASS_DATA[input.glassType] || GLASS_DATA["Bullseye-COE90"];

  const roundDiameter = number(input.roundDiameter, 40);
  const length = number(input.length, 0);
  const width = number(input.width, 0);
  const thickness = number(input.thickness, 6);
  const ceramicMaxRate = number(input.ceramicMaxRate, 330);
  const transformationHold = number(input.transformationHold, 30);
  const topTemperatureHold = number(input.topTemperatureHold, 10);

  // Exact workbook C7 formula:
  // IF both dimensions > 0 => rounded diagonal;
  // otherwise positive length; otherwise positive width; otherwise 40.
  // In the V5 interface, Round mode passes dimensions as 0 and Rectangular
  // mode passes both dimensions only once complete.
  let effectiveSize;
  if (length > 0 && width > 0) {
    effectiveSize = xlRound(Math.sqrt(length ** 2 + width ** 2), 1);
  } else if (length > 0) {
    effectiveSize = length;
  } else if (width > 0) {
    effectiveSize = width;
  } else {
    effectiveSize = roundDiameter > 0 ? roundDiameter : 40;
  }

  const diagonal = getDiagonal(length, width);

  let topTemperature;
  if (input.process === "TackFuse") topTemperature = glass.tack;
  else if (input.process === "ContourFuse") topTemperature = glass.contour;
  else if (input.process === "FullFuse") topTemperature = glass.fullFuse;
  else topTemperature = glass.slump;

  const effectiveThickness =
    input.process === "FullFuse" &&
    input.enclosure !== "N.v.t." &&
    thickness > 6 ? 6 : thickness;

  const historyFactor =
    input.heatingHistory === "2e or more heating"
      ? PARAMETERS.laterFiringFactor
      : input.heatingHistory === "Old fuse + New layer"
        ? PARAMETERS.oldFuseNewLayerFactor
        : 1;

  const minutesPerMm = xlRound(
    PARAMETERS.baseTransformationTime *
    (1 + PARAMETERS.diameterFactorPer10cm *
    (Math.max(effectiveSize, 1) - 30) / 10) *
    historyFactor,
    2
  );

  const firstHeatingMinutes = xlRound(thickness * minutesPerMm, 0);

  const firstHeatingRate = firstHeatingMinutes === 0
    ? 0
    : xlRound(
        (glass.transformation - PARAMETERS.startTemperature) /
        (firstHeatingMinutes / 60),
        0
      );

  const bubbleRate = String(input.bubbleSoak).startsWith("Slow")
    ? PARAMETERS.bubbleSlowRate
    : 9999;

  let bubbleHold = 0;
  if (String(input.bubbleSoak).endsWith("15 min")) bubbleHold = 15;
  else if (String(input.bubbleSoak).endsWith("30 min")) bubbleHold = 30;
  else if (String(input.bubbleSoak).endsWith("60 min")) bubbleHold = 60;

  const annealTime = xlRound(
    firstHeatingMinutes * PARAMETERS.annealHeatingShare, 0
  );
  const annealHold = xlRound(
    annealTime * PARAMETERS.upperAnnealHoldShare, 0
  );

  const calculatedFinalDiameter =
    input.process === "FullFuse" &&
    input.enclosure === "Recalculate diameter" &&
    thickness > 6
      ? xlRound(effectiveSize * Math.sqrt(thickness / 6), 1)
      : effectiveSize;

  const bubbleSegmentMinutes = bubbleHold === 0
    ? 0
    : xlRound(
        (glass.softening - glass.transformation) /
        (bubbleRate / 60), 0
      ) + bubbleHold;

  const topRampMinutes = xlRound(
    (topTemperature -
      (bubbleHold === 0 ? glass.transformation : glass.softening)) / 10,
    0
  );

  const totalDurationHours = xlRound(
    (
      firstHeatingMinutes +
      bubbleSegmentMinutes +
      topRampMinutes +
      topTemperatureHold +
      annealTime +
      annealHold
    ) / 60,
    1
  );

  const lowerAnnealRate = annealTime === 0
    ? 0
    : xlRound(
        (glass.upperAnneal - glass.lowerAnneal) /
        (annealTime / 60), 0
      );

  const schedule = [
    { number: 1, rate: firstHeatingRate, target: glass.transformation,
      hold: transformationHold, phase: "Transformation",
      note: "Slowly through the critical range", stageType: "heating" },
    { number: 2, rate: bubbleHold === 0 ? "Skip" : bubbleRate,
      target: bubbleHold === 0 ? "Skip" : glass.softening,
      hold: bubbleHold === 0 ? "Skip" : bubbleHold,
      phase: "Bubble soak", note: "Vent around softening point", stageType: "heating" },
    { number: 3, rate: input.process === "Slump-Ceramic" ? ceramicMaxRate : 9999,
      target: topTemperature, hold: topTemperatureHold,
      phase: "Top temperature", note: "Fuse or slump", stageType: "heating" },
    { number: 4, rate: 9999, target: glass.upperAnneal,
      hold: annealHold, phase: "Upper anneal",
      note: "Natural cooling at unrestricted controller rate", stageType: "natural-cooling" },
    { number: 5, rate: lowerAnnealRate, target: glass.lowerAnneal,
      hold: annealHold, phase: "Lower anneal",
      note: "Controlled through annealing range", stageType: "controlled-cooling" },
    { number: 6, rate: 73, target: 200, hold: 0,
      phase: "Cooling", note: "Keep kiln closed", stageType: "controlled-cooling" },
    { number: 7, rate: "End", target: 50, hold: 0,
      phase: "End", note: "Open around 50 °C", stageType: "natural-cooling" }
  ];

  return {
    input: { ...input, roundDiameter, length, width, thickness,
      ceramicMaxRate, transformationHold, topTemperatureHold },
    glass, diagonal, effectiveSize, topTemperature, effectiveThickness,
    minutesPerMm, firstHeatingMinutes, firstHeatingRate, bubbleRate,
    bubbleHold, annealTime, annealHold, calculatedFinalDiameter,
    totalDurationHours, lowerAnnealRate, schedule
  };
}

export function validateInput(rawInput = {}) {
  const input = { ...DEFAULT_INPUT, ...rawInput };
  const warnings = [];
  const errors = [];
  const length = number(input.length);
  const width = number(input.width);
  const diameter = number(input.roundDiameter);
  const thickness = number(input.thickness);

  if (!String(input.description).trim()) {
    warnings.push("Add a project description before saving or printing.");
  }

  if (input.shapeMode === "round") {
    if (!(diameter > 0)) errors.push("Round diameter must be greater than zero.");
    if (diameter > PARAMETERS.maxDiameter) {
      warnings.push(`Diameter exceeds the workbook validation limit of ${PARAMETERS.maxDiameter} cm.`);
    }
  } else {
    if (!(length > 0) || !(width > 0)) {
      errors.push("Rectangular mode requires both length and width.");
    }
    const diagonal = getDiagonal(length, width);
    if (diagonal && diagonal > PARAMETERS.maxDiameter) {
      warnings.push(`Calculated diagonal (${diagonal} cm) exceeds the workbook validation limit of ${PARAMETERS.maxDiameter} cm.`);
    }
  }

  if (!(thickness > 0)) errors.push("Thickness must be greater than zero.");
  if (thickness > PARAMETERS.maxThickness) {
    warnings.push(`Thickness exceeds the workbook validation limit of ${PARAMETERS.maxThickness} mm.`);
  }

  if (input.process.startsWith("Slump") && input.bubbleSoak !== "No Bubble Soak") {
    errors.push("Bubble soak is not compatible with slump processes because the slump temperature is below the softening point.");
  }

  if (input.process !== "FullFuse" && input.enclosure !== "N.v.t.") {
    warnings.push("Enclosure/dams only affects FullFuse calculations.");
  }

  if (input.process === "Slump-Ceramic" && !(number(input.ceramicMaxRate) > 0)) {
    errors.push("Ceramic maximum rate must be greater than zero.");
  }

  if (input.glassType === "COE-90 experimental") {
    warnings.push("Experimental COE-90 selected: perform a test firing first.");
  }

  return { warnings, errors, valid: errors.length === 0 };
}
