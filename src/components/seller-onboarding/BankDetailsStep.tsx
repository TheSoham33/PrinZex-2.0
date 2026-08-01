'use client';

import type { BankDetails } from '@/lib/seller-types';
import { IconAlertCircle, IconShieldCheck } from '@/components/icons';

interface BankDetailsStepProps {
  bankDetails: BankDetails;
  errors: Partial<Record<keyof BankDetails, string>>;
  onChange: (patch: Partial<BankDetails>) => void;
}

export default function BankDetailsStep({ bankDetails, errors, onChange }: BankDetailsStepProps) {
  return (
    <div className="space-y-6">
      <header>
        <h2 className="text-xl font-bold text-slate-900">Where should we send your money?</h2>
        <p className="mt-1 text-sm text-slate-600">
          Payouts are transferred every Monday for the previous week&apos;s completed orders.
        </p>
      </header>

      <p className="flex items-start gap-2.5 rounded-lg bg-green-50 px-4 py-3 text-sm text-green-800">
        <IconShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
        Your bank details are encrypted and never shared with customers.
      </p>

      <div className="space-y-5">
        <div>
          <label htmlFor="accountHolderName" className="label">
            Account holder name <span className="text-red-500">*</span>
          </label>
          <input
            id="accountHolderName"
            type="text"
            value={bankDetails.accountHolderName}
            onChange={(event) => onChange({ accountHolderName: event.target.value })}
            placeholder="As printed on your passbook"
            className={`input ${errors.accountHolderName ? 'input-error' : ''}`}
          />
          {errors.accountHolderName && (
            <p className="field-error">
              <IconAlertCircle className="h-3.5 w-3.5" /> {errors.accountHolderName}
            </p>
          )}
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label htmlFor="accountNumber" className="label">
              Account number <span className="text-red-500">*</span>
            </label>
            <input
              id="accountNumber"
              type="text"
              inputMode="numeric"
              value={bankDetails.accountNumber}
              onChange={(event) =>
                onChange({ accountNumber: event.target.value.replace(/\D/g, '').slice(0, 18) })
              }
              placeholder="000123456789"
              className={`input ${errors.accountNumber ? 'input-error' : ''}`}
            />
            {errors.accountNumber && (
              <p className="field-error">
                <IconAlertCircle className="h-3.5 w-3.5" /> {errors.accountNumber}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="confirmAccountNumber" className="label">
              Confirm account number <span className="text-red-500">*</span>
            </label>
            <input
              id="confirmAccountNumber"
              type="text"
              inputMode="numeric"
              onPaste={(event) => event.preventDefault()}
              value={bankDetails.confirmAccountNumber}
              onChange={(event) =>
                onChange({
                  confirmAccountNumber: event.target.value.replace(/\D/g, '').slice(0, 18),
                })
              }
              placeholder="Re-enter to confirm"
              className={`input ${errors.confirmAccountNumber ? 'input-error' : ''}`}
            />
            {errors.confirmAccountNumber && (
              <p className="field-error">
                <IconAlertCircle className="h-3.5 w-3.5" /> {errors.confirmAccountNumber}
              </p>
            )}
          </div>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label htmlFor="ifscCode" className="label">
              IFSC code <span className="text-red-500">*</span>
            </label>
            <input
              id="ifscCode"
              type="text"
              maxLength={11}
              value={bankDetails.ifscCode}
              onChange={(event) => onChange({ ifscCode: event.target.value.toUpperCase() })}
              placeholder="SBIN0001234"
              className={`input uppercase ${errors.ifscCode ? 'input-error' : ''}`}
            />
            {errors.ifscCode ? (
              <p className="field-error">
                <IconAlertCircle className="h-3.5 w-3.5" /> {errors.ifscCode}
              </p>
            ) : (
              <p className="mt-1.5 text-xs text-slate-500">11 characters, e.g. SBIN0001234</p>
            )}
          </div>

          <div>
            <label htmlFor="panNumber" className="label">
              PAN number <span className="text-red-500">*</span>
            </label>
            <input
              id="panNumber"
              type="text"
              maxLength={10}
              value={bankDetails.panNumber}
              onChange={(event) => onChange({ panNumber: event.target.value.toUpperCase() })}
              placeholder="ABCDE1234F"
              className={`input uppercase ${errors.panNumber ? 'input-error' : ''}`}
            />
            {errors.panNumber ? (
              <p className="field-error">
                <IconAlertCircle className="h-3.5 w-3.5" /> {errors.panNumber}
              </p>
            ) : (
              <p className="mt-1.5 text-xs text-slate-500">10 characters, e.g. ABCDE1234F</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
