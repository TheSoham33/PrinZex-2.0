'use client';

import Link from 'next/link';
import { IconChevronRight } from '@/components/icons';

export interface BreadcrumbItem {
  label: string;
  href?: string;
  active?: boolean;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
  className?: string;
}

export default function Breadcrumbs({ items, className = '' }: BreadcrumbsProps) {
  return (
    <nav aria-label="Breadcrumb" className={`mb-6 ${className}`}>
      <ol className="flex flex-wrap items-center gap-2 text-sm text-slate-500">
        <li>
          <Link href="/" className="hover:text-blue-600 transition-colors">
            Home
          </Link>
        </li>
        
        {items.map((item, index) => (
          <li key={index} className="flex items-center gap-2">
            <IconChevronRight className="h-4 w-4 shrink-0 text-slate-400" />
            {item.active || !item.href ? (
              <span className="font-medium text-slate-900 truncate max-w-[200px]" aria-current="page">
                {item.label}
              </span>
            ) : (
              <Link 
                href={item.href} 
                className="hover:text-blue-600 transition-colors truncate max-w-[200px]"
              >
                {item.label}
              </Link>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
