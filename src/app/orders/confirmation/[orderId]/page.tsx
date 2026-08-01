import type { Metadata } from 'next';
import Navbar from '@/components/landing/Navbar';
import Footer from '@/components/landing/Footer';
import ConfirmationView from './ConfirmationView';

export const metadata: Metadata = {
  title: 'Order confirmed',
  description: 'Your PrinZex order has been placed successfully.',
};

export default async function ConfirmationPage({
  params,
}: {
  params: Promise<{ orderId: string }>;
}) {
  const { orderId } = await params;

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <Navbar />
      <main className="flex-1">
        <ConfirmationView orderId={orderId} />
      </main>
      <Footer />
    </div>
  );
}
