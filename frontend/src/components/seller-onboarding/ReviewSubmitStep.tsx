'use client';

import { BUSINESS_TYPES, type SellerRegistrationState } from '@/lib/seller-types';
import { formatCurrency } from '@/lib/utils';
import { IconAlertCircle, IconCheckCircle, IconFileText } from '@/components/icons';

interface ReviewSubmitStepProps {
  state: SellerRegistrationState;
  agreed: boolean;
  onAgreedChange: (value: boolean) => void;
  onEditStep: (step: number) => void;
  error: string | null;
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 py-1.5 text-sm">
      <dt className="shrink-0 text-slate-500">{label}</dt>
      <dd className="min-w-0 break-words text-right font-medium text-slate-900">{value || '—'}</dd>
    </div>
  );
}

function Section({
  title,
  step,
  onEdit,
  children,
}: {
  title: string;
  step: number;
  onEdit: (step: number) => void;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-slate-200 p-4">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-sm font-bold text-slate-900">{title}</h3>
        <button
          type="button"
          onClick={() => onEdit(step)}
          className="text-xs font-semibold text-blue-600 hover:text-blue-700"
        >
          Edit
        </button>
      </div>
      <dl className="divide-y divide-slate-100">{children}</dl>
    </div>
  );
}

export default function ReviewSubmitStep({
  state,
  agreed,
  onAgreedChange,
  onEditStep,
  error,
}: ReviewSubmitStepProps) {
  const { storeInfo, selectedServices, pricing, bankDetails, documents } = state;
  const businessLabel =
    BUSINESS_TYPES.find((type) => type.value === storeInfo.businessType)?.label ?? '';
  const maskedAccount = bankDetails.accountNumber
    ? `•••• ${bankDetails.accountNumber.slice(-4)}`
    : '';

  return (
    <div className="space-y-6">
      <header>
        <h2 className="text-xl font-bold text-slate-900">Review and submit</h2>
        <p className="mt-1 text-sm text-slate-600">
          Check everything looks right — you can edit any section before submitting.
        </p>
      </header>

      {error && (
        <p className="flex items-center gap-2 rounded-lg bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          <IconAlertCircle className="h-4 w-4 shrink-0" /> {error}
        </p>
      )}

      <div className="space-y-3">
        <Section title="Store information" step={1} onEdit={onEditStep}>
          <Row label="Store name" value={storeInfo.storeName} />
          <Row label="Owner" value={storeInfo.ownerName} />
          <Row label="Email" value={storeInfo.email} />
          <Row label="Phone" value={storeInfo.phone ? `+91 ${storeInfo.phone}` : ''} />
          <Row label="Business type" value={businessLabel} />
          <Row label="GST" value={storeInfo.gstNumber} />
          <Row
            label="Address"
            value={[storeInfo.storeAddress, storeInfo.city, storeInfo.state, storeInfo.pincode]
              .filter(Boolean)
              .join(', ')}
          />
          <Row label="Hours" value={`${storeInfo.openingTime} – ${storeInfo.closingTime}`} />
        </Section>

        <Section title={`Services (${selectedServices.length})`} step={2} onEdit={onEditStep}>
          <div className="flex flex-wrap gap-1.5 py-2">
            {selectedServices.length === 0 ? (
              <span className="text-sm text-slate-400">None selected</span>
            ) : (
              selectedServices.map((service) => (
                <span
                  key={service.serviceId}
                  className="rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600"
                >
                  {service.serviceName}
                </span>
              ))
            )}
          </div>
        </Section>

        <Section title="Pricing" step={3} onEdit={onEditStep}>
          {pricing.length === 0 ? (
            <span className="block py-2 text-sm text-slate-400">No pricing set</span>
          ) : (
            pricing.map((entry) => (
              <Row
                key={entry.serviceId}
                label={entry.serviceName}
                value={`${formatCurrency(entry.basePrice)} ${entry.unit}`}
              />
            ))
          )}
        </Section>

        <Section title="Bank details" step={4} onEdit={onEditStep}>
          <Row label="Account holder" value={bankDetails.accountHolderName} />
          <Row label="Account number" value={maskedAccount} />
          <Row label="IFSC" value={bankDetails.ifscCode} />
          <Row label="PAN" value={bankDetails.panNumber} />
        </Section>

        <Section title="Documents" step={5} onEdit={onEditStep}>
          {documents.map((doc) => (
            <div key={doc.type} className="flex items-center justify-between gap-3 py-2 text-sm">
              <span className="flex items-center gap-2 text-slate-600">
                <IconFileText className="h-4 w-4 shrink-0 text-slate-400" />
                {doc.label}
              </span>
              {doc.file ? (
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-green-600">
                  <IconCheckCircle className="h-3.5 w-3.5" /> Uploaded
                </span>
              ) : (
                <span className="text-xs font-semibold text-red-500">Missing</span>
              )}
            </div>
          ))}
        </Section>
      </div>

      <label className="flex cursor-pointer items-start gap-3 rounded-xl bg-slate-50 p-4 text-sm text-slate-600">
        <input
          type="checkbox"
          checked={agreed}
          onChange={(event) => onAgreedChange(event.target.checked)}
          className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-300 text-blue-600 focus:ring-2 focus:ring-blue-500/30"
        />
        <span>
          I confirm the information above is accurate and I accept the{' '}
          <span className="font-medium text-blue-600">Seller Terms &amp; Conditions</span> and{' '}
          <span className="font-medium text-blue-600">Commission Policy</span>.
        </span>
      </label>
    </div>
  );
}
