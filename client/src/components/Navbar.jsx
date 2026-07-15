import { useState } from "react";
import { Link, NavLink } from "react-router-dom";
import { Close, Menu } from "./Icons";
const links = [["/", "Home"], ["/sofas", "Sofa Collection"], ["/configurator", "Configurator"], ["/about", "About"], ["/contact", "Contact"]];
function Navbar() { const [open, setOpen] = useState(false); return <header className="navbar"><Link className="brand" to="/" aria-label="Draft Interiors home"><span>D</span><div>DRAFT <small>INTERIORS</small></div></Link><nav id="primary-navigation" aria-label="Primary navigation" className={open ? "open" : ""}>{links.map(([to, label]) => <NavLink end={to === "/"} key={to} to={to} onClick={() => setOpen(false)}>{label}</NavLink>)}</nav><button type="button" className="menu" onClick={() => setOpen(!open)} aria-label={open ? "Close menu" : "Open menu"} aria-expanded={open} aria-controls="primary-navigation">{open ? <Close /> : <Menu />}</button></header> }
export default Navbar;
