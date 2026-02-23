'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { RANKS, RANK_LABELS, JOBS, SYSTEM_ROLES } from '@/lib/types';
import type { Rank, Job, SystemRole } from '@/lib/types';
import { useToast } from '@/components/Toast';

function AddUserForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get('edit');
  const isEdit = !!editId;
  const { showToast, ToastContainer } = useToast();
  const supabase = createClient();

  const [fullName, setFullName] = useState('');
  const [militaryId, setMilitaryId] = useState('');
  const [rank, setRank] = useState<Rank | ''>('');
  const [job, setJob] = useState<Job | ''>('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [systemRole, setSystemRole] = useState<SystemRole>('General');
  const [email, setEmail] = useState('');
  const [roleExpiration, setRoleExpiration] = useState('');
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (editId) {
      fetchUser(editId);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editId]);

  async function fetchUser(id: string) {
    const { data } = await supabase.from('users').select('*').eq('id', id).single();
    if (data) {
      setFullName(data.full_name);
      setMilitaryId(String(data.military_id));
      setRank(data.rank as Rank);
      setJob(data.job as Job);
      setPhoneNumber(data.phone_number);
      setSystemRole(data.system_role as SystemRole);
      setEmail(data.email || '');
      setRoleExpiration(data.role_expiration_date ? data.role_expiration_date.split('T')[0] : '');
    }
  }

  function validate(): boolean {
    const newErrors: Record<string, string> = {};

    if (fullName.trim().split(/\s+/).length < 2) {
      newErrors.fullName = 'Must contain at least two words';
    }

    if (!/^\d{7}$/.test(militaryId)) {
      newErrors.militaryId = 'Must be exactly 7 digits';
    }

    if (!rank) newErrors.rank = 'Required';
    if (!job) newErrors.job = 'Required';

    const phoneDigits = phoneNumber.replace(/\D/g, '');
    if (!/^05\d{8}$/.test(phoneDigits)) {
      newErrors.phoneNumber = 'Must be format 05#-#######';
    }

    if ((systemRole === 'Admin' || systemRole === 'Temp_Admin') && !email) {
      newErrors.email = 'Email required for Admin/Temp Admin';
    }

    if (systemRole === 'Temp_Admin' && !roleExpiration) {
      newErrors.roleExpiration = 'Expiration date required for Temp Admin';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleSave() {
    if (!validate()) return;

    setSaving(true);

    const userData = {
      full_name: fullName.trim(),
      military_id: parseInt(militaryId),
      rank,
      job,
      phone_number: phoneNumber.replace(/\D/g, ''),
      system_role: systemRole,
      email: (systemRole === 'Admin' || systemRole === 'Temp_Admin') ? email : null,
      role_expiration_date: systemRole === 'Temp_Admin' ? new Date(roleExpiration).toISOString() : null,
    };

    let error;
    if (isEdit) {
      ({ error } = await supabase.from('users').update(userData).eq('id', editId));
    } else {
      ({ error } = await supabase.from('users').insert(userData));
    }

    if (error) {
      showToast(error.message, 'error');
    } else {
      showToast(isEdit ? 'User updated' : 'User added', 'success');
      router.push('/management');
    }
    setSaving(false);
  }

  return (
    <div className="max-w-md mx-auto">
      <ToastContainer />

      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => router.push('/management')}
          className="p-2 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-lg transition-colors"
        >
          <svg className="w-5 h-5 text-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-2xl font-bold text-foreground">
          {isEdit ? 'Edit User' : 'Add New User'}
        </h1>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">Full Name</label>
          <input
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="First Last"
            className="w-full px-3 py-2 bg-card border border-card-border rounded-lg text-foreground placeholder-muted text-sm focus:outline-none focus:ring-2 focus:ring-accent"
          />
          {errors.fullName && <p className="text-xs text-danger mt-1">{errors.fullName}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-1">Military ID</label>
          <input
            type="text"
            value={militaryId}
            onChange={(e) => setMilitaryId(e.target.value.replace(/\D/g, '').slice(0, 7))}
            placeholder="1234567"
            maxLength={7}
            className="w-full px-3 py-2 bg-card border border-card-border rounded-lg text-foreground placeholder-muted text-sm focus:outline-none focus:ring-2 focus:ring-accent"
          />
          {errors.militaryId && <p className="text-xs text-danger mt-1">{errors.militaryId}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-1">Rank</label>
          <select
            value={rank}
            onChange={(e) => setRank(e.target.value as Rank)}
            className="w-full px-3 py-2 bg-card border border-card-border rounded-lg text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-accent"
          >
            <option value="">Select rank...</option>
            {RANKS.map((r) => (
              <option key={r} value={r}>
                {r} ({RANK_LABELS[r]})
              </option>
            ))}
          </select>
          {errors.rank && <p className="text-xs text-danger mt-1">{errors.rank}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-1">Job</label>
          <select
            value={job}
            onChange={(e) => setJob(e.target.value as Job)}
            className="w-full px-3 py-2 bg-card border border-card-border rounded-lg text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-accent"
          >
            <option value="">Select job...</option>
            {JOBS.map((j) => (
              <option key={j} value={j}>{j}</option>
            ))}
          </select>
          {errors.job && <p className="text-xs text-danger mt-1">{errors.job}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-1">Phone Number</label>
          <input
            type="text"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, '').slice(0, 10))}
            placeholder="0501234567"
            maxLength={10}
            className="w-full px-3 py-2 bg-card border border-card-border rounded-lg text-foreground placeholder-muted text-sm focus:outline-none focus:ring-2 focus:ring-accent"
          />
          {errors.phoneNumber && <p className="text-xs text-danger mt-1">{errors.phoneNumber}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-1">System Role</label>
          <select
            value={systemRole}
            onChange={(e) => setSystemRole(e.target.value as SystemRole)}
            className="w-full px-3 py-2 bg-card border border-card-border rounded-lg text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-accent"
          >
            {SYSTEM_ROLES.map((r) => (
              <option key={r} value={r}>{r.replace('_', ' ')}</option>
            ))}
          </select>
        </div>

        {(systemRole === 'Admin' || systemRole === 'Temp_Admin') && (
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Email (for Google SSO)</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="user@example.com"
              className="w-full px-3 py-2 bg-card border border-card-border rounded-lg text-foreground placeholder-muted text-sm focus:outline-none focus:ring-2 focus:ring-accent"
            />
            {errors.email && <p className="text-xs text-danger mt-1">{errors.email}</p>}
          </div>
        )}

        {systemRole === 'Temp_Admin' && (
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Role Expiration Date</label>
            <input
              type="date"
              value={roleExpiration}
              onChange={(e) => setRoleExpiration(e.target.value)}
              className="w-full px-3 py-2 bg-card border border-card-border rounded-lg text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-accent"
            />
            {errors.roleExpiration && <p className="text-xs text-danger mt-1">{errors.roleExpiration}</p>}
          </div>
        )}

        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full py-3 bg-accent text-white rounded-lg hover:bg-accent-light transition-colors text-sm font-medium disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save'}
        </button>
      </div>
    </div>
  );
}

export default function AddUserPage() {
  return (
    <Suspense fallback={<div className="text-center py-8 text-muted">Loading...</div>}>
      <AddUserForm />
    </Suspense>
  );
}
