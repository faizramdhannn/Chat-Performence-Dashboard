"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { useState, useEffect } from "react";

export default function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    // Fetch pending registrations count if super admin
    if (session?.user?.role === "super_admin") {
      fetchPendingCount();
      // Refresh count every 30 seconds
      const interval = setInterval(fetchPendingCount, 30000);
      return () => clearInterval(interval);
    }
  }, [session]);

  const fetchPendingCount = async () => {
    try {
      const response = await fetch("/api/registrations");
      const result = await response.json();
      setPendingCount(result.registrations?.length || 0);
    } catch (error) {
      console.error("Error fetching pending count:", error);
    }
  };

  const getMenuItems = () => {
    const role = session?.user?.role;

    const baseItems = [
      {
        href: "/dashboard",
        label: "Dashboard",
        roles: ["super_admin", "admin", "cs"],
      },
      {
        href: "/dashboard/create",
        label: "Tambah Data",
        roles: ["super_admin", "admin", "cs"],
      },
    ];

    const adminItems = [
      {
        href: "/dashboard/analytics",
        label: "Analytics",
        roles: ["super_admin", "admin"],
      },
    ];

    const superAdminItems = [
      {
        href: "/dashboard/registrations",
        label: "Registration Requests",
        roles: ["super_admin"],
        badge: pendingCount,
      },
      {
        href: "/dashboard/users",
        label: "User Management",
        roles: ["super_admin"],
      },
      {
        href: "/dashboard/settings",
        label: "Settings",
        roles: ["super_admin"],
      },
    ];

    const allItems = [...baseItems, ...adminItems, ...superAdminItems];

    return allItems.filter((item) => item.roles.includes(role));
  };

  const menuItems = getMenuItems();

  return (
    <aside className="w-64 bg-primary text-white min-h-screen p-6 fixed left-0 top-0 overflow-y-auto">
      <div className="mb-8 pb-6 border-b border-white/10">
        <h2 className="text-2xl font-bold text-accent">CS Torch</h2>
        <p className="text-xs text-white/60 mt-1">
          {session?.user?.role === "super_admin"
            ? "Super Admin"
            : session?.user?.role === "admin"
            ? "Admin"
            : "Customer Service"}
        </p>
      </div>

      <nav className="space-y-2">
        {menuItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`block px-4 py-3 rounded-lg transition-all duration-300 relative ${
              pathname === item.href
                ? "bg-accent/20 text-accent"
                : "hover:bg-white/10 text-white"
            }`}
          >
            <span>{item.label}</span>
            {item.badge > 0 && (
              <span className="absolute right-4 top-1/2 -translate-y-1/2 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full min-w-[24px] text-center">
                {item.badge}
              </span>
            )}
          </Link>
        ))}

        <div className="pt-4 border-t border-white/10 mt-4">
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="w-full text-left px-4 py-3 rounded-lg hover:bg-red-900 text-white transition-all duration-300"
          >
            Logout
          </button>
        </div>
      </nav>

      <div className="absolute bottom-6 left-6 right-6">
        <div className="bg-white/10 rounded-lg p-3">
          <p className="text-xs text-white/80 font-semibold">Logged in as:</p>
          <p className="text-sm text-white truncate">{session?.user?.name}</p>
        </div>
      </div>
    </aside>
  );
}
