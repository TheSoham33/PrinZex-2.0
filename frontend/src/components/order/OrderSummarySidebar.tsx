'use client';

import type { CostBreakdown, OrderSpecifications, ServiceOffering } from '@/lib/types';
import { formatCurrency } from '@/lib/utils';
import { IconShieldCheck, IconLock } from '@/components/icons';

interface OrderSummarySidebarProps {
  storeName: string;
  service: ServiceOffering | undefined;
  quantity: number;
  cost: CostBreakdown;
  isLoggedIn?: boolean;
  specs?: OrderSpecifications;
}

export default function OrderSummarySidebar({
  storeName,
  service,
  quantity,
  cost,
  isLoggedIn = true,
  specs,
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
          <div className="flex flex-col gap-2 border-b border-slate-200 pb-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-slate-900">{service.name}</p>
                <p className="mt-0.5 text-xs text-slate-500">
                  {formatCurrency(service.startingPrice)} {service.unit} · {specs?.totalPages ? `${specs.totalPages} pages · ` : ''}Qty {quantity}
                </p>
              </div>
            </div>
            
            {specs && (
              <div className="space-y-1 text-[11px] text-slate-500">
                {specs.paperType && <p>Paper: <span className="capitalize">{specs.paperType}</span></p>}
                {specs.size && <p>Size: {specs.size}</p>}
                {specs.pageCornerSize && <p>Corners: <span className="capitalize">{specs.pageCornerSize}</span></p>}
                {specs.colorPages && <p className="line-clamp-1">Color Pages: {specs.colorPages}</p>}
                {specs.coverType && (
                  <div className="mt-2 rounded bg-slate-100 p-1.5 text-slate-700">
                    <p className="font-bold text-[10px] uppercase text-slate-500">Cover</p>
                    <p>{specs.coverType} · {specs.coverColor}</p>
                    {specs.serviceId === 'bind-spiral' && specs.coverDesignType === 'custom' ? (
                      <div className="mt-1 space-y-0.5 border-t border-slate-200 pt-1 text-[10px]">
                        <p className="truncate">Front: {specs.frontCoverFileUrl || '—'}</p>
                        <p className="truncate">Back: {specs.backCoverFileUrl || '—'}</p>
                      </div>
                    ) : (
                      specs.applyCoverToAll !== false ? (
                        specs.coverFileUrl && <p className="truncate">File: {specs.coverFileUrl}</p>
                      ) : (
                        specs.coverFileUrls && (
                          <p className="mt-1 font-medium italic">
                            {specs.coverFileUrls.filter(Boolean).length} of {quantity} designs uploaded
                          </p>
                        )
                      )
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          <p className="border-b border-slate-200 pb-4 text-sm text-slate-500">
            No service selected yet
          </p>
        )}

        {!isLoggedIn ? (
          <div className="py-8 text-center">
            <IconLock className="mx-auto h-8 w-8 text-slate-300" />
            <p className="mt-2 text-sm text-slate-500">Log in to see exact pricing & taxes</p>
          </div>
        ) : (
          <>
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
          </>
        )}

        <p className="mt-4 flex items-start gap-2 rounded-lg bg-green-50 p-3 text-xs text-green-800">
          <IconShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
          Payment is held securely until your order is confirmed by the shop.
        </p>
      </div>
    </div>
  );
}
