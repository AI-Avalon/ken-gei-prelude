// Ken-Gei Prelude — Performer Editor
// Spec: Chapter 7.3 Field 20 — 出演者の動的追加/削除UI

import type { Performer } from '../types';

interface Props {
  performers: Performer[];
  onChange: (performers: Performer[]) => void;
}

export default function PerformerEditor({ performers, onChange }: Props) {
  const updateItem = (index: number, field: keyof Performer, value: string) => {
    const next = [...performers];
    next[index] = { ...next[index], [field]: value };
    onChange(next);
  };

  const removeItem = (index: number) => {
    onChange(performers.filter((_, i) => i !== index));
  };

  const addItem = () => {
    onChange([...performers, { name: '' }]);
  };

  return (
    <div className="space-y-3">
      {performers.map((item, i) => (
        <div key={i} className="flex flex-wrap sm:flex-nowrap gap-2 items-end">
          <div className="flex-1 min-w-[120px]">
            <label className="label">名前</label>
            <input className="input" value={item.name}
              onChange={(e) => updateItem(i, 'name', e.target.value)}
              placeholder="例: 山田太郎" />
          </div>
          <div className="w-full sm:w-40">
            <label className="label">学年</label>
            <input className="input" value={item.year || ''}
              onChange={(e) => updateItem(i, 'year', e.target.value)}
              placeholder="例: 大学4年" />
          </div>
          <div className="w-full sm:w-32">
            <label className="label">楽器</label>
            <input className="input" value={item.instrument || ''}
              onChange={(e) => updateItem(i, 'instrument', e.target.value)}
              placeholder="例: ヴァイオリン" />
          </div>
          <button type="button" onClick={() => removeItem(i)}
            className="text-red-500 p-2 hover:bg-red-50 rounded" title="削除">🗑</button>
        </div>
      ))}

      <button type="button" onClick={addItem}
        className="text-sm text-primary-600 hover:text-primary-700 font-medium">
        + 出演者を追加
      </button>
    </div>
  );
}
