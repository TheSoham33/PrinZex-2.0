import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/** Merge conditional class names with Tailwind conflict resolution. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Format a number as Indian Rupees, e.g. 1200 -> "₹1,200". */
export function formatCurrency(amount: number, withDecimals = false): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: withDecimals ? 2 : 0,
    maximumFractionDigits: withDecimals ? 2 : 0,
  }).format(amount);
}

/** Format an ISO date string into a readable label. */
export function formatDate(iso: string | null, opts?: Intl.DateTimeFormatOptions): string {
  if (!iso) return '—';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    ...opts,
  }).format(date);
}

/** Format an ISO date string into "12 Jul, 4:30 PM". */
export function formatDateTime(iso: string | null): string {
  if (!iso) return '—';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(date);
}

/** Human readable file size. */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Simulated network latency used by every mock API function. */
export const fakeDelay = (ms = 600) => new Promise<void>((res) => setTimeout(res, ms));

/** Compact relative time, e.g. "32 min ago", "3 hr ago", "2 days ago". */
export function timeAgo(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '—';

  const seconds = Math.max(0, Math.floor((Date.now() - then) / 1000));
  if (seconds < 60) return 'just now';

  const mins = Math.floor(seconds / 60);
  if (mins < 60) return `${mins} min ago`;

  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hr ago`;

  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} day${days === 1 ? '' : 's'} ago`;

  const months = Math.floor(days / 30);
  return `${months} month${months === 1 ? '' : 's'} ago`;
}

/** Mask all but the last 4 digits of a phone number. */
export function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 4) return '●●●●';
  return `●●●●● ●${digits.slice(-4)}`;
}

/**
 * Parse a "particular pages in colour" spec such as "1, 5, 10-15" into the
 * number of distinct pages that fall within [1, totalPages].
 */
export function countColorPages(spec: string | undefined | null, totalPages: number): number {
  if (!spec) return 0;
  const pages = new Set<number>();

  for (const raw of spec.split(',')) {
    const part = raw.trim();
    if (!part) continue;

    if (part.includes('-')) {
      const [a, b] = part.split('-').map((n) => parseInt(n.trim(), 10));
      if (!Number.isFinite(a)) continue;
      const end = Number.isFinite(b) ? b : a;
      const start = Math.min(a, end);
      const stop = Math.max(a, end);
      for (let p = start; p <= stop; p++) {
        if (p >= 1 && p <= totalPages) pages.add(p);
      }
    } else {
      const n = parseInt(part, 10);
      if (Number.isFinite(n) && n >= 1 && n <= totalPages) pages.add(n);
    }
  }

  return pages.size;
}

/** Build a full URL for media stored on the backend. */
export function getMediaUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  if (path.startsWith('http')) return path;

  let apiUrl = process.env.NEXT_PUBLIC_API_URL;
  
  // If the env var is undefined or the string "undefined", use the local dev fallback.
  if (!apiUrl || apiUrl === 'undefined') {
    apiUrl = 'http://localhost:5000/api';
  }
  
  const baseUrl = apiUrl.replace(/\/api\/?$/, '');
  
  // Ensure we return an absolute URL or at least a path starting with /
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  
  return `${baseUrl}${normalizedPath}`;
}
