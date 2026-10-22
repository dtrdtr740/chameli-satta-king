import { getCurrentUser } from '@/lib/auth';
import { uploadUrl } from '@/lib/settings';
import { saveImage } from '@/lib/uploads';

// Image uploads from the rich-text editor (TinyMCE expects { location }).
export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: 'Not logged in' }, { status: 401 });
  // Same-origin only: the editor posts from our own admin pages.
  const origin = req.headers.get('origin');
  if (origin && new URL(origin).host !== req.headers.get('host')) {
    return Response.json({ error: 'Bad origin' }, { status: 403 });
  }
  try {
    const form = await req.formData();
    const saved = await saveImage(form.get('file'), 'editor');
    if (!saved) return Response.json({ error: 'No image received' }, { status: 400 });
    return Response.json({ location: uploadUrl(saved) });
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 400 });
  }
}
