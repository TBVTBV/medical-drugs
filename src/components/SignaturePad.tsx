'use client';

import { useRef, useState } from 'react';
import SignatureCanvas from 'react-signature-canvas';

interface SignaturePadProps {
  onSave: (dataUrl: string) => void;
  onCancel: () => void;
}

export default function SignaturePad({ onSave, onCancel }: SignaturePadProps) {
  const sigRef = useRef<SignatureCanvas>(null);
  const [isEmpty, setIsEmpty] = useState(true);

  const handleClear = () => {
    sigRef.current?.clear();
    setIsEmpty(true);
  };

  const handleSave = () => {
    if (sigRef.current && !sigRef.current.isEmpty()) {
      const dataUrl = sigRef.current.getTrimmedCanvas().toDataURL('image/png');
      onSave(dataUrl);
    }
  };

  return (
    <div className="space-y-3">
      <p className="text-sm font-medium text-foreground">Signature Required</p>
      <p className="text-xs text-muted">The soldier must sign below to confirm.</p>
      <div className="border-2 border-dashed border-card-border rounded-lg overflow-hidden bg-white">
        <SignatureCanvas
          ref={sigRef}
          penColor="#1c1917"
          canvasProps={{
            className: 'signature-canvas w-full',
            style: { width: '100%', height: '200px' },
          }}
          onBegin={() => setIsEmpty(false)}
        />
      </div>
      <div className="flex gap-2">
        <button
          onClick={handleClear}
          className="flex-1 px-3 py-2 text-sm border border-card-border rounded-lg hover:bg-stone-50 dark:hover:bg-stone-800 transition-colors text-foreground"
        >
          Clear
        </button>
        <button
          onClick={onCancel}
          className="flex-1 px-3 py-2 text-sm border border-card-border rounded-lg hover:bg-stone-50 dark:hover:bg-stone-800 transition-colors text-muted"
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          disabled={isEmpty}
          className="flex-1 px-3 py-2 text-sm bg-accent text-white rounded-lg hover:bg-accent-light transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Confirm
        </button>
      </div>
    </div>
  );
}
