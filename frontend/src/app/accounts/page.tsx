'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/lib/auth';
import { useRouter } from 'next/navigation';
import { api, Account, CREDIT_CARD_TYPES } from '@/lib/supabase';
import {
  triggerWorkflow,
  getWorkflowRuns,
  WorkflowRun,
  BANKS,
  FIELD_LABELS,
} from '@/lib/github';
import Sidebar from '@/components/layout/Sidebar';
import {
  Building2,
  CreditCard,
  RefreshCw,
  Loader2,
  CheckCircle,
  AlertCircle,
  Clock,
  ExternalLink,
  Plus,
  Play,
  X,
  Eye,
  EyeOff,
  Receipt,
  Trash2,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { he } from 'date-fns/locale';

export default function AccountsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [creditCardCharges, setCreditCardCharges] = useState<Record<string, number>>({});
  const [workflowRuns, setWorkflowRuns] = useState<WorkflowRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showTokenModal, setShowTokenModal] = useState(false);
  const [githubToken, setGithubToken] = useState('');
  const [showToken, setShowToken] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<Account | null>(null);
  const [deleting, setDeleting] = useState(false);

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

  const fetchData = useCallback(async () => {
    try {
      const accountsData = await api.getAccounts();
      setAccounts(accountsData || []);
      
      // Fetch credit card charges
      const charges: Record<string, number> = {};
      for (const account of accountsData || []) {
        if (CREDIT_CARD_TYPES.includes(account.bank_type)) {
          try {
            const charge = await api.getCreditCardUpcomingCharges(account.id);
            charges[account.id] = charge;
          } catch (error) {
            console.error('Error fetching credit card charges:', error);
          }
        }
      }
      setCreditCardCharges(charges);

      // Fetch workflow runs if token exists
      const token = await api.getGithubToken();
      if (token) {
        const runs = await getWorkflowRuns(token);
        setWorkflowRuns(runs);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user) {
      fetchData();
      // Refresh every 30 seconds to update workflow status
      const interval = setInterval(fetchData, 30000);
      return () => clearInterval(interval);
    }
  }, [user, fetchData]);

  const handleSync = async () => {
    const token = await api.getGithubToken();
    if (!token) {
      setShowTokenModal(true);
      return;
    }

    setSyncing(true);
    const result = await triggerWorkflow('daily-sync.yml', { sync_mode: 'update' }, token);
    
    if (result.success) {
      setTimeout(fetchData, 3000);
    } else {
      alert('שגיאה: ' + result.error);
    }
    
    setSyncing(false);
  };

  const handleSaveToken = async () => {
    try {
      await api.saveGithubToken(githubToken);
      setShowTokenModal(false);
      fetchData();
    } catch (error) {
      console.error('Error saving token:', error);
      alert('שגיאה בשמירת ה-Token');
    }
  };

  const handleDeleteAccount = async () => {
    if (!deleteConfirm) return;
    
    setDeleting(true);
    try {
      await api.deleteBankUserAccount(deleteConfirm.user_account_id);
      setAccounts(accounts.filter(a => a.user_account_id !== deleteConfirm.user_account_id));
      setDeleteConfirm(null);
    } catch (error) {
      console.error('Error deleting account:', error);
      alert('שגיאה במחיקת החשבון');
    } finally {
      setDeleting(false);
    }
  };

  const hasToken = !!githubToken;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-50 text-green-700';
      case 'error':
        return 'bg-red-50 text-red-700';
      default:
        return 'bg-yellow-50 text-yellow-700';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="w-4 h-4" />;
      case 'error':
        return <AlertCircle className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active':
        return 'פעיל';
      case 'error':
        return 'שגיאה';
      default:
        return 'ממתין';
    }
  };

  const getBankDisplayName = (bankName: string) => {
    const banks: Record<string, string> = {
      hapoalim: 'בנק הפועלים',
      leumi: 'בנק לאומי',
      discount: 'בנק דיסקונט',
      mizrahi: 'מזרחי טפחות',
      isracard: 'ישראכרט',
      cal: 'כאל',
      max: 'מקס',
      visa: 'ויזה',
      amex: 'אמריקן אקספרס',
      behatsdaa: 'בהצדעה',
    };
    return banks[bankName] || bankName;
  };

  // Calculate total: bank balances + credit card charges (as negative)
  const totalBalance = accounts.reduce((sum, acc) => {
    if (CREDIT_CARD_TYPES.includes(acc.bank_type)) {
      return sum - (creditCardCharges[acc.id] || 0); // Credit card charges are expenses
    }
    return sum + (acc.current_balance || 0);
  }, 0);

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
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-2xl font-bold text-slate-800">חשבונות מחוברים</h1>
              <p className="text-slate-500">ניהול חשבונות בנק וכרטיסי אשראי</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleSync}
                disabled={syncing || !hasToken}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                {syncing ? (
                  <Loader2 className="w-4 h-4 spinner" />
                ) : (
                  <Play className="w-4 h-4" />
                )}
                <span>סנכרון</span>
              </button>
              <button
                onClick={() => {
                  if (!hasToken) {
                    setShowTokenModal(true);
                  } else {
                    setShowAddModal(true);
                  }
                }}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
              >
                <Plus className="w-4 h-4" />
                <span>הוסף חשבון</span>
              </button>
            </div>
          </div>

          {/* Summary Card */}
          <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 mb-1">סה"כ יתרה</p>
                <p className="text-3xl font-bold ltr-number">
                  ₪{totalBalance.toLocaleString('he-IL', { maximumFractionDigits: 0 })}
                </p>
              </div>
              <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center">
                <Building2 className="w-7 h-7" />
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-white/20">
              <p className="text-sm text-blue-100">
                {accounts.length} חשבונות מחוברים
              </p>
            </div>
          </div>

          {/* Info Box */}
          <div className="bg-amber-50 border border-amber-100 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm text-amber-700 font-medium">הוספת חשבונות</p>
                <p className="text-sm text-amber-600 mt-1">
                  {!hasToken 
                    ? 'כדי להוסיף חשבון, לחץ על ⚙️ והזן GitHub Token עם הרשאות workflow.'
                    : 'לחץ על "הוסף חשבון" לחיבור חשבון בנק או כרטיס אשראי חדש.'}
                </p>
              </div>
            </div>
          </div>

          {/* Activity Indicator */}
          {workflowRuns.length > 0 && (
            <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
              <div className="p-4 border-b border-slate-100">
                <h2 className="text-lg font-semibold text-slate-800">פעילות אחרונה</h2>
              </div>
              <div className="divide-y divide-slate-100 max-h-48 overflow-y-auto">
                {workflowRuns.map((run) => (
                  <div key={run.id} className="p-3 flex items-center justify-between text-sm">
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full ${
                        run.status === 'completed' 
                          ? run.conclusion === 'success' ? 'bg-green-500' : 'bg-red-500'
                          : run.status === 'in_progress' ? 'bg-yellow-500 animate-pulse' : 'bg-slate-300'
                      }`} />
                      <span className="text-slate-700">{run.name}</span>
                    </div>
                    <div className="flex items-center gap-3 text-slate-400">
                      <span>
                        {run.status === 'completed' 
                          ? run.conclusion === 'success' ? '✓ הצליח' : '✗ נכשל'
                          : run.status === 'in_progress' ? 'פועל...' : 'ממתין'}
                      </span>
                      <span>{formatDistanceToNow(new Date(run.created_at), { addSuffix: true, locale: he })}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Accounts List */}
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-100">
              <h2 className="text-lg font-semibold text-slate-800">חשבונות</h2>
            </div>

            {accounts.length === 0 ? (
              <div className="text-center py-12">
                <CreditCard className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-slate-600 mb-2">אין חשבונות</h3>
                <p className="text-slate-400 text-sm">הוסף חשבון בנק או כרטיס אשראי להתחיל</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {accounts.map((account) => {
                  const isCreditCard = CREDIT_CARD_TYPES.includes(account.bank_type);
                  const displayAmount = isCreditCard 
                    ? -(creditCardCharges[account.id] || 0)
                    : (account.current_balance || 0);
                  
                  return (
                  <div key={account.id} className="p-6 hover:bg-slate-50 transition">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${isCreditCard ? 'bg-purple-100' : 'bg-slate-100'}`}>
                          {isCreditCard ? (
                            <CreditCard className="w-6 h-6 text-purple-600" />
                          ) : (
                            <Building2 className="w-6 h-6 text-slate-600" />
                          )}
                        </div>
                        <div>
                          <h3 className="font-medium text-slate-800">
                            {getBankDisplayName(account.bank_name)}
                          </h3>
                          {account.account_number && (
                            <p className="text-sm text-slate-500 ltr-number">
                              {isCreditCard ? 'כרטיס' : 'חשבון'}: ****{account.account_number.slice(-4)}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="text-left">
                        <p className="text-xs text-slate-400 mb-0.5">
                          {isCreditCard ? 'חיוב קרוב' : 'יתרה'}
                        </p>
                        <p className={`text-xl font-bold ltr-number ${
                          displayAmount >= 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          ₪{Math.abs(displayAmount).toLocaleString('he-IL', { maximumFractionDigits: 0 })}
                        </p>
                        <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(account.status)}`}>
                          {getStatusIcon(account.status)}
                          <span>{getStatusText(account.status)}</span>
                        </div>
                      </div>
                    </div>

                    {account.last_sync && (
                      <div className="mt-3 flex items-center justify-between">
                        <div className="flex items-center gap-2 text-sm text-slate-400">
                          <RefreshCw className="w-3.5 h-3.5" />
                          <span>
                            עודכן לאחרונה {formatDistanceToNow(new Date(account.last_sync), { addSuffix: true, locale: he })}
                          </span>
                        </div>
                        <button
                          onClick={() => setDeleteConfirm(account)}
                          className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                          title="הסר חשבון"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                    {!account.last_sync && (
                      <div className="mt-3 flex justify-end">
                        <button
                          onClick={() => setDeleteConfirm(account)}
                          className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                          title="הסר חשבון"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Sync Info */}
          <div className="bg-white rounded-2xl shadow-sm p-6">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center flex-shrink-0">
                <RefreshCw className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h3 className="font-medium text-slate-800 mb-1">סנכרון אוטומטי</h3>
                <p className="text-sm text-slate-500">
                  החשבונות מסונכרנים אוטומטית פעם ביום באמצעות GitHub Actions.
                  הסנכרון שואב עסקאות חדשות מכל החשבונות המחוברים.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Token Settings Modal */}
        {showTokenModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl w-full max-w-md shadow-xl">
              <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                <h2 className="text-lg font-semibold">הגדרות GitHub Token</h2>
                <button onClick={() => setShowTokenModal(false)} className="text-slate-400 hover:text-slate-600" title="סגור">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">GitHub Personal Access Token</label>
                  <div className="relative">
                    <input
                      type={showToken ? 'text' : 'password'}
                      value={githubToken}
                      onChange={(e) => setGithubToken(e.target.value)}
                      className="w-full p-3 pl-10 border rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="ghp_xxxxxxxxxxxx"
                      dir="ltr"
                    />
                    <button
                      type="button"
                      onClick={() => setShowToken(!showToken)}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                    >
                      {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <p className="text-xs text-slate-500 mt-2">
                    צור Token ב-GitHub Settings → Developer settings → Personal access tokens
                    עם הרשאות: repo, workflow
                  </p>
                </div>
              </div>
              <div className="p-6 border-t border-slate-100 flex justify-end gap-3">
                <button
                  onClick={() => setShowTokenModal(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition"
                >
                  ביטול
                </button>
                <button
                  onClick={handleSaveToken}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                >
                  שמור
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Add Account Modal */}
        {showAddModal && (
          <AddAccountModal 
            onClose={() => setShowAddModal(false)} 
            onSuccess={() => {
              setShowAddModal(false);
              setTimeout(fetchData, 3000);
            }}
          />
        )}

        {/* Delete Account Confirmation Modal */}
        {deleteConfirm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl w-full max-w-md shadow-xl">
              <div className="p-6 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                    <Trash2 className="w-5 h-5 text-red-600" />
                  </div>
                  <h2 className="text-lg font-semibold text-slate-800">הסרת חשבון</h2>
                </div>
              </div>
              <div className="p-6">
                <p className="text-slate-600 mb-4">
                  האם אתה בטוח שברצונך להסיר את החשבון הזה?
                </p>
                <div className="bg-slate-50 rounded-lg p-4 mb-4">
                  <p className="font-medium text-slate-800">{getBankDisplayName(deleteConfirm.bank_type)}</p>
                  {deleteConfirm.account_number && (
                    <p className="text-sm text-slate-500">****{deleteConfirm.account_number.slice(-4)}</p>
                  )}
                </div>
                <p className="text-sm text-red-600">
                  פעולה זו תמחק את החשבון, כל העסקאות שלו, והתשלומים הקבועים הקשורים אליו.
                  לא ניתן לבטל פעולה זו.
                </p>
              </div>
              <div className="p-6 border-t border-slate-100 flex justify-end gap-3">
                <button
                  onClick={() => setDeleteConfirm(null)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition"
                >
                  ביטול
                </button>
                <button
                  onClick={handleDeleteAccount}
                  disabled={deleting}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition disabled:opacity-50 flex items-center gap-2"
                >
                  {deleting ? (
                    <Loader2 className="w-4 h-4 spinner" />
                  ) : (
                    <Trash2 className="w-4 h-4" />
                  )}
                  <span>הסר חשבון</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

// Add Account Modal Component
function AddAccountModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [selectedBank, setSelectedBank] = useState('');
  const [credentials, setCredentials] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({});

  const selectedBankConfig = BANKS.find(b => b.id === selectedBank);

  const handleSubmit = async () => {
    const token = await api.getGithubToken();
    if (!token || !selectedBank) return;

    setSubmitting(true);
    
    const inputs: Record<string, string> = { bank_type: selectedBank };
    selectedBankConfig?.fields.forEach(field => {
      inputs[field] = credentials[field] || '';
    });

    const result = await triggerWorkflow('add-account.yml', inputs, token);
    
    if (result.success) {
      onSuccess();
    } else {
      alert('שגיאה: ' + result.error);
    }
    
    setSubmitting(false);
  };

  const togglePasswordVisibility = (field: string) => {
    setShowPasswords(prev => ({ ...prev, [field]: !prev[field] }));
  };

  const isPasswordField = (field: string) => {
    return field.toLowerCase().includes('password') || 
           field.toLowerCase().includes('code') ||
           field.toLowerCase().includes('num');
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-lg font-semibold">הוספת חשבון חדש</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600" title="סגור">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-6 space-y-4 overflow-y-auto flex-1">
          {/* Bank Selection */}
          <div>
            <label htmlFor="bank-select" className="block text-sm font-medium text-slate-700 mb-2">בחר בנק/כרטיס</label>
            <select
              id="bank-select"
              value={selectedBank}
              onChange={(e) => {
                setSelectedBank(e.target.value);
                setCredentials({});
              }}
              className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="">בחר...</option>
              {BANKS.map(bank => (
                <option key={bank.id} value={bank.id}>{bank.name}</option>
              ))}
            </select>
          </div>

          {/* Credential Fields */}
          {selectedBankConfig && selectedBankConfig.fields.map(field => (
            <div key={field}>
              <label htmlFor={`field-${field}`} className="block text-sm font-medium text-slate-700 mb-2">
                {FIELD_LABELS[field] || field}
              </label>
              <div className="relative">
                <input
                  id={`field-${field}`}
                  type={isPasswordField(field) && !showPasswords[field] ? 'password' : 'text'}
                  value={credentials[field] || ''}
                  onChange={(e) => setCredentials(prev => ({ ...prev, [field]: e.target.value }))}
                  className="w-full p-3 pl-10 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder={FIELD_LABELS[field] || field}
                  dir="ltr"
                />
                {isPasswordField(field) && (
                  <button
                    type="button"
                    onClick={() => togglePasswordVisibility(field)}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                    title={showPasswords[field] ? 'הסתר' : 'הצג'}
                  >
                    {showPasswords[field] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                )}
              </div>
            </div>
          ))}

          {selectedBank && (
            <div className="bg-amber-50 border border-amber-100 rounded-lg p-3 text-sm text-amber-700">
              ⚠️ הפרטים יישלחו ל-GitHub Actions ויאוחסנו כ-Secrets מוצפנים.
            </div>
          )}
        </div>

        <div className="p-6 border-t border-slate-100 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition"
          >
            ביטול
          </button>
          <button
            onClick={handleSubmit}
            disabled={!selectedBank || submitting}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition flex items-center gap-2"
          >
            {submitting && <Loader2 className="w-4 h-4 spinner" />}
            <span>הוסף חשבון</span>
          </button>
        </div>
      </div>
    </div>
  );
}
