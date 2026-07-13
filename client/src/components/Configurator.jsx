import { useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import SofaViewer from "./SofaViewer";
import { Minus, Plus } from "./Icons";
import ErrorBoundary from "./ErrorBoundary";
import { WHATSAPP_BUSINESS_NUMBER } from "../config/contact";
import { ConfiguratorProvider } from "../configurator/ConfiguratorContext";
import { useConfigurator } from "../configurator/context";
import { legFinishes, resolveSofaModel } from "../configurator/configuration";

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
    price,
    saveConfiguration,
    saved,
    selectedColour,
    selectedFabric,
    setOption,
    viewerConfiguration,
  } = useConfigurator();
  const set = (key) => (value) => setOption(key, value);

  return <main className="config-page"><section className="config-heading"><p className="eyebrow">DRAFT / MADE TO ORDER</p><h1>{model.name}, <em>your way.</em></h1><p>Refine every material and detail. Your estimate updates as you design.</p></section><div className="config-layout">
    <div className="config-controls">
      <Options label="01 / UPHOLSTERY" value={design.fabricId} items={availableFabrics} onChange={set("fabricId")} />
      <section className="option-group"><p>02 / COLOUR <span>{selectedColour.name}</span></p><div className="colour-options">{availableColours.map((option) => <button type="button" aria-label={option.name} style={{ background: option.hex }} className={design.colourId === option.id ? "selected" : ""} onClick={() => set("colourId")(option.id)} key={option.id} />)}</div></section>
      <Options label="03 / DIMENSIONS" value={design.size} items={model.sizes} onChange={set("size")} />
      <Options label="04 / LEG FINISH" value={design.legs} items={legFinishes} onChange={set("legs")} />
      <section className="option-group cushion"><p>05 / EXTRA CUSHIONS</p><div><button type="button" aria-label="Remove cushion" onClick={() => set("cushions")(Math.max(2, design.cushions - 1))}><Minus /></button><strong>{design.cushions}</strong><button type="button" aria-label="Add cushion" onClick={() => set("cushions")(Math.min(5, design.cushions + 1))}><Plus /></button><span>feather-filled cushions</span></div></section>
    </div>
    <div className="viewer-panel"><div className="viewer"><ErrorBoundary fallback={<div className="viewer-fallback" role="status">The 3D preview is unavailable on this device. Your configuration and estimate are still available below.</div>}><SofaViewer {...viewerConfiguration} /></ErrorBoundary></div><div className="viewer-note"><span>DRAG TO ROTATE</span><span>LIVE MATERIAL PREVIEW</span></div><div className="summary"><div><p>YOUR DESIGN</p><h2>{model.name}</h2><span>{selectedFabric.name} · {selectedColour.name} · {design.size}</span></div><div><p>ESTIMATED TOTAL</p><motion.strong key={price} initial={{ opacity: .3, y: 4 }} animate={{ opacity: 1, y: 0 }}>{`₹${price.toLocaleString("en-IN")}`}</motion.strong><small>Estimated delivery: 6–8 weeks</small></div><button type="button" className="add-cart" onClick={saveConfiguration}>{saved ? "Design saved" : "Save design"}<span>+</span></button><a className="whatsapp" href={`https://wa.me/${WHATSAPP_BUSINESS_NUMBER}?text=${encodeURIComponent(`I'd like a quote for my ${model.name}: ${selectedFabric.name}, ${selectedColour.name}, ${design.size}.`)}`} target="_blank" rel="noreferrer">WhatsApp quote <span>↗</span></a></div></div>
  </div></main>;
}

export default function Configurator() {
  const [params] = useSearchParams();
  const model = resolveSofaModel(params.get("model"));

  return <ConfiguratorProvider key={model.id} model={model}><ConfiguratorView /></ConfiguratorProvider>;
}
