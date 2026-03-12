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
      {/* Thumbnail if available */}
      {concert.flyer_thumbnail_key && (
        <div className="aspect-[4/3] bg-gray-100 overflow-hidden">
          <img
            src={`/api/image/${concert.flyer_thumbnail_key}`}
            alt={concert.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
          />
        </div>
      )}

      <div className="p-4">
        {/* Date */}
        <div className="flex items-center justify-between mb-1">
          <span className={`text-lg font-bold ${isToday ? 'text-red-600' : isEnded ? 'text-gray-400' : 'text-primary-700'}`}>
            {formatDateShort(concert.date)}
          </span>
          <span className={`badge ${cat.color}`}>
            {cat.icon} {cat.label}
          </span>
        </div>

        {/* Venue */}
        <p className="text-sm text-gray-500 mb-2">{concert.venue?.name || '会場未定'}</p>

        {/* Title */}
        <h3 className="font-medium text-gray-900 line-clamp-2 mb-3 group-hover:text-primary-600 transition-colors">
          {concert.title}
        </h3>

        {/* Departments */}
        <div className="flex items-center gap-1 mb-2 flex-wrap">
          {concert.departments?.slice(0, 2).map((dept) => {
            const d = DEPARTMENTS[dept];
            return d ? (
              <span key={dept} className="text-xs text-gray-500">
                {d.icon} {d.label}
              </span>
            ) : null;
          })}
        </div>

        {/* Bottom row */}
        <div className="flex items-center justify-between text-sm">
          <span className={`font-medium ${
            formatPricing(concert.pricing) === '無料' ? 'text-green-600' : 'text-gray-700'
          }`}>
            {formatPricing(concert.pricing)}
          </span>
          <div className="flex items-center gap-3 text-xs text-gray-400">
            <span className={isToday ? 'text-red-500 font-bold' : isEnded ? 'text-gray-400' : 'text-primary-600'}>
              {status}
            </span>
            <span>👁 {formatViews(concert.views)}</span>
          </div>
        </div>
      </div>
    </Link>
  );
}
