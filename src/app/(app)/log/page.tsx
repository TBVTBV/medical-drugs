'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { ActionLog, User } from '@/lib/types';
import { useToast } from '@/components/Toast';
import Modal from '@/components/Modal';
import Papa from 'papaparse';

// eslint-disable-next-line @next/next/no-img-element
const Img = (props: React.ImgHTMLAttributes<HTMLImageElement>) => <img {...props} />;

export default function LogPage() {
  const [logs, setLogs] = useState<(ActionLog & { admin: User; soldier: User })[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewSignature, setViewSignature] = useState<string | null>(null);
  const { showToast, ToastContainer } = useToast();
  const supabase = createClient();

  useEffect(() => {
    fetchLogs();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function fetchLogs() {
    setLoading(true);
    const { data, error } = await supabase
      .from('action_logs')
      .select('*, admin:admin_id(*), soldier:soldier_id(*)')
      .order('timestamp', { ascending: false });

    if (error) {
      showToast('Failed to load logs', 'error');
    } else {
      setLogs(data || []);
    }
    setLoading(false);
  }

  function handleExport() {
    const exportData = logs.map((log) => ({
      action_type: log.action_type,
      actiq_amount: log.actiq_amount,
      other_drugs: log.other_drugs_text || '',
      timestamp: new Date(log.timestamp).toLocaleString(),
      admin: log.admin?.full_name || '',
      soldier: log.soldier?.full_name || '',
      has_signature: !!log.signature_image_url,
    }));
    const csv = Papa.unparse(exportData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `assignment_log_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    showToast('Log exported successfully', 'success');
  }

  function getActionColor(action: string): string {
    switch (action) {
      case 'Given': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'Administered': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
      case 'Returned': return 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400';
      case 'Lost/Damaged': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
      default: return 'bg-stone-100 text-stone-600';
    }
  }

  function getActionIcon(action: string) {
    switch (action) {
      case 'Given':
        return (
          <svg className="w-5 h-5 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        );
      case 'Administered':
        return (
          <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
          </svg>
        );
      case 'Returned':
        return (
          <svg className="w-5 h-5 text-amber-600 dark:text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
          </svg>
        );
      case 'Lost/Damaged':
        return (
          <svg className="w-5 h-5 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        );
      default: return null;
    }
  }

  if (loading) {
    return <div className="text-center py-8 text-muted">Loading logs...</div>;
  }

  return (
    <div className="space-y-4">
      <ToastContainer />

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Assignment Log</h1>
        <button
          onClick={handleExport}
          className="px-4 py-2 text-sm border border-card-border rounded-lg hover:bg-stone-50 dark:hover:bg-stone-800 transition-colors text-foreground"
        >
          Export CSV
        </button>
      </div>

      {logs.length === 0 ? (
        <div className="text-center py-12 text-muted">No log entries yet.</div>
      ) : (
        <div className="space-y-3">
          {logs.map((log) => (
            <div key={log.id} className="bg-card border border-card-border rounded-xl p-4">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex-shrink-0">
                  {getActionIcon(log.action_type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getActionColor(log.action_type)}`}>
                      {log.action_type === 'Given' ? 'Was Given' : log.action_type}
                    </span>
                    <span className="text-xs text-muted">
                      {new Date(log.timestamp).toLocaleString()}
                    </span>
                  </div>

                  <div className="mt-2 space-y-1">
                    {log.actiq_amount > 0 && (
                      <p className="text-sm text-foreground">
                        <span className="font-medium">{log.actiq_amount}x Actiq</span>
                      </p>
                    )}
                    {log.other_drugs_text && (
                      <p className="text-sm text-foreground">
                        Other: <span className="font-medium">{log.other_drugs_text}</span>
                      </p>
                    )}
                  </div>

                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
                    <span>
                      By: <span className="text-foreground">{log.admin?.full_name}</span>
                    </span>
                    <span>
                      To: <span className="text-foreground">{log.soldier?.full_name}</span>
                    </span>
                  </div>

                  {log.signature_image_url && (
                    <button
                      onClick={() => setViewSignature(log.signature_image_url)}
                      className="mt-2 text-xs text-accent hover:underline"
                    >
                      View Signature
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Signature View Modal */}
      <Modal open={!!viewSignature} onClose={() => setViewSignature(null)} title="Signature">
        {viewSignature && (
          <div className="flex justify-center">
            <Img
              src={viewSignature}
              alt="Signature"
              className="max-w-full border border-card-border rounded-lg"
            />
          </div>
        )}
      </Modal>
    </div>
  );
}
