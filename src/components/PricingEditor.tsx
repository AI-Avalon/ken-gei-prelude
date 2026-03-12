// Crescendo — Pricing Editor
// Spec: Chapter 7.3 Field 16 — 料金区分の動的追加/削除UI

import type { PricingItem } from '../types';

interface Props {
  pricing: PricingItem[];
  onChange: (pricing: PricingItem[]) => void;
  pricingNote: string;
  onNoteChange: (note: string) => void;
}

const PRESETS: { label: string; items: PricingItem[] }[] = [
  { label: '無料', items: [{ label: '入場料', amount: 0 }] },
  { label: '一般/学生', items: [{ label: '一般', amount: 1000 }, { label: '学生', amount: 500 }] },
  { label: '大人/子供', items: [{ label: '大人', amount: 1000 }, { label: '子供', amount: 500 }] },
  { label: '一般/学生/子供', items: [{ label: '一般', amount: 2000 }, { label: '学生', amount: 1000 }, { label: '子供（中学生以下）', amount: 0, note: '無料' }] },
];

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
    <div className="space-y-4">
      {/* Quick presets */}
      <div>
        <p className="text-xs text-stone-500 mb-2">テンプレートから選択:</p>
        <div className="flex flex-wrap gap-2">
          {PRESETS.map((preset) => (
            <button
              key={preset.label}
              type="button"
              onClick={() => onChange(preset.items.map(i => ({ ...i })))}
              className="px-3 py-1 rounded-full text-xs font-medium bg-primary-50 text-primary-700 border border-primary-200 hover:bg-primary-100 transition-colors"
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      {/* Pricing items */}
      <div className="space-y-3">
        {pricing.map((item, i) => (
          <div key={i} className="bg-stone-50 rounded-lg p-3 border border-stone-200">
            <div className="flex gap-2 items-end">
              <div className="flex-1">
                <label className="label">区分名</label>
                <input className="input" value={item.label}
                  onChange={(e) => updateItem(i, 'label', e.target.value)}
                  placeholder="例: 一般・大人・学生" />
              </div>
              <div className="w-32">
                <label className="label">金額 (円)</label>
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
                className="text-red-500 p-2 hover:bg-red-50 rounded flex-shrink-0" title="削除">🗑</button>
            </div>
            {item.amount === 0 && (
              <p className="text-xs text-green-600 mt-1 ml-1">💚 無料</p>
            )}
          </div>
        ))}
      </div>

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
