// Ken-Gei Prelude — Pricing Editor
// Spec: Chapter 7.3 Field 16 — 料金区分の動的追加/削除UI

import type { PricingItem } from '../types';

interface Props {
  pricing: PricingItem[];
  onChange: (pricing: PricingItem[]) => void;
  pricingNote: string;
  onNoteChange: (note: string) => void;
}

export default function PricingEditor({ pricing, onChange, pricingNote, onNoteChange }: Props) {
  const updateItem = (index: number, field: keyof PricingItem, value: string | number) => {
    const next = [...pricing];
    next[index] = { ...next[index], [field]: value };
    onChange(next);
  };

  const removeItem = (index: number) => {
    onChange(pricing.filter((_, i) => i !== index));
  };

  const addItem = () => {
    onChange([...pricing, { label: '', amount: 0 }]);
  };

  return (
    <div className="space-y-3">
      {pricing.map((item, i) => (
        <div key={i} className="flex gap-2 items-end">
          <div className="flex-1">
            <label className="label">区分名</label>
            <input className="input" value={item.label}
              onChange={(e) => updateItem(i, 'label', e.target.value)}
              placeholder="例: 一般" />
          </div>
          <div className="w-32">
            <label className="label">金額</label>
            <input type="number" className="input" value={item.amount}
              onChange={(e) => updateItem(i, 'amount', parseInt(e.target.value) || 0)}
              min={0} />
          </div>
          <div className="flex-1">
            <label className="label">備考</label>
            <input className="input" value={item.note || ''}
              onChange={(e) => updateItem(i, 'note', e.target.value)}
              placeholder="例: 要学生証" />
          </div>
          <button type="button" onClick={() => removeItem(i)}
            className="text-red-500 p-2 hover:bg-red-50 rounded" title="削除">🗑</button>
        </div>
      ))}

      <button type="button" onClick={addItem}
        className="text-sm text-primary-600 hover:text-primary-700 font-medium">
        + 料金区分を追加
      </button>

      <div>
        <label className="label">料金全体備考</label>
        <input className="input" value={pricingNote} onChange={(e) => onNoteChange(e.target.value)}
          placeholder="例: 未就学児入場不可" />
      </div>
    </div>
  );
}
