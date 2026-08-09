import { redirect } from 'next/navigation';

/** The seller hub opens on the order queue. */
export default function SellerDashboardIndex() {
  redirect('/seller/dashboard/orders');
}
