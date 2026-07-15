import { lazy, Suspense } from "react";
import { Routes, Route, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import Navbar from "./components/Navbar";
import Home from "./Home";
import Collection from "./pages/Collection";
import About from "./pages/About";
import Contact from "./components/Contact";
import ErrorBoundary from "./components/ErrorBoundary";
import NotFound from "./pages/NotFound";
import { pageTransition } from "./motion/premiumMotion";
import { ErrorState, LoadingState } from "./components/SystemStates";
const Configurator = lazy(() => import("./components/Configurator"));

function PageMotion({ children }) { return <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={pageTransition}>{children}</motion.div>; }
function App() { const location = useLocation(); return <><Navbar /><AnimatePresence mode="wait"><Routes location={location} key={location.pathname}><Route path="/" element={<PageMotion><Home /></PageMotion>} /><Route path="/sofas" element={<PageMotion><Collection /></PageMotion>} /><Route path="/configurator" element={<PageMotion><ErrorBoundary fallback={<ErrorState title="The configurator is resting." message="Refresh the page or contact our design team. Your saved configurations remain safe." />}><Suspense fallback={<LoadingState label="Preparing your atelier..." />}><Configurator /></Suspense></ErrorBoundary></PageMotion>} /><Route path="/about" element={<PageMotion><About /></PageMotion>} /><Route path="/contact" element={<PageMotion><Contact /></PageMotion>} /><Route path="*" element={<PageMotion><NotFound /></PageMotion>} /></Routes></AnimatePresence></>; }
export default App;
