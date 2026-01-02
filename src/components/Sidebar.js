'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut } from 'next-auth/react';

export default function Sidebar() {
  const pathname = usePathname();

  const menuItems = [
    { href: '/dashboard', label: 'Dashboard'},
    { href: '/dashboard/analytics', label: 'Analytics'},
    { href: '/dashboard/create', label: 'Tambah Data'},
  ];

  return (
    <aside className="w-64 bg-primary text-white min-h-screen p-6 fixed left-0 top-0 overflow-y-auto">
      <div className="mb-8 pb-6 border-b border-white/10">
        <h2 className="text-2xl font-bold text-accent">Chat Performance</h2>
      </div>

      <nav className="space-y-2">
        {menuItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`block px-4 py-3 rounded-lg transition-all duration-300 ${
              pathname === item.href
                ? 'bg-accent/20 text-accent'
                : 'hover:bg-white/10 text-white'
            }`}
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
