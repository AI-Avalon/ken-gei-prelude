import { useEffect, useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
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

export default function ConcertListPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [concerts, setConcerts] = useState<Concert[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);

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
      category: selectedCategories.length === 1 ? selectedCategories[0] : undefined,
      sort: sortBy,
      search: searchQuery || undefined,
      dateFrom: today,
    });
    if (res.ok && res.data) {
      setConcerts((prev) => append ? [...prev, ...res.data!] : res.data!);
      setTotal(res.total ?? res.data.length);
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

  // Client-side multi-category filter + fuzzy search
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
      <h1 className="text-3xl font-bold mb-2">演奏会一覧</h1>
      <p className="text-gray-500 mb-6">今後開催される演奏会</p>

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
          <div className="text-center py-16 text-gray-400">読み込み中...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <p className="text-lg mb-2">該当する演奏会がありません</p>
            <p className="text-sm">フィルターを変更してみてください</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filtered.map((c) => (
                <ConcertCard key={c.id} concert={c} />
              ))}
            </div>

            {hasMore && (
              <div className="text-center mt-8">
                <button
                  onClick={loadMore}
                  disabled={loading}
                  className="btn-secondary"
                >
                  {loading ? '読み込み中...' : 'もっと見る（20件ずつ）'}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
