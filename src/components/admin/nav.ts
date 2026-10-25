export type NavItem = { href: string; label: string; icon: string; perm: string; isNew?: boolean };
export type NavGroup = { heading: string; items: NavItem[] };

// Grouped version of the original flat sidebar; `perm` is the permission that opens the page.
export const ADMIN_NAV: NavGroup[] = [
  {
    heading: 'Results',
    items: [
      { href: '/admin', label: 'Dashboard', icon: '🏠', perm: 'view dashboard' },
      { href: '/admin/today-update', label: 'Today Result Update', icon: '⚡', perm: 'update today results' },
      { href: '/admin/results', label: 'Game Results', icon: '📊', perm: 'manage game results' },
      { href: '/admin/results/import', label: 'Import Results (Excel)', icon: '📥', perm: 'manage game results', isNew: true },
    ],
  },
  {
    heading: 'Games',
    items: [
      { href: '/admin/games', label: 'Games', icon: '🎯', perm: 'manage games' },
      { href: '/admin/assign-games', label: 'Assign Games', icon: '👥', perm: 'assign games to users' },
      { href: '/admin/chart-years', label: 'Chart Years', icon: '📅', perm: 'manage chart years' },
    ],
  },
  {
    heading: 'Content & SEO',
    items: [
      { href: '/admin/seo-content', label: 'SEO & Content', icon: '✍️', perm: 'manage seo & content', isNew: true },
      { href: '/admin/blog', label: 'Blog', icon: '📝', perm: 'manage blog', isNew: true },
      { href: '/admin/seo-pages', label: 'SEO Pages', icon: '🌐', perm: 'manage seo pages' },
      { href: '/admin/content-blocks', label: 'Content Blocks', icon: '📄', perm: 'manage content blocks' },
      { href: '/admin/whatsapp-sections', label: 'WhatsApp Sections', icon: '💬', perm: 'manage whatsapp sections', isNew: true },
      { href: '/admin/advertisements', label: 'Advertisements', icon: '📣', perm: 'manage advertisements' },
      { href: '/admin/notices', label: 'Notices', icon: '🔔', perm: 'manage notices' },
    ],
  },
  {
    heading: 'Access',
    items: [
      { href: '/admin/users', label: 'Users', icon: '🧑', perm: 'manage users' },
      { href: '/admin/roles', label: 'Roles', icon: '🛡️', perm: 'manage roles' },
      { href: '/admin/user-permissions', label: 'User Permissions', icon: '🧾', perm: 'manage permissions' },
      { href: '/admin/permissions', label: 'Permissions', icon: '🔑', perm: 'manage permissions' },
    ],
  },
  {
    heading: 'System',
    items: [
      { href: '/admin/settings', label: 'Site Settings', icon: '⚙️', perm: 'manage site settings' },
      { href: '/admin/profile', label: 'My Profile', icon: '👤', perm: '' },
    ],
  },
];
