import { createContext, useContext } from "react";

export const ConfiguratorContext = createContext(null);

export function useConfigurator() {
  const context = useContext(ConfiguratorContext);
  if (!context) throw new Error("useConfigurator must be used inside ConfiguratorProvider");
  return context;
}
