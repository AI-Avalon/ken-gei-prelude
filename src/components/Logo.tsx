import { Link } from 'react-router-dom';
import { SITE_NAME } from '../lib/constants';

interface LogoProps {
  compact?: boolean;
  className?: string;
  showSubtitle?: boolean;
}

export default function Logo({ compact = false, className = '', showSubtitle = true }: LogoProps) {
  return (
    <Link to="/" className={`inline-flex items-center gap-3 group min-w-0 ${className}`}>
      <img
        src="/favicon.svg"
        alt=""
        width={compact ? 28 : 36}
        height={compact ? 28 : 36}
        className="rounded-full shadow-sm shadow-black/10 flex-shrink-0"
      />
      <span className="min-w-0">
        <span className={`${compact ? 'text-lg' : 'text-xl'} block text-primary-400 tracking-widest font-display font-semibold leading-none group-hover:text-primary-300 transition-colors`}>
          {SITE_NAME}
        </span>
        {showSubtitle && (
          <span className="hidden sm:block text-[10px] text-stone-500 tracking-[0.15em] uppercase leading-none mt-1">
            Aichi Univ. of the Arts
          </span>
        )}
      </span>
    </Link>
  );
}
