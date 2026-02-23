'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { ActiveAssignment, User } from '@/lib/types';
import { useToast } from '@/components/Toast';
import Modal from '@/components/Modal';
import SignaturePad from '@/components/SignaturePad';
import UpdateStatusModal from './UpdateStatusModal';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

const CHART_COLORS = ['#556B2F', '#6B8E23', '#9ACD32', '#BDB76B', '#D2B48C', '#8FBC8F'];

export default function DashboardPage() {
  const [assignments, setAssignments] = useState<(ActiveAssignment & { soldier: User; assigned_by_user: User })[]>([]);
  const [totalActiqs, setTotalActiqs] = useState(0);
  const [usedActiqs, setUsedActiqs] = useState(0);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [roleFilter, setRoleFilter] = useState<string | null>(null);

  // Assign modal state
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assignSoldierId, setAssignSoldierId] = useState('');
  const [assignActiqCount, setAssignActiqCount] = useState('2');
  const [assignOtherDrugs, setAssignOtherDrugs] = useState('');
  const [showSignature, setShowSignature] = useState(false);
  const [assignSaving, setAssignSaving] = useState(false);

  // Update status modal
  const [updateSoldierId, setUpdateSoldierId] = useState<string | null>(null);

  // View other drugs modal
  const [viewOtherDrugs, setViewOtherDrugs] = useState<string | null>(null);

  const { dbUser } = useAuth();
  const { showToast, ToastContainer } = useToast();
  const supabase = createClient();

  const fetchData = useCallback(async () => {
    setLoading(true);

    // Fetch all data in parallel
    const [assignmentsRes, batchesRes, logsRes, usersRes] = await Promise.all([
      supabase.from('active_assignments').select('*, soldier:soldier_id(*)  , assigned_by_user:last_assigned_by(*)'),
      supabase.from('inventory_batches').select('*').eq('drug_category', 'Actiq'),
      supabase.from('action_logs').select('*').in('action_type', ['Administered', 'Lost/Damaged']),
      supabase.from('users').select('*').order('full_name'),
    ]);

    setAssignments(assignmentsRes.data || []);
    setUsers(usersRes.data || []);

    // Calculate totals
    const totalReceived = (batchesRes.data || []).reduce((sum, b) => sum + b.amount_received, 0);
    const totalUsedWasted = (logsRes.data || []).reduce((sum, l) => sum + l.actiq_amount, 0);
    setTotalActiqs(totalReceived);
    setUsedActiqs(totalUsedWasted);

    setLoading(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const assignedActiqs = assignments.reduce((sum, a) => sum + a.actiq_balance, 0);
  const availableActiqs = totalActiqs - assignedActiqs - usedActiqs;

  // Pie chart data for Actiq overview
  const actiqPieData = [
    { name: 'Available', value: Math.max(0, availableActiqs) },
    { name: 'Assigned', value: assignedActiqs },
    { name: 'Used/Lost', value: usedActiqs },
  ].filter(d => d.value > 0);

  // Pie chart for Other drugs role distribution
  const otherDrugsAssignments = assignments.filter((a) => a.other_drugs_text);
  const otherDrugsRoleCounts: Record<string, number> = {};
  otherDrugsAssignments.forEach((a) => {
    const job = a.soldier?.job || 'Other';
    otherDrugsRoleCounts[job] = (otherDrugsRoleCounts[job] || 0) + 1;
  });
  const otherDrugsPieData = Object.entries(otherDrugsRoleCounts).map(([name, value]) => ({ name, value }));

  // Role grid data for Actiq holders
  const actiqByRole: Record<string, { count: number; totalActiqs: number }> = {};
  assignments
    .filter((a) => a.actiq_balance > 0)
    .forEach((a) => {
      const job = a.soldier?.job || 'Other';
      if (!actiqByRole[job]) actiqByRole[job] = { count: 0, totalActiqs: 0 };
      actiqByRole[job].count++;
      actiqByRole[job].totalActiqs += a.actiq_balance;
    });

  // Filtered assignments for table
  const filteredAssignments = roleFilter
    ? assignments.filter((a) => a.soldier?.job === roleFilter)
    : assignments;

  // Handle assign drug flow
  function handleStartAssign() {
    setAssignSoldierId('');
    setAssignActiqCount('2');
    setAssignOtherDrugs('');
    setShowSignature(false);
    setShowAssignModal(true);
  }

  function handleProceedToSign() {
    if (!assignSoldierId) {
      showToast('Select a soldier', 'error');
      return;
    }
    if (!assignActiqCount && !assignOtherDrugs.trim()) {
      showToast('Specify drugs to assign', 'error');
      return;
    }
    setShowSignature(true);
  }

  async function handleSignatureComplete(signatureDataUrl: string) {
    setAssignSaving(true);

    // Upload signature
    const fileName = `sig_${Date.now()}.png`;
    const base64Data = signatureDataUrl.split(',')[1];
    const byteArray = Uint8Array.from(atob(base64Data), (c) => c.charCodeAt(0));

    const { error: uploadError } = await supabase.storage
      .from('signatures')
      .upload(fileName, byteArray, { contentType: 'image/png' });

    let signatureUrl: string | null = null;
    if (!uploadError) {
      const { data: urlData } = supabase.storage.from('signatures').getPublicUrl(fileName);
      signatureUrl = urlData.publicUrl;
    }

    const actiqAmount = parseInt(assignActiqCount) || 0;

    // Upsert active assignment
    const existing = assignments.find((a) => a.soldier_id === assignSoldierId);
    if (existing) {
      await supabase
        .from('active_assignments')
        .update({
          actiq_balance: existing.actiq_balance + actiqAmount,
          other_drugs_text: assignOtherDrugs.trim()
            ? (existing.other_drugs_text ? existing.other_drugs_text + '\n' + assignOtherDrugs.trim() : assignOtherDrugs.trim())
            : existing.other_drugs_text,
          last_assigned_date: new Date().toISOString(),
          last_assigned_by: dbUser!.id,
        })
        .eq('soldier_id', assignSoldierId);
    } else {
      await supabase.from('active_assignments').insert({
        soldier_id: assignSoldierId,
        actiq_balance: actiqAmount,
        other_drugs_text: assignOtherDrugs.trim() || null,
        last_assigned_date: new Date().toISOString(),
        last_assigned_by: dbUser!.id,
      });
    }

    // Log the action
    await supabase.from('action_logs').insert({
      action_type: 'Given',
      actiq_amount: actiqAmount,
      other_drugs_text: assignOtherDrugs.trim() || null,
      admin_id: dbUser!.id,
      soldier_id: assignSoldierId,
      signature_image_url: signatureUrl,
    });

    showToast('Drugs assigned successfully', 'success');
    setShowAssignModal(false);
    setAssignSaving(false);
    fetchData();
  }

  if (loading) {
    return <div className="text-center py-8 text-muted">Loading dashboard...</div>;
  }

  return (
    <div className="space-y-6">
      <ToastContainer />

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <button
          onClick={handleStartAssign}
          className="px-4 py-2 text-sm bg-accent text-white rounded-lg hover:bg-accent-light transition-colors"
        >
          + Assign Drug
        </button>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-card border border-card-border rounded-xl p-3 text-center">
          <p className="text-2xl font-bold text-foreground">{totalActiqs}</p>
          <p className="text-xs text-muted">Total Actiqs</p>
        </div>
        <div className="bg-card border border-card-border rounded-xl p-3 text-center">
          <p className="text-2xl font-bold text-accent">{availableActiqs}</p>
          <p className="text-xs text-muted">Available</p>
        </div>
        <div className="bg-card border border-card-border rounded-xl p-3 text-center">
          <p className="text-2xl font-bold text-warning">{assignedActiqs}</p>
          <p className="text-xs text-muted">Assigned</p>
        </div>
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Actiq Pie Chart */}
        <div className="bg-card border border-card-border rounded-xl p-4">
          <h3 className="text-sm font-medium text-foreground mb-3">Actiq Distribution</h3>
          {actiqPieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={actiqPieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {actiqPieData.map((_, index) => (
                    <Cell key={index} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[200px] flex items-center justify-center text-muted text-sm">No data yet</div>
          )}
        </div>

        {/* Other Drugs Role Distribution */}
        <div className="bg-card border border-card-border rounded-xl p-4">
          <h3 className="text-sm font-medium text-foreground mb-3">Other Drugs by Role</h3>
          {otherDrugsPieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={otherDrugsPieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {otherDrugsPieData.map((_, index) => (
                    <Cell key={index} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[200px] flex items-center justify-center text-muted text-sm">No data yet</div>
          )}
        </div>
      </div>

      {/* Role Grid */}
      <div className="bg-card border border-card-border rounded-xl p-4">
        <h3 className="text-sm font-medium text-foreground mb-3">Actiq Holders by Role</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
          {Object.entries(actiqByRole).map(([role, data]) => (
            <button
              key={role}
              onClick={() => setRoleFilter(roleFilter === role ? null : role)}
              className={`p-3 rounded-lg border text-center transition-colors ${
                roleFilter === role
                  ? 'border-accent bg-accent/10'
                  : 'border-card-border hover:bg-stone-50 dark:hover:bg-stone-800'
              }`}
            >
              <p className="text-sm font-medium text-foreground">{role}</p>
              <p className="text-xs text-muted">
                {data.count} soldier{data.count !== 1 ? 's' : ''} ({data.totalActiqs} Actiqs)
              </p>
            </button>
          ))}
          {Object.keys(actiqByRole).length === 0 && (
            <p className="col-span-full text-sm text-muted text-center py-2">No assignments yet</p>
          )}
        </div>
        {roleFilter && (
          <button
            onClick={() => setRoleFilter(null)}
            className="mt-2 text-xs text-accent hover:underline"
          >
            Clear filter
          </button>
        )}
      </div>

      {/* Assigned Drugs Table */}
      <div className="bg-card border border-card-border rounded-xl overflow-hidden">
        <div className="p-4 border-b border-card-border">
          <h3 className="text-sm font-medium text-foreground">Assigned Drugs</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-card-border bg-stone-50 dark:bg-stone-900">
                <th className="text-left px-4 py-3 font-medium text-muted">Soldier</th>
                <th className="text-left px-4 py-3 font-medium text-muted">Job</th>
                <th className="text-left px-4 py-3 font-medium text-muted">Actiqs</th>
                <th className="text-left px-4 py-3 font-medium text-muted">Other Drugs</th>
                <th className="text-left px-4 py-3 font-medium text-muted">Assigned</th>
                <th className="text-left px-4 py-3 font-medium text-muted">By</th>
                <th className="text-right px-4 py-3 font-medium text-muted">Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredAssignments.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-muted">
                    No assignments{roleFilter ? ` for ${roleFilter}` : ''}.
                  </td>
                </tr>
              ) : (
                filteredAssignments.map((a) => (
                  <tr key={a.id} className="border-b border-card-border last:border-0 hover:bg-stone-50 dark:hover:bg-stone-900/50">
                    <td className="px-4 py-3 font-medium text-foreground">{a.soldier?.full_name}</td>
                    <td className="px-4 py-3 text-muted">{a.soldier?.job}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">
                        {a.actiq_balance}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {a.other_drugs_text ? (
                        <button
                          onClick={() => setViewOtherDrugs(a.other_drugs_text)}
                          className="text-xs text-accent hover:underline"
                        >
                          View
                        </button>
                      ) : (
                        <span className="text-muted">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-muted text-xs">
                      {new Date(a.last_assigned_date).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-muted text-xs">{a.assigned_by_user?.full_name}</td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => setUpdateSoldierId(a.soldier_id)}
                        className="px-3 py-1.5 text-xs bg-stone-100 dark:bg-stone-800 border border-card-border rounded-lg hover:bg-stone-200 dark:hover:bg-stone-700 transition-colors text-foreground"
                      >
                        Update Status
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Assign Drug Modal */}
      <Modal open={showAssignModal} onClose={() => setShowAssignModal(false)} title="Assign Drug">
        {!showSignature ? (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Select Soldier</label>
              <select
                value={assignSoldierId}
                onChange={(e) => setAssignSoldierId(e.target.value)}
                className="w-full px-3 py-2 bg-card border border-card-border rounded-lg text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-accent"
              >
                <option value="">Choose...</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>{u.full_name} ({u.job})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Number of Actiqs</label>
              <input
                type="number"
                min="0"
                value={assignActiqCount}
                onChange={(e) => setAssignActiqCount(e.target.value)}
                className="w-full px-3 py-2 bg-card border border-card-border rounded-lg text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-accent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Other Drugs (optional)</label>
              <textarea
                value={assignOtherDrugs}
                onChange={(e) => setAssignOtherDrugs(e.target.value)}
                rows={3}
                placeholder="e.g., 2x Morphine, 1x Ketamine..."
                className="w-full px-3 py-2 bg-card border border-card-border rounded-lg text-foreground placeholder-muted text-sm focus:outline-none focus:ring-2 focus:ring-accent resize-none"
              />
            </div>
            <button
              onClick={handleProceedToSign}
              className="w-full py-2.5 bg-accent text-white rounded-lg hover:bg-accent-light transition-colors text-sm font-medium"
            >
              Proceed to Signature
            </button>
          </div>
        ) : (
          <div>
            {assignSaving ? (
              <div className="text-center py-8 text-muted">Saving assignment...</div>
            ) : (
              <SignaturePad
                onSave={handleSignatureComplete}
                onCancel={() => setShowSignature(false)}
              />
            )}
          </div>
        )}
      </Modal>

      {/* Update Status Modal */}
      {updateSoldierId && (
        <UpdateStatusModal
          soldierId={updateSoldierId}
          assignment={assignments.find((a) => a.soldier_id === updateSoldierId)!}
          adminId={dbUser!.id}
          onClose={() => setUpdateSoldierId(null)}
          onComplete={() => {
            setUpdateSoldierId(null);
            fetchData();
          }}
        />
      )}

      {/* View Other Drugs Modal */}
      <Modal open={!!viewOtherDrugs} onClose={() => setViewOtherDrugs(null)} title="Other Drugs">
        <div className="whitespace-pre-wrap text-sm text-foreground">{viewOtherDrugs}</div>
      </Modal>
    </div>
  );
}
