import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

export async function checkAuth() {
  const session = await getServerSession(authOptions);
  return session;
}

export async function requireAuth(requiredRole = null) {
  const session = await getServerSession(authOptions);
  
  if (!session) {
    return { authorized: false, error: 'Unauthorized', status: 401 };
  }

  if (requiredRole) {
    const userRole = session.user.role;
    
    // Role hierarchy: super_admin > admin > cs
    const roleHierarchy = {
      'super_admin': 3,
      'admin': 2,
      'cs': 1
    };

    const userLevel = roleHierarchy[userRole] || 0;
    const requiredLevel = roleHierarchy[requiredRole] || 0;

    if (userLevel < requiredLevel) {
      return { 
        authorized: false, 
        error: 'Forbidden - Insufficient permissions', 
        status: 403 
      };
    }
  }

  return { authorized: true, session };
}

export function hasRole(session, role) {
  return session?.user?.role === role;
}

export function hasMinRole(session, minRole) {
  const roleHierarchy = {
    'super_admin': 3,
    'admin': 2,
    'cs': 1
  };

  const userLevel = roleHierarchy[session?.user?.role] || 0;
  const minLevel = roleHierarchy[minRole] || 0;

  return userLevel >= minLevel;
}