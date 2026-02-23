'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { User } from '@/lib/types';
import { useToast } from '@/components/Toast';

interface BatchInput {
  id: string;
  amount: string;
  dateReceived: string;
  receivingUserId: string;
  lotNumber: string;
  expirationDate: string;
}

function createEmptyBatch(): BatchInput {
  return {
    id: crypto.randomUUID(),
    amount: '',
    dateReceived: new Date().toISOString().split('T')[0],
    receivingUserId: '',
    lotNumber: '',
    expirationDate: '',
  };
}

export default function DrugManagementTab() {
  const [batches, setBatches] = useState<BatchInput[]>([createEmptyBatch()]);
  const [otherDrugsNotes, setOtherDrugsNotes] = useState('');
  const [users, setUsers] = useState<User[]>([]);
  const [saving, setSaving] = useState(false);
  const { dbUser } = useAuth();
  const { showToast, ToastContainer } = useToast();
  const supabase = createClient();

  useEffect(() => {
    fetchUsers();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function fetchUsers() {
    const { data } = await supabase.from('users').select('*').order('full_name');
    setUsers(data || []);
  }

  function updateBatch(id: string, field: keyof BatchInput, value: string) {
    setBatches(batches.map((b) => (b.id === id ? { ...b, [field]: value } : b)));
  }

  function addBatch() {
    setBatches([...batches, createEmptyBatch()]);
  }

  function removeBatch(id: string) {
    if (batches.length > 1) {
      setBatches(batches.filter((b) => b.id !== id));
    }
  }

  async function handleSaveActiqs() {
    setSaving(true);

    for (const batch of batches) {
      if (!batch.amount || !batch.receivingUserId) {
        showToast('Fill in amount and receiving user for all batches', 'error');
        setSaving(false);
        return;
      }

      const { error } = await supabase.from('inventory_batches').insert({
        drug_category: 'Actiq',
        amount_received: parseInt(batch.amount),
        date_received: batch.dateReceived,
        receiving_admin_id: batch.receivingUserId,
        lot_number: batch.lotNumber || null,
        expiration_date: batch.expirationDate || null,
      });

      if (error) {
        showToast(`Error saving batch: ${error.message}`, 'error');
        setSaving(false);
        return;
      }
    }

    showToast('Actiq batches saved successfully', 'success');
    setBatches([createEmptyBatch()]);
    setSaving(false);
  }

  async function handleSaveOtherDrugs() {
    if (!otherDrugsNotes.trim()) {
      showToast('Please enter inventory notes', 'error');
      return;
    }

    setSaving(true);

    const { error } = await supabase.from('inventory_batches').insert({
      drug_category: 'Other',
      amount_received: 0,
      date_received: new Date().toISOString().split('T')[0],
      receiving_admin_id: dbUser!.id,
      other_drugs_notes: otherDrugsNotes.trim(),
    });

    if (error) {
      showToast(`Error: ${error.message}`, 'error');
    } else {
      showToast('Other drugs notes saved', 'success');
      setOtherDrugsNotes('');
    }
    setSaving(false);
  }

  return (
    <div className="space-y-6">
      <ToastContainer />

      {/* Actiqs Section */}
      <div className="bg-card border border-card-border rounded-xl p-4">
        <h2 className="text-lg font-semibold text-foreground mb-4">Actiq Shipments</h2>

        <div className="space-y-4">
          {batches.map((batch, index) => (
            <div key={batch.id} className="space-y-3 p-3 bg-stone-50 dark:bg-stone-900 rounded-lg">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-muted">Batch {index + 1}</span>
                {batches.length > 1 && (
                  <button
                    onClick={() => removeBatch(batch.id)}
                    className="text-xs text-danger hover:underline"
                  >
                    Remove
                  </button>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-muted mb-1">Amount</label>
                  <input
                    type="number"
                    min="1"
                    value={batch.amount}
                    onChange={(e) => updateBatch(batch.id, 'amount', e.target.value)}
                    placeholder="0"
                    className="w-full px-3 py-2 bg-card border border-card-border rounded-lg text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted mb-1">Date Received</label>
                  <input
                    type="date"
                    value={batch.dateReceived}
                    onChange={(e) => updateBatch(batch.id, 'dateReceived', e.target.value)}
                    className="w-full px-3 py-2 bg-card border border-card-border rounded-lg text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-muted mb-1">Receiving User</label>
                  <select
                    value={batch.receivingUserId}
                    onChange={(e) => updateBatch(batch.id, 'receivingUserId', e.target.value)}
                    className="w-full px-3 py-2 bg-card border border-card-border rounded-lg text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                  >
                    <option value="">Select user...</option>
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>{u.full_name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted mb-1">Lot/Batch # (optional)</label>
                  <input
                    type="text"
                    value={batch.lotNumber}
                    onChange={(e) => updateBatch(batch.id, 'lotNumber', e.target.value)}
                    className="w-full px-3 py-2 bg-card border border-card-border rounded-lg text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted mb-1">Expiration (optional)</label>
                  <input
                    type="date"
                    value={batch.expirationDate}
                    onChange={(e) => updateBatch(batch.id, 'expirationDate', e.target.value)}
                    className="w-full px-3 py-2 bg-card border border-card-border rounded-lg text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                  />
                </div>
              </div>
            </div>
          ))}

          <button
            onClick={addBatch}
            className="text-sm text-accent hover:underline"
          >
            + Add another batch
          </button>

          <button
            onClick={handleSaveActiqs}
            disabled={saving}
            className="w-full py-2.5 bg-accent text-white rounded-lg hover:bg-accent-light transition-colors text-sm font-medium disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Actiq Batches'}
          </button>
        </div>
      </div>

      {/* Other Drugs Section */}
      <div className="bg-card border border-card-border rounded-xl p-4">
        <h2 className="text-lg font-semibold text-foreground mb-4">Other Drugs</h2>

        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-muted mb-1">General Inventory Notes</label>
            <textarea
              value={otherDrugsNotes}
              onChange={(e) => setOtherDrugsNotes(e.target.value)}
              rows={6}
              placeholder="Enter notes about other medical supplies received..."
              className="w-full px-3 py-2 bg-card border border-card-border rounded-lg text-foreground placeholder-muted text-sm focus:outline-none focus:ring-2 focus:ring-accent resize-none"
            />
          </div>

          <button
            onClick={handleSaveOtherDrugs}
            disabled={saving}
            className="w-full py-2.5 bg-accent text-white rounded-lg hover:bg-accent-light transition-colors text-sm font-medium disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Notes'}
          </button>
        </div>
      </div>
    </div>
  );
}
