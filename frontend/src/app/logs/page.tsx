'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/lib/auth';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/supabase';
import { getWorkflowRuns, WorkflowRun } from '@/lib/github';
import Sidebar from '@/components/layout/Sidebar';
import {
  FileText,
  Loader2,
  CheckCircle,
  XCircle,
  Clock,
  ExternalLink,
  RefreshCw,
  Github,
  AlertCircle,
} from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import { he } from 'date-fns/locale';

interface LogEntry {
  id: string;
  type: string;
  message: string;
  details?: string;
  created_at: string;
}

export default function LogsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [workflowRuns, setWorkflowRuns] = useState<WorkflowRun[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'workflows' | 'logs'>('workflows');

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  const fetchData = useCallback(async () => {
    try {
      // Fetch workflow runs
      const token = await api.getGithubToken();
      if (token) {
        const runs = await getWorkflowRuns(token);
        setWorkflowRuns(runs);
      }

      // Fetch logs from database (if table exists)
      try {
        const logsData = await api.getLogs();
        setLogs(logsData || []);
      } catch (error) {
        // Logs table might not exist yet
        console.log('Logs table not available');
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
      // Refresh every 30 seconds
      const interval = setInterval(fetchData, 30000);
      return () => clearInterval(interval);
    }
  }, [user, fetchData]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  const getStatusIcon = (run: WorkflowRun) => {
    if (run.status === 'completed') {
      return run.conclusion === 'success' 
        ? <CheckCircle className="w-5 h-5 text-green-500" />
        : <XCircle className="w-5 h-5 text-red-500" />;
    }
    if (run.status === 'in_progress') {
      return <Loader2 className="w-5 h-5 text-yellow-500 spinner" />;
    }
    return <Clock className="w-5 h-5 text-slate-400" />;
  };

  const getStatusText = (run: WorkflowRun) => {
    if (run.status === 'completed') {
      return run.conclusion === 'success' ? 'הצליח' : 'נכשל';
    }
    if (run.status === 'in_progress') {
      return 'פועל...';
    }
    return 'ממתין';
  };

  const getStatusColor = (run: WorkflowRun) => {
    if (run.status === 'completed') {
      return run.conclusion === 'success' 
        ? 'bg-green-50 text-green-700 border-green-200'
        : 'bg-red-50 text-red-700 border-red-200';
    }
    if (run.status === 'in_progress') {
      return 'bg-yellow-50 text-yellow-700 border-yellow-200';
    }
    return 'bg-slate-50 text-slate-700 border-slate-200';
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
        <div className="max-w-4xl space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-800">לוג פעילות</h1>
              <p className="text-slate-500">מעקב אחר סנכרונים וריצות GitHub Actions</p>
            </div>
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 disabled:opacity-50 transition"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'spinner' : ''}`} />
              <span>רענן</span>
            </button>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 p-1 bg-slate-100 rounded-xl">
            <button
              onClick={() => setActiveTab('workflows')}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg font-medium transition ${
                activeTab === 'workflows'
                  ? 'bg-white text-slate-800 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <Github className="w-4 h-4" />
              <span>GitHub Actions</span>
            </button>
            <button
              onClick={() => setActiveTab('logs')}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg font-medium transition ${
                activeTab === 'logs'
                  ? 'bg-white text-slate-800 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>לוג מערכת</span>
            </button>
          </div>

          {/* Workflows Tab */}
          {activeTab === 'workflows' && (
            <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
              <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-slate-800">ריצות אחרונות</h2>
                <span className="text-sm text-slate-400">{workflowRuns.length} ריצות</span>
              </div>

              {workflowRuns.length === 0 ? (
                <div className="text-center py-12">
                  <Github className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-slate-600 mb-2">אין ריצות</h3>
                  <p className="text-slate-400 text-sm">
                    עדיין לא הופעלו workflows או שה-Token לא הוגדר
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {workflowRuns.map((run) => (
                    <div key={run.id} className="p-4 hover:bg-slate-50 transition">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-3">
                          {getStatusIcon(run)}
                          <div>
                            <h3 className="font-medium text-slate-800">{run.name}</h3>
                            <p className="text-sm text-slate-500 mt-0.5">
                              {format(new Date(run.created_at), 'dd/MM/yyyy HH:mm', { locale: he })}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className={`px-2.5 py-1 text-xs font-medium rounded-full border ${getStatusColor(run)}`}>
                            {getStatusText(run)}
                          </span>
                          <a
                            href={run.html_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                            title="פתח ב-GitHub"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        </div>
                      </div>
                      <div className="mt-2 mr-8 text-xs text-slate-400">
                        {formatDistanceToNow(new Date(run.created_at), { addSuffix: true, locale: he })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Logs Tab */}
          {activeTab === 'logs' && (
            <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
              <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-slate-800">לוג מערכת</h2>
                <span className="text-sm text-slate-400">{logs.length} רשומות</span>
              </div>

              {logs.length === 0 ? (
                <div className="text-center py-12">
                  <FileText className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-slate-600 mb-2">אין לוגים</h3>
                  <p className="text-slate-400 text-sm">
                    לוגים יופיעו כאן לאחר פעולות סנכרון
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100 max-h-[600px] overflow-y-auto">
                  {logs.map((log) => (
                    <div key={log.id} className="p-4 hover:bg-slate-50 transition">
                      <div className="flex items-start gap-3">
                        <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${
                          log.type === 'error' ? 'bg-red-500' :
                          log.type === 'success' ? 'bg-green-500' :
                          log.type === 'warning' ? 'bg-yellow-500' :
                          'bg-blue-500'
                        }`} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-slate-800">{log.message}</p>
                          {log.details && (
                            <p className="text-xs text-slate-500 mt-1 font-mono bg-slate-50 p-2 rounded">
                              {log.details}
                            </p>
                          )}
                          <p className="text-xs text-slate-400 mt-1">
                            {format(new Date(log.created_at), 'dd/MM/yyyy HH:mm:ss', { locale: he })}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Info */}
          <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm text-blue-700 font-medium">מידע על סנכרון</p>
                <p className="text-sm text-blue-600 mt-1">
                  הסנכרון היומי רץ אוטומטית ב-GitHub Actions.
                  לחץ על הקישור החיצוני כדי לראות פרטים מלאים ב-GitHub.
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
