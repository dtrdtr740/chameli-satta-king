'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import type { NavGroup } from './nav';

export function AdminShell({
  nav,
  user,
  siteName,
  logoutAction,
  children,
}: {
  nav: NavGroup[];
  user: { name: string; email: string; role: string };
  siteName: string;
  logoutAction: () => Promise<void>;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  useEffect(() => setOpen(false), [pathname]);

  // The longest matching link wins, so /admin/results/import highlights "Import Results", not "Game Results".
  const matches = (href: string) => (href === '/admin' ? pathname === '/admin' : pathname === href || pathname.startsWith(`${href}/`));
  const current = nav
    .flatMap((g) => g.items.map((i) => i.href))
    .filter(matches)
    .sort((a, b) => b.length - a.length)[0];
  const isCurrent = (href: string) => href === current;

  return (
    <div className="admin-shell" data-open={open}>
      <div className="admin-overlay" onClick={() => setOpen(false)} />
      <aside className="admin-side">
        <Link href="/admin" className="admin-brand">
          <b>SK</b> {siteName}
        </Link>
        <nav aria-label="Admin">
          {nav.map((g) => (
            <div key={g.heading}>
              <div className="side-group">{g.heading}</div>
              {g.items.map((i) => (
                <Link key={i.href} href={i.href} className="side-link" aria-current={isCurrent(i.href) ? 'page' : undefined}>
                  <span aria-hidden="true">{i.icon}</span>
                  {i.label}
                  {i.isNew ? <span className="new">NEW</span> : null}
                </Link>
              ))}
            </div>
          ))}
        </nav>
        <div className="side-user">
          <strong>{user.name}</strong>
          <small>{user.email}</small>
          <small>{user.role}</small>
          <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
            <a className="btn btn-sm" href="/" target="_blank" rel="noopener">
              View site
            </a>
            <form action={logoutAction}>
              <button className="btn btn-sm" type="submit">
                Log out
              </button>
            </form>
          </div>
        </div>
      </aside>

      <div style={{ minWidth: 0 }}>
        <div className="admin-top">
          <button className="btn" type="button" aria-label="Open menu" onClick={() => setOpen(true)}>
            ☰
          </button>
          <strong>{siteName} Admin</strong>
        </div>
        <main className="admin-main">{children}</main>
      </div>
    </div>
  );
}
