'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { useRouter } from 'next/navigation';
import { api, Notification } from '@/lib/supabase';
import Sidebar from '@/components/layout/Sidebar';
import {
  Bell,
  Loader2,
  Check,
  AlertCircle,
  Info,
  CheckCircle,
  Trash2,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { he } from 'date-fns/locale';

export default function NotificationsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const data = await api.getNotifications();
        setNotifications(data || []);
      } catch (error) {
        console.error('Error fetching notifications:', error);
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchData();
    }
  }, [user]);

  const handleMarkRead = async (id: string) => {
    try {
      await api.markNotificationRead(id);
      setNotifications(notifications.map((n) =>
        n.id === id ? { ...n, is_read: true } : n
      ));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  if (authLoading || loading) {
    return (
      <div className="flex min-h-screen">
        <Sidebar />
        <main className="flex-1 p-6 lg:p-8 mr-0 lg:mr-64 flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-blue-600 spinner" />
        </main>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 p-6 lg:p-8 mr-0 lg:mr-64">
        <div className="max-w-2xl space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-800">התראות</h1>
              <p className="text-slate-500">
                {unreadCount > 0 
                  ? `${unreadCount} התראות שלא נקראו` 
                  : 'אין התראות חדשות'}
              </p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
              <Bell className="w-6 h-6 text-blue-600" />
            </div>
          </div>

          {/* Notifications List */}
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            {notifications.length === 0 ? (
              <div className="text-center py-12">
                <Bell className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-slate-600 mb-2">אין התראות</h3>
                <p className="text-slate-400 text-sm">
                  כשיהיו התראות חדשות, הן יופיעו כאן
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {notifications.map((notification) => (
                  <div 
                    key={notification.id} 
                    className={`p-5 hover:bg-slate-50 transition ${
                      !notification.is_read ? 'bg-blue-50/50' : ''
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                        !notification.is_read ? 'bg-blue-100' : 'bg-slate-100'
                      }`}>
                        <Info className={`w-5 h-5 ${
                          !notification.is_read ? 'text-blue-600' : 'text-slate-400'
                        }`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <h3 className={`font-medium ${
                            !notification.is_read ? 'text-slate-800' : 'text-slate-600'
                          }`}>
                            {notification.title}
                          </h3>
                          {!notification.is_read && (
                            <button
                              onClick={() => handleMarkRead(notification.id)}
                              className="p-1.5 text-blue-600 hover:bg-blue-100 rounded-lg transition flex-shrink-0"
                              title="סמן כנקרא"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                        <p className="text-sm text-slate-500 mt-1">
                          {notification.message}
                        </p>
                        <p className="text-xs text-slate-400 mt-2">
                          {formatDistanceToNow(new Date(notification.created_at), { 
                            addSuffix: true, 
                            locale: he 
                          })}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Info */}
          <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
            <p className="text-sm text-blue-700">
              <strong>התראות</strong> - כאן תקבל עדכונים על סנכרון יומי, חריגות מתקציב,
              ותזכורות לגבי תשלומים קבועים.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
