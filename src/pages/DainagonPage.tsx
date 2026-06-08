import photos from '../data/dainagonPhotos.json';

type DainagonPhoto = {
  src: string;
  width: number;
  height: number;
  size: number;
  hash: string;
};

export default function DainagonPage() {
  const items = photos as DainagonPhoto[];

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100">
      <div className="max-w-5xl mx-auto px-4 py-10 sm:py-14">
        <div className="mb-8">
          <p className="text-xs uppercase tracking-[0.35em] text-primary-300">after hours</p>
          <h1 className="mt-2 text-3xl sm:text-5xl font-serif font-bold">backstage</h1>
          <p className="mt-3 text-sm text-stone-400">
            ここは知っている人だけが開ける小さな余白です。
          </p>
        </div>

        {items.length === 0 ? (
          <div className="rounded-xl border border-white/10 bg-white/5 p-6 text-sm text-stone-300">
            まだ何も置かれていません。
          </div>
        ) : (
          <div className="columns-1 sm:columns-2 lg:columns-3 gap-4 [column-fill:_balance]">
            {items.map((photo) => (
              <a
                key={photo.hash}
                href={photo.src}
                target="_blank"
                rel="noopener noreferrer"
                className="mb-4 block break-inside-avoid overflow-hidden rounded-lg border border-white/10 bg-white/5"
              >
                <img
                  src={photo.src}
                  alt="after hours"
                  width={photo.width}
                  height={photo.height}
                  loading="lazy"
                  className="w-full h-auto object-cover transition duration-300 hover:scale-[1.02]"
                />
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
