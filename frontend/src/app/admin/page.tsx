import { redirect } from 'next/navigation';

/** The admin portal opens on the dashboard. */
export default function AdminIndex() {
  redirect('/admin/dashboard');
}
