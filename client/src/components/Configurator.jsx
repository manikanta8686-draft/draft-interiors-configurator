import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import SofaViewer from "./SofaViewer";
import { Minus, Plus } from "./Icons";
import { sofaModels } from "../data/sofas";
import ErrorBoundary from "./ErrorBoundary";
import { WHATSAPP_BUSINESS_NUMBER } from "../config/contact";

const colours = [
  { name: "Oat", value: "#c9b99e" }, { name: "Moss", value: "#53604c" },
  { name: "Terracotta", value: "#9d5d47" }, { name: "Ink", value: "#30383a" },
  { name: "Cloud", value: "#ded9cf" },
];

function makeDesign(model) {
  return { fabric: model.fabrics[0], colour: colours[0], size: model.sizes[0], legs: "Oak", cushions: 3 };
}

function Options({ label, value, items, onChange }) {
  return <section className="option-group"><p>{label}</p><div className="option-options">
    {items.map((item) => <button type="button" key={item} onClick={() => onChange(item)} className={value === item ? "selected" : ""}>{item}</button>)}
  </div></section>;
}

export default function Configurator() {
  const [params] = useSearchParams();
  const model = sofaModels.find((sofa) => sofa.id === params.get("model")) || sofaModels[0];
  const [saved, setSaved] = useState(false);
  const [design, setDesign] = useState(() => makeDesign(model));

  useEffect(() => { setDesign(makeDesign(model)); setSaved(false); }, [model]);
  const set = (key) => (value) => { setSaved(false); setDesign((current) => ({ ...current, [key]: value })); };
  const price = useMemo(() => model.price
    + (design.fabric === "Brushed Velvet" ? 12500 : design.fabric === "Textured Boucle" ? 21000 : 0)
    + (design.legs === "Brass" ? 8000 : 0) + (design.cushions - 3) * 2800
    + (design.size !== model.sizes[0] ? 14000 : 0), [design, model]);

  function saveDesign() {
    const savedDesign = { model: model.name, ...design, price, savedAt: new Date().toISOString() };
    localStorage.setItem("draft-interiors-design", JSON.stringify(savedDesign));
    setSaved(true);
  }

  const type = ["L Shape", "Corner"].includes(model.category) ? "Chaise" : model.category === "Recliner" ? "Lounge" : "Standard";
  return <main className="config-page"><section className="config-heading"><p className="eyebrow">DRAFT / MADE TO ORDER</p><h1>{model.name}, <em>your way.</em></h1><p>Refine every material and detail. Your estimate updates as you design.</p></section><div className="config-layout">
    <div className="config-controls">
      <Options label="01 / UPHOLSTERY" value={design.fabric} items={model.fabrics} onChange={set("fabric")} />
      <section className="option-group"><p>02 / COLOUR <span>{design.colour.name}</span></p><div className="colour-options">{colours.map((colour) => <button type="button" aria-label={colour.name} style={{ background: colour.value }} className={design.colour.name === colour.name ? "selected" : ""} onClick={() => set("colour")(colour)} key={colour.name} />)}</div></section>
      <Options label="03 / DIMENSIONS" value={design.size} items={model.sizes} onChange={set("size")} />
      <Options label="04 / LEG FINISH" value={design.legs} items={["Oak", "Walnut", "Brass"]} onChange={set("legs")} />
      <section className="option-group cushion"><p>05 / EXTRA CUSHIONS</p><div><button type="button" aria-label="Remove cushion" onClick={() => set("cushions")(Math.max(2, design.cushions - 1))}><Minus /></button><strong>{design.cushions}</strong><button type="button" aria-label="Add cushion" onClick={() => set("cushions")(Math.min(5, design.cushions + 1))}><Plus /></button><span>feather-filled cushions</span></div></section>
    </div>
    <div className="viewer-panel"><div className="viewer"><ErrorBoundary fallback={<div className="viewer-fallback" role="status">The 3D preview is unavailable on this device. Your configuration and estimate are still available below.</div>}><SofaViewer color={design.colour.value} fabric={design.fabric} legs={design.legs} cushions={design.cushions} type={type} size={design.size.includes("300") ? "Grand" : design.size.includes("160") || design.size.includes("90") ? "Compact" : "Standard"} /></ErrorBoundary></div><div className="viewer-note"><span>DRAG TO ROTATE</span><span>LIVE MATERIAL PREVIEW</span></div><div className="summary"><div><p>YOUR DESIGN</p><h2>{model.name}</h2><span>{design.fabric} · {design.colour.name} · {design.size}</span></div><div><p>ESTIMATED TOTAL</p><motion.strong key={price} initial={{ opacity: .3, y: 4 }} animate={{ opacity: 1, y: 0 }}>{`₹${price.toLocaleString("en-IN")}`}</motion.strong><small>Estimated delivery: 6–8 weeks</small></div><button type="button" className="add-cart" onClick={saveDesign}>{saved ? "Design saved" : "Save design"}<span>+</span></button><a className="whatsapp" href={`https://wa.me/${WHATSAPP_BUSINESS_NUMBER}?text=${encodeURIComponent(`I'd like a quote for my ${model.name}: ${design.fabric}, ${design.colour.name}, ${design.size}.`)}`} target="_blank" rel="noreferrer">WhatsApp quote <span>↗</span></a></div></div>
  </div></main>;
}
