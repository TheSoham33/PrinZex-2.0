/**
 * Inline SVG icon set. No external icon library is used anywhere in PrinZex.
 * Every icon accepts the full set of SVG props so callers can size/colour them
 * with Tailwind utility classes (`className="h-5 w-5 text-blue-600"`).
 */
import type { SVGProps } from 'react';

type IconProps = SVGProps<SVGSVGElement>;

const base = {
  xmlns: 'http://www.w3.org/2000/svg',
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
};

export const IconArrowUpRight = (props: IconProps) => (
  <svg {...base} {...props}>
    <path d="M7 17 17 7" />
    <path d="M7 7h10v10" />
  </svg>
);

export const IconArrowDownLeft = (props: IconProps) => (
  <svg {...base} {...props}>
    <path d="M17 7 7 17" />
    <path d="M17 17H7V7" />
  </svg>
);

export const IconArrowRight = (props: IconProps) => (
  <svg {...base} {...props}>
    <path d="M5 12h14" />
    <path d="m12 5 7 7-7 7" />
  </svg>
);

export const IconArrowLeft = (props: IconProps) => (
  <svg {...base} {...props}>
    <path d="M19 12H5" />
    <path d="m12 19-7-7 7-7" />
  </svg>
);

export const IconLogOut = (props: IconProps) => (
  <svg {...base} {...props}>
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <path d="m16 17 5-5-5-5" />
    <path d="M21 12H9" />
  </svg>
);

export const IconPhone = (props: IconProps) => (
  <svg {...base} {...props}>
    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.79 19.79 0 0 1 2.12 4.18 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.9.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92Z" />
  </svg>
);

export const IconMessageSquare = (props: IconProps) => (
  <svg {...base} {...props}>
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
  </svg>
);

export const IconClock = (props: IconProps) => (
  <svg {...base} {...props}>
    <circle cx="12" cy="12" r="10" />
    <path d="M12 6v6l4 2" />
  </svg>
);

export const IconPackageOpen = (props: IconProps) => (
  <svg {...base} {...props}>
    <path d="M12 22V12" />
    <path d="M3.29 7 12 12l8.71-5" />
    <path d="m2 8.5 10-5 10 5-10 5z" />
    <path d="M4 11.5V17l8 4 8-4v-5.5" />
  </svg>
);

export const IconAlertCircle = (props: IconProps) => (
  <svg {...base} {...props}>
    <circle cx="12" cy="12" r="10" />
    <path d="M12 8v4" />
    <path d="M12 16h.01" />
  </svg>
);

export const IconCopy = (props: IconProps) => (
  <svg {...base} {...props}>
    <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
    <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
  </svg>
);

export const IconRefreshCw = (props: IconProps) => (
  <svg {...base} {...props}>
    <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
    <path d="M21 3v5h-5" />
    <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
    <path d="M8 16H3v5" />
  </svg>
);

export const IconChevronDown = (props: IconProps) => (
  <svg {...base} {...props}>
    <path d="m6 9 6 6 6-6" />
  </svg>
);

export const IconChevronRight = (props: IconProps) => (
  <svg {...base} {...props}>
    <path d="m9 18 6-6-6-6" />
  </svg>
);

export const IconChevronUp = (props: IconProps) => (
  <svg {...base} {...props}>
    <path d="m18 15-6-6-6 6" />
  </svg>
);

export const IconEye = (props: IconProps) => (
  <svg {...base} {...props}>
    <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7Z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

export const IconEyeOff = (props: IconProps) => (
  <svg {...base} {...props}>
    <path d="M10.7 5.1A9.9 9.9 0 0 1 12 5c6.4 0 10 7 10 7a15.5 15.5 0 0 1-3.1 4" />
    <path d="M6.6 6.6A15.6 15.6 0 0 0 2 12s3.6 7 10 7a9.7 9.7 0 0 0 5.4-1.6" />
    <path d="m2 2 20 20" />
    <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
  </svg>
);

export const IconMailCheck = (props: IconProps) => (
  <svg {...base} {...props}>
    <path d="M22 13V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v12c0 1.1.9 2 2 2h8" />
    <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
    <path d="m16 19 2 2 4-4" />
  </svg>
);

export const IconMenu = (props: IconProps) => (
  <svg {...base} {...props}>
    <path d="M4 6h16" />
    <path d="M4 12h16" />
    <path d="M4 18h16" />
  </svg>
);

export const IconX = (props: IconProps) => (
  <svg {...base} {...props}>
    <path d="M18 6 6 18" />
    <path d="m6 6 12 12" />
  </svg>
);

export const IconMapPin = (props: IconProps) => (
  <svg {...base} {...props}>
    <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
    <circle cx="12" cy="10" r="3" />
  </svg>
);

export const IconStore = (props: IconProps) => (
  <svg {...base} {...props}>
    <path d="m2 7 1.5-4h17L22 7" />
    <path d="M2 7h20v3a3 3 0 0 1-6 0 3 3 0 0 1-6 0 3 3 0 0 1-6 0z" />
    <path d="M4 12v9h16v-9" />
    <path d="M9 21v-5h6v5" />
  </svg>
);

export const IconFlag = (props: IconProps) => (
  <svg {...base} {...props}>
    <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V4s-1 1-4 1-5-2-8-2-4 1-4 1z" />
    <path d="M4 22v-7" />
  </svg>
);

export const IconBadgeCheck = (props: IconProps) => (
  <svg {...base} {...props}>
    <path d="M3.85 8.62a4 4 0 0 1 4.78-4.77 4 4 0 0 1 6.74 0 4 4 0 0 1 4.78 4.78 4 4 0 0 1 0 6.74 4 4 0 0 1-4.77 4.78 4 4 0 0 1-6.75 0 4 4 0 0 1-4.78-4.77 4 4 0 0 1 0-6.76Z" />
    <path d="m9 12 2 2 4-4" />
  </svg>
);

export const IconFileText = (props: IconProps) => (
  <svg {...base} {...props}>
    <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
    <path d="M14 2v4a2 2 0 0 0 2 2h4" />
    <path d="M10 9H8" />
    <path d="M16 13H8" />
    <path d="M16 17H8" />
  </svg>
);

export const IconTag = (props: IconProps) => (
  <svg {...base} {...props}>
    <path d="M12.6 2.6A2 2 0 0 0 11.2 2H4a2 2 0 0 0-2 2v7.2a2 2 0 0 0 .6 1.4l8.8 8.8a2 2 0 0 0 2.8 0l7.2-7.2a2 2 0 0 0 0-2.8z" />
    <circle cx="7.5" cy="7.5" r="1.5" fill="currentColor" />
  </svg>
);

export const IconWallet = (props: IconProps) => (
  <svg {...base} {...props}>
    <path d="M19 7V5a2 2 0 0 0-2-2H5a2 2 0 0 0 0 4h15a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5" />
    <path d="M16 12h.01" />
  </svg>
);

export const IconUser = (props: IconProps) => (
  <svg {...base} {...props}>
    <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);

export const IconBell = (props: IconProps) => (
  <svg {...base} {...props}>
    <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
    <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
  </svg>
);

export const IconPackage = (props: IconProps) => (
  <svg {...base} {...props}>
    <path d="m7.5 4.27 9 5.15" />
    <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
    <path d="m3.3 7 8.7 5 8.7-5" />
    <path d="M12 22V12" />
  </svg>
);

export const IconLayoutDashboard = (props: IconProps) => (
  <svg {...base} {...props}>
    <rect width="7" height="9" x="3" y="3" rx="1" />
    <rect width="7" height="5" x="14" y="3" rx="1" />
    <rect width="7" height="9" x="14" y="12" rx="1" />
    <rect width="7" height="5" x="3" y="16" rx="1" />
  </svg>
);

export const IconHeart = (props: IconProps) => (
  <svg {...base} {...props}>
    <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
  </svg>
);

export const IconCheckCircle = (props: IconProps) => (
  <svg {...base} {...props}>
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
    <path d="m9 11 3 3L22 4" />
  </svg>
);

export const IconCreditCard = (props: IconProps) => (
  <svg {...base} {...props}>
    <rect width="20" height="14" x="2" y="5" rx="2" />
    <path d="M2 10h20" />
  </svg>
);

export const IconLock = (props: IconProps) => (
  <svg {...base} {...props}>
    <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
);

export const IconShieldCheck = (props: IconProps) => (
  <svg {...base} {...props}>
    <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />
    <path d="m9 12 2 2 4-4" />
  </svg>
);

export const IconHelpCircle = (props: IconProps) => (
  <svg {...base} {...props}>
    <circle cx="12" cy="12" r="10" />
    <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
    <path d="M12 17h.01" />
  </svg>
);

export const IconIdCard = (props: IconProps) => (
  <svg {...base} {...props}>
    <rect width="20" height="14" x="2" y="5" rx="2" />
    <circle cx="8" cy="11" r="2" />
    <path d="M5 16c.5-1.5 1.6-2 3-2s2.5.5 3 2" />
    <path d="M14 10h5" />
    <path d="M14 14h3" />
  </svg>
);

export const IconImageIcon = (props: IconProps) => (
  <svg {...base} {...props}>
    <rect width="18" height="18" x="3" y="3" rx="2" />
    <circle cx="9" cy="9" r="2" />
    <path d="m21 15-3.09-3.09a2 2 0 0 0-2.82 0L6 21" />
  </svg>
);

export const IconStar = (props: IconProps) => (
  <svg {...base} {...props}>
    <path d="m12 2 3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01z" />
  </svg>
);

export const IconSearch = (props: IconProps) => (
  <svg {...base} {...props}>
    <circle cx="11" cy="11" r="8" />
    <path d="m21 21-4.3-4.3" />
  </svg>
);

export const IconUpload = (props: IconProps) => (
  <svg {...base} {...props}>
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <path d="m17 8-5-5-5 5" />
    <path d="M12 3v12" />
  </svg>
);

export const IconTruck = (props: IconProps) => (
  <svg {...base} {...props}>
    <path d="M14 18V6a1 1 0 0 0-1-1H2a1 1 0 0 0-1 1v11a1 1 0 0 0 1 1h2" />
    <path d="M14 9h4l3 3v5a1 1 0 0 1-1 1h-1" />
    <circle cx="7" cy="18" r="2" />
    <circle cx="17" cy="18" r="2" />
    <path d="M9 18h6" />
  </svg>
);

export const IconPlus = (props: IconProps) => (
  <svg {...base} {...props}>
    <path d="M12 5v14" />
    <path d="M5 12h14" />
  </svg>
);

export const IconTrash = (props: IconProps) => (
  <svg {...base} {...props}>
    <path d="M3 6h18" />
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
    <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
  </svg>
);

export const IconShoppingCart = (props: IconProps) => (
  <svg {...base} {...props}>
    <circle cx="8" cy="21" r="1" />
    <circle cx="19" cy="21" r="1" />
    <path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.56-7.43H5.12" />
  </svg>
);

export const IconSettings = (props: IconProps) => (
  <svg {...base} {...props}>
    <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

export const IconPrinter = (props: IconProps) => (
  <svg {...base} {...props}>
    <path d="M6 9V2h12v7" />
    <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
    <rect width="12" height="8" x="6" y="14" rx="1" />
  </svg>
);

export const IconGoogle = (props: IconProps) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" {...props}>
    <path
      fill="#4285F4"
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1Z"
    />
    <path
      fill="#34A853"
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z"
    />
    <path
      fill="#FBBC05"
      d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84Z"
    />
    <path
      fill="#EA4335"
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06L5.84 9.9c.87-2.6 3.3-4.52 6.16-4.52Z"
    />
  </svg>
);

/* ------------------------------------------------------------------ */
/* Seller dashboard icons                                              */
/* ------------------------------------------------------------------ */

export const IconBarChart2 = (props: IconProps) => (
  <svg {...base} {...props}>
    <path d="M18 20V10" />
    <path d="M12 20V4" />
    <path d="M6 20v-6" />
  </svg>
);

export const IconArchive = (props: IconProps) => (
  <svg {...base} {...props}>
    <rect width="20" height="5" x="2" y="3" rx="1" />
    <path d="M4 8v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8" />
    <path d="M10 12h4" />
  </svg>
);

export const IconUsers = (props: IconProps) => (
  <svg {...base} {...props}>
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);

export const IconZap = (props: IconProps) => (
  <svg {...base} {...props}>
    <path d="M13 2 3 14h9l-1 8 10-12h-9z" />
  </svg>
);

export const IconTrendingUp = (props: IconProps) => (
  <svg {...base} {...props}>
    <path d="m22 7-8.5 8.5-5-5L2 17" />
    <path d="M16 7h6v6" />
  </svg>
);

export const IconTrendingDown = (props: IconProps) => (
  <svg {...base} {...props}>
    <path d="m22 17-8.5-8.5-5 5L2 7" />
    <path d="M16 17h6v-6" />
  </svg>
);

export const IconAlertTriangle = (props: IconProps) => (
  <svg {...base} {...props}>
    <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
    <path d="M12 9v4" />
    <path d="M12 17h.01" />
  </svg>
);

export const IconDownload = (props: IconProps) => (
  <svg {...base} {...props}>
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <path d="m7 10 5 5 5-5" />
    <path d="M12 15V3" />
  </svg>
);

export const IconMoreHorizontal = (props: IconProps) => (
  <svg {...base} {...props}>
    <circle cx="12" cy="12" r="1" fill="currentColor" />
    <circle cx="19" cy="12" r="1" fill="currentColor" />
    <circle cx="5" cy="12" r="1" fill="currentColor" />
  </svg>
);

export const IconPencil = (props: IconProps) => (
  <svg {...base} {...props}>
    <path d="M21.17 6.83a2.83 2.83 0 0 0-4-4L3 17v4h4z" />
    <path d="m15 5 4 4" />
  </svg>
);

export const IconSend = (props: IconProps) => (
  <svg {...base} {...props}>
    <path d="M22 2 11 13" />
    <path d="M22 2 15 22l-4-9-9-4z" />
  </svg>
);

/* ------------------------------------------------------------------ */
/* Admin panel icons                                                   */
/* ------------------------------------------------------------------ */

export const IconArrowUpDown = (props: IconProps) => (
  <svg {...base} {...props}>
    <path d="m21 16-4 4-4-4" />
    <path d="M17 20V4" />
    <path d="m3 8 4-4 4 4" />
    <path d="M7 4v16" />
  </svg>
);

export const IconArrowUp = (props: IconProps) => (
  <svg {...base} {...props}>
    <path d="m5 12 7-7 7 7" />
    <path d="M12 19V5" />
  </svg>
);

export const IconArrowDown = (props: IconProps) => (
  <svg {...base} {...props}>
    <path d="M12 5v14" />
    <path d="m19 12-7 7-7-7" />
  </svg>
);

export const IconFileEdit = (props: IconProps) => (
  <svg {...base} {...props}>
    <path d="M20 12V7l-5-5H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h5" />
    <path d="M14 2v4a2 2 0 0 0 2 2h4" />
    <path d="M21.4 15.6a2 2 0 0 0-2.8-2.83L14 17.35V21h3.65z" />
  </svg>
);

export const IconHeadphones = (props: IconProps) => (
  <svg {...base} {...props}>
    <path d="M3 14v-3a9 9 0 0 1 18 0v3" />
    <path d="M21 16a2 2 0 0 1-2 2h-1v-6h1a2 2 0 0 1 2 2z" />
    <path d="M3 16a2 2 0 0 0 2 2h1v-6H5a2 2 0 0 0-2 2z" />
  </svg>
);

export const IconShieldOff = (props: IconProps) => (
  <svg {...base} {...props}>
    <path d="M19.7 14.4A9.4 9.4 0 0 0 20 13V6a1 1 0 0 0-1-1c-2 0-4.5-1.2-6.2-2.7a1.2 1.2 0 0 0-1.6 0c-.5.5-1.2.9-1.9 1.3" />
    <path d="M4.7 4.7A1 1 0 0 0 4 5.7V13c0 5 3.5 7.5 7.7 8.9a1 1 0 0 0 .7 0c1.6-.6 3.1-1.4 4.3-2.5" />
    <path d="m2 2 20 20" />
  </svg>
);

export const IconPanelLeft = (props: IconProps) => (
  <svg {...base} {...props}>
    <rect width="18" height="18" x="3" y="3" rx="2" />
    <path d="M9 3v18" />
  </svg>
);

export const IconChevronsLeft = (props: IconProps) => (
  <svg {...base} {...props}>
    <path d="m11 17-5-5 5-5" />
    <path d="m18 17-5-5 5-5" />
  </svg>
);

export const IconChevronsRight = (props: IconProps) => (
  <svg {...base} {...props}>
    <path d="m6 17 5-5-5-5" />
    <path d="m13 17 5-5-5-5" />
  </svg>
);

export const IconBan = (props: IconProps) => (
  <svg {...base} {...props}>
    <circle cx="12" cy="12" r="10" />
    <path d="m4.9 4.9 14.2 14.2" />
  </svg>
);
