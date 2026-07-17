import { useCallback, useEffect, useMemo, useState } from "react";
import { WHATSAPP_BUSINESS_NUMBER } from "../config/contact";
import { downloadQuotation } from "../sales/generateQuotation";
import { FRAME_DESCRIPTION, WARRANTY_NOTICE, formatConfigurationReference } from "../sales/configurationSummary";
import {
  addAdminEnquiryNote,
  createAdminSession,
  deleteAdminSession,
  getAdminEnquiry,
  getAdminSession,
  listAdminEnquiries,
  updateAdminEnquiryStatus,
} from "../services/adminApi";

const STATUS_OPTIONS = [
  ["new", "New"], ["contacted", "Contacted"], ["quote_sent", "Quote Sent"],
  ["negotiating", "Negotiating"], ["confirmed", "Confirmed"], ["closed", "Closed"],
];
const STATUS_LABELS = Object.fromEntries(STATUS_OPTIONS);

function formatDate(value, includeTime = true) {
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium", ...(includeTime ? { timeStyle: "short" } : {}),
  }).format(new Date(value));
}

function formatMoney(value) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(value ?? 0);
}

function quoteFromEnquiry(enquiry) {
  const specification = enquiry.specification;
  return {
    reference: formatConfigurationReference(enquiry.id),
    createdAt: new Date().toISOString(),
    shareUrl: "",
    model: specification.model,
    category: "Configured sofa",
    configuration: {
      dimensions: specification.dimensions,
      frame: FRAME_DESCRIPTION,
      upholstery: specification.fabric,
      colour: specification.colour,
      legFinish: specification.legs,
      cushions: `${specification.cushions} feather-filled cushions`,
      warranty: WARRANTY_NOTICE,
      delivery: "Estimated 6-8 weeks",
    },
    pricing: enquiry.pricing,
  };
}

function AdminLogin({ onSignedIn }) {
  const [credentials, setCredentials] = useState({ email: "", password: "" });
  const [state, setState] = useState({ busy: false, error: "" });
  async function submit(event) {
    event.preventDefault();
    setState({ busy: true, error: "" });
    try {
      const session = await createAdminSession(credentials);
      onSignedIn(session);
    } catch (error) {
      setState({ busy: false, error: error.message });
    }
  }
  return <main className="admin-login-page"><section className="admin-login-card"><p className="eyebrow">PRIVATE SALES OFFICE</p><h1>Welcome back.</h1><p>Sign in to manage Draft Interiors customer enquiries.</p><form onSubmit={submit}><label>Email<input type="email" autoComplete="username" value={credentials.email} onChange={(event) => setCredentials({ ...credentials, email: event.target.value })} required /></label><label>Password<input type="password" autoComplete="current-password" value={credentials.password} onChange={(event) => setCredentials({ ...credentials, password: event.target.value })} required /></label>{state.error && <p className="admin-error" role="alert">{state.error}</p>}<button className="button button-dark" disabled={state.busy}>{state.busy ? "Signing in..." : "Sign in"}<span>→</span></button></form></section></main>;
}

function EnquiryDetail({ enquiry, busy, onClose, onStatus, onNote, onQuote }) {
  const [note, setNote] = useState("");
  if (!enquiry) return null;
  const spec = enquiry.specification;
  const message = encodeURIComponent(`Hello ${enquiry.customer.name},\n\nThank you for your enquiry with Draft Interiors.`);
  const emailSubject = encodeURIComponent(`Draft Interiors enquiry ${formatConfigurationReference(enquiry.id)}`);
  return <div className="admin-detail-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}><aside className="admin-detail" aria-label={`Enquiry from ${enquiry.customer.name}`}><header><div><p className="eyebrow">{formatConfigurationReference(enquiry.id)}</p><h2>{enquiry.customer.name}</h2><span>{formatDate(enquiry.createdAt)}</span></div><button className="admin-close" onClick={onClose} aria-label="Close enquiry">×</button></header><div className="admin-contact-card"><a href={`tel:${enquiry.customer.phone ?? ""}`} className={!enquiry.customer.phone ? "is-disabled" : ""}>Call customer</a><a href={`https://wa.me/${String(enquiry.customer.phone ?? "").replace(/\D/gu, "") || WHATSAPP_BUSINESS_NUMBER}?text=${message}`} target="_blank" rel="noreferrer">WhatsApp</a><a href={`mailto:${enquiry.customer.email}?subject=${emailSubject}`}>Send email</a>{spec && <button onClick={onQuote} disabled={busy}>Updated quote</button>}</div><section className="admin-detail-section"><h3>Customer details</h3><dl><div><dt>Email</dt><dd><a href={`mailto:${enquiry.customer.email}`}>{enquiry.customer.email}</a></dd></div><div><dt>Phone</dt><dd>{enquiry.customer.phone || "Not provided"}</dd></div><div><dt>Source</dt><dd>{enquiry.source === "configurator" ? "Configurator quote" : "Contact form"}</dd></div></dl><p className="admin-customer-message">{enquiry.message}</p></section><section className="admin-detail-section"><div className="admin-section-heading"><h3>Sales status</h3><span className={`admin-status status-${enquiry.status}`}>{STATUS_LABELS[enquiry.status]}</span></div><select value={enquiry.status} onChange={(event) => onStatus(event.target.value)} disabled={busy}>{STATUS_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></section>{spec && <section className="admin-detail-section"><h3>Selected sofa</h3><dl className="admin-spec-grid"><div><dt>Model</dt><dd>{spec.model}</dd></div><div><dt>Estimate</dt><dd>{formatMoney(enquiry.pricing?.total)}</dd></div><div><dt>Upholstery</dt><dd>{spec.fabric}</dd></div><div><dt>Colour</dt><dd>{spec.colour}</dd></div><div><dt>Dimensions</dt><dd>{spec.dimensions}</dd></div><div><dt>Leg finish</dt><dd>{spec.legs}</dd></div><div><dt>Cushions</dt><dd>{spec.cushions}</dd></div><div><dt>Email delivery</dt><dd>{enquiry.notificationStatus.replaceAll("_", " ")}</dd></div></dl></section>}<section className="admin-detail-section"><h3>Internal notes</h3><form className="admin-note-form" onSubmit={async (event) => { event.preventDefault(); if (!note.trim()) return; await onNote(note); setNote(""); }}><textarea value={note} onChange={(event) => setNote(event.target.value)} placeholder="Add a private note for the sales team..." maxLength="2000" rows="3" /><button disabled={busy || !note.trim()}>Add note</button></form><div className="admin-notes">{enquiry.notes.length ? enquiry.notes.map((item) => <article key={item.id}><p>{item.body}</p><small>{item.author} · {formatDate(item.createdAt)}</small></article>) : <p className="admin-empty-note">No internal notes yet.</p>}</div></section></aside></div>;
}

export default function AdminDashboard() {
  const [session, setSession] = useState(undefined);
  const [filters, setFilters] = useState({ search: "", status: "", source: "", sort: "newest", page: 1, pageSize: 20 });
  const [data, setData] = useState(null);
  const [selected, setSelected] = useState(null);
  const [state, setState] = useState({ loading: true, busy: false, error: "" });

  useEffect(() => { getAdminSession().then(setSession).catch(() => setSession(null)); }, []);
  const load = useCallback(async () => {
    if (!session) return;
    setState((current) => ({ ...current, loading: true, error: "" }));
    try { setData(await listAdminEnquiries(filters)); setState((current) => ({ ...current, loading: false })); }
    catch (error) { if (error.status === 401) setSession(null); setState((current) => ({ ...current, loading: false, error: error.message })); }
  }, [filters, session]);
  useEffect(() => { load(); }, [load]);
  const pages = useMemo(() => data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1, [data]);

  async function openEnquiry(id) {
    setState((current) => ({ ...current, busy: true }));
    try { setSelected(await getAdminEnquiry(id)); } finally { setState((current) => ({ ...current, busy: false })); }
  }
  async function updateStatus(status) {
    setState((current) => ({ ...current, busy: true }));
    try { setSelected(await updateAdminEnquiryStatus(selected.id, status)); await load(); } finally { setState((current) => ({ ...current, busy: false })); }
  }
  async function addNote(body) {
    setState((current) => ({ ...current, busy: true }));
    try { await addAdminEnquiryNote(selected.id, body); setSelected(await getAdminEnquiry(selected.id)); } finally { setState((current) => ({ ...current, busy: false })); }
  }
  if (session === undefined) return <main className="admin-loading"><p>Opening the private sales office...</p></main>;
  if (!session) return <AdminLogin onSignedIn={setSession} />;
  const stats = data?.stats ?? {};
  return <main className="admin-page"><header className="admin-page-header"><div><p className="eyebrow">PHASE 7 · SALES OFFICE</p><h1>Customer enquiries.</h1><p>Follow every conversation from first interest to confirmed order.</p></div><div><span>Signed in as<br /><strong>{session.email}</strong></span><button onClick={async () => { await deleteAdminSession(); setSession(null); }}>Sign out</button></div></header><section className="admin-stats" aria-label="Enquiry statistics"><article><span>All enquiries</span><strong>{stats.total ?? 0}</strong></article>{STATUS_OPTIONS.slice(0, 5).map(([key, label]) => <article key={key}><span>{label}</span><strong>{stats[key] ?? 0}</strong></article>)}</section><section className="admin-workspace"><div className="admin-toolbar"><label className="admin-search">Search<input type="search" placeholder="Name, email, phone or ID" value={filters.search} onChange={(event) => setFilters({ ...filters, search: event.target.value, page: 1 })} /></label><label>Status<select value={filters.status} onChange={(event) => setFilters({ ...filters, status: event.target.value, page: 1 })}><option value="">All statuses</option>{STATUS_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><label>Source<select value={filters.source} onChange={(event) => setFilters({ ...filters, source: event.target.value, page: 1 })}><option value="">All sources</option><option value="configurator">Configurator</option><option value="contact">Contact form</option></select></label><label>Sort<select value={filters.sort} onChange={(event) => setFilters({ ...filters, sort: event.target.value, page: 1 })}><option value="newest">Newest first</option><option value="oldest">Oldest first</option></select></label></div>{state.error && <p className="admin-error" role="alert">{state.error}</p>}<div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Customer</th><th>Interest</th><th>Estimate</th><th>Received</th><th>Status</th><th><span className="visually-hidden">Open</span></th></tr></thead><tbody>{data?.items.map((item) => <tr key={item.id}><td><strong>{item.customer.name}</strong><span>{item.customer.email}</span></td><td>{item.specification?.model ?? "General enquiry"}<span>{item.source === "configurator" ? "Configured quote" : "Contact form"}</span></td><td>{item.pricing ? formatMoney(item.pricing.total) : "—"}</td><td>{formatDate(item.createdAt, false)}</td><td><span className={`admin-status status-${item.status}`}>{STATUS_LABELS[item.status]}</span></td><td><button onClick={() => openEnquiry(item.id)}>Open</button></td></tr>)}</tbody></table>{!state.loading && data?.items.length === 0 && <div className="admin-empty"><h2>No enquiries found.</h2><p>Try changing the search or filters.</p></div>}{state.loading && <div className="admin-empty"><p>Loading enquiries...</p></div>}</div><footer className="admin-pagination"><span>{data?.total ?? 0} enquiries</span><div><button disabled={filters.page <= 1} onClick={() => setFilters({ ...filters, page: filters.page - 1 })}>Previous</button><span>Page {filters.page} of {pages}</span><button disabled={filters.page >= pages} onClick={() => setFilters({ ...filters, page: filters.page + 1 })}>Next</button></div></footer></section><EnquiryDetail enquiry={selected} busy={state.busy} onClose={() => setSelected(null)} onStatus={updateStatus} onNote={addNote} onQuote={() => downloadQuotation(quoteFromEnquiry(selected))} /></main>;
}
