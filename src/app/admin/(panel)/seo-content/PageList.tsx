'use client';

import Link from 'next/link';
import { useState } from 'react';

export type ListItem = { href: string; label: string; sub: string; status: 'ok' | 'warn' | 'off'; current: boolean; group: string };

export function PageList({ items }: { items: ListItem[] }) {
  const [q, setQ] = useState('');
  const term = q.trim().toLowerCase();
  const shown = term ? items.filter((i) => i.label.toLowerCase().includes(term) || i.sub.toLowerCase().includes(term)) : items;
  const groups = [...new Set(shown.map((i) => i.group))];

  return (
    <div className="seo-list">
      <input className="input" type="search" placeholder="Filter pages…" aria-label="Filter pages" value={q} onChange={(e) => setQ(e.target.value)} />
      <div className="scroll">
        {groups.map((g) => (
          <div key={g}>
            <div className="group">{g}</div>
            {shown
              .filter((i) => i.group === g)
              .map((i) => (
                <Link key={i.href} href={i.href} aria-current={i.current ? 'page' : undefined}>
                  <span>
                    <span className={`dot ${i.status}`} aria-hidden="true" />
                    {i.label}
                  </span>
                  <small>{i.sub}</small>
                </Link>
              ))}
          </div>
        ))}
        {shown.length === 0 ? <p className="empty">No match</p> : null}
      </div>
    </div>
  );
}
