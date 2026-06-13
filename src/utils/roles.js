const ADMIN_ROLES = new Set(['admin', 'administrator', 'owner', 'manager', 'superadmin']);

export function normalizeRole(role) {
  const cleanRole = String(role || 'cashier').trim().toLowerCase();
  return ADMIN_ROLES.has(cleanRole) ? 'admin' : 'cashier';
}

export function envAdminEmails() {
  return String(import.meta.env.VITE_ADMIN_EMAILS || '')
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

export function isEnvAdminEmail(email) {
  if (!email) return false;
  return envAdminEmails().includes(String(email).trim().toLowerCase());
}

export function resolveUserRole(profile, user) {
  if (isEnvAdminEmail(user?.email || profile?.email)) return 'admin';
  return normalizeRole(profile?.role);
}
