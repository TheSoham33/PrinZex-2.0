import Link from 'next/link';
import { IconAlertCircle, IconArrowLeft } from '@/components/icons';

export default function NotFoundState({ storeId }: { storeId?: string }) {
  return (
    <div className="container-page flex flex-col items-center justify-center py-24 text-center">
      <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-red-50 text-red-500">
        <IconAlertCircle className="h-8 w-8" />
      </span>
      <h1 className="mt-5 text-2xl font-bold text-slate-900">Store not found</h1>
      <p className="mt-2 max-w-md text-slate-600">
        {storeId
          ? `We couldn't find a print shop with the ID "${storeId}". It may have been removed or the link is incorrect.`
          : "We couldn't find that print shop."}
      </p>
      <Link href="/stores" className="btn-primary mt-6">
        <IconArrowLeft className="h-4 w-4" /> Back to all shops
      </Link>
    </div>
  );
}
