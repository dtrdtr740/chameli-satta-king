import { logout } from '../actions';
import { AdminShell } from '@/components/admin/AdminShell';
import { ADMIN_NAV } from '@/components/admin/nav';
import { can, requirePermission } from '@/lib/auth';
import { getSettings } from '@/lib/settings';

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const user = await requirePermission();
  const settings = await getSettings();
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
