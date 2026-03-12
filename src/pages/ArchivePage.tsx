import { useEffect, useState, useMemo, useCallback } from 'react';
import Fuse from 'fuse.js';
import { fetchConcerts } from '../lib/api';
import { CATEGORIES } from '../lib/constants';
import ConcertCard from '../components/ConcertCard';
import FilterBar from '../components/FilterBar';
import type { Concert } from '../types';

const fuseOptions = {
  keys: ['title', 'venue.name', 'category', 'description', 'program'],
  threshold: 0.3,
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
      limit: 20,
      category: selectedCategories.length === 1 ? selectedCategories[0] : undefined,
      sort: sortBy,
      search: searchQuery || undefined,
    });
    if (res.ok && res.data) {
      setConcerts((prev) => append ? [...prev, ...res.data!] : res.data!);
      setHasMore(res.data.length === 20);
    }
    setLoading(false);
  }, [selectedCategories, sortBy, searchQuery]);

  useEffect(() => {
    setPage(1);
    load(1, false);
  }, [load]);

  // Client-side fuzzy search with fuse.js
  const filtered = useMemo(() => {
    let result = concerts;
    if (selectedCategories.length > 1) {
      result = result.filter((c) => selectedCategories.includes(c.category));
    }
    if (searchQuery.trim()) {
      const fuse = new Fuse(result, fuseOptions);
      result = fuse.search(searchQuery).map((r) => r.item);
    }
    return result;
  }, [concerts, selectedCategories, searchQuery]);

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-2">アーカイブ</h1>
      <p className="text-stone-500 mb-6">過去を含むすべての演奏会を検索・閲覧</p>

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
          <div className="text-center py-16 text-stone-400">読み込み中...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-stone-400">
            <p className="text-lg mb-2">該当する演奏会がありません</p>
          </div>
        ) : (
          <>
            <p className="text-sm text-stone-500 mb-4">{filtered.length}件表示中</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filtered.map((c) => (
                <ConcertCard key={c.id} concert={c} />
              ))}
            </div>
            {hasMore && (
              <div className="text-center mt-8">
                <button
                  onClick={() => {
                    const next = page + 1;
                    setPage(next);
                    load(next, true);
                  }}
                  disabled={loading}
                  className="btn-secondary"
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
