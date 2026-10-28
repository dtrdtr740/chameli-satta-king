import { logout } from '../actions';
import { AdminShell } from '@/components/admin/AdminShell';
import { ADMIN_NAV, landingHref } from '@/components/admin/nav';
import { can, requirePermission } from '@/lib/auth';
import { getSettings } from '@/lib/settings';

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const user = await requirePermission();
  const settings = await getSettings();
  // Someone with no permission at all sees nothing of the admin: no menu, no pages, only a message and Log out.
  if (!landingHref((perm) => can(user, perm))) {
    return (
      <div className="login-wrap">
        <div className="login-card">
          <h1>No access</h1>
          <p className="muted" style={{ marginTop: 0 }}>
            Your account has no permissions yet. Ask an administrator to give you access.
          </p>
          <form action={logout}>
            <button className="btn btn-primary" type="submit">
              Log out
            </button>
          </form>
        </div>
      </div>
    );
  }
  const nav = ADMIN_NAV.map((g) => ({ ...g, items: g.items.filter((i) => !i.perm || can(user, i.perm)) })).filter(
    (g) => g.items.length > 0,
  );
  return (
    <AdminShell
      nav={nav}
      user={{ name: user.name, email: user.email, role: user.roles.join(', ') || 'No role' }}
      siteName={settings.site_name}
      logoutAction={logout}
    >
      {children}
    </AdminShell>
  );
}
