import { useState, useRef, useEffect, useCallback } from 'react';
import type { CATEGORIES } from '../lib/constants';

interface Props {
  categories: typeof CATEGORIES;
  selected: string[];
  onChange: (selected: string[]) => void;
  searchQuery?: string;
  onSearchChange?: (q: string) => void;
  sortBy?: string;
  onSortChange?: (s: string) => void;
}

function SearchInput({ value, onChange }: { value: string; onChange: (q: string) => void }) {
  const [local, setLocal] = useState(value);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => { setLocal(value); }, [value]);

  const handleChange = useCallback((v: string) => {
    setLocal(v);
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => onChange(v), 300);
  }, [onChange]);

  useEffect(() => () => clearTimeout(timerRef.current), []);

  return (
    <div className="relative flex-1">
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
      <input
        type="text"
        value={local}
        onChange={(e) => handleChange(e.target.value)}
        placeholder="演奏会を検索..."
        className="input pl-10 w-full"
      />
    </div>
  );
}

export default function FilterBar({
  categories, selected, onChange,
  searchQuery, onSearchChange,
  sortBy, onSortChange,
}: Props) {
  const [showAll, setShowAll] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const cats = Object.entries(categories);
  const visibleCats = showAll ? cats : cats.slice(0, 8);

  const toggle = (key: string) => {
    onChange(
      selected.includes(key)
        ? selected.filter((s) => s !== key)
        : [...selected, key],
    );
  };

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollLeft = 0;
    }
  }, [selected]);

  return (
    <div className="space-y-3">
      {/* Search + Sort row */}
      <div className="flex flex-col sm:flex-row gap-3">
        {onSearchChange && (
          <SearchInput value={searchQuery ?? ''} onChange={onSearchChange} />
        )}
        {onSortChange && (
          <select
            value={sortBy ?? 'date_asc'}
            onChange={(e) => onSortChange(e.target.value)}
            className="input w-full sm:w-48"
          >
            <option value="date_asc">日付 （近い順）</option>
            <option value="date_desc">日付（遠い順）</option>
            <option value="views">閲覧数順</option>
            <option value="created">登録日順</option>
          </select>
        )}
      </div>

      {/* Category chips */}
      <div ref={scrollRef} className="flex flex-wrap gap-2">
        <button
          onClick={() => onChange([])}
          className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
            selected.length === 0
              ? 'bg-primary-600 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          すべて
        </button>
        {visibleCats.map(([key, cat]) => {
          const isSelected = selected.includes(key);
          return (
            <button
              key={key}
              onClick={() => toggle(key)}
              className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                isSelected
                  ? `${cat.color} ring-2 ring-offset-1 ring-primary-400`
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {cat.icon} {cat.label}
            </button>
          );
        })}
        {cats.length > 8 && (
          <button
            onClick={() => setShowAll(!showAll)}
            className="px-3 py-1 rounded-full text-sm text-gray-500 hover:text-gray-700"
          >
            {showAll ? '▲ 折りたたむ' : `▼ 他${cats.length - 8}件`}
          </button>
        )}
      </div>

      {/* Active filter count */}
      {selected.length > 0 && (
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <span>{selected.length}件のフィルタ適用中</span>
          <button onClick={() => onChange([])} className="text-primary-600 hover:underline">
            クリア
          </button>
        </div>
      )}
    </div>
  );
}
