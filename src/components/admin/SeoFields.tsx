'use client';

import { useState } from 'react';

function Counter({ len, good, max }: { len: number; good: [number, number]; max: number }) {
  const cls = len === 0 ? 'bad' : len > max ? 'bad' : len < good[0] || len > good[1] ? 'warn' : 'good';
  return (
    <span className={`counter ${cls}`}>
      {len} chars · best {good[0]}–{good[1]}
    </span>
  );
}

/** Meta title + description with length guidance and a Google-style result preview. */
export function SeoFields({
  title: initialTitle = '',
  description: initialDescription = '',
  keywords = '',
  url,
  siteName,
  vars = {},
}: {
  title?: string;
  description?: string;
  keywords?: string;
  url: string;
  siteName: string;
  vars?: Record<string, string>;
}) {
  const [title, setTitle] = useState(initialTitle);
  const [description, setDescription] = useState(initialDescription);
  const fill = (s: string) =>
    s.replace(/\{(\w+)\}/g, (m, k) => (k === 'site' ? siteName : k === 'year' ? String(new Date().getFullYear()) : vars[k] ?? m));
  const shownTitle = fill(title);
  const shownDesc = fill(description);

  return (
    <div className="grid">
      <div className="field">
        <label htmlFor="meta_title">
          Meta title <Counter len={shownTitle.length} good={[45, 60]} max={70} />
        </label>
        <input id="meta_title" name="meta_title" className="input" maxLength={255} value={title} onChange={(e) => setTitle(e.target.value)} />
      </div>
      <div className="field">
        <label htmlFor="meta_description">
          Meta description <Counter len={shownDesc.length} good={[120, 160]} max={170} />
        </label>
        <textarea
          id="meta_description"
          name="meta_description"
          className="textarea"
          rows={3}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>
      <div className="field">
        <label htmlFor="meta_keywords">Meta keywords</label>
        <input id="meta_keywords" name="meta_keywords" className="input" defaultValue={keywords} placeholder="comma, separated, keywords" />
      </div>
      <div className="field">
        <label>Google preview</label>
        <div className="serp">
          <div className="url">{url}</div>
          <div className="t">{shownTitle.length > 60 ? `${shownTitle.slice(0, 60)}…` : shownTitle || 'Page title'}</div>
          <div className="d">{shownDesc.length > 160 ? `${shownDesc.slice(0, 160)}…` : shownDesc || 'Page description'}</div>
        </div>
      </div>
    </div>
  );
}
