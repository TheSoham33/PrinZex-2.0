'use client';

import Navbar from '@/components/landing/Navbar';
import Footer from '@/components/landing/Footer';
import Link from 'next/link';
import { SERVICE_CATEGORIES } from '@/lib/seller-types';
import { IconChevronRight } from '@/components/icons';

const IMAGE_MAP: Record<string, string> = {
  'doc-bw-print': '/images/services/xerox.jpg',
  'doc-color-print': '/images/services/color-print.jpg',
  'doc-xerox': '/images/services/photocopy.jpg',
  'doc-scan': '/images/services/scanning.jpg',
  'doc-fax': '/images/services/scanning.jpg',
  'bulk-booklets': '/images/services/booklets.jpg',
  'bulk-brochures': '/images/services/brochures.jpg',
  'bulk-flyers': '/images/services/flyers.jpg',
  'bulk-question-papers': '/images/services/xerox.jpg',
  'stat-visiting-cards': '/images/services/business-cards.jpg',
  'stat-letterheads': '/images/services/color-print.jpg',
  'stat-envelopes': '/images/services/color-print.jpg',
  'stat-bill-books': '/images/services/xerox.jpg',
  'stat-id-cards': '/images/services/business-cards.jpg',
  'spec-photo-prints': '/images/services/passport-photo.jpg',
  'spec-canvas': '/images/services/posters.jpg',
  'spec-mugs': '/images/services/mugs.jpg',
  'spec-tshirts': '/images/services/tshirts.jpg',
  'spec-invitations': '/images/services/posters.jpg',
  'pack-stickers': '/images/services/stickers.jpg',
  'pack-labels': '/images/services/stickers.jpg',
  'pack-boxes': '/images/services/booklets.jpg',
  'pack-tags': '/images/services/stickers.jpg',
  'bind-spiral': '/images/services/binding.jpg',
  'bind-hard': '/images/services/binding.jpg',
  'bind-perfect': '/images/services/binding.jpg',
  'bind-lamination': '/images/services/lamination.jpg',
  'bind-cutting': '/images/services/xerox.jpg',
  'lf-flex-banner': '/images/services/banners.jpg',
  'lf-vinyl': '/images/services/vinyl.jpg',
  'lf-standee': '/images/services/standee.jpg',
  'lf-hoarding': '/images/services/banners.jpg',
  'lf-vehicle-wrap': '/images/services/vinyl.jpg',
  'cust-design': '/images/services/design.jpg',
  'cust-urgent': '/images/services/color-print.jpg',
  'cust-pickup': '/images/services/scanning.jpg',
};

export default function AllServicesPage() {
  const ALL_SERVICES = SERVICE_CATEGORIES.flatMap(cat => 
    cat.services.map(s => ({
      id: s.id,
      name: s.name,
      category: cat.name,
      image: IMAGE_MAP[s.id] || '/images/services/xerox.jpg'
    }))
  );

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <Navbar />
      
      <main className="flex-1 py-12">
        <div className="container-page">
          <header className="mb-12">
            <nav aria-label="Breadcrumb" className="mb-4">
              <ol className="flex items-center gap-2 text-sm text-slate-500">
                <li><Link href="/" className="hover:text-blue-600">Home</Link></li>
                <IconChevronRight className="h-4 w-4" />
                <li className="font-medium text-slate-900 text-blue-600">Services</li>
              </ol>
            </nav>
            <h1 className="text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
              All printing services
            </h1>
            <p className="mt-4 max-w-2xl text-lg text-slate-600">
              Browse our complete catalog of professional printing and finishing options available from local shops in Kolkata.
            </p>
          </header>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {ALL_SERVICES.map((service) => (
              <Link
                key={service.id}
                href={`/stores?q=${encodeURIComponent(service.name)}`}
                className="group card flex overflow-hidden transition-all hover:shadow-lg hover:border-blue-200"
              >
                <div className="aspect-square w-32 shrink-0 overflow-hidden sm:w-40">
                  <img
                    src={service.image}
                    alt={service.name}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                  />
                </div>
                <div className="flex flex-col justify-center p-4 sm:p-6">
                  <p className="text-xs font-bold uppercase tracking-wider text-blue-600">
                    {service.category}
                  </p>
                  <h3 className="mt-1 text-base font-bold text-slate-900 sm:text-lg">
                    {service.name}
                  </h3>
                  <div className="mt-3 flex items-center text-sm font-semibold text-slate-500 transition-colors group-hover:text-blue-600">
                    Find shops <IconChevronRight className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
