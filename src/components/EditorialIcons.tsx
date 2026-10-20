import type { SVGProps } from 'react';

export type IconProps = SVGProps<SVGSVGElement> & {
  strokeWidth?: number | string;
};

function BaseSvg({
  children,
  strokeWidth = 1.5,
  className = 'w-4 h-4',
  ...rest
}: IconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
      {...rest}
    >
      {children}
    </svg>
  );
}

export function Search(props: IconProps) {
  return (
    <BaseSvg {...props}>
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" />
    </BaseSvg>
  );
}

export function Bookmark(props: IconProps) {
  return (
    <BaseSvg {...props}>
      <path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z" />
    </BaseSvg>
  );
}

export function Volume2(props: IconProps) {
  return (
    <BaseSvg {...props}>
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
      <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
      <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
    </BaseSvg>
  );
}

export function Square(props: IconProps) {
  return (
    <BaseSvg {...props}>
      <rect width="18" height="18" x="3" y="3" rx="2" />
    </BaseSvg>
  );
}

export function Play(props: IconProps) {
  return (
    <BaseSvg {...props}>
      <polygon points="6 3 20 12 6 21 6 3" />
    </BaseSvg>
  );
}

export function Share2(props: IconProps) {
  return (
    <BaseSvg {...props}>
      <circle cx="18" cy="5" r="3" />
      <circle cx="6" cy="12" r="3" />
      <circle cx="18" cy="19" r="3" />
      <line x1="8.59" x2="15.42" y1="13.51" y2="17.49" />
      <line x1="15.41" x2="8.59" y1="6.51" y2="10.49" />
    </BaseSvg>
  );
}

export function Check(props: IconProps) {
  return (
    <BaseSvg {...props}>
      <path d="M20 6 9 17l-5-5" />
    </BaseSvg>
  );
}

export function X(props: IconProps) {
  return (
    <BaseSvg {...props}>
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </BaseSvg>
  );
}

export function ArrowRight(props: IconProps) {
  return (
    <BaseSvg {...props}>
      <path d="M5 12h14" />
      <path d="m12 5 7 7-7 7" />
    </BaseSvg>
  );
}

export function SlidersHorizontal(props: IconProps) {
  return (
    <BaseSvg {...props}>
      <line x1="21" x2="14" y1="4" y2="4" />
      <line x1="10" x2="3" y1="4" y2="4" />
      <line x1="21" x2="12" y1="12" y2="12" />
      <line x1="8" x2="3" y1="12" y2="12" />
      <line x1="21" x2="16" y1="20" y2="20" />
      <line x1="12" x2="3" y1="20" y2="20" />
      <line x1="14" x2="14" y1="2" y2="6" />
      <line x1="8" x2="8" y1="10" y2="14" />
      <line x1="16" x2="16" y1="18" y2="22" />
    </BaseSvg>
  );
}

export const Sliders = SlidersHorizontal;

export function BookOpen(props: IconProps) {
  return (
    <BaseSvg {...props}>
      <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
      <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
    </BaseSvg>
  );
}

export function Compass(props: IconProps) {
  return (
    <BaseSvg {...props}>
      <circle cx="12" cy="12" r="10" />
      <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
    </BaseSvg>
  );
}

export function Plus(props: IconProps) {
  return (
    <BaseSvg {...props}>
      <path d="M5 12h14" />
      <path d="M12 5v14" />
    </BaseSvg>
  );
}

export function PlusCircle(props: IconProps) {
  return (
    <BaseSvg {...props}>
      <circle cx="12" cy="12" r="10" />
      <path d="M8 12h8" />
      <path d="M12 8v8" />
    </BaseSvg>
  );
}

export function Trash2(props: IconProps) {
  return (
    <BaseSvg {...props}>
      <path d="M3 6h18" />
      <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
      <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
      <line x1="10" x2="10" y1="11" y2="17" />
      <line x1="14" x2="14" y1="11" y2="17" />
    </BaseSvg>
  );
}

export function Copy(props: IconProps) {
  return (
    <BaseSvg {...props}>
      <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
      <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
    </BaseSvg>
  );
}

export function Printer(props: IconProps) {
  return (
    <BaseSvg {...props}>
      <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
      <path d="M6 9V3a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v6" />
      <rect x="6" y="14" width="12" height="8" rx="1" />
    </BaseSvg>
  );
}

export function Clock(props: IconProps) {
  return (
    <BaseSvg {...props}>
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </BaseSvg>
  );
}

export function FileSpreadsheet(props: IconProps) {
  return (
    <BaseSvg {...props}>
      <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
      <path d="M14 2v4a2 2 0 0 0 2 2h4" />
      <path d="M8 13h2" />
      <path d="M14 13h2" />
      <path d="M8 17h2" />
      <path d="M14 17h2" />
    </BaseSvg>
  );
}

export function FileText(props: IconProps) {
  return (
    <BaseSvg {...props}>
      <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
      <path d="M14 2v4a2 2 0 0 0 2 2h4" />
      <path d="M10 9H8" />
      <path d="M16 13H8" />
      <path d="M16 17H8" />
    </BaseSvg>
  );
}

export function CheckSquare(props: IconProps) {
  return (
    <BaseSvg {...props}>
      <rect width="18" height="18" x="3" y="3" rx="2" />
      <path d="m9 12 2 2 4-4" />
    </BaseSvg>
  );
}

export function RotateCcw(props: IconProps) {
  return (
    <BaseSvg {...props}>
      <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
      <path d="M3 3v5h5" />
    </BaseSvg>
  );
}

export function Sparkles(props: IconProps) {
  return (
    <BaseSvg {...props}>
      <path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3Z" />
    </BaseSvg>
  );
}

export function MapPin(props: IconProps) {
  return (
    <BaseSvg {...props}>
      <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
      <circle cx="12" cy="10" r="3" />
    </BaseSvg>
  );
}

export function AlertCircle(props: IconProps) {
  return (
    <BaseSvg {...props}>
      <circle cx="12" cy="12" r="10" />
      <line x1="12" x2="12" y1="8" y2="12" />
      <line x1="12" x2="12.01" y1="16" y2="16" />
    </BaseSvg>
  );
}

export function Eye(props: IconProps) {
  return (
    <BaseSvg {...props}>
      <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </BaseSvg>
  );
}

export function Lock(props: IconProps) {
  return (
    <BaseSvg {...props}>
      <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </BaseSvg>
  );
}

export function User(props: IconProps) {
  return (
    <BaseSvg {...props}>
      <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </BaseSvg>
  );
}

export function ChevronDown(props: IconProps) {
  return (
    <BaseSvg {...props}>
      <path d="m6 9 6 6 6-6" />
    </BaseSvg>
  );
}

export function Wrench(props: IconProps) {
  return (
    <BaseSvg {...props}>
      <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
    </BaseSvg>
  );
}

export function Mail(props: IconProps) {
  return (
    <BaseSvg {...props}>
      <rect width="20" height="16" x="2" y="4" rx="2" />
      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
    </BaseSvg>
  );
}

export function Home(props: IconProps) {
  return (
    <BaseSvg {...props}>
      <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </BaseSvg>
  );
}

export function Music(props: IconProps) {
  return (
    <BaseSvg {...props}>
      <path d="M9 18V5l12-2v13" />
      <circle cx="6" cy="18" r="3" />
      <circle cx="18" cy="16" r="3" />
    </BaseSvg>
  );
}

export function Menu(props: IconProps) {
  return (
    <BaseSvg {...props}>
      <line x1="4" x2="20" y1="12" y2="12" />
      <line x1="4" x2="20" y1="6" y2="6" />
      <line x1="4" x2="20" y1="18" y2="18" />
    </BaseSvg>
  );
}

export function Calendar(props: IconProps) {
  return (
    <BaseSvg {...props}>
      <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
      <line x1="16" x2="16" y1="2" y2="6" />
      <line x1="8" x2="8" y1="2" y2="6" />
      <line x1="3" x2="21" y1="10" y2="10" />
    </BaseSvg>
  );
}

export function HelpCircle(props: IconProps) {
  return (
    <BaseSvg {...props}>
      <circle cx="12" cy="12" r="10" />
      <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
      <path d="M12 17h.01" />
    </BaseSvg>
  );
}

export function Archive(props: IconProps) {
  return (
    <BaseSvg {...props}>
      <rect width="20" height="5" x="2" y="3" rx="1" />
      <path d="M4 8v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8" />
      <path d="M10 12h4" />
    </BaseSvg>
  );
}

export function Info(props: IconProps) {
  return (
    <BaseSvg {...props}>
      <circle cx="12" cy="12" r="10" />
      <path d="M12 16v-4" />
      <path d="M12 8h.01" />
    </BaseSvg>
  );
}
