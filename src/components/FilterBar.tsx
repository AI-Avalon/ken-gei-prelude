import { useState, useRef, useEffect, useCallback } from 'react';
import type { CATEGORIES } from '../lib/constants';

export type QuickFilterType = 'all' | 'week' | 'month' | 'free' | 'archive';

interface Props {
  categories: typeof CATEGORIES;
  selected: string[];
  onChange: (selected: string[]) => void;
  searchQuery?: string;
  onSearchChange?: (q: string) => void;
  sortBy?: string;
  onSortChange?: (s: string) => void;
  quickFilter?: QuickFilterType;
  onQuickFilterChange?: (qf: QuickFilterType) => void;
}

const SMART_KEYWORDS = ['ブラームス', 'ベートーヴェン', 'モーツァルト', 'ピアノ', '弦楽', 'チェロ', '奏楽堂', '室内楽ホール'];

function SearchInput({ value, onChange }: { value: string; onChange: (q: string) => void }) {
  const [local, setLocal] = useState(value);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => { setLocal(value); }, [value]);

  const handleChange = useCallback((v: string) => {
    setLocal(v);
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => onChange(v), 120);
  }, [onChange]);

  useEffect(() => () => clearTimeout(timerRef.current), []);

  return (
    <div className="flex-1 space-y-2">
      <div className="relative">
        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400">🔍</span>
        <input
          type="text"
          data-testid="smart-search-input"
          value={local}
          onChange={(e) => handleChange(e.target.value)}
          placeholder="タイトル・作曲家（例: ブラームス）・楽器（例: ピアノ, チェロ）・会場名で検索..."
          className="input pl-10 pr-9 w-full"
        />
        {local && (
          <button
            type="button"
            aria-label="検索をクリア"
            onClick={() => handleChange('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700 text-xs px-1.5 py-0.5 rounded"
          >
            ✕
          </button>
        )}
      </div>

      {/* Smart Search Keyword Chips */}
      <div className="flex flex-wrap items-center gap-1.5 text-xs">
        <span className="text-stone-400 text-[11px] whitespace-nowrap">キーワード:</span>
        {SMART_KEYWORDS.map((kw) => {
          const isActive = local === kw;
          return (
            <button
              key={kw}
              type="button"
              onClick={() => handleChange(isActive ? '' : kw)}
              className={`px-2 py-0.5 rounded-full text-[11px] transition-colors whitespace-nowrap shrink-0 ${
                isActive
                  ? 'bg-navy-900 text-primary-300 font-semibold'
                  : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
              }`}
            >
              {kw}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function FilterBar({
  categories,
  selected,
  onChange,
  searchQuery,
  onSearchChange,
  sortBy,
  onSortChange,
  quickFilter = 'all',
  onQuickFilterChange,
}: Props) {
  const [showAll, setShowAll] = useState(false);

  const cats = Object.entries(categories);
  const visibleCats = showAll ? cats : cats.slice(0, 10);

  const toggle = (key: string) => {
    onChange(
      selected.includes(key)
        ? selected.filter((s) => s !== key)
        : [...selected, key],
    );
  };

  const quickFilterOptions: Array<{ key: QuickFilterType; label: string }> = [
    { key: 'all', label: 'すべて' },
    { key: 'week', label: '📅 今日・今週' },
    { key: 'month', label: '🗓️ 今月' },
    { key: 'free', label: '🎫 入場無料' },
    { key: 'archive', label: '📦 過去の公演アーカイブ' },
  ];

  return (
    <div className="space-y-3 bg-white rounded-2xl p-4 border border-stone-200/70 shadow-sm">
      {/* Search + Sort row */}
      <div className="flex flex-col sm:flex-row sm:items-start gap-3">
        {onSearchChange && (
          <SearchInput value={searchQuery ?? ''} onChange={onSearchChange} />
        )}
        {onSortChange && (
          <select
            aria-label="並び替え"
            value={sortBy ?? 'date_asc'}
            onChange={(e) => onSortChange(e.target.value)}
            className="input w-full sm:w-48 shrink-0"
          >
            <option value="date_asc">日付（近い順）</option>
            <option value="date_desc">日付（新しい/遠い順）</option>
            <option value="views">閲覧数順</option>
            <option value="created">登録日順</option>
          </select>
        )}
      </div>

      {/* Quick Filter Pill Bar (URL Query Synced) */}
      {onQuickFilterChange && (
        <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-stone-100" data-testid="quick-filter-bar">
          <span className="text-[11px] font-semibold text-stone-400 mr-1 whitespace-nowrap">期間・条件:</span>
          {quickFilterOptions.map((opt) => {
            const isActive = quickFilter === opt.key;
            return (
              <button
                key={opt.key}
                type="button"
                data-testid={`quick-filter-${opt.key}`}
                onClick={() => onQuickFilterChange(opt.key)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all whitespace-nowrap shrink-0 ${
                  isActive
                    ? 'bg-navy-900 text-primary-300 shadow-sm'
                    : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                }`}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      )}

      {/* Category & Genre Chips */}
      <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-stone-100">
        <span className="text-[11px] font-semibold text-stone-400 mr-1 whitespace-nowrap">ジャンル:</span>
        <button
          type="button"
          onClick={() => onChange([])}
          className={`px-3 py-1 rounded-full text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
            selected.length === 0
              ? 'bg-primary-600 text-white shadow-sm'
              : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
          }`}
        >
          すべて
        </button>
        {visibleCats.map(([key, cat]) => {
          const isSelected = selected.includes(key);
          return (
            <button
              key={key}
              type="button"
              onClick={() => toggle(key)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                isSelected
                  ? `${cat.color} ring-2 ring-offset-1 ring-primary-400 font-bold`
                  : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
              }`}
            >
              {cat.icon} {cat.label}
            </button>
          );
        })}
        {cats.length > 10 && (
          <button
            type="button"
            onClick={() => setShowAll(!showAll)}
            className="px-2.5 py-1 rounded-full text-xs text-stone-500 hover:text-stone-800 whitespace-nowrap shrink-0"
          >
            {showAll ? '▲ 折りたたむ' : `▼ 他${cats.length - 10}件`}
          </button>
        )}
      </div>

      {/* Active filter summary */}
      {(selected.length > 0 || quickFilter !== 'all' || (searchQuery && searchQuery.trim())) && (
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-stone-500 pt-1 border-t border-stone-100">
          <span>
            絞り込み条件を適用中
            {selected.length > 0 ? `（ジャンル${selected.length}件）` : ''}
            {searchQuery ? `「${searchQuery}」` : ''}
          </span>
          <button
            type="button"
            onClick={() => {
              onChange([]);
              onQuickFilterChange?.('all');
              onSearchChange?.('');
            }}
            className="text-primary-700 hover:underline font-medium"
          >
            すべての条件をリセット
          </button>
        </div>
      )}
    </div>
  );
}
