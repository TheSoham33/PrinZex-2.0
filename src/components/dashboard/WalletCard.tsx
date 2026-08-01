import { formatCurrency } from '@/lib/utils';
import { IconPlus, IconWallet } from '@/components/icons';

interface WalletCardProps {
  balance: number;
  loading?: boolean;
}

export default function WalletCard({ balance, loading = false }: WalletCardProps) {
  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 p-6 text-white shadow-lg">
      <div
        className="absolute -right-8 -top-8 h-36 w-36 rounded-full bg-white/10 blur-2xl"
        aria-hidden
      />

      <div className="relative flex items-start justify-between">
        <div>
          <p className="text-sm text-blue-100">Wallet balance</p>
          {loading ? (
            <div className="mt-2 h-10 w-32 animate-pulse rounded-lg bg-white/20" />
          ) : (
            <p className="mt-1 text-4xl font-extrabold tracking-tight">
              {formatCurrency(balance, true)}
            </p>
          )}
          <p className="mt-2 text-xs text-blue-200">Use at checkout on any order</p>
        </div>

        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/15 ring-1 ring-white/25">
          <IconWallet className="h-5 w-5" />
        </span>
      </div>

      <button
        type="button"
        className="relative mt-6 inline-flex items-center gap-2 rounded-lg bg-white/15 px-4 py-2.5 text-sm font-semibold ring-1 ring-white/25 transition-colors hover:bg-white/25"
      >
        <IconPlus className="h-4 w-4" /> Add money
      </button>
    </div>
  );
}
