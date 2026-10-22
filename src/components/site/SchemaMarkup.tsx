/** Renders admin-entered schema.org markup. Accepts raw JSON or full <script type="application/ld+json"> tags. */
export function SchemaMarkup({ markup }: { markup: string | null }) {
  if (!markup?.trim()) return null;
  const blocks: string[] = [];
  const re = /<script[^>]*application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(markup))) blocks.push(m[1].trim());
  if (!blocks.length) blocks.push(markup.trim());
  return (
    <>
      {blocks.map((json, i) => (
        <script
          key={i}
          type="application/ld+json"
          // Escape "<" so a stray "</script>" inside the JSON cannot close the tag.
          dangerouslySetInnerHTML={{ __html: json.replace(/</g, '\\u003c') }}
        />
      ))}
    </>
  );
}

export function CmsContent({ html }: { html: string }) {
  if (!html.trim()) return null;
  return <section className="cms" dangerouslySetInnerHTML={{ __html: html }} />;
}
