import Link from 'next/link';
import {
  IconBadgeCheck,
  IconFileText,
  IconFlag,
  IconIdCard,
  IconImageIcon,
  IconTag,
} from '@/components/icons';

const SERVICES = [
  { icon: IconFileText, name: 'Documents', hint: 'From ₹1/page', query: 'documents', color: 'bg-blue-50 text-blue-600' },
  { icon: IconFlag, name: 'Vinyl Printing', hint: 'From ₹40/sq ft', query: 'vinyl', color: 'bg-violet-50 text-violet-600' },
  { icon: IconFlag, name: 'Flex Banners', hint: 'From ₹45/sq ft', query: 'banners', color: 'bg-orange-50 text-orange-600' },
  { icon: IconImageIcon, name: 'Photo Print', hint: 'From ₹25/pc', query: 'photo prints', color: 'bg-rose-50 text-rose-600' },
  { icon: IconTag, name: 'Custom Stickers', hint: 'From ₹4/pc', query: 'stickers', color: 'bg-emerald-50 text-emerald-600' },
  { icon: IconBadgeCheck, name: 'Binding', hint: 'From ₹40/pc', query: 'binding', color: 'bg-amber-50 text-amber-600' },
];

export default function PopularServices() {
  return (
    <section id="services" className="scroll-mt-20 bg-white py-16 sm:py-20">
      <div className="container-page">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
              Popular services
            </h2>
            <p className="mt-2 text-slate-600">Whatever you need printed, someone nearby does it.</p>
          </div>
          <Link href="/stores" className="btn-secondary">
            Browse all shops
          </Link>
        </div>

        <div className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {SERVICES.map((service) => (
            <Link
              key={service.name}
              href={`/stores?q=${encodeURIComponent(service.query)}`}
              className="card group flex flex-col items-center gap-3 p-5 text-center transition-all hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md"
            >
              <span className={`flex h-12 w-12 items-center justify-center rounded-xl ${service.color}`}>
                <service.icon className="h-6 w-6" />
              </span>
              <span className="text-sm font-semibold text-slate-900 group-hover:text-blue-600">
                {service.name}
              </span>
              <span className="text-xs text-slate-500">{service.hint}</span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
