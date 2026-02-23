'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { ActiveAssignment, User, ActionType } from '@/lib/types';
import Modal from '@/components/Modal';
import SignaturePad from '@/components/SignaturePad';
import { useToast } from '@/components/Toast';

interface UpdateStatusModalProps {
  soldierId: string;
  assignment: ActiveAssignment & { soldier: User };
  adminId: string;
  onClose: () => void;
  onComplete: () => void;
}

type StatusAction = 'Administered' | 'Lost/Damaged' | 'Returned';

export default function UpdateStatusModal({ soldierId, assignment, adminId, onClose, onComplete }: UpdateStatusModalProps) {
  const [selectedDrug, setSelectedDrug] = useState<'actiq' | 'other'>('actiq');
  const [actiqAmount, setActiqAmount] = useState('1');
  const [action, setAction] = useState<StatusAction>('Administered');
  const [showSignature, setShowSignature] = useState(false);
  const [saving, setSaving] = useState(false);
  const { showToast, ToastContainer } = useToast();
  const supabase = createClient();

  function handleProceed() {
    if (selectedDrug === 'actiq') {
      const amount = parseInt(actiqAmount) || 0;
      if (amount < 1 || amount > assignment.actiq_balance) {
        showToast(`Amount must be between 1 and ${assignment.actiq_balance}`, 'error');
        return;
      }
    }

    if (action === 'Returned') {
      setShowSignature(true);
    } else {
      handleSave(null);
    }
  }

  async function handleSave(signatureDataUrl: string | null) {
    setSaving(true);

    let signatureUrl: string | null = null;
    if (signatureDataUrl) {
      const fileName = `sig_return_${Date.now()}.png`;
      const base64Data = signatureDataUrl.split(',')[1];
      const byteArray = Uint8Array.from(atob(base64Data), (c) => c.charCodeAt(0));
      const { error: uploadError } = await supabase.storage
        .from('signatures')
        .upload(fileName, byteArray, { contentType: 'image/png' });

      if (!uploadError) {
        const { data: urlData } = supabase.storage.from('signatures').getPublicUrl(fileName);
        signatureUrl = urlData.publicUrl;
      }
    }

    const amount = selectedDrug === 'actiq' ? (parseInt(actiqAmount) || 0) : 0;

    // Update active assignment
    const newBalance = assignment.actiq_balance - amount;
    const updateData: Record<string, unknown> = {
      actiq_balance: Math.max(0, newBalance),
    };

    if (selectedDrug === 'other') {
      updateData.other_drugs_text = null;
    }

    if (newBalance <= 0 && !assignment.other_drugs_text) {
      // Remove assignment entirely if nothing left
      await supabase.from('active_assignments').delete().eq('soldier_id', soldierId);
    } else {
      await supabase.from('active_assignments').update(updateData).eq('soldier_id', soldierId);
    }

    // If "Returned", add back to available pool (no explicit action needed since
    // available = total - assigned - used/lost, and we just reduced "assigned")

    // Log the action
    await supabase.from('action_logs').insert({
      action_type: action as ActionType,
      actiq_amount: amount,
      other_drugs_text: selectedDrug === 'other' ? assignment.other_drugs_text : null,
      admin_id: adminId,
      soldier_id: soldierId,
      signature_image_url: signatureUrl,
    });

    showToast('Status updated successfully', 'success');
    setSaving(false);
    onComplete();
  }

  return (
    <>
      <ToastContainer />
      <Modal open onClose={onClose} title={`Update Status: ${assignment.soldier?.full_name}`}>
        {!showSignature ? (
          <div className="space-y-4">
            {/* Current inventory */}
            <div className="p-3 bg-stone-50 dark:bg-stone-900 rounded-lg">
              <p className="text-xs font-medium text-muted mb-2">Current Inventory</p>
              <div className="flex gap-4 text-sm">
                <div>
                  <span className="text-muted">Actiqs: </span>
                  <span className="font-medium text-foreground">{assignment.actiq_balance}</span>
                </div>
                {assignment.other_drugs_text && (
                  <div>
                    <span className="text-muted">Other: </span>
                    <span className="font-medium text-foreground">Yes</span>
                  </div>
                )}
              </div>
            </div>

            {/* Drug selection */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Select Drug</label>
              <div className="flex gap-2">
                <button
                  onClick={() => setSelectedDrug('actiq')}
                  className={`flex-1 px-3 py-2 text-sm rounded-lg border transition-colors ${
                    selectedDrug === 'actiq'
                      ? 'border-accent bg-accent/10 text-accent'
                      : 'border-card-border text-muted'
                  }`}
                >
                  Actiq
                </button>
                {assignment.other_drugs_text && (
                  <button
                    onClick={() => setSelectedDrug('other')}
                    className={`flex-1 px-3 py-2 text-sm rounded-lg border transition-colors ${
                      selectedDrug === 'other'
                        ? 'border-accent bg-accent/10 text-accent'
                        : 'border-card-border text-muted'
                    }`}
                  >
                    Other Drugs
                  </button>
                )}
              </div>
            </div>

            {/* Amount (for Actiq) */}
            {selectedDrug === 'actiq' && (
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Amount</label>
                <input
                  type="number"
                  min="1"
                  max={assignment.actiq_balance}
                  value={actiqAmount}
                  onChange={(e) => setActiqAmount(e.target.value)}
                  className="w-full px-3 py-2 bg-card border border-card-border rounded-lg text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                />
              </div>
            )}

            {/* Action */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Action</label>
              <select
                value={action}
                onChange={(e) => setAction(e.target.value as StatusAction)}
                className="w-full px-3 py-2 bg-card border border-card-border rounded-lg text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-accent"
              >
                <option value="Administered">Administered (used on casualty)</option>
                <option value="Lost/Damaged">Lost / Damaged</option>
                <option value="Returned">Returned (back to inventory)</option>
              </select>
              {action === 'Returned' && (
                <p className="text-xs text-muted mt-1">Signature will be required for return.</p>
              )}
            </div>

            <button
              onClick={handleProceed}
              disabled={saving}
              className="w-full py-2.5 bg-accent text-white rounded-lg hover:bg-accent-light transition-colors text-sm font-medium disabled:opacity-50"
            >
              {saving ? 'Processing...' : 'Confirm'}
            </button>
          </div>
        ) : (
          <div>
            {saving ? (
              <div className="text-center py-8 text-muted">Saving...</div>
            ) : (
              <SignaturePad
                onSave={(dataUrl) => handleSave(dataUrl)}
                onCancel={() => setShowSignature(false)}
              />
            )}
          </div>
        )}
      </Modal>
    </>
  );
}
