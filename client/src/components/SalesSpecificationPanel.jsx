export default function SalesSpecificationPanel({ quote, compact = false }) {
  const specification = quote.configuration;
  const items = [
    ["Dimensions", specification.dimensions],
    ["Frame", specification.frame],
    ["Upholstery", `${specification.upholstery} - ${specification.colour}`],
    ["Leg finish", specification.legFinish],
    ["Cushions", specification.cushions],
    ["Warranty", specification.warranty],
  ];

  return <section className={compact ? "sales-specification compact" : "sales-specification"} aria-label="Selected sofa specification">
    <div className="sales-specification-heading"><div><p className="eyebrow">LIVE SPECIFICATION</p><h2>Made for this configuration.</h2></div><small>{quote.reference}</small></div>
    <dl>{items.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
  </section>;
}
