'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/supabase';
import {
  LayoutDashboard,
  Receipt,
  PieChart,
  RefreshCw,
  Settings,
  Bell,
  LogOut,
  Menu,
  X,
  CreditCard,
  GitBranch,
  FileText,
} from 'lucide-react';

const menuItems = [
  { href: '/', icon: LayoutDashboard, label: 'דשבורד' },
  { href: '/transactions', icon: Receipt, label: 'עסקאות' },
  { href: '/accounts', icon: CreditCard, label: 'חשבונות' },
  { href: '/budget', icon: PieChart, label: 'תקציב' },
  { href: '/recurring', icon: RefreshCw, label: 'תשלומים קבועים', hasBadge: true },
  { href: '/rules', icon: GitBranch, label: 'חוקי שיוך' },
  { href: '/logs', icon: FileText, label: 'לוג' },
  { href: '/settings', icon: Settings, label: 'הגדרות' },
];

export default function Sidebar() {
  const { user, signOut } = useAuth();
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [pendingRecurringCount, setPendingRecurringCount] = useState(0);
  const [unreadNotificationsCount, setUnreadNotificationsCount] = useState(0);

  useEffect(() => {
    const fetchCounts = async () => {
      try {
        const [recurringCount, notifications] = await Promise.all([
          api.getPendingRecurringCount(),
          api.getNotifications()
        ]);
        setPendingRecurringCount(recurringCount);
        setUnreadNotificationsCount(notifications?.filter(n => !n.is_read).length || 0);
      } catch (error) {
        console.error('Error fetching counts:', error);
      }
    };

    if (user) {
      fetchCounts();
      // Refresh every 60 seconds
      const interval = setInterval(fetchCounts, 60000);
      return () => clearInterval(interval);
    }
  }, [user]);

  return (
    <>
      {/* Mobile menu button */}
      <button
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        className="fixed top-4 right-4 z-50 lg:hidden p-2 bg-white rounded-lg shadow-lg"
      >
        {isMobileMenuOpen ? (
          <X className="w-6 h-6 text-slate-600" />
        ) : (
          <Menu className="w-6 h-6 text-slate-600" />
        )}
      </button>

      {/* Overlay for mobile */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed top-0 right-0 h-full w-64 bg-white border-l border-slate-200 z-40
          transform transition-transform duration-300 ease-in-out
          ${isMobileMenuOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'}
        `}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="p-6 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center">
                <span className="text-white font-bold text-lg">₪</span>
              </div>
              <div>
                <h1 className="font-bold text-slate-800">MoneyManager</h1>
                <p className="text-xs text-slate-500">ניהול פיננסי חכם</p>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
            {menuItems.map((item) => {
              const isActive = pathname === item.href;
              const showBadge = item.hasBadge && pendingRecurringCount > 0;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`
                    flex items-center gap-3 px-4 py-3 rounded-xl transition
                    ${isActive
                      ? 'bg-blue-50 text-blue-600'
                      : 'text-slate-600 hover:bg-slate-50'
                    }
                  `}
                >
                  <div className="relative">
                    <item.icon className="w-5 h-5" />
                    {showBadge && (
                      <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 flex items-center justify-center bg-red-500 text-white text-[10px] font-bold rounded-full">
                        {pendingRecurringCount > 9 ? '9+' : pendingRecurringCount}
                      </span>
                    )}
                  </div>
                  <span className="font-medium">{item.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Notifications & User */}
          <div className="p-4 border-t border-slate-100">
            <Link
              href="/notifications"
              className="flex items-center gap-3 px-4 py-3 rounded-xl text-slate-600 hover:bg-slate-50 transition"
            >
              <div className="relative">
                <Bell className="w-5 h-5" />
                {unreadNotificationsCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 flex items-center justify-center bg-red-500 text-white text-[10px] font-bold rounded-full">
                    {unreadNotificationsCount > 9 ? '9+' : unreadNotificationsCount}
                  </span>
                )}
              </div>
              <span className="font-medium">התראות</span>
            </Link>

            <div className="mt-4 p-4 bg-slate-50 rounded-xl">
              <p className="text-sm text-slate-600 truncate">{user?.email}</p>
              <button
                onClick={signOut}
                className="mt-2 flex items-center gap-2 text-sm text-red-600 hover:text-red-700 transition"
              >
                <LogOut className="w-4 h-4" />
                <span>התנתק</span>
              </button>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
