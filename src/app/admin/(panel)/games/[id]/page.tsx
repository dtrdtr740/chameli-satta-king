import Link from 'next/link';
import { notFound } from 'next/navigation';
import { saveGame } from '../actions';
import { Field, Flash, PageHead, type SP } from '@/components/admin/ui';
import { requirePermission } from '@/lib/auth';
import { queryOne } from '@/lib/db';

type Game = {
  id: number;
  name: string;
  slug: string;
  result_time: string | null;
  is_active: number;
  sort_order: number;
  default_show_minutes: number;
};

export default async function GameForm({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: SP }) {
  await requirePermission('manage games');
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const game = id === 'new' ? null : await queryOne<Game>('SELECT * FROM games WHERE id = ?', [Number(id)]);
  if (id !== 'new' && !game) notFound();

  return (
    <>
      <PageHead
        title={game ? `Edit ${game.name}` : 'Add game'}
        sub={game ? undefined : 'After saving you can upload the game’s previous results from Excel.'}
        actions={
          game ? (
            <Link className="btn" href={`/admin/results/import?game=${game.id}`}>
              ⬆ Upload old results (Excel)
            </Link>
          ) : undefined
        }
      />
      <Flash sp={sp} />
      <form action={saveGame} className="card">
        {game ? <input type="hidden" name="id" value={game.id} /> : null}
        <div className="grid grid-2">
          <Field label="Name" htmlFor="name">
            <input id="name" name="name" className="input" required defaultValue={game?.name} />
          </Field>
          <Field label="Slug" htmlFor="slug" hint="Used in the URL /records/<slug>. Leave empty to generate from the name.">
            <input id="slug" name="slug" className="input" defaultValue={game?.slug} />
          </Field>
          <Field label="Result time (IST)" htmlFor="result_time" hint="Waiting shows 5 minutes before this time.">
            <input id="result_time" name="result_time" type="time" className="input" defaultValue={game?.result_time?.slice(0, 5)} />
          </Field>
          <Field label="Sort order" htmlFor="sort_order">
            <input id="sort_order" name="sort_order" type="number" min={0} className="input" defaultValue={game?.sort_order ?? 0} />
          </Field>
          <Field label="Default live box minutes" htmlFor="mins" hint="How long a declared result stays in the live box.">
            <input
              id="mins"
              name="default_show_minutes"
              type="number"
              min={0}
              className="input"
              defaultValue={game?.default_show_minutes ?? 15}
            />
          </Field>
          <div className="field" style={{ justifyContent: 'end' }}>
            <label className="check">
              <input type="checkbox" name="is_active" defaultChecked={game ? !!game.is_active : true} /> Active
            </label>
          </div>
        </div>
        <div className="form-actions">
          <button className="btn btn-primary" type="submit">
            Save
          </button>
          <Link className="btn" href="/admin/games">
            Cancel
          </Link>
        </div>
      </form>
    </>
  );
}
