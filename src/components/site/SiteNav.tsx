'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

type Item = { href: string; label: string };
type Menu = { label: string; items: Item[] };

/** Pill-button nav: HOME · CHART ▾ · OTHERS ▾ · CONTACT · LOGIN, dropdowns open on click/tap. */
export function SiteNav({ games, loggedIn }: { games: { name: string; slug: string }[]; loggedIn: boolean }) {
  const pathname = usePathname();
  const [open, setOpen] = useState<string | null>(null);
  const navRef = useRef<HTMLElement>(null);

  useEffect(() => setOpen(null), [pathname]);
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (navRef.current && !navRef.current.contains(e.target as Node)) setOpen(null);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(null);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, []);

  const chart: Menu = {
    label: 'Chart',
    items: [{ href: '/chart', label: 'All Charts' }, ...games.map((g) => ({ href: `/records/${g.slug}`, label: `${g.name} Chart` }))],
  };
  const others: Menu = {
    label: 'Others',
    items: [
      { href: '/satta-khaiwal', label: 'Satta Khaiwal' },
      { href: '/lucky-satta-king', label: 'Lucky Satta King' },
      { href: '/blog', label: 'Blog' },
      { href: '/privacy-policy', label: 'Privacy Policy' },
      { href: '/terms-conditions', label: 'Terms & Conditions' },
    ],
  };
  const isActive = (href: string) => (href === '/' ? pathname === '/' : pathname.startsWith(href));
  const menuActive = (m: Menu) => m.items.some((i) => isActive(i.href));

  const dropdown = (m: Menu) => {
    const id = `menu-${m.label.toLowerCase()}`;
    const isOpen = open === m.label;
    return (
      <li className="pill-drop">
        <button
          type="button"
          className="pill"
          aria-expanded={isOpen}
          aria-controls={id}
          data-active={menuActive(m)}
          onClick={() => setOpen(isOpen ? null : m.label)}
        >
          {m.label} <span className="caret" aria-hidden="true">▾</span>
        </button>
        {isOpen ? (
          <ul id={id} className="drop-list">
            {m.items.map((i) => (
              <li key={i.href}>
                <Link href={i.href} aria-current={isActive(i.href) ? 'page' : undefined} prefetch={false}>
                  {i.label}
                </Link>
              </li>
            ))}
          </ul>
        ) : null}
      </li>
    );
  };

  return (
    <header className="site-header">
      <nav className="pill-nav" aria-label="Main" ref={navRef}>
        <ul>
          <li>
            <Link href="/" className="pill" aria-current={isActive('/') ? 'page' : undefined} data-active={isActive('/')}>
              Home
            </Link>
          </li>
          {dropdown(chart)}
          {dropdown(others)}
          <li>
            <Link href="/contact-us" className="pill" data-active={isActive('/contact-us')}>
              Contact
            </Link>
          </li>
          <li>
            <Link href={loggedIn ? '/admin' : '/admin/login'} className="pill" prefetch={false}>
              {loggedIn ? 'My Account' : 'Login'}
            </Link>
          </li>
        </ul>
      </nav>
    </header>
  );
}
