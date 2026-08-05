'use client';

import type { CostBreakdown, ServiceOffering } from '@/lib/mock-data/stores';
import { formatCurrency } from '@/lib/utils';
import { IconShieldCheck } from '@/components/icons';

interface OrderSummarySidebarProps {
  storeName: string;
  service: ServiceOffering | undefined;
  quantity: number;
  cost: CostBreakdown;
}

export default function OrderSummarySidebar({
  storeName,
  service,
  quantity,
  cost,
}: OrderSummarySidebarProps) {
  const rows = [
    { label: 'Subtotal', value: cost.subtotal },
    ...(cost.rushFee > 0 ? [{ label: 'Rush fee', value: cost.rushFee }] : []),
    {
      label: 'Delivery',
      value: cost.deliveryFee,
      display: cost.deliveryFee === 0 ? 'Free' : undefined,
    },
    { label: 'GST (18%)', value: cost.tax },
    ...(cost.discount > 0
      ? [{ label: 'Discount', value: -cost.discount, className: 'text-green-600' }]
      : []),
  ];

  return (
    <div className="card sticky top-24 overflow-hidden">
      <div className="border-b border-slate-200 bg-slate-50 px-5 py-4">
        <h3 className="font-semibold text-slate-900">Order summary</h3>
        <p className="mt-0.5 truncate text-xs text-slate-500">{storeName}</p>
      </div>

      <div className="px-5 py-4">
        {service ? (
          <div className="flex items-start justify-between gap-3 border-b border-slate-200 pb-4">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-slate-900">{service.name}</p>
              <p className="mt-0.5 text-xs text-slate-500">
                {formatCurrency(service.startingPrice)} {service.unit} · Qty {quantity}
              </p>
            </div>
          </div>
        ) : (
          <p className="border-b border-slate-200 pb-4 text-sm text-slate-500">
            No service selected yet
          </p>
        )}

        <dl className="space-y-2.5 py-4 text-sm">
          {rows.map((row) => (
            <div key={row.label} className="flex items-center justify-between">
              <dt className="text-slate-600">{row.label}</dt>
              <dd className={`font-medium ${row.className ?? 'text-slate-900'}`}>
                {row.display ?? formatCurrency(row.value)}
              </dd>
            </div>
          ))}
        </dl>

        <div className="flex items-baseline justify-between border-t border-slate-200 pt-4">
          <span className="font-semibold text-slate-900">Total</span>
          <span className="text-xl font-extrabold text-slate-900">
            {formatCurrency(cost.total)}
          </span>
        </div>

        <p className="mt-4 flex items-start gap-2 rounded-lg bg-green-50 p-3 text-xs text-green-800">
          <IconShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
          Payment is held securely until your order is confirmed by the shop.
        </p>
      </div>
    </div>
  );
}
