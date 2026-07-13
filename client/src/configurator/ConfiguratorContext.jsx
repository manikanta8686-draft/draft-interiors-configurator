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

function createInitialConfiguration(model) {
  try {
    return parseSavedConfiguration(localStorage.getItem(DESIGN_STORAGE_KEY), model)
      ?? configurationReducer(undefined, { type: "reset", model });
  } catch {
    return configurationReducer(undefined, { type: "reset", model });
  }
}

export function ConfiguratorProvider({ model, children }) {
  const [configuration, dispatch] = useReducer(configurationReducer, model, createInitialConfiguration);
  const [saved, setSaved] = useState(false);
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

  const saveConfiguration = useCallback(() => {
    const savedDesign = createSavedDesign(configuration, model, pricing.total);
    try {
      localStorage.setItem(DESIGN_STORAGE_KEY, JSON.stringify(savedDesign));
      setSaved(true);
    } catch {
      setSaved(false);
    }
  }, [configuration, model, pricing.total]);

  const value = useMemo(() => ({
    ...catalogue,
    configuration,
    model,
    pricing,
    resetConfiguration,
    saveConfiguration,
    saved,
    setOption,
    viewerConfiguration,
  }), [catalogue, configuration, model, pricing, resetConfiguration, saveConfiguration, saved, setOption, viewerConfiguration]);

  return <ConfiguratorContext.Provider value={value}>{children}</ConfiguratorContext.Provider>;
}
