import Link from 'next/link';

export type SP = Promise<Record<string, string | string[] | undefined>>;

export function one(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}

export function PageHead({ title, sub, actions }: { title: string; sub?: string; actions?: React.ReactNode }) {
  return (
    <div className="page-head">
      <h1>{title}</h1>
      {actions ? <div className="actions">{actions}</div> : null}
      {sub ? <p>{sub}</p> : null}
    </div>
  );
}

export function Flash({ sp }: { sp: Record<string, string | string[] | undefined> }) {
  const ok = one(sp.ok);
  const err = one(sp.error);
  const denied = one(sp.denied);
  return (
    <>
      {ok ? <div className="flash ok">{ok}</div> : null}
      {err ? <div className="flash err">{err}</div> : null}
      {denied ? <div className="flash err">You don&apos;t have permission to open that page.</div> : null}
    </>
  );
}

export function Active({ on }: { on: number | boolean }) {
  return on ? <span className="badge ok">Active</span> : <span className="badge off">Inactive</span>;
}

export function Pager({ page, pages, href }: { page: number; pages: number; href: (p: number) => string }) {
  if (pages <= 1) return null;
  return (
    <div className="pager">
      {page > 1 ? (
        <Link className="btn btn-sm" href={href(page - 1)}>
          ← Prev
        </Link>
      ) : null}
      <span className="muted">
        Page {page} of {pages}
      </span>
      {page < pages ? (
        <Link className="btn btn-sm" href={href(page + 1)}>
          Next →
        </Link>
      ) : null}
    </div>
  );
}

export function Field({
  label,
  hint,
  children,
  htmlFor,
}: {
  label: string;
  hint?: React.ReactNode;
  children: React.ReactNode;
  htmlFor?: string;
}) {
  return (
    <div className="field">
      <label htmlFor={htmlFor}>{label}</label>
      {children}
      {hint ? <span className="hint">{hint}</span> : null}
    </div>
  );
}

export function pageNum(v: string | string[] | undefined): number {
  const n = Number(one(v));
  return Number.isInteger(n) && n > 0 ? n : 1;
}
