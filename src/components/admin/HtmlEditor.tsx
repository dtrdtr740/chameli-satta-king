'use client';

import { Editor } from '@tinymce/tinymce-react';
import { useState } from 'react';

// Mirrors the public site's `.cms` styles so the editor looks like the live page:
// any H1/H2/H3 gets the yellow band with black borders automatically.
const CONTENT_STYLE = `
  body { font-family: Arial, 'Noto Sans Devanagari', sans-serif; color: #000; margin: 12px; }
  h1, h2, h3, .content-heading {
    display: block; padding: 12px 16px; text-align: center; font-size: 28px; font-weight: 700; color: #000;
    line-height: 1.35; background: #ffab00; border-top: 2px solid #000; border-bottom: 1px solid #000; margin: 20px 0;
  }
  h3 { font-size: 22px; }
  h4, h5, h6 { font-weight: 800; margin: 16px 0 8px; }
  p, .content-para, ul, ol { font-size: 15px; font-weight: 500; letter-spacing: .2px; line-height: 1.7; }
  a { color: #0b57d0; }
  img { max-width: 100%; height: auto; border-radius: 6px; }
  blockquote { margin: 14px 0; padding: 10px 16px; border-left: 5px solid #ffab00; background: #fff8e1; font-style: italic; }
  hr { border: 0; border-top: 2px solid #000; }
  table { border-collapse: collapse; } th, td { border: 1px solid #333; padding: 6px 10px; } th { background: #ffab00; }
`;

const SITE_COLORS = [
  '000000', 'Black', 'FFFFFF', 'White', 'FFAB00', 'Site yellow', 'F5004F', 'Site pink',
  'D10B37', 'Red', '34BD34', 'Green', '0B57D0', 'Blue', 'FF6600', 'Orange',
  '8B0000', 'Dark red', '555555', 'Grey',
];

async function uploadImage(blobInfo: { blob: () => Blob; filename: () => string }): Promise<string> {
  const body = new FormData();
  body.append('file', blobInfo.blob(), blobInfo.filename());
  const res = await fetch('/api/admin/upload', { method: 'POST', body });
  const json = (await res.json().catch(() => ({}))) as { location?: string; error?: string };
  if (!res.ok || !json.location) throw new Error(json.error || 'Upload failed');
  return json.location;
}

/**
 * WordPress-style visual editor (TinyMCE, self-hosted from /public/tinymce). Paste from Word/Docs/websites,
 * headings, colours, alignment, links, lists, images, tables, and an HTML source view.
 * The HTML is submitted with the surrounding form under `name`.
 */
export function HtmlEditor({
  name,
  defaultValue = '',
  rows = 18,
  placeholders,
}: {
  name: string;
  defaultValue?: string;
  rows?: number;
  placeholders?: string;
}) {
  const [value, setValue] = useState(defaultValue);
  return (
    <div>
      <input type="hidden" name={name} value={value} />
      <Editor
        tinymceScriptSrc="/tinymce/tinymce.min.js"
        licenseKey="gpl"
        initialValue={defaultValue}
        onEditorChange={(html) => setValue(html)}
        init={{
          height: Math.max(380, rows * 26),
          menubar: 'edit insert format table view',
          branding: false,
          promotion: false,
          plugins:
            'advlist autolink lists link image charmap preview anchor searchreplace visualblocks code fullscreen insertdatetime media table wordcount',
          toolbar:
            'undo redo | blocks | bold italic underline strikethrough | forecolor backcolor | ' +
            'alignleft aligncenter alignright alignjustify | bullist numlist outdent indent | ' +
            'link unlink image media table | blockquote hr | removeformat | code preview fullscreen',
          toolbar_mode: 'wrap',
          block_formats: 'Paragraph=p; Heading 1=h1; Heading 2=h2; Heading 3=h3; Heading 4=h4; Preformatted=pre',
          content_style: CONTENT_STYLE,
          color_map: SITE_COLORS,
          // Keep formatting when pasting from Word / Google Docs / other websites, but drop their CSS classes.
          paste_data_images: true,
          paste_webkit_styles: 'color font-weight font-style text-decoration text-align background-color',
          paste_remove_styles_if_webkit: false,
          link_default_target: '_blank',
          link_assume_external_targets: 'https',
          image_caption: true,
          image_advtab: true,
          automatic_uploads: true,
          images_upload_handler: uploadImage,
          relative_urls: false,
          convert_urls: false,
          entity_encoding: 'raw',
        }}
      />
      {placeholders ? <p className="hint muted">{placeholders}</p> : null}
    </div>
  );
}
