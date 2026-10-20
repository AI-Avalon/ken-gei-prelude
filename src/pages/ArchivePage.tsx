import { useEffect, useState, useMemo, useCallback } from 'react';
import Fuse from 'fuse.js';
import { fetchConcerts } from '../lib/api';
import { CATEGORIES } from '../lib/constants';
import ConcertCard from '../components/ConcertCard';
import FilterBar from '../components/FilterBar';
import type { Concert } from '../types';

const fuseOptions = {
  keys: [
    'title',
    'subtitle',
    'venue.name',
    'venue.address',
    'category',
    'description',
    'program.composer',
    'program.piece',
    'performers.name',
    'performers.instrument',
    'instruments',
    'tags',
    'departments',
  ],
  threshold: 0.32,
  ignoreLocation: true,
};

export default function ArchivePage() {
  const [concerts, setConcerts] = useState<Concert[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('date_desc');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);

  const load = useCallback(async (pageNum: number, append = false) => {
    setLoading(true);
    const res = await fetchConcerts({
      page: pageNum,
      limit: 24,
      category: selectedCategories.length > 0 ? selectedCategories.join(',') : undefined,
      sort: sortBy,
      search: searchQuery || undefined,
    });
    if (res.ok && res.data) {
      setConcerts((prev) => (append ? [...prev, ...res.data!] : res.data!));
      setHasMore(res.data.length === 24);
    }
    setLoading(false);
  }, [selectedCategories, sortBy, searchQuery]);

  useEffect(() => {
    setPage(1);
    load(1, false);
  }, [load]);

  const filtered = useMemo(() => {
    let result = concerts;
    if (selectedCategories.length > 0) {
      result = result.filter((c) => selectedCategories.includes(c.category));
    }
    if (searchQuery.trim()) {
      const fuse = new Fuse(result, fuseOptions);
      result = fuse.search(searchQuery.trim()).map((r) => r.item);
    }
    return result;
  }, [concerts, selectedCategories, searchQuery]);

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 sm:py-8">
      <h1 className="fluid-page-title font-serif font-bold mb-1 text-stone-900">過去の公演アーカイブ・全公演検索</h1>
      <p className="text-stone-500 text-xs sm:text-sm mb-5">
        終演したアーカイブ公演を含むすべての演奏会を作曲家・楽器・会場名で検索できます
      </p>

      <FilterBar
        categories={CATEGORIES}
        selected={selectedCategories}
        onChange={setSelectedCategories}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        sortBy={sortBy}
        onSortChange={setSortBy}
      />

      <div className="mt-6">
        {loading && concerts.length === 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="bg-white rounded-xl shadow-sm border border-stone-100 overflow-hidden">
                <div className="skeleton h-40 w-full" />
                <div className="p-4 space-y-3">
                  <div className="skeleton h-4 w-3/4" />
                  <div className="skeleton h-3 w-1/2" />
                  <div className="skeleton h-3 w-2/3" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl border border-stone-200/60 text-stone-400">
            <div className="text-4xl mb-3">🔍</div>
            <p className="text-lg mb-2 font-serif text-stone-700">該当する演奏会がありません</p>
          </div>
        ) : (
          <>
            <p className="text-xs text-stone-500 mb-3 tabular-nums">{filtered.length}件表示中</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {filtered.map((c) => (
                <ConcertCard key={c.id} concert={c} />
              ))}
            </div>
            {hasMore && (
              <div className="text-center mt-8">
                <button
                  type="button"
                  onClick={() => {
                    const next = page + 1;
                    setPage(next);
                    load(next, true);
                  }}
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
