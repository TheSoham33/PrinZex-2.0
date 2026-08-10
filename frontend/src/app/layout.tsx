import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import ClientWrapper from './ClientWrapper';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: 'PrinZex — Local Print Shops, Delivered',
    template: '%s · PrinZex',
  },
  description:
    'Find trusted print shops near you, upload your files and get prints delivered to your door. Documents, banners, business cards and more across Kolkata.',
  keywords: ['printing', 'print shop', 'xerox', 'Kolkata', 'banners', 'business cards'],
};

export const viewport: Viewport = {
  themeColor: '#2563eb',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="font-sans">
        <ClientWrapper>{children}</ClientWrapper>
      </body>
    </html>
  );
}
