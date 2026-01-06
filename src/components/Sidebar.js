"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { useState, useEffect } from "react";

export default function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [pendingCount, setPendingCount] = useState(0);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [permissions, setPermissions] = useState({});
  const [loadingPermissions, setLoadingPermissions] = useState(true);

  useEffect(() => {
    if (session) {
      fetchPermissions();
      fetchPendingCount();
      const interval = setInterval(fetchPendingCount, 30000);
      return () => clearInterval(interval);
    }
  }, [session]);

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  const fetchPermissions = async () => {
    try {
      console.log('🔍 Fetching permissions for user:', session?.user?.username);
      const response = await fetch('/api/user/permissions');
      const result = await response.json();
      console.log('✅ Permissions received:', result.permissions);
      setPermissions(result.permissions || {});
    } catch (error) {
      console.error('❌ Error fetching permissions:', error);
    } finally {
      setLoadingPermissions(false);
    }
  };

  const fetchPendingCount = async () => {
    try {
      if (permissions.registrations) {
        const response = await fetch("/api/registrations");
        const result = await response.json();
        setPendingCount(result.registrations?.length || 0);
      }
    } catch (error) {
      console.error("Error fetching pending count:", error);
    }
  };

  const handleMenuClick = (e, item) => {
    if (!item.permission) {
      e.preventDefault();
      alert('Anda tidak memiliki akses ke fitur ini. Hubungi Faiz jika ingin mengakses.');
    }
  };

  const getAllMenuItems = () => {
    return [
      {
        href: "/dashboard",
        label: "Dashboard",
        permission: permissions.dashboard,
      },
      {
        href: "/dashboard/create",
        label: "Chat Creation",
        permission: permissions.chatCreation,
      },
      {
        href: "/dashboard/analytics",
        label: "Analytics",
        permission: permissions.analytics,
      },
      {
        href: "/dashboard/warranty",
        label: "Warranty",
        permission: permissions.warranty,
      },
      {
        href: "/dashboard/stock",
        label: "Stock",
        permission: permissions.stock,
      },
      {
        href: "/dashboard/registrations",
        label: "Registration Requests",
        permission: permissions.registrations,
        badge: pendingCount,
      },
      {
        href: "/dashboard/users",
        label: "User Management",
        permission: permissions.userManagement,
      },
      {
        href: "/dashboard/settings",
        label: "Settings",
        permission: permissions.settings,
      },
    ];
  };

  const menuItems = getAllMenuItems();

  if (loadingPermissions) {
    return (
      <aside className="w-64 bg-primary text-white min-h-screen p-6 fixed left-0 top-0 overflow-y-auto z-40">
        <div className="mb-8 pb-6 border-b border-white/10">
          <h2 className="text-2xl font-bold text-accent">CS Torch</h2>
        </div>
        <div className="text-center text-white/60">Loading...</div>
      </aside>
    );
  }

  return (
    <>
      {/* Mobile Hamburger Button */}
      <button
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 bg-primary text-white p-3 rounded-lg shadow-lg hover:bg-[#164d6e] transition-colors"
        aria-label="Toggle menu"
      >
        <svg
          className="w-6 h-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          {isMobileMenuOpen ? (
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          ) : (
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 6h16M4 12h16M4 18h16"
            />
          )}
        </svg>
      </button>

      {/* Overlay for mobile */}
      {isMobileMenuOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-30"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          w-64 bg-primary text-white min-h-screen p-6 fixed left-0 top-0 overflow-y-auto z-40
          transition-transform duration-300 ease-in-out
          ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
          lg:translate-x-0
        `}
      >
        <div className="mb-8 pb-6 border-b border-white/10">
          <h2 className="text-2xl font-bold text-accent">CS Torch</h2>
          <p className="text-xs text-white/60 mt-1">
            {session?.user?.name || 'User'}
          </p>
        </div>

        <nav className="space-y-2">
          {menuItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={(e) => handleMenuClick(e, item)}
              className={`block px-4 py-3 rounded-lg transition-all duration-300 relative ${
                pathname === item.href
                  ? "bg-accent/20 text-accent"
                  : item.permission
                  ? "hover:bg-white/10 text-white"
                  : "text-white/40 hover:bg-white/5"
              }`}
            >
              <div className="flex items-center justify-between">
                <span>{item.label}</span>
                <div className="flex items-center gap-2">
                  {item.badge > 0 && (
                    <span className="bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full min-w-[24px] text-center">
                      {item.badge}
                    </span>
                  )}
                  {!item.permission && (
                    <span className="text-xs">🔒</span>
                  )}
                </div>
              </div>
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
      </aside>
    </>
  );
}