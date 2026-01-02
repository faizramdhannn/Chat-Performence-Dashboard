'use client';

import { useSession, signOut } from 'next-auth/react';

export default function Header({ title }) {
  const { data: session } = useSession();

  return (
    <header className="bg-white rounded-xl shadow-md p-6 mb-8 flex justify-between items-center">
      <h1 className="text-3xl font-bold text-primary">{title}</h1>
      
      <div className="flex items-center gap-4">
        <span className="font-semibold text-primary">
          👤 {session?.user?.name || 'Admin'}
        </span>
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
