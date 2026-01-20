'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/supabase';
import Sidebar from '@/components/layout/Sidebar';
import {
  Settings,
  User,
  Bell,
  Shield,
  Palette,
  LogOut,
  Loader2,
  Check,
  Mail,
  Trash2,
  AlertTriangle,
} from 'lucide-react';

export default function SettingsPage() {
  const { user, loading: authLoading, signOut } = useAuth();
  const router = useRouter();

  const [notifications, setNotifications] = useState({
    dailySync: true,
    budgetAlerts: true,
    recurringReminders: true,
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [resetConfirmText, setResetConfirmText] = useState('');

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  const handleNotificationChange = (key: keyof typeof notifications) => {
    setNotifications((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    // Simulate save
    await new Promise((resolve) => setTimeout(resolve, 500));
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleLogout = async () => {
    await signOut();
    router.push('/login');
  };

  const handleReset = async () => {
    if (resetConfirmText !== 'מחק הכל') return;
    
    setResetting(true);
    try {
      await api.resetAllData();
      alert('כל הנתונים נמחקו בהצלחה. החשבונות נשמרו.');
      setShowResetModal(false);
      setResetConfirmText('');
    } catch (error) {
      console.error('Error resetting data:', error);
      alert('שגיאה במחיקת הנתונים');
    } finally {
      setResetting(false);
    }
  };

  if (authLoading) {
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
          <div>
            <h1 className="text-2xl font-bold text-slate-800">הגדרות</h1>
            <p className="text-slate-500">ניהול הגדרות החשבון והאפליקציה</p>
          </div>

          {/* Profile Section */}
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <User className="w-5 h-5 text-slate-600" />
                <h2 className="text-lg font-semibold text-slate-800">פרופיל</h2>
              </div>
            </div>
            <div className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                  <span className="text-2xl font-bold text-blue-600">
                    {user.email?.[0].toUpperCase()}
                  </span>
                </div>
                <div>
                  <p className="font-medium text-slate-800">{user.email}</p>
                  <p className="text-sm text-slate-500 flex items-center gap-1 mt-1">
                    <Mail className="w-3.5 h-3.5" />
                    מחובר באמצעות אימייל
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Notifications Section */}
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <Bell className="w-5 h-5 text-slate-600" />
                <h2 className="text-lg font-semibold text-slate-800">התראות</h2>
              </div>
            </div>
            <div className="divide-y divide-slate-100">
              <div className="p-6 flex items-center justify-between">
                <div>
                  <p className="font-medium text-slate-800">סנכרון יומי</p>
                  <p className="text-sm text-slate-500">קבל התראה כשהסנכרון היומי מסתיים</p>
                </div>
                <button
                  onClick={() => handleNotificationChange('dailySync')}
                  className={`relative w-12 h-6 rounded-full transition ${
                    notifications.dailySync ? 'bg-blue-600' : 'bg-slate-200'
                  }`}
                >
                  <span
                    className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${
                      notifications.dailySync ? 'right-1' : 'right-7'
                    }`}
                  />
                </button>
              </div>

              <div className="p-6 flex items-center justify-between">
                <div>
                  <p className="font-medium text-slate-800">חריגה מתקציב</p>
                  <p className="text-sm text-slate-500">התראה כשקטגוריה עוברת את היעד</p>
                </div>
                <button
                  onClick={() => handleNotificationChange('budgetAlerts')}
                  className={`relative w-12 h-6 rounded-full transition ${
                    notifications.budgetAlerts ? 'bg-blue-600' : 'bg-slate-200'
                  }`}
                >
                  <span
                    className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${
                      notifications.budgetAlerts ? 'right-1' : 'right-7'
                    }`}
                  />
                </button>
              </div>

              <div className="p-6 flex items-center justify-between">
                <div>
                  <p className="font-medium text-slate-800">תזכורות תשלומים קבועים</p>
                  <p className="text-sm text-slate-500">התראה על פריטים ממתינים לאישור</p>
                </div>
                <button
                  onClick={() => handleNotificationChange('recurringReminders')}
                  className={`relative w-12 h-6 rounded-full transition ${
                    notifications.recurringReminders ? 'bg-blue-600' : 'bg-slate-200'
                  }`}
                >
                  <span
                    className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${
                      notifications.recurringReminders ? 'right-1' : 'right-7'
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>

          {/* Security Section */}
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <Shield className="w-5 h-5 text-slate-600" />
                <h2 className="text-lg font-semibold text-slate-800">אבטחה</h2>
              </div>
            </div>
            <div className="p-6">
              <p className="text-sm text-slate-500 mb-4">
                פרטי ההתחברות לבנקים וכרטיסי האשראי מאוחסנים באופן מאובטח 
                ב-GitHub Secrets ומשמשים רק לסנכרון עסקאות.
              </p>
              <div className="flex items-center gap-2 text-sm text-green-600">
                <Check className="w-4 h-4" />
                <span>הנתונים מוצפנים ומאובטחים</span>
              </div>
            </div>
          </div>

          {/* App Info */}
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <Palette className="w-5 h-5 text-slate-600" />
                <h2 className="text-lg font-semibold text-slate-800">אודות</h2>
              </div>
            </div>
            <div className="p-6">
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-500">גרסה</span>
                  <span className="text-slate-800">1.0.0</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">פלטפורמה</span>
                  <span className="text-slate-800">PWA</span>
                </div>
              </div>
            </div>
          </div>

          {/* Danger Zone */}
          <div className="bg-red-50 border border-red-200 rounded-2xl overflow-hidden">
            <div className="p-6 border-b border-red-200">
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 text-red-600" />
                <h2 className="text-lg font-semibold text-red-800">אזור סכנה</h2>
              </div>
            </div>
            <div className="p-6">
              <p className="text-sm text-red-700 mb-4">
                איפוס המערכת ימחק את כל העסקאות, תשלומים קבועים, קטגוריות וחוקי שיוך.
                החשבונות המחוברים (פרטי הבנק) יישמרו.
              </p>
              <button
                onClick={() => setShowResetModal(true)}
                className="w-full py-3 bg-red-600 text-white font-medium rounded-xl hover:bg-red-700 transition flex items-center justify-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                <span>איפוס כל הנתונים</span>
              </button>
            </div>
          </div>

          {/* Actions */}
          <div className="space-y-3">
            <button
              onClick={handleSave}
              disabled={saving}
              className="w-full py-3 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 transition flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 spinner" />
              ) : saved ? (
                <>
                  <Check className="w-4 h-4" />
                  <span>נשמר!</span>
                </>
              ) : (
                <span>שמור הגדרות</span>
              )}
            </button>

            <button
              onClick={handleLogout}
              className="w-full py-3 bg-red-50 text-red-600 font-medium rounded-xl hover:bg-red-100 transition flex items-center justify-center gap-2"
            >
              <LogOut className="w-4 h-4" />
              <span>התנתק</span>
            </button>
          </div>
        </div>

        {/* Reset Confirmation Modal */}
        {showResetModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl w-full max-w-md shadow-xl">
              <div className="p-6 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                    <AlertTriangle className="w-5 h-5 text-red-600" />
                  </div>
                  <h2 className="text-lg font-semibold text-slate-800">איפוס כל הנתונים</h2>
                </div>
              </div>
              <div className="p-6 space-y-4">
                <p className="text-slate-600">
                  פעולה זו תמחק:
                </p>
                <ul className="text-sm text-slate-500 space-y-1 list-disc list-inside">
                  <li>כל העסקאות</li>
                  <li>תשלומים קבועים</li>
                  <li>קטגוריות ותקציבים</li>
                  <li>חוקי שיוך</li>
                  <li>לוגים</li>
                </ul>
                <p className="text-sm text-green-600 font-medium">
                  ✓ החשבונות המחוברים (פרטי הבנק) יישמרו
                </p>
                <div className="pt-4">
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    הקלד &quot;מחק הכל&quot; לאישור:
                  </label>
                  <input
                    type="text"
                    value={resetConfirmText}
                    onChange={(e) => setResetConfirmText(e.target.value)}
                    className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-red-500"
                    placeholder="מחק הכל"
                  />
                </div>
              </div>
              <div className="p-6 border-t border-slate-100 flex justify-end gap-3">
                <button
                  onClick={() => {
                    setShowResetModal(false);
                    setResetConfirmText('');
                  }}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition"
                >
                  ביטול
                </button>
                <button
                  onClick={handleReset}
                  disabled={resetConfirmText !== 'מחק הכל' || resetting}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition disabled:opacity-50 flex items-center gap-2"
                >
                  {resetting ? (
                    <Loader2 className="w-4 h-4 spinner" />
                  ) : (
                    <Trash2 className="w-4 h-4" />
                  )}
                  <span>מחק הכל</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
