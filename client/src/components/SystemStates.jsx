export function Skeleton({ className = "", ...props }) {
  return <span className={`skeleton ${className}`.trim()} aria-hidden="true" {...props} />;
}

export function LoadingState({ label = "Preparing your experience..." }) {
  return <main className="state-page state-loading" aria-busy="true" aria-live="polite">
    <div className="state-skeleton" aria-hidden="true">
      <Skeleton className="skeleton-meta" />
      <Skeleton className="skeleton-title" />
      <Skeleton className="skeleton-copy" />
      <Skeleton className="skeleton-surface" />
    </div>
    <p>{label}</p>
  </main>;
}

export function EmptyState({ title, message }) {
  return <div className="state-panel state-empty">
    <p className="eyebrow">NOTHING HERE YET</p>
    <h3>{title}</h3>
    <p>{message}</p>
  </div>;
}

export function ErrorState({ title = "Something went wrong.", message, action = null }) {
  return <main className="state-page state-error" role="alert">
    <div className="state-panel">
      <p className="eyebrow">A MOMENTARY INTERRUPTION</p>
      <h1>{title}</h1>
      <p>{message}</p>
      {action}
    </div>
  </main>;
}
