'use client';

import { useEffect, useState, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { User } from '@/lib/types';
import { RANK_LABELS } from '@/lib/types';
import { useToast } from '@/components/Toast';
import { useRouter } from 'next/navigation';
import Papa from 'papaparse';

export default function UsersTab() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [editUser, setEditUser] = useState<User | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { showToast, ToastContainer } = useToast();
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    fetchUsers();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function fetchUsers() {
    setLoading(true);
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .order('full_name');
    if (error) {
      showToast('Failed to load users', 'error');
    } else {
      setUsers(data || []);
    }
    setLoading(false);
  }

  async function handleDelete(userId: string) {
    const { error } = await supabase.from('users').delete().eq('id', userId);
    if (error) {
      showToast('Failed to delete user', 'error');
    } else {
      showToast('User deleted', 'success');
      setUsers(users.filter((u) => u.id !== userId));
    }
    setDeleteConfirm(null);
    setOpenMenuId(null);
  }

  function handleExport() {
    const exportData = users.map((u) => ({
      full_name: u.full_name,
      military_id: u.military_id,
      rank: u.rank,
      job: u.job,
      phone_number: u.phone_number,
      system_role: u.system_role,
      email: u.email || '',
    }));
    const csv = Papa.unparse(exportData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `users_export_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    showToast('Users exported successfully', 'success');
  }

  function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        const rows = results.data as Record<string, string>[];
        let successCount = 0;
        const errors: string[] = [];

        for (const row of rows) {
          const militaryId = parseInt(row.military_id);
          // Check for existing military_id
          const existing = users.find((u) => u.military_id === militaryId);
          if (existing) {
            errors.push(`Military ID ${militaryId} already exists (${existing.full_name})`);
            continue;
          }

          const { error } = await supabase.from('users').insert({
            full_name: row.full_name,
            military_id: militaryId,
            rank: row.rank,
            job: row.job,
            phone_number: row.phone_number,
            system_role: row.system_role || 'General',
            email: row.email || null,
          });

          if (error) {
            errors.push(`Failed to import ${row.full_name}: ${error.message}`);
          } else {
            successCount++;
          }
        }

        if (successCount > 0) {
          showToast(`${successCount} users imported successfully`, 'success');
          fetchUsers();
        }
        errors.forEach((err) => showToast(err, 'error'));
      },
    });

    // Reset file input
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  function formatPhone(phone: string): string {
    const digits = phone.replace(/\D/g, '');
    if (digits.length === 10) {
      return `${digits.slice(0, 3)}-${digits.slice(3)}`;
    }
    return phone;
  }

  if (loading) {
    return <div className="text-center py-8 text-muted">Loading users...</div>;
  }

  return (
    <div>
      <ToastContainer />

      {/* Action buttons */}
      <div className="flex flex-wrap gap-2 mb-4">
        <button
          onClick={() => router.push('/management/add-user')}
          className="px-4 py-2 text-sm bg-accent text-white rounded-lg hover:bg-accent-light transition-colors"
        >
          + Add User
        </button>
        <button
          onClick={handleExport}
          className="px-4 py-2 text-sm border border-card-border rounded-lg hover:bg-stone-50 dark:hover:bg-stone-800 transition-colors text-foreground"
        >
          Export CSV
        </button>
        <button
          onClick={() => fileInputRef.current?.click()}
          className="px-4 py-2 text-sm border border-card-border rounded-lg hover:bg-stone-50 dark:hover:bg-stone-800 transition-colors text-foreground"
        >
          Import CSV
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          className="hidden"
          onChange={handleImport}
        />
      </div>

      {/* Users table */}
      <div className="bg-card border border-card-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-card-border bg-stone-50 dark:bg-stone-900">
                <th className="text-left px-4 py-3 font-medium text-muted">Name</th>
                <th className="text-left px-4 py-3 font-medium text-muted">Military ID</th>
                <th className="text-left px-4 py-3 font-medium text-muted">Rank</th>
                <th className="text-left px-4 py-3 font-medium text-muted">Job</th>
                <th className="text-left px-4 py-3 font-medium text-muted">Phone</th>
                <th className="text-left px-4 py-3 font-medium text-muted">Role</th>
                <th className="text-right px-4 py-3 font-medium text-muted">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-muted">
                    No users yet. Add your first user.
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr key={user.id} className="border-b border-card-border last:border-0 hover:bg-stone-50 dark:hover:bg-stone-900/50">
                    <td className="px-4 py-3 font-medium text-foreground">{user.full_name}</td>
                    <td className="px-4 py-3 text-muted">{user.military_id}</td>
                    <td className="px-4 py-3 text-muted" dir="rtl">{RANK_LABELS[user.rank] || user.rank}</td>
                    <td className="px-4 py-3 text-muted">{user.job}</td>
                    <td className="px-4 py-3 text-muted">{formatPhone(user.phone_number)}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                        user.system_role === 'Admin'
                          ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400'
                          : user.system_role === 'Temp_Admin'
                          ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
                          : 'bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-400'
                      }`}>
                        {user.system_role.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right relative">
                      <button
                        onClick={() => setOpenMenuId(openMenuId === user.id ? null : user.id)}
                        className="p-1 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-lg transition-colors"
                      >
                        <svg className="w-5 h-5 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01" />
                        </svg>
                      </button>
                      {openMenuId === user.id && (
                        <div className="absolute right-4 top-12 bg-card border border-card-border rounded-lg shadow-lg py-1 z-10 min-w-[120px]">
                          <button
                            onClick={() => {
                              setEditUser(user);
                              router.push(`/management/add-user?edit=${user.id}`);
                              setOpenMenuId(null);
                            }}
                            className="w-full text-left px-4 py-2 text-sm hover:bg-stone-50 dark:hover:bg-stone-800 text-foreground"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => {
                              setDeleteConfirm(user.id);
                              setOpenMenuId(null);
                            }}
                            className="w-full text-left px-4 py-2 text-sm hover:bg-stone-50 dark:hover:bg-stone-800 text-danger"
                          >
                            Delete
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Delete confirmation modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setDeleteConfirm(null)} />
          <div className="relative bg-card border border-card-border rounded-xl shadow-xl p-6 max-w-sm w-full">
            <h3 className="text-lg font-semibold text-foreground mb-2">Delete User</h3>
            <p className="text-sm text-muted mb-4">
              Are you sure you want to delete this user? This action cannot be undone.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 px-4 py-2 text-sm border border-card-border rounded-lg hover:bg-stone-50 dark:hover:bg-stone-800 transition-colors text-foreground"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm)}
                className="flex-1 px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Close menu on click outside */}
      {openMenuId && (
        <div className="fixed inset-0 z-[5]" onClick={() => setOpenMenuId(null)} />
      )}
    </div>
  );
}
