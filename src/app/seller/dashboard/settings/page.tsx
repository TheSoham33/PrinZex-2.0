'use client';

import { useState, type FormEvent } from 'react';
import ToggleSwitch from '@/components/seller-dashboard/ToggleSwitch';
import { useToast } from '@/components/seller-dashboard/Toast';
import { BUSINESS_TYPES, type BusinessType } from '@/lib/seller-types';
import { IconAlertCircle, IconPlus, IconX } from '@/components/icons';

const TABS = ['Store info', 'Service hours', 'Delivery radius', 'Notifications'] as const;
type Tab = (typeof TABS)[number];

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

interface DayHours {
  day: string;
  closed: boolean;
  open: string;
  close: string;
}

interface NotificationSetting {
  key: string;
  label: string;
  description: string;
  enabled: boolean;
}

export default function SellerSettingsPage() {
  const { showToast } = useToast();
  const [tab, setTab] = useState<Tab>('Store info');
  const [saving, setSaving] = useState(false);

  const [storeInfo, setStoreInfo] = useState({
    storeName: '',
    ownerName: '',
    email: '',
    phone: '',
    gstNumber: '',
    businessType: '' as BusinessType,
    storeAddress: '',
    city: '',
    state: '',
    pincode: '',
  });

  const [hours, setHours] = useState<DayHours[]>(
    DAYS.map((day) => ({
      day,
      closed: day === 'Sunday',
      open: day === 'Saturday' ? '10:00' : '09:00',
      close: day === 'Saturday' ? '18:00' : '21:00',
    })),
  );

  const [radius, setRadius] = useState(12);
  const [pincodes, setPincodes] = useState(['700064', '700091', '700102']);
  const [pincodeDraft, setPincodeDraft] = useState('');
  const [pincodeError, setPincodeError] = useState<string | null>(null);

  const [notifications, setNotifications] = useState<NotificationSetting[]>([
    {
      key: 'new-orders',
      label: 'New order alerts',
      description: 'Get notified the moment a customer places an order.',
      enabled: true,
    },
    {
      key: 'low-inventory',
      label: 'Low inventory alerts',
      description: 'Warn me when stock drops below the threshold.',
      enabled: true,
    },
    {
      key: 'payouts',
      label: 'Payout notifications',
      description: 'Confirmations when money is sent to your bank.',
      enabled: true,
    },
    {
      key: 'messages',
      label: 'Customer messages',
      description: 'Alerts when a customer replies about an order.',
      enabled: false,
    },
    {
      key: 'announcements',
      label: 'Platform announcements',
      description: 'Product updates and policy changes from PrinZex.',
      enabled: false,
    },
  ]);

  const save = async (event: FormEvent, label: string) => {
    event.preventDefault();
    setSaving(true);
    setSaving(false);
    showToast(`${label} saved`);
  };

  const applyMondayToWeekdays = () => {
    const monday = hours[0];
    setHours((previous) =>
      previous.map((entry, index) =>
        index >= 1 && index <= 4
          ? { ...entry, closed: monday.closed, open: monday.open, close: monday.close }
          : entry,
      ),
    );
    showToast('Monday’s hours applied to all weekdays');
  };

  const addPincode = () => {
    const value = pincodeDraft.trim();
    if (!/^[1-9][0-9]{5}$/.test(value)) {
      setPincodeError('Enter a valid 6-digit pincode');
      return;
    }
    if (pincodes.includes(value)) {
      setPincodeError('That pincode is already in the list');
      return;
    }
    setPincodes((previous) => [...previous, value]);
    setPincodeDraft('');
    setPincodeError(null);
  };

  return (
    <div className="mx-auto max-w-3xl">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Settings</h1>
        <p className="mt-1 text-sm text-slate-600">
          Manage your store profile, hours and delivery area.
        </p>
      </header>

      <div
        role="tablist"
        aria-label="Settings sections"
        className="mt-6 flex gap-1 overflow-x-auto rounded-xl bg-slate-100 p-1"
      >
        {TABS.map((item) => (
          <button
            key={item}
            role="tab"
            aria-selected={tab === item}
            onClick={() => setTab(item)}
            className={`flex-1 whitespace-nowrap rounded-lg px-3 py-2.5 text-sm font-semibold transition-colors ${
              tab === item ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {item}
          </button>
        ))}
      </div>

      {tab === 'Store info' && (
        <form onSubmit={(event) => save(event, 'Store info')} className="card mt-6 space-y-5 p-6">
          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label htmlFor="storeName" className="label">Store name</label>
              <input
                id="storeName"
                type="text"
                value={storeInfo.storeName}
                onChange={(event) => setStoreInfo({ ...storeInfo, storeName: event.target.value })}
                className="input"
              />
            </div>
            <div>
              <label htmlFor="ownerName" className="label">Owner name</label>
              <input
                id="ownerName"
                type="text"
                value={storeInfo.ownerName}
                onChange={(event) => setStoreInfo({ ...storeInfo, ownerName: event.target.value })}
                className="input"
              />
            </div>
            <div>
              <label htmlFor="email" className="label">Business email</label>
              <input
                id="email"
                type="email"
                value={storeInfo.email}
                onChange={(event) => setStoreInfo({ ...storeInfo, email: event.target.value })}
                className="input"
              />
            </div>
            <div>
              <label htmlFor="phone" className="label">Phone</label>
              <div className="flex gap-2">
                <span className="flex shrink-0 items-center rounded-lg border border-slate-300 bg-slate-50 px-3 text-sm text-slate-600">
                  +91
                </span>
                <input
                  id="phone"
                  type="tel"
                  value={storeInfo.phone}
                  onChange={(event) => setStoreInfo({ ...storeInfo, phone: event.target.value })}
                  className="input"
                />
              </div>
            </div>
            <div>
              <label htmlFor="businessType" className="label">Business type</label>
              <select
                id="businessType"
                value={storeInfo.businessType}
                onChange={(event) =>
                  setStoreInfo({ ...storeInfo, businessType: event.target.value as BusinessType })
                }
                className="input"
              >
                {BUSINESS_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="gstNumber" className="label">GST number</label>
              <input
                id="gstNumber"
                type="text"
                value={storeInfo.gstNumber}
                onChange={(event) =>
                  setStoreInfo({ ...storeInfo, gstNumber: event.target.value.toUpperCase() })
                }
                maxLength={15}
                className="input uppercase"
              />
            </div>
          </div>

          <div>
            <label htmlFor="storeAddress" className="label">Store address</label>
            <textarea
              id="storeAddress"
              rows={3}
              value={storeInfo.storeAddress}
              onChange={(event) => setStoreInfo({ ...storeInfo, storeAddress: event.target.value })}
              className="input resize-none"
            />
          </div>

          <div className="grid gap-5 sm:grid-cols-3">
            <div>
              <label htmlFor="city" className="label">City</label>
              <input
                id="city"
                type="text"
                value={storeInfo.city}
                onChange={(event) => setStoreInfo({ ...storeInfo, city: event.target.value })}
                className="input"
              />
            </div>
            <div>
              <label htmlFor="state" className="label">State</label>
              <input
                id="state"
                type="text"
                value={storeInfo.state}
                onChange={(event) => setStoreInfo({ ...storeInfo, state: event.target.value })}
                className="input"
              />
            </div>
            <div>
              <label htmlFor="pincode" className="label">Pincode</label>
              <input
                id="pincode"
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={storeInfo.pincode}
                onChange={(event) =>
                  setStoreInfo({ ...storeInfo, pincode: event.target.value.replace(/\D/g, '') })
                }
                className="input"
              />
            </div>
          </div>

          <button type="submit" disabled={saving} className="btn-primary">
            {saving ? 'Saving…' : 'Save changes'}
          </button>
        </form>
      )}

      {tab === 'Service hours' && (
        <form onSubmit={(event) => save(event, 'Service hours')} className="card mt-6 p-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-sm font-bold text-slate-900">Weekly opening hours</h2>
            <button type="button" onClick={applyMondayToWeekdays} className="btn-secondary text-xs">
              Apply Monday&apos;s hours to all weekdays
            </button>
          </div>

          <div className="divide-y divide-slate-100">
            {hours.map((entry, index) => (
              <div key={entry.day} className="flex flex-wrap items-center gap-4 py-3">
                <p className="w-28 shrink-0 text-sm font-medium text-slate-900">{entry.day}</p>

                <div className="flex items-center gap-2">
                  <ToggleSwitch
                    checked={!entry.closed}
                    onChange={(open) =>
                      setHours((previous) =>
                        previous.map((row, rowIndex) =>
                          rowIndex === index ? { ...row, closed: !open } : row,
                        ),
                      )
                    }
                    label={`${entry.day} open`}
                    hideLabel
                  />
                  <span
                    className={`text-xs font-semibold ${
                      entry.closed ? 'text-slate-400' : 'text-green-600'
                    }`}
                  >
                    {entry.closed ? 'Closed' : 'Open'}
                  </span>
                </div>

                {!entry.closed && (
                  <div className="flex items-center gap-2">
                    <label htmlFor={`open-${entry.day}`} className="sr-only">
                      {entry.day} opening time
                    </label>
                    <input
                      id={`open-${entry.day}`}
                      type="time"
                      value={entry.open}
                      onChange={(event) =>
                        setHours((previous) =>
                          previous.map((row, rowIndex) =>
                            rowIndex === index ? { ...row, open: event.target.value } : row,
                          ),
                        )
                      }
                      className="input w-32 py-1.5 text-sm"
                    />
                    <span className="text-slate-400">–</span>
                    <label htmlFor={`close-${entry.day}`} className="sr-only">
                      {entry.day} closing time
                    </label>
                    <input
                      id={`close-${entry.day}`}
                      type="time"
                      value={entry.close}
                      onChange={(event) =>
                        setHours((previous) =>
                          previous.map((row, rowIndex) =>
                            rowIndex === index ? { ...row, close: event.target.value } : row,
                          ),
                        )
                      }
                      className="input w-32 py-1.5 text-sm"
                    />
                  </div>
                )}
              </div>
            ))}
          </div>

          <button type="submit" disabled={saving} className="btn-primary mt-5">
            {saving ? 'Saving…' : 'Save changes'}
          </button>
        </form>
      )}

      {tab === 'Delivery radius' && (
        <form onSubmit={(event) => save(event, 'Delivery settings')} className="card mt-6 p-6">
          <h2 className="text-sm font-bold text-slate-900">Delivery radius</h2>
          <p className="mt-3 text-2xl font-bold text-blue-600">Deliver within {radius} km</p>

          <label htmlFor="radius" className="sr-only">
            Delivery radius in kilometres
          </label>
          <input
            id="radius"
            type="range"
            min={1}
            max={50}
            value={radius}
            onChange={(event) => setRadius(Number(event.target.value))}
            className="mt-4 h-2 w-full cursor-pointer appearance-none rounded-full bg-slate-200 accent-blue-600"
          />
          <div className="mt-1 flex justify-between text-xs text-slate-400">
            <span>1 km</span>
            <span>50 km</span>
          </div>

          <div className="mt-6 border-t border-slate-200 pt-5">
            <h3 className="text-sm font-bold text-slate-900">Serviceable pincodes</h3>
            <p className="mt-0.5 text-xs text-slate-500">
              Orders from these pincodes are accepted even outside the radius.
            </p>

            <div className="mt-3 flex flex-wrap gap-2">
              {pincodes.map((pincode) => (
                <span
                  key={pincode}
                  className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 py-1 pl-3 pr-1.5 text-sm font-medium text-slate-700"
                >
                  {pincode}
                  <button
                    type="button"
                    onClick={() => setPincodes((previous) => previous.filter((p) => p !== pincode))}
                    className="rounded-full p-0.5 text-slate-400 transition-colors hover:bg-slate-200 hover:text-red-600"
                    aria-label={`Remove pincode ${pincode}`}
                  >
                    <IconX className="h-3.5 w-3.5" />
                  </button>
                </span>
              ))}
              {pincodes.length === 0 && (
                <p className="text-sm text-slate-500">No pincodes added yet.</p>
              )}
            </div>

            <div className="mt-4 flex gap-2">
              <div className="flex-1">
                <label htmlFor="pincode-add" className="sr-only">
                  Add a pincode
                </label>
                <input
                  id="pincode-add"
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={pincodeDraft}
                  onChange={(event) => {
                    setPincodeDraft(event.target.value.replace(/\D/g, ''));
                    setPincodeError(null);
                  }}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault();
                      addPincode();
                    }
                  }}
                  placeholder="700001"
                  className={`input ${pincodeError ? 'input-error' : ''}`}
                />
              </div>
              <button type="button" onClick={addPincode} className="btn-secondary shrink-0">
                <IconPlus className="h-4 w-4" /> Add
              </button>
            </div>

            {pincodeError && (
              <p className="field-error">
                <IconAlertCircle className="h-3.5 w-3.5" /> {pincodeError}
              </p>
            )}
          </div>

          <button type="submit" disabled={saving} className="btn-primary mt-6">
            {saving ? 'Saving…' : 'Save changes'}
          </button>
        </form>
      )}

      {tab === 'Notifications' && (
        <form onSubmit={(event) => save(event, 'Notification preferences')} className="card mt-6 p-6">
          <h2 className="text-sm font-bold text-slate-900">Notification preferences</h2>

          <div className="mt-4 divide-y divide-slate-100">
            {notifications.map((setting, index) => (
              <div key={setting.key} className="flex items-start justify-between gap-4 py-4">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-900">{setting.label}</p>
                  <p className="mt-0.5 text-sm text-slate-600">{setting.description}</p>
                </div>
                <ToggleSwitch
                  checked={setting.enabled}
                  onChange={(value) =>
                    setNotifications((previous) =>
                      previous.map((row, rowIndex) =>
                        rowIndex === index ? { ...row, enabled: value } : row,
                      ),
                    )
                  }
                  label={setting.label}
                  hideLabel
                />
              </div>
            ))}
          </div>

          <button type="submit" disabled={saving} className="btn-primary mt-5">
            {saving ? 'Saving…' : 'Save changes'}
          </button>
        </form>
      )}
    </div>
  );
}
