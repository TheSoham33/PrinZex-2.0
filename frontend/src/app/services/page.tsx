'use client';

import Navbar from '@/components/landing/Navbar';
import Footer from '@/components/landing/Footer';
import Link from 'next/link';
import { SERVICE_CATEGORIES } from '@/lib/seller-types';
import { DEFAULT_SERVICE_IMAGE, SERVICE_IMAGE_MAP } from '@/lib/domain/stores';
import { IconChevronRight } from '@/components/icons';
import Breadcrumbs from '@/components/common/Breadcrumbs';


export default function AllServicesPage() {
  const ALL_SERVICES = SERVICE_CATEGORIES.flatMap(cat => 
    cat.services.map(s => ({
      id: s.id,
      name: s.name,
      category: cat.name,
      image: SERVICE_IMAGE_MAP[s.id] || DEFAULT_SERVICE_IMAGE
    }))
  );

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <Navbar />
      
      <main className="flex-1 py-12">
        <div className="container-page">
          <header className="mb-12">
            <Breadcrumbs items={[{ label: 'Services', active: true }]} />
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
