'use client';

import type { ServiceOffering } from '@/lib/mock-data/stores';
import ServiceCard from './ServiceCard';

interface ServicesListProps {
  services: ServiceOffering[];
  selectedId: string | null;
  onSelect: (serviceId: string) => void;
}

export default function ServicesList({ services, selectedId, onSelect }: ServicesListProps) {
  return (
    <div className="space-y-3">
      <p className="text-sm text-slate-600">
        Select a service to continue. You&apos;ll set quantity and paper options next.
      </p>
      {services.map((service) => (
        <ServiceCard
          key={service.id}
          service={service}
          selected={selectedId === service.id}
          onSelect={onSelect}
        />
      ))}
    </div>
  );
}
