import {
  CONFIGURATION_SCHEMA_VERSION,
  DESIGN_STORAGE_KEY,
  getSofaModelById,
  normalizeConfiguration,
  parseSavedConfiguration,
} from "./configuration.js";
import { sofaModels } from "../data/sofas.js";

export const SAVED_CONFIGURATIONS_KEY = "draft-interiors-configurations";
export const SAVED_CONFIGURATIONS_VERSION = 1;
const LEGACY_MIGRATION_KEY = "draft-interiors-design-migrated";

function safeIsoDate(value, fallback) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? fallback.toISOString() : date.toISOString();
}

function normalizeSavedRecord(record) {
  if (!record || typeof record.id !== "string" || !record.id
    || typeof record.name !== "string" || !record.name.trim()) return null;
  const model = getSofaModelById(record.modelId);
  if (!model) return null;
  const configuration = normalizeConfiguration(record, model);
  const fallbackDate = new Date(0);

  const serverId = typeof record.serverId === "string" && record.serverId.length <= 128
    ? record.serverId
    : null;
  return {
    id: record.id,
    ...(serverId ? { serverId } : {}),
    name: record.name.trim().slice(0, 80),
    version: CONFIGURATION_SCHEMA_VERSION,
    ...configuration,
    createdAt: safeIsoDate(record.createdAt, fallbackDate),
    updatedAt: safeIsoDate(record.updatedAt, fallbackDate),
  };
}

export function attachServerId(items, localId, serverId) {
  if (typeof serverId !== "string" || !serverId || serverId.length > 128) return items;
  return items.map((item) => item.id === localId ? { ...item, serverId } : item);
}

export async function syncSavedConfiguration({ items, localId, storage, persist }) {
  try {
    const persisted = await persist();
    const syncedItems = attachServerId(items, localId, persisted?.id);
    if (syncedItems === items || !writeSavedConfigurations(storage, syncedItems)) {
      return { items, status: "offline" };
    }
    return { items: syncedItems, status: "synced" };
  } catch {
    return { items, status: "offline" };
  }
}

export function parseSavedConfigurations(value) {
  if (!value) return [];

  try {
    const collection = typeof value === "string" ? JSON.parse(value) : value;
    if (collection?.version !== SAVED_CONFIGURATIONS_VERSION || !Array.isArray(collection.items)) return [];
    const ids = new Set();
    return collection.items.reduce((items, candidate) => {
      const record = normalizeSavedRecord(candidate);
      if (record && !ids.has(record.id)) {
        ids.add(record.id);
        items.push(record);
      }
      return items;
    }, []);
  } catch {
    return [];
  }
}

export function readSavedConfigurations(storage) {
  try {
    return parseSavedConfigurations(storage.getItem(SAVED_CONFIGURATIONS_KEY));
  } catch {
    return [];
  }
}

export function writeSavedConfigurations(storage, items) {
  try {
    storage.setItem(SAVED_CONFIGURATIONS_KEY, JSON.stringify({
      version: SAVED_CONFIGURATIONS_VERSION,
      items,
    }));
    return true;
  } catch {
    return false;
  }
}

function createRecordId() {
  return globalThis.crypto?.randomUUID?.()
    ?? `design-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function createSavedConfigurationRecord({ name, configuration, id = createRecordId(), now = new Date() }) {
  if (typeof name !== "string" || !name.trim()) return null;
  const model = getSofaModelById(configuration?.modelId);
  if (!model) return null;
  const normalized = normalizeConfiguration(configuration, model);
  const timestamp = now.toISOString();

  return {
    id,
    name: name.trim().slice(0, 80),
    version: CONFIGURATION_SCHEMA_VERSION,
    ...normalized,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

export function addSavedConfiguration(items, record) {
  return record ? [record, ...items.filter((item) => item.id !== record.id)] : items;
}

export function deleteSavedConfiguration(items, id) {
  return items.filter((item) => item.id !== id);
}

export function initializeSavedConfigurations(storage, now = new Date()) {
  const existing = readSavedConfigurations(storage);

  try {
    if (storage.getItem(LEGACY_MIGRATION_KEY)) return existing;
    const rawLegacy = storage.getItem(DESIGN_STORAGE_KEY);
    if (!rawLegacy) {
      storage.setItem(LEGACY_MIGRATION_KEY, "1");
      return existing;
    }

    const legacy = JSON.parse(rawLegacy);
    const model = getSofaModelById(legacy?.modelId)
      ?? sofaModels.find((candidate) => candidate.name === legacy?.model
        || candidate.legacyNames?.includes(legacy?.model))
      ?? null;
    const configuration = model ? parseSavedConfiguration(legacy, model) : null;
    if (!configuration) {
      storage.setItem(LEGACY_MIGRATION_KEY, "1");
      return existing;
    }

    const migrated = createSavedConfigurationRecord({
      id: "legacy-design",
      name: `${model.name} design`,
      configuration,
      now: new Date(safeIsoDate(legacy.savedAt, now)),
    });
    const items = existing.some((item) => item.id === migrated.id)
      ? existing
      : addSavedConfiguration(existing, migrated);
    writeSavedConfigurations(storage, items);
    storage.setItem(LEGACY_MIGRATION_KEY, "1");
    return items;
  } catch {
    return existing;
  }
}
