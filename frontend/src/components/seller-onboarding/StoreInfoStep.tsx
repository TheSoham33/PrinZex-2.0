'use client';

import { useRef } from 'react';
import { BUSINESS_TYPES, type StoreInfo } from '@/lib/seller-types';
import { IconAlertCircle, IconImageIcon, IconStore, IconUpload, IconX } from '@/components/icons';

interface StoreInfoStepProps {
  storeInfo: StoreInfo;
  errors: Partial<Record<keyof StoreInfo, string>>;
  onChange: (patch: Partial<StoreInfo>) => void;
}

function Field({
  id,
  label,
  required,
  error,
  hint,
  children,
}: {
  id: string;
  label: string;
  required?: boolean;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={id} className="label">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {children}
      {error ? (
        <p className="field-error">
          <IconAlertCircle className="h-3.5 w-3.5" /> {error}
        </p>
      ) : hint ? (
        <p className="mt-1.5 text-xs text-slate-500">{hint}</p>
      ) : null}
    </div>
  );
}

export default function StoreInfoStep({ storeInfo, errors, onChange }: StoreInfoStepProps) {
  const logoRef = useRef<HTMLInputElement>(null);
  const bannerRef = useRef<HTMLInputElement>(null);

  return (
    <div className="space-y-8">
      <header>
        <h2 className="text-xl font-bold text-slate-900">Tell us about your shop</h2>
        <p className="mt-1 text-sm text-slate-600">
          This is what customers see when they find you on PrinZex.
        </p>
      </header>

      <section className="space-y-5">
        <h3 className="text-sm font-bold uppercase tracking-wide text-slate-400">Basic info</h3>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field id="storeName" label="Store name" required error={errors.storeName}>
            <input
              id="storeName"
              type="text"
              value={storeInfo.storeName}
              onChange={(event) => onChange({ storeName: event.target.value })}
              placeholder="Print Master Pro"
              className={`input ${errors.storeName ? 'input-error' : ''}`}
            />
          </Field>

          <Field id="ownerName" label="Owner name" required error={errors.ownerName}>
            <input
              id="ownerName"
              type="text"
              value={storeInfo.ownerName}
              onChange={(event) => onChange({ ownerName: event.target.value })}
              placeholder="Rahul Banerjee"
              className={`input ${errors.ownerName ? 'input-error' : ''}`}
            />
          </Field>

          <Field id="email" label="Business email" required error={errors.email}>
            <input
              id="email"
              type="email"
              value={storeInfo.email}
              onChange={(event) => onChange({ email: event.target.value })}
              placeholder="hello@yourshop.in"
              className={`input ${errors.email ? 'input-error' : ''}`}
            />
          </Field>

          <Field id="phone" label="Phone number" required error={errors.phone}>
            <div className="flex gap-2">
              <span className="flex shrink-0 items-center rounded-lg border border-slate-300 bg-slate-50 px-3 text-sm text-slate-600">
                +91
              </span>
              <input
                id="phone"
                type="tel"
                value={storeInfo.phone}
                onChange={(event) => onChange({ phone: event.target.value })}
                placeholder="9830012345"
                className={`input ${errors.phone ? 'input-error' : ''}`}
              />
            </div>
          </Field>

          <Field
            id="businessType"
            label="Business type"
            required
            error={errors.businessType}
          >
            <select
              id="businessType"
              value={storeInfo.businessType}
              onChange={(event) =>
                onChange({ businessType: event.target.value as StoreInfo['businessType'] })
              }
              className={`input ${errors.businessType ? 'input-error' : ''}`}
            >
              <option value="">Select business type…</option>
              {BUSINESS_TYPES.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </Field>

          <Field
            id="gstNumber"
            label="GST number"
            required
            error={errors.gstNumber}
            hint="15-character GSTIN, e.g. 19AAAAA0000A1Z5"
          >
            <input
              id="gstNumber"
              type="text"
              value={storeInfo.gstNumber}
              onChange={(event) => onChange({ gstNumber: event.target.value.toUpperCase() })}
              placeholder="19AAAAA0000A1Z5"
              maxLength={15}
              className={`input uppercase ${errors.gstNumber ? 'input-error' : ''}`}
            />
          </Field>
        </div>
      </section>

      <section className="space-y-5 border-t border-slate-200 pt-6">
        <h3 className="text-sm font-bold uppercase tracking-wide text-slate-400">Store address</h3>

        <Field id="storeAddress" label="Full address" required error={errors.storeAddress}>
          <textarea
            id="storeAddress"
            rows={3}
            value={storeInfo.storeAddress}
            onChange={(event) => onChange({ storeAddress: event.target.value })}
            placeholder="Shop number, building, street, landmark"
            className={`input resize-none ${errors.storeAddress ? 'input-error' : ''}`}
          />
        </Field>

        <div className="grid gap-5 sm:grid-cols-3">
          <Field id="city" label="City" required error={errors.city}>
            <input
              id="city"
              type="text"
              value={storeInfo.city}
              onChange={(event) => onChange({ city: event.target.value })}
              placeholder="Kolkata"
              className={`input ${errors.city ? 'input-error' : ''}`}
            />
          </Field>

          <Field id="state" label="State" required error={errors.state}>
            <input
              id="state"
              type="text"
              value={storeInfo.state}
              onChange={(event) => onChange({ state: event.target.value })}
              placeholder="West Bengal"
              className={`input ${errors.state ? 'input-error' : ''}`}
            />
          </Field>

          <Field id="pincode" label="Pincode" required error={errors.pincode}>
            <input
              id="pincode"
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={storeInfo.pincode}
              onChange={(event) =>
                onChange({ pincode: event.target.value.replace(/\D/g, '').slice(0, 6) })
              }
              placeholder="700091"
              className={`input ${errors.pincode ? 'input-error' : ''}`}
            />
          </Field>
        </div>
      </section>

      <section className="space-y-5 border-t border-slate-200 pt-6">
        <h3 className="text-sm font-bold uppercase tracking-wide text-slate-400">Working hours</h3>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field id="openingTime" label="Opening time" required error={errors.openingTime}>
            <input
              id="openingTime"
              type="time"
              value={storeInfo.openingTime}
              onChange={(event) => onChange({ openingTime: event.target.value })}
              className={`input ${errors.openingTime ? 'input-error' : ''}`}
            />
          </Field>

          <Field id="closingTime" label="Closing time" required error={errors.closingTime}>
            <input
              id="closingTime"
              type="time"
              value={storeInfo.closingTime}
              onChange={(event) => onChange({ closingTime: event.target.value })}
              className={`input ${errors.closingTime ? 'input-error' : ''}`}
            />
          </Field>
        </div>
      </section>

      <section className="space-y-5 border-t border-slate-200 pt-6">
        <h3 className="text-sm font-bold uppercase tracking-wide text-slate-400">Branding</h3>

        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <p className="label">Store logo</p>
            {storeInfo.storeLogo ? (
              <div className="flex items-center gap-3 rounded-xl border border-green-300 bg-green-50/50 p-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-green-600 text-white">
                  <IconStore className="h-5 w-5" />
                </span>
                <p className="min-w-0 flex-1 truncate text-sm text-slate-700">
                  {storeInfo.storeLogo}
                </p>
                <button
                  type="button"
                  onClick={() => onChange({ storeLogo: null })}
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
                  aria-label="Remove logo"
                >
                  <IconX className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => logoRef.current?.click()}
                className="flex w-full flex-col items-center gap-2 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 py-6 transition-colors hover:border-blue-400 hover:bg-blue-50/50"
              >
                <IconUpload className="h-6 w-6 text-slate-400" />
                <span className="text-sm font-medium text-slate-600">Upload logo</span>
                <span className="text-xs text-slate-400">Square image, min 200×200</span>
              </button>
            )}
            <input
              ref={logoRef}
              type="file"
              accept="image/*"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) onChange({ storeLogo: file.name });
              }}
              className="hidden"
            />
          </div>

          <div>
            <p className="label">Store banner</p>
            {storeInfo.storeBanner ? (
              <div className="flex items-center gap-3 rounded-xl border border-green-300 bg-green-50/50 p-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-green-600 text-white">
                  <IconImageIcon className="h-5 w-5" />
                </span>
                <p className="min-w-0 flex-1 truncate text-sm text-slate-700">
                  {storeInfo.storeBanner}
                </p>
                <button
                  type="button"
                  onClick={() => onChange({ storeBanner: null })}
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
                  aria-label="Remove banner"
                >
                  <IconX className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => bannerRef.current?.click()}
                className="flex w-full flex-col items-center gap-2 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 py-6 transition-colors hover:border-blue-400 hover:bg-blue-50/50"
              >
                <IconUpload className="h-6 w-6 text-slate-400" />
                <span className="text-sm font-medium text-slate-600">Upload banner</span>
                <span className="text-xs text-slate-400">Wide image, 1200×400</span>
              </button>
            )}
            <input
              ref={bannerRef}
              type="file"
              accept="image/*"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) onChange({ storeBanner: file.name });
              }}
              className="hidden"
            />
          </div>
        </div>
      </section>
    </div>
  );
}
