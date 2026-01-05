'use client';

import { useSession, signOut } from 'next-auth/react';

export default function Header({ title }) {
  const { data: session } = useSession();

  return (
    <header className="bg-white rounded-xl shadow-md p-6 mb-8 flex justify-between items-center">
      <h1 className="text-3xl font-bold text-primary">{title}</h1>
      
      <div className="flex items-center gap-4">
        <div className="text-right">
          <p className="text-sm text-gray-500">Logged in as</p>
          <p className="font-semibold text-primary">
            {session?.user?.name || 'User'}
          </p>
          <p className="text-xs text-gray-400">
            {session?.user?.role === 'super_admin' ? 'Super Admin' : 
             session?.user?.role === 'admin' ? 'Admin' : 'CS'}
          </p>
        </div>
        <button
          onClick={() => signOut({ callbackUrl: '/login' })}
          className="btn-secondary text-sm"
        >
          Logout
        </button>
      </div>
    </header>
  );
}
