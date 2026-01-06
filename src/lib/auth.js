import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

export async function checkAuth() {
  const session = await getServerSession(authOptions);
  return session;
}

export async function requireAuth(requiredPermission = null) {
  const session = await getServerSession(authOptions);
  
  if (!session) {
    return { authorized: false, error: 'Unauthorized', status: 401 };
  }

  // Permission check sudah dipindah ke masing-masing page
  // requireAuth sekarang hanya cek apakah user sudah login
  // Permission checking dilakukan di /api/user/permissions
  
  return { authorized: true, session };
}

export function hasRole(session, role) {
  // Legacy function - masih disimpan untuk backward compatibility
  return session?.user?.role === role;
}

export function hasMinRole(session, minRole) {
  // Legacy function - masih disimpan untuk backward compatibility
  const roleHierarchy = {
    'super_admin': 3,
    'admin': 2,
    'cs': 1
  };

  const userLevel = roleHierarchy[session?.user?.role] || 0;
  const minLevel = roleHierarchy[minRole] || 0;

  return userLevel >= minLevel;
}