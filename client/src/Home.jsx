import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { ArrowUpRight } from "./components/Icons";
import { revealTransition } from "./motion/premiumMotion";

export default function Home() {
  return <main className="mood-editorial">
    <section className="home-hero">
      <div className="hero-copy-wrap">
        <motion.img className="hero-brand-lockup" src="/brand/draft-interiors-full.png" alt="Draft Interiors — Crafting comfort, creating elegance" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={revealTransition()} />
        <motion.h1 initial={{ opacity: 0, y: 22 }} animate={{ opacity: 1, y: 0 }} transition={revealTransition(.08)}>Sit <em>beautifully.</em><br />Live completely.</motion.h1>
        <motion.p className="hero-copy" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={revealTransition(.2)}>Thoughtfully made sofas for rooms that hold real life. Designed in India, made to stay awhile.</motion.p>
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={revealTransition(.32)}><Link className="button button-dark" to="/configurator">Create your sofa <ArrowUpRight /></Link></motion.div>
      </div>
      <div className="hero-image hero-image-real">
        <img src="/images/file_00000000036081fa841a77418556be37.png" alt="Draft Interiors sofa collection" />
        <p>BUTTERFLY / THREE-SEAT SOFA</p>
      </div>
    </section>
    <section className="statement">
      <p className="eyebrow">THE DRAFT DIFFERENCE</p>
      <h2>A good sofa isn't just <em>seen.</em><br />It's lived in.</h2>
      <p>We make pieces with restraint, warmth and the kind of comfort that asks you to stay for one more cup of tea.</p>
    </section>
    <section className="features">
      <img className="feature-image" src="/images/aston/edited/aston-front-studio.jpg" alt="Aston three-seat sofa-cum-bed by Draft Interiors" />
      <div className="feature-copy">
        <p className="eyebrow">DESIGNED AROUND YOU</p>
        <h2>Your room.<br /><em>Your rhythm.</em></h2>
        <p>Choose your silhouette, dimensions, upholstery and finishing details. We'll build a sofa that feels like it has always belonged.</p>
        <Link className="text-button" to="/configurator">Explore the configurator <ArrowUpRight /></Link>
      </div>
    </section>
  </main>;
}
