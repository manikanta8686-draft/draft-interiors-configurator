import { useState } from "react";
import { Link, NavLink } from "react-router-dom";
const links = [["/", "Home"], ["/sofas", "Sofa Collection"], ["/configurator", "Configurator"], ["/about", "About"], ["/contact", "Contact"]];
function Navbar() { const [open, setOpen] = useState(false); return <header className="navbar"><Link className="brand" to="/" aria-label="Draft Interiors home"><span>D</span><div>DRAFT <small>INTERIORS</small></div></Link><nav className={open ? "open" : ""}>{links.map(([to, label]) => <NavLink end={to === "/"} key={to} to={to} onClick={() => setOpen(false)}>{label}</NavLink>)}</nav><button className="menu" onClick={() => setOpen(!open)} aria-label="Toggle menu"><i /><i /></button></header> }
export default Navbar;
