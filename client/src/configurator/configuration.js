import { sofaModels } from "../data/sofas.js";
import {
  colours,
  fabrics,
  getAvailableColours,
  getColourById,
  getCompatibleFabrics,
  getFabricById,
} from "../data/fabrics.js";

export const DESIGN_STORAGE_KEY = "draft-interiors-design";
export const CONFIGURATION_SCHEMA_VERSION = 2;
export const legFinishes = ["Oak", "Walnut", "Brass"];

export function resolveSofaModel(modelId) {
  return sofaModels.find((sofa) => sofa.id === modelId) ?? sofaModels[0];
}

function resolveFabricId(value) {
  if (typeof value !== "string") return null;
  return getFabricById(value)?.id
    ?? fabrics.find((fabric) => fabric.name === value)?.id
    ?? null;
}

function resolveColourId(value) {
  const candidate = typeof value === "object" && value ? value.id ?? value.name : value;
  if (typeof candidate !== "string") return null;
  return getColourById(candidate)?.id
    ?? colours.find((colour) => colour.name === candidate)?.id
    ?? null;
}

export function createDefaultConfiguration(model) {
  const fabric = getCompatibleFabrics(model)[0];
  const colour = getAvailableColours(fabric)[0];

  return {
    modelId: model.id,
    fabricId: fabric.id,
    colourId: colour.id,
    size: model.sizes[0],
    legs: legFinishes[0],
    cushions: 3,
  };
}

export function normalizeConfiguration(candidate, model) {
  const defaults = createDefaultConfiguration(model);
  const compatibleFabrics = getCompatibleFabrics(model);
  const requestedFabricId = resolveFabricId(candidate?.fabricId ?? candidate?.fabric);
  const fabric = compatibleFabrics.find((option) => option.id === requestedFabricId)
    ?? getFabricById(defaults.fabricId);
  const availableColours = getAvailableColours(fabric);
  const requestedColourId = resolveColourId(candidate?.colourId ?? candidate?.colour);
  const colour = availableColours.find((option) => option.id === requestedColourId)
    ?? availableColours[0];
  const cushions = Number.isInteger(candidate?.cushions)
    ? Math.min(5, Math.max(2, candidate.cushions))
    : defaults.cushions;

  return {
    modelId: model.id,
    fabricId: fabric.id,
    colourId: colour.id,
    size: model.sizes.includes(candidate?.size) ? candidate.size : defaults.size,
    legs: legFinishes.includes(candidate?.legs) ? candidate.legs : defaults.legs,
    cushions,
  };
}

export function configurationReducer(state, action) {
  switch (action.type) {
    case "set-option":
      return normalizeConfiguration({ ...state, [action.option]: action.value }, action.model);
    case "reset":
      return createDefaultConfiguration(action.model);
    default:
      return state;
  }
}

export function createSavedDesign(configuration, model, price, savedAt = new Date()) {
  return {
    version: CONFIGURATION_SCHEMA_VERSION,
    modelId: model.id,
    fabricId: configuration.fabricId,
    colourId: configuration.colourId,
    size: configuration.size,
    legs: configuration.legs,
    cushions: configuration.cushions,
    price,
    savedAt: savedAt.toISOString(),
  };
}

export function parseSavedConfiguration(value, model) {
  if (!value) return null;

  try {
    const saved = typeof value === "string" ? JSON.parse(value) : value;
    const matchesModel = saved?.modelId === model.id || (!saved?.modelId && saved?.model === model.name);
    return matchesModel ? normalizeConfiguration(saved, model) : null;
  } catch {
    return null;
  }
}

export function getConfigurationCatalogue(configuration, model) {
  const availableFabrics = getCompatibleFabrics(model);
  const selectedFabric = availableFabrics.find((fabric) => fabric.id === configuration.fabricId)
    ?? availableFabrics[0];
  const availableColours = getAvailableColours(selectedFabric);
  const selectedColour = availableColours.find((colour) => colour.id === configuration.colourId)
    ?? availableColours[0];

  return { availableFabrics, availableColours, selectedFabric, selectedColour };
}

export function getViewerConfiguration(configuration, model) {
  const { selectedFabric, selectedColour } = getConfigurationCatalogue(configuration, model);
  const type = ["L Shape", "Corner"].includes(model.category)
    ? "Chaise"
    : model.category === "Recliner" ? "Lounge" : "Standard";
  const size = configuration.size.includes("300")
    ? "Grand"
    : configuration.size.includes("160") || configuration.size.includes("90") ? "Compact" : "Standard";

  return {
    color: selectedColour.hex,
    fabricId: selectedFabric.id,
    fabricName: selectedFabric.name,
    colourId: selectedColour.id,
    texture: selectedColour.textureOverride ?? selectedFabric.texture,
    material: selectedFabric.material,
    legs: configuration.legs,
    cushions: configuration.cushions,
    type,
    size,
  };
}
