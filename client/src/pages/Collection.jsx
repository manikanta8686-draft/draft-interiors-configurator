import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowUpRight } from "../components/Icons";
import { categories, sofaModels } from "../data/sofas";
import { collectionFabricIds, getFabricById } from "../data/fabrics";
import { revealTransition } from "../motion/premiumMotion";

const collectionFabricNames = collectionFabricIds.map((id) => getFabricById(id).name);

export default function Collection() {
  const [filter, setFilter] = useState("All");
  const visible = useMemo(
    () => filter === "All" ? sofaModels : sofaModels.filter((sofa) => sofa.category === filter),
    [filter],
  );

  return <main className="collection-page mood-product">
    <div className="page-intro">
      <p className="eyebrow">THE SOFA COLLECTION</p>
      <h1>Made for the way<br /><em>you live.</em></h1>
      <p>Twenty considered forms, exceptional comfort, and materials chosen to grow more beautiful over time.</p>
    </div>
    <div className="collection-filters" aria-label="Filter sofas by category">
      {categories.map((category) => <button type="button" aria-pressed={filter === category} className={filter === category ? "selected" : ""} key={category} onClick={() => setFilter(category)}>{category}</button>)}
    </div>
    <section className="collection-grid" aria-live="polite">
      {visible.map((sofa, index) => <motion.article className="sofa-product" key={sofa.id} initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={revealTransition(Math.min(index * .04, .32))}>
        <img src={sofa.image} alt={sofa.name} />
        <p className="eyebrow">{sofa.category}</p>
        <h2>{sofa.name}</h2>
        <p>{sofa.description}</p>
        <dl><div><dt>Starting at</dt><dd>{`₹${sofa.price.toLocaleString("en-IN")}`}</dd></div><div><dt>Dimensions</dt><dd>{sofa.dimensions}</dd></div></dl>
        <p className="fabric-note">{collectionFabricNames.join(" · ")}</p>
        <Link className="configure-link" to={`/configurator?model=${sofa.id}`}>Configure <ArrowUpRight /></Link>
      </motion.article>)}
    </section>
  </main>;
}
