import { Link } from "react-router-dom";

export default function NotFound() {
  return <main className="not-found"><p className="eyebrow">404 / PAGE NOT FOUND</p><h1>This space is<br /><em>still taking shape.</em></h1><p>The page you requested is not available. Return to the Draft Interiors collection to continue exploring.</p><Link className="button button-dark" to="/sofas">Explore the collection</Link></main>;
}
