import { Link } from 'react-router-dom';
import { CATEGORIES, DEPARTMENTS } from '../lib/constants';
import { formatDateShort, daysUntil, formatViews, formatPricing } from '../lib/utils';
import type { Concert } from '../types';

interface Props {
  concert: Concert;
  highlight?: boolean;
}

export default function ConcertCard({ concert, highlight }: Props) {
  const cat = CATEGORIES[concert.category] || CATEGORIES.other;
  const status = daysUntil(concert.date);
  const isToday = status === '本日！';
  const isEnded = status === '終了';

  return (
    <Link to={`/concerts/${concert.slug}`} className={`card block group ${highlight ? 'ring-2 ring-primary-400 shadow-lg' : ''}`}>
      {/* Thumbnail */}
      {concert.flyer_thumbnail_key ? (
        <div className="aspect-[4/3] bg-stone-100 overflow-hidden">
          <img
            src={`/api/image/${concert.flyer_thumbnail_key}`}
            alt={concert.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            loading="lazy"
          />
        </div>
      ) : (
        <div className="aspect-[4/3] bg-gradient-to-br from-navy-900 to-navy-800 flex items-center justify-center">
          <div className="text-center">
            <span className="text-primary-400/60 text-3xl font-display tracking-widest">♪</span>
            <p className="text-stone-600 text-xs mt-2">{cat.label}</p>
          </div>
        </div>
      )}

      <div className="p-4">
        {/* Date + Category */}
        <div className="flex items-center justify-between mb-2">
          <span className={`text-sm font-bold ${isToday ? 'text-accent-600' : isEnded ? 'text-stone-400' : 'text-primary-700'}`}>
            {formatDateShort(concert.date)}
          </span>
          <span className={`badge text-[10px] ${cat.color}`}>
            {cat.label}
          </span>
        </div>

        {/* Title */}
        <h3 className="font-medium text-stone-900 line-clamp-2 mb-2 group-hover:text-primary-700 transition-colors leading-snug">
          {concert.title}
        </h3>

        {/* Venue */}
        <p className="text-xs text-stone-500 mb-3">{concert.venue?.name || '会場未定'}</p>

        {/* Bottom row */}
        <div className="flex items-center justify-between text-xs border-t border-stone-100 pt-3">
          <span className={`font-medium ${
            formatPricing(concert.pricing) === '無料' ? 'text-emerald-600' : 'text-stone-700'
          }`}>
            {formatPricing(concert.pricing)}
          </span>
          <div className="flex items-center gap-3 text-stone-400">
            <span className={isToday ? 'text-accent-500 font-bold' : isEnded ? 'text-stone-400' : 'text-primary-600'}>
              {status}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}
