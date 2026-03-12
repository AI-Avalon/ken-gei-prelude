// Ken-Gei Prelude — Program Editor
// Spec: Chapter 7.3 Field 19 — プログラムの動的追加/削除UI

import type { ProgramItem } from '../types';

interface Props {
  program: ProgramItem[];
  onChange: (program: ProgramItem[]) => void;
}

export default function ProgramEditor({ program, onChange }: Props) {
  const updateItem = (index: number, field: keyof ProgramItem, value: string) => {
    const next = [...program];
    next[index] = { ...next[index], [field]: value };
    onChange(next);
  };

  const removeItem = (index: number) => {
    onChange(program.filter((_, i) => i !== index));
  };

  const addItem = () => {
    onChange([...program, { composer: '', piece: '' }]);
  };

  return (
    <div className="space-y-3">
      {program.map((item, i) => (
        <div key={i} className="flex gap-2 items-end">
          <div className="flex-1">
            <label className="label">作曲者</label>
            <input className="input" value={item.composer}
              onChange={(e) => updateItem(i, 'composer', e.target.value)}
              placeholder="例: L.v.Beethoven" />
          </div>
          <div className="flex-1">
            <label className="label">曲名</label>
            <input className="input" value={item.piece}
              onChange={(e) => updateItem(i, 'piece', e.target.value)}
              placeholder="例: Piano Sonata No.14" />
          </div>
          <button type="button" onClick={() => removeItem(i)}
            className="text-red-500 p-2 hover:bg-red-50 rounded" title="削除">🗑</button>
        </div>
      ))}

      <button type="button" onClick={addItem}
        className="text-sm text-primary-600 hover:text-primary-700 font-medium">
        + プログラムを追加
      </button>
    </div>
  );
}
