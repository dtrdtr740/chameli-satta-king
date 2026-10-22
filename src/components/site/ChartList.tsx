'use client';

import Link from 'next/link';
import { useState } from 'react';

export type ChartGame = { id: number; name: string; slug: string; years: number[] };

export function ChartList({ games, currentYear }: { games: ChartGame[]; currentYear: number }) {
  const [q, setQ] = useState('');
  const term = q.trim().toLowerCase();
  const shown = term ? games.filter((g) => g.name.toLowerCase().includes(term)) : games;

  return (
    <>
      <input
        className="chart-filter"
        type="search"
        placeholder="Search game…"
        aria-label="Search game"
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />
      <div className="chart-list">
        {shown.length === 0 ? (
          <div className="chart-row">
            <span className="name">No chart found.</span>
          </div>
        ) : (
          shown.map((g) => {
            const years = g.years.length ? g.years : [currentYear];
            return (
              <div className="chart-row" key={g.id}>
                <Link className="name" href={`/records/${g.slug}`}>
                  {g.name}
                </Link>
                <div className="years">
                  {years.map((y) => (
                    <Link key={y} href={y === currentYear ? `/records/${g.slug}` : `/records/${g.slug}?year=${y}`}>
                      {y}
                    </Link>
                  ))}
                </div>
              </div>
            );
          })
        )}
      </div>
    </>
  );
}
