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
  Github,
  Eye,
  EyeOff,
  X,
  RefreshCw,
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
  const [githubToken, setGithubToken] = useState('');
  const [showToken, setShowToken] = useState(false);
  const [tokenSaved, setTokenSaved] = useState(false);
  const [editingToken, setEditingToken] = useState(false);
  const [newToken, setNewToken] = useState('');

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    // Load token from database
    const loadToken = async () => {
      try {
        const savedToken = await api.getGithubToken();
        if (savedToken) {
          setGithubToken(savedToken);
        }
      } catch (error) {
        console.error('Error loading GitHub token:', error);
      }
    };
    if (user) {
      loadToken();
    }
  }, [user]);

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

  const handleSaveToken = () => {
    if (githubToken.trim()) {
      localStorage.setItem('github_token', githubToken.trim());
    } else {
      localStorage.removeItem('github_token');
    }
    setTokenSaved(true);
    setTimeout(() => setTokenSaved(false), 2000);
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

          {/* GitHub Token Section */}
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-100">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Github className="w-5 h-5 text-slate-600" />
                  <h2 className="text-lg font-semibold text-slate-800">GitHub Token</h2>
                </div>
                {githubToken ? (
                  <span className="flex items-center gap-1.5 px-2.5 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                    <Check className="w-3.5 h-3.5" />
                    מוגדר
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-100 text-amber-700 text-xs font-medium rounded-full">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    לא מוגדר
                  </span>
                )}
              </div>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-sm text-slate-500">
                הזן את ה-Personal Access Token מ-GitHub לצורך הפעלת סנכרון ידני והוספת חשבונות.
              </p>
              
              {/* Token exists and not editing - show masked token with replace button */}
              {githubToken && !editingToken ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                    <div className="flex-1">
                      <p className="text-xs text-slate-500 mb-1">Token שמור</p>
                      <p className="font-mono text-sm text-slate-700" dir="ltr">
                        {githubToken.substring(0, 7)}{'•'.repeat(20)}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setEditingToken(true);
                      setNewToken('');
                    }}
                    className="w-full py-2.5 border border-slate-300 text-slate-700 font-medium rounded-lg hover:bg-slate-50 transition flex items-center justify-center gap-2"
                  >
                    <RefreshCw className="w-4 h-4" />
                    <span>החלף Token</span>
                  </button>
                </div>
              ) : (
                /* No token or editing - show input field */
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Personal Access Token</label>
                    <div className="relative">
                      <input
                        type={showToken ? 'text' : 'password'}
                        value={editingToken ? newToken : githubToken}
                        onChange={(e) => editingToken ? setNewToken(e.target.value) : setGithubToken(e.target.value)}
                        className="w-full p-3 pl-10 border rounded-lg focus:ring-2 focus:ring-blue-500"
                        placeholder="ghp_xxxxxxxxxxxx"
                        dir="ltr"
                      />
                      <button
                        type="button"
                        onClick={() => setShowToken(!showToken)}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                        title={showToken ? 'הסתר' : 'הצג'}
                      >
                        {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    <p className="text-xs text-slate-500 mt-2">
                      צור Token ב-GitHub Settings → Developer settings → Personal access tokens
                      עם הרשאות: repo, workflow
                    </p>
                  </div>
                  <div className="flex gap-2">
                    {editingToken && (
                      <button
                        onClick={() => {
                          setEditingToken(false);
                          setNewToken('');
                        }}
                        className="flex-1 py-2.5 border border-slate-300 text-slate-700 font-medium rounded-lg hover:bg-slate-50 transition"
                      >
                        ביטול
                      </button>
                    )}
                    <button
                      onClick={async () => {
                        const tokenToSave = editingToken ? newToken : githubToken;
                        if (tokenToSave.trim()) {
                          try {
                            await api.saveGithubToken(tokenToSave.trim());
                            setGithubToken(tokenToSave.trim());
                            setTokenSaved(true);
                            setTimeout(() => setTokenSaved(false), 2000);
                          } catch (error) {
                            console.error('Error saving token:', error);
                            alert('שגיאה בשמירת ה-Token');
                          }
                        }
                        setEditingToken(false);
                        setNewToken('');
                      }}
                      disabled={editingToken ? !newToken.trim() : !githubToken.trim()}
                      className="flex-1 py-2.5 bg-slate-800 text-white font-medium rounded-lg hover:bg-slate-900 transition flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {tokenSaved ? (
                        <>
                          <Check className="w-4 h-4" />
                          <span>נשמר!</span>
                        </>
                      ) : (
                        <span>שמור Token</span>
                      )}
                    </button>
                  </div>
                </div>
              )}
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
