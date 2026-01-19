'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { useRouter } from 'next/navigation';
import { api, Category } from '@/lib/supabase';
import Sidebar from '@/components/layout/Sidebar';
import {
  Settings,
  Plus,
  Edit2,
  Trash2,
  Loader2,
  ArrowRight,
  Check,
  X,
} from 'lucide-react';

interface AssignmentRule {
  id: string;
  pattern: string;
  category_id: string;
  created_at: string;
  category?: Category;
}

export default function RulesPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [rules, setRules] = useState<AssignmentRule[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingRule, setEditingRule] = useState<AssignmentRule | null>(null);
  const [formData, setFormData] = useState({ pattern: '', category_id: '' });
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [rulesData, catData] = await Promise.all([
          api.getAssignmentRules(),
          api.getCategories(),
        ]);
        setRules(rulesData || []);
        setCategories(catData || []);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchData();
    }
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.category_id) return;

    try {
      if (editingRule) {
        await api.updateAssignmentRule(editingRule.id, formData);
      } else {
        await api.createAssignmentRule(formData);
      }
      // Refresh rules
      const rulesData = await api.getAssignmentRules();
      setRules(rulesData || []);
      setShowModal(false);
      setEditingRule(null);
      setFormData({ pattern: '', category_id: '' });
    } catch (error) {
      console.error('Error saving rule:', error);
    }
  };

  const handleDelete = async (ruleId: string) => {
    try {
      await api.deleteAssignmentRule(ruleId);
      setRules(rules.filter((r) => r.id !== ruleId));
      setDeleteConfirm(null);
    } catch (error) {
      console.error('Error deleting rule:', error);
    }
  };

  const openEditModal = (rule: AssignmentRule) => {
    setEditingRule(rule);
    setFormData({
      pattern: rule.pattern,
      category_id: rule.category_id,
    });
    setShowModal(true);
  };

  const openNewModal = () => {
    setEditingRule(null);
    setFormData({ pattern: '', category_id: '' });
    setShowModal(true);
  };

  const getCategoryName = (categoryId: string) => {
    const category = categories.find((c) => c.id === categoryId);
    return category?.name || 'לא מוגדר';
  };

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
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-800">חוקי שיוך</h1>
              <p className="text-slate-500">הגדר שיוך אוטומטי של עסקים לקטגוריות</p>
            </div>
            <button
              onClick={openNewModal}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition"
            >
              <Plus className="w-4 h-4" />
              <span>חוק חדש</span>
            </button>
          </div>

          {/* Info Box */}
          <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
            <p className="text-sm text-blue-700">
              <strong>איך זה עובד?</strong> כאשר עסקה חדשה נכנסת למערכת, המערכת בודקת אם שם בית העסק 
              מכיל אחד מהביטויים שהגדרת. אם כן, העסקה תשויך אוטומטית לקטגוריה המתאימה.
            </p>
          </div>

          {/* Rules List */}
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-100">
              <h2 className="text-lg font-semibold text-slate-800">חוקים פעילים</h2>
            </div>

            {rules.length === 0 ? (
              <div className="text-center py-12">
                <Settings className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-slate-600 mb-2">אין חוקים</h3>
                <p className="text-slate-400 text-sm">הוסף חוקים לשיוך אוטומטי של עסקאות</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {rules.map((rule) => (
                  <div key={rule.id} className="p-4 hover:bg-slate-50 transition">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="bg-slate-100 px-3 py-1.5 rounded-lg">
                            <span className="font-medium text-slate-700 text-sm">{rule.pattern}</span>
                          </div>
                          <ArrowRight className="w-4 h-4 text-slate-400" />
                          <div className="bg-blue-50 px-3 py-1.5 rounded-lg">
                            <span className="font-medium text-blue-700 text-sm">
                              {getCategoryName(rule.category_id)}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {deleteConfirm === rule.id ? (
                          <>
                            <button
                              onClick={() => handleDelete(rule.id)}
                              className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setDeleteConfirm(null)}
                              className="p-2 text-slate-400 hover:bg-slate-100 rounded-lg transition"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => openEditModal(rule)}
                              className="p-2 text-slate-400 hover:text-slate-600 transition"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setDeleteConfirm(rule.id)}
                              className="p-2 text-slate-400 hover:text-red-500 transition"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Add/Edit Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl p-6 w-full max-w-md">
              <h3 className="text-lg font-semibold text-slate-800 mb-4">
                {editingRule ? 'עריכת חוק' : 'חוק חדש'}
              </h3>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    ביטוי לחיפוש
                  </label>
                  <input
                    type="text"
                    value={formData.pattern}
                    onChange={(e) => setFormData({ ...formData, pattern: e.target.value })}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    placeholder="לדוגמה: סופר, פיצה, רמי לוי"
                    required
                  />
                  <p className="text-xs text-slate-400 mt-1">
                    הביטוי יחפש בשם בית העסק (לא תלוי רישיות)
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    קטגוריה
                  </label>
                  <select
                    value={formData.category_id}
                    onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-white"
                    required
                  >
                    <option value="">בחר קטגוריה</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="submit"
                    className="flex-1 py-2.5 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 transition"
                  >
                    {editingRule ? 'שמור' : 'הוסף'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowModal(false);
                      setEditingRule(null);
                    }}
                    className="flex-1 py-2.5 bg-slate-100 text-slate-600 font-medium rounded-xl hover:bg-slate-200 transition"
                  >
                    ביטול
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
