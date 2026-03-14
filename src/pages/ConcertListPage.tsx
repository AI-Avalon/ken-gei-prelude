import { useEffect, useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import Fuse from 'fuse.js';
import { fetchConcerts } from '../lib/api';
import { CATEGORIES } from '../lib/constants';
import ConcertCard from '../components/ConcertCard';
import FilterBar from '../components/FilterBar';
import { useIsMobile } from '../hooks/useDevice';
import type { Concert } from '../types';

const fuseOptions = {
  keys: ['title', 'venue.name', 'category', 'description', 'program'],
  threshold: 0.3,
  ignoreLocation: true,
};

export default function ConcertListPage() {
  const [searchParams] = useSearchParams();
  const [concerts, setConcerts] = useState<Concert[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const isMobile = useIsMobile();

  const [selectedCategories, setSelectedCategories] = useState<string[]>(() => {
    const c = searchParams.get('category');
    return c ? [c] : [];
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('date_asc');

  const today = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }, []);

  const loadConcerts = async (pageNum: number, append = false) => {
    setLoading(true);
    const res = await fetchConcerts({
      page: pageNum,
      limit: 20,
      category: selectedCategories.length > 0 ? selectedCategories.join(',') : undefined,
      sort: sortBy,
      search: searchQuery || undefined,
      dateFrom: today,
    });
    if (res.ok && res.data) {
      setConcerts((prev) => append ? [...prev, ...res.data!] : res.data!);
      setHasMore(res.data.length === 20);
    }
    setLoading(false);
  };

  useEffect(() => {
    setPage(1);
    loadConcerts(1, false);
  }, [selectedCategories, sortBy, searchQuery]);

  const loadMore = () => {
    const next = page + 1;
    setPage(next);
    loadConcerts(next, true);
  };

  // Client-side fuzzy search (categories handled by API now)
  const filtered = useMemo(() => {
    let result = concerts;
    if (searchQuery.trim()) {
      const fuse = new Fuse(result, fuseOptions);
      result = fuse.search(searchQuery).map((r) => r.item);
    }
    return result;
  }, [concerts, searchQuery]);

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 sm:py-8">
      <h1 className="text-2xl sm:text-3xl font-serif font-bold mb-1">演奏会一覧</h1>
      <p className="text-stone-500 text-sm mb-5">今後開催される演奏会</p>

      <FilterBar
        categories={CATEGORIES}
        selected={selectedCategories}
        onChange={setSelectedCategories}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        sortBy={sortBy}
        onSortChange={setSortBy}
      />

      <div className="mt-5 sm:mt-6">
        {loading && concerts.length === 0 ? (
          isMobile ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex bg-white rounded-xl shadow-sm border border-stone-100 overflow-hidden">
                  <div className="skeleton w-24 min-h-[96px]" style={{ borderRadius: 0 }} />
                  <div className="flex-1 p-3 space-y-2">
                    <div className="skeleton h-3 w-20" />
                    <div className="skeleton h-4 w-full" />
                    <div className="skeleton h-3 w-2/3" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="bg-white rounded-xl shadow-sm border border-stone-100 overflow-hidden">
                  <div className="skeleton h-40 w-full" style={{ borderRadius: 0 }} />
                  <div className="p-4 space-y-3">
                    <div className="skeleton h-4 w-3/4" />
                    <div className="skeleton h-3 w-1/2" />
                    <div className="skeleton h-3 w-2/3" />
                  </div>
                </div>
              ))}
            </div>
          )
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-stone-400">
            <div className="text-4xl mb-3">🔍</div>
            <p className="text-lg mb-2">該当する演奏会がありません</p>
            <p className="text-sm">
              {selectedCategories.length > 0 || searchQuery
                ? 'フィルターや検索条件を変更してみてください'
                : '近日中に演奏会が追加される予定です'}
            </p>
          </div>
        ) : (
          <>
            <p className="text-xs text-stone-400 mb-3">{filtered.length}件{hasMore ? '+' : ''}</p>
            <div className={isMobile
              ? 'space-y-3'
              : 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6'
            }>
              {filtered.map((c) => (
                <ConcertCard key={c.id} concert={c} />
              ))}
            </div>

            {hasMore && (
              <div className="text-center mt-8">
                <button
                  onClick={loadMore}
                  disabled={loading}
                  className="btn-secondary w-full sm:w-auto"
                >
                  {loading ? '読み込み中...' : 'もっと見る'}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
