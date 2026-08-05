import type { Transaction } from '@/lib/api/wallet';
import { formatCurrency, formatDateTime } from '@/lib/utils';
import { IconArrowDownLeft, IconArrowUpRight } from '@/components/icons';

export default function TransactionRow({ transaction }: { transaction: Transaction }) {
  const credit = transaction.type === 'credit';

  return (
    <div className="flex items-center gap-4 border-b border-slate-100 py-4 last:border-0">
      <span
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
          credit ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'
        }`}
      >
        {credit ? (
          <IconArrowDownLeft className="h-5 w-5" />
        ) : (
          <IconArrowUpRight className="h-5 w-5" />
        )}
      </span>

      <div className="min-w-0 flex-1">
        <p className="truncate font-medium text-slate-900">{transaction.title}</p>
        <p className="mt-0.5 truncate text-xs text-slate-500">{transaction.description}</p>
      </div>

      <div className="shrink-0 text-right">
        <p className={`font-semibold ${credit ? 'text-green-600' : 'text-slate-900'}`}>
          {credit ? '+' : '−'}
          {formatCurrency(transaction.amount)}
        </p>
        <p className="mt-0.5 text-xs text-slate-500">{formatDateTime(transaction.date)}</p>
      </div>
    </div>
  );
}
