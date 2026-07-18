import { useCallback, useMemo, useReducer, useState } from "react";
import {
  configurationReducer,
  createSavedDesign,
  DESIGN_STORAGE_KEY,
  getConfigurationCatalogue,
  getViewerConfiguration,
  parseSavedConfiguration,
} from "./configuration";
import { ConfiguratorContext } from "./context";
import { calculatePricing } from "../pricing/pricingEngine.js";
import {
  addSavedConfiguration,
  attachServerId,
  createSavedConfigurationRecord,
  deleteSavedConfiguration as removeSavedConfiguration,
  initializeSavedConfigurations,
  syncSavedConfiguration,
  writeSavedConfigurations,
} from "./persistence.js";
import { createPersistedConfiguration } from "../services/configurationsApi.js";

function createInitialConfiguration({ model, sharedConfiguration, hasSharedConfiguration }) {
  if (hasSharedConfiguration) {
    return parseSavedConfiguration(sharedConfiguration, model)
      ?? configurationReducer(undefined, { type: "reset", model });
  }

  try {
    return parseSavedConfiguration(localStorage.getItem(DESIGN_STORAGE_KEY), model)
      ?? configurationReducer(undefined, { type: "reset", model });
  } catch {
    return configurationReducer(undefined, { type: "reset", model });
  }
}

function createInitialSavedConfigurations() {
  try {
    return initializeSavedConfigurations(localStorage);
  } catch {
    return [];
  }
}

export function ConfiguratorProvider({ model, sharedConfiguration, hasSharedConfiguration, persistenceNotice = "", children }) {
  const [configuration, dispatch] = useReducer(
    configurationReducer,
    { model, sharedConfiguration, hasSharedConfiguration },
    createInitialConfiguration,
  );
  const [savedConfigurations, setSavedConfigurations] = useState(createInitialSavedConfigurations);
  const [saved, setSaved] = useState(false);
  const [persistenceStatus, setPersistenceStatus] = useState("idle");
  const pricing = useMemo(() => calculatePricing(configuration, model), [configuration, model]);
  const catalogue = useMemo(
    () => getConfigurationCatalogue(configuration, model),
    [configuration, model],
  );
  const viewerConfiguration = useMemo(
    () => getViewerConfiguration(configuration, model),
    [configuration, model],
  );

  const setOption = useCallback((option, value) => {
    setSaved(false);
    dispatch({ type: "set-option", option, value, model });
  }, [model]);

  const resetConfiguration = useCallback(() => {
    setSaved(false);
    dispatch({ type: "reset", model });
  }, [model]);

  const saveConfiguration = useCallback((name, id) => {
    const record = createSavedConfigurationRecord({ name, configuration, id });
    if (!record) return false;
    const items = addSavedConfiguration(savedConfigurations, record);
    if (!writeSavedConfigurations(localStorage, items)) {
      setSaved(false);
      return false;
    }

    const savedDesign = createSavedDesign(configuration, model);
    setSavedConfigurations(items);
    setSaved(true);
    try {
      localStorage.setItem(DESIGN_STORAGE_KEY, JSON.stringify(savedDesign));
    } catch {
      // The versioned collection is authoritative; this write only preserves the legacy key.
    }
    setPersistenceStatus("syncing");
    void syncSavedConfiguration({
      items,
      localId: record.id,
      storage: localStorage,
      persist: () => createPersistedConfiguration({ name: record.name, configuration }),
    }).then((result) => {
      if (result.status === "synced") {
        setSavedConfigurations((currentItems) => {
          const syncedItems = attachServerId(currentItems, record.id, result.items.find((item) => item.id === record.id)?.serverId);
          writeSavedConfigurations(localStorage, syncedItems);
          return syncedItems;
        });
      }
      setPersistenceStatus(result.status);
    });
    return true;
  }, [configuration, model, savedConfigurations]);

  const persistShareConfiguration = useCallback(async () => {
    setPersistenceStatus("syncing");
    try {
      const record = await createPersistedConfiguration({ configuration });
      setPersistenceStatus("synced");
      return record.id;
    } catch {
      setPersistenceStatus("offline");
      return null;
    }
  }, [configuration]);

  const deleteSavedConfiguration = useCallback((id) => {
    const items = removeSavedConfiguration(savedConfigurations, id);
    if (!writeSavedConfigurations(localStorage, items)) return false;
    setSavedConfigurations(items);
    return true;
  }, [savedConfigurations]);

  const loadConfiguration = useCallback((savedConfiguration) => {
    if (savedConfiguration?.modelId !== model.id) return false;
    setSaved(false);
    dispatch({ type: "load", configuration: savedConfiguration, model });
    return true;
  }, [model]);

  const value = useMemo(() => ({
    ...catalogue,
    configuration,
    deleteSavedConfiguration,
    loadConfiguration,
    model,
    persistenceNotice,
    persistenceStatus,
    persistShareConfiguration,
    pricing,
    resetConfiguration,
    saveConfiguration,
    saved,
    savedConfigurations,
    setOption,
    viewerConfiguration,
  }), [catalogue, configuration, deleteSavedConfiguration, loadConfiguration, model, persistenceNotice, persistenceStatus, persistShareConfiguration, pricing, resetConfiguration, saveConfiguration, saved, savedConfigurations, setOption, viewerConfiguration]);

  return <ConfiguratorContext.Provider value={value}>{children}</ConfiguratorContext.Provider>;
}
