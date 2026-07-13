import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import SofaViewer from "./SofaViewer";
import { Minus, Plus } from "./Icons";
import ErrorBoundary from "./ErrorBoundary";
import { WHATSAPP_BUSINESS_NUMBER } from "../config/contact";
import { ConfiguratorProvider } from "../configurator/ConfiguratorContext";
import { useConfigurator } from "../configurator/context";
import { legFinishes, resolveSofaModel } from "../configurator/configuration";
import { formatINR } from "../pricing/pricingEngine.js";
import SavedConfigurations from "./SavedConfigurations.jsx";
import {
  decodeShareConfiguration,
  PERSISTED_CONFIGURATION_PARAM,
  SHARE_CONFIGURATION_PARAM,
} from "../configurator/share.js";
import { getSofaModelById } from "../configurator/configuration.js";
import { readPersistedConfiguration } from "../services/configurationsApi.js";

function Options({ label, value, items, onChange }) {
  return <section className="option-group"><p>{label}</p><div className="option-options">
    {items.map((item) => {
      const optionValue = typeof item === "string" ? item : item.id;
      const optionLabel = typeof item === "string" ? item : item.name;
      return <button type="button" key={optionValue} onClick={() => onChange(optionValue)} className={value === optionValue ? "selected" : ""}>{optionLabel}</button>;
    })}
  </div></section>;
}

function ConfiguratorView() {
  const {
    availableColours,
    availableFabrics,
    configuration: design,
    model,
    pricing,
    saved,
    selectedColour,
    selectedFabric,
    setOption,
    viewerConfiguration,
  } = useConfigurator();
  const set = (key) => (value) => setOption(key, value);
  const appliedAdjustments = pricing.adjustments.filter((item) => item.amount !== 0);

  return <main className="config-page"><section className="config-heading"><p className="eyebrow">DRAFT / MADE TO ORDER</p><h1>{model.name}, <em>your way.</em></h1><p>Refine every material and detail. Your estimate updates as you design.</p></section><div className="config-layout">
    <div className="config-controls">
      <Options label="01 / UPHOLSTERY" value={design.fabricId} items={availableFabrics} onChange={set("fabricId")} />
      <section className="option-group"><p>02 / COLOUR <span>{selectedColour.name}</span></p><div className="colour-options">{availableColours.map((option) => <button type="button" aria-label={option.name} style={{ background: option.hex }} className={design.colourId === option.id ? "selected" : ""} onClick={() => set("colourId")(option.id)} key={option.id} />)}</div></section>
      <Options label="03 / DIMENSIONS" value={design.size} items={model.sizes} onChange={set("size")} />
      <Options label="04 / LEG FINISH" value={design.legs} items={legFinishes} onChange={set("legs")} />
      <section className="option-group cushion"><p>05 / EXTRA CUSHIONS</p><div><button type="button" aria-label="Remove cushion" onClick={() => set("cushions")(Math.max(2, design.cushions - 1))}><Minus /></button><strong>{design.cushions}</strong><button type="button" aria-label="Add cushion" onClick={() => set("cushions")(Math.min(5, design.cushions + 1))}><Plus /></button><span>feather-filled cushions</span></div></section>
    </div>
    <div className="viewer-panel"><div className="viewer"><ErrorBoundary fallback={<div className="viewer-fallback" role="status">The 3D preview is unavailable on this device. Your configuration and estimate are still available below.</div>}><SofaViewer {...viewerConfiguration} /></ErrorBoundary></div><div className="viewer-note"><span>DRAG TO ROTATE</span><span>LIVE MATERIAL PREVIEW</span></div><div className="summary"><div><p>YOUR DESIGN</p><h2>{model.name}</h2><span>{selectedFabric.name} · {selectedColour.name} · {design.size}</span></div><div><p>ESTIMATED TOTAL</p><motion.strong key={pricing.total} initial={{ opacity: .3, y: 4 }} animate={{ opacity: 1, y: 0 }}>{formatINR(pricing.total)}</motion.strong><dl className="price-breakdown"><div><dt>{pricing.base.label}</dt><dd>{formatINR(pricing.base.amount)}</dd></div>{appliedAdjustments.map((item) => <div key={item.id}><dt>{item.label}</dt><dd>{formatINR(item.amount, { showSign: true })}</dd></div>)}</dl><small>Estimated delivery: 6–8 weeks</small></div><button type="button" className="add-cart" onClick={() => document.getElementById("configuration-name")?.focus()}>{saved ? "Design saved" : "Save design"}<span>+</span></button><a className="whatsapp" href={`https://wa.me/${WHATSAPP_BUSINESS_NUMBER}?text=${encodeURIComponent(`I'd like a quote for my ${model.name}: ${selectedFabric.name}, ${selectedColour.name}, ${design.size}.`)}`} target="_blank" rel="noreferrer">WhatsApp quote <span>↗</span></a></div></div>
  </div><SavedConfigurations /></main>;
}

export default function Configurator() {
  const [params] = useSearchParams();
  const encodedConfiguration = params.get(SHARE_CONFIGURATION_PARAM);
  const inlineConfiguration = decodeShareConfiguration(encodedConfiguration);
  const persistedId = encodedConfiguration === null
    ? params.get(PERSISTED_CONFIGURATION_PARAM)
    : null;
  const [persistedResult, setPersistedResult] = useState(null);

  useEffect(() => {
    if (!persistedId) return;
    let active = true;
    readPersistedConfiguration(persistedId).then(
      (record) => active && setPersistedResult({ id: persistedId, record, status: "loaded" }),
      () => active && setPersistedResult({ id: persistedId, status: "failed" }),
    );
    return () => { active = false; };
  }, [persistedId]);

  if (persistedId && persistedResult?.id !== persistedId) {
    return <main className="loading">Restoring your saved design...</main>;
  }

  const persistedConfiguration = persistedResult?.status === "loaded"
    ? persistedResult.record.configuration
    : null;
  const sharedConfiguration = inlineConfiguration ?? persistedConfiguration;
  const requestedModel = getSofaModelById(params.get("model"));
  const sharedModel = getSofaModelById(sharedConfiguration?.modelId);
  const model = persistedConfiguration
    ? sharedModel ?? resolveSofaModel()
    : requestedModel ?? sharedModel ?? resolveSofaModel();
  const persistenceNotice = persistedResult?.status === "failed"
    ? "That server-backed share link could not be restored. Your local design remains available."
    : "";
  const hasSharedConfiguration = encodedConfiguration !== null || Boolean(persistedConfiguration);

  return <ConfiguratorProvider key={`${model.id}:${encodedConfiguration ?? persistedId ?? "local"}:${persistedResult?.status ?? "idle"}`} model={model} sharedConfiguration={sharedConfiguration} hasSharedConfiguration={hasSharedConfiguration} persistenceNotice={persistenceNotice}><ConfiguratorView /></ConfiguratorProvider>;
}
