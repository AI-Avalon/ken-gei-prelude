// Crescendo — Pricing Editor
// Spec: Chapter 7.3 Field 16 — 料金区分の動的追加/削除UI

import { useState } from 'react';
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
  { label: '全席指定', items: [{ label: 'S席', amount: 5000 }, { label: 'A席', amount: 3000 }, { label: 'B席', amount: 1000 }] },
  { label: '前売/当日', items: [{ label: '前売り', amount: 1000 }, { label: '当日', amount: 1500 }] },
];

export default function PricingEditor({ pricing, onChange, pricingNote, onNoteChange }: Props) {
  const [freeTextMode, setFreeTextMode] = useState(false);
  const [freeText, setFreeText] = useState('');

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

  const moveItem = (index: number, dir: -1 | 1) => {
    const newIdx = index + dir;
    if (newIdx < 0 || newIdx >= pricing.length) return;
    const next = [...pricing];
    [next[index], next[newIdx]] = [next[newIdx], next[index]];
    onChange(next);
  };

  const duplicateItem = (index: number) => {
    const next = [...pricing];
    next.splice(index + 1, 0, { ...pricing[index] });
    onChange(next);
  };

  const parseFreeText = () => {
    const lines = freeText.split('\n').filter(l => l.trim());
    const items: PricingItem[] = [];
    for (const line of lines) {
      const t = line.normalize('NFKC').trim();
      if (!t) continue;
      // Try "Label: 1000円" or "Label 1000" patterns
      const match = t.match(/^(.+?)\s*[：:]\s*(\d[\d,]*)\s*円?$/);
      if (match) {
        items.push({ label: match[1].trim(), amount: parseInt(match[2].replace(/,/g, ''), 10) });
        continue;
      }
      const match2 = t.match(/^(.+?)\s+(\d[\d,]*)\s*円?$/);
      if (match2) {
        items.push({ label: match2[1].trim(), amount: parseInt(match2[2].replace(/,/g, ''), 10) });
        continue;
      }
      if (/無料|free/i.test(t)) {
        items.push({ label: t.replace(/[（(].*[）)]/, '').trim() || '入場料', amount: 0 });
        continue;
      }
      // Just a label with no price
      items.push({ label: t, amount: 0, note: '要確認' });
    }
    if (items.length > 0) {
      onChange(items);
      setFreeTextMode(false);
      setFreeText('');
    }
  };

  return (
    <div className="space-y-4">
      {/* Mode toggle */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-stone-500">テンプレートから選択:</p>
        <button
          type="button"
          onClick={() => setFreeTextMode(!freeTextMode)}
          className="text-xs text-primary-600 hover:text-primary-700 font-medium"
        >
          {freeTextMode ? '← 通常入力に戻る' : 'テキストから一括入力 →'}
        </button>
      </div>

      {freeTextMode ? (
        <div className="space-y-2">
          <textarea
            className="input w-full h-32 font-mono text-sm"
            value={freeText}
            onChange={(e) => setFreeText(e.target.value)}
            placeholder={"一般: 1000円\n学生: 500円\n子供（中学生以下）: 無料\n\n※1行に1区分ずつ入力してください"}
          />
          <button
            type="button"
            onClick={parseFreeText}
            className="btn-primary text-sm"
          >
            テキストから料金を設定
          </button>
        </div>
      ) : (
        <>
          {/* Quick presets */}
          <div className="flex flex-wrap gap-2">
            {PRESETS.map((preset) => (
              <button
                key={preset.label}
                type="button"
                onClick={() => onChange(preset.items.map(i => ({ ...i })))}
                className="px-3 py-1.5 rounded-full text-xs font-medium bg-primary-50 text-primary-700 border border-primary-200 hover:bg-primary-100 transition-colors"
              >
                {preset.label}
              </button>
            ))}
          </div>

          {/* Pricing items */}
          <div className="space-y-3">
            {pricing.map((item, i) => (
              <div key={i} className="bg-stone-50 rounded-lg p-3 border border-stone-200">
                <div className="grid grid-cols-[1fr_5rem] sm:grid-cols-[1fr_6rem_1fr] gap-2 items-end">
                  <div>
                    <label className="label">区分名</label>
                    <input className="input" value={item.label}
                      onChange={(e) => updateItem(i, 'label', e.target.value)}
                      placeholder="例: 一般・学生" />
                  </div>
                  <div>
                    <label className="label">金額</label>
                    <input type="number" className="input" value={item.amount}
                      onChange={(e) => updateItem(i, 'amount', parseInt(e.target.value) || 0)}
                      min={0} step={100} />
                  </div>
                  <div className="hidden sm:block">
                    <label className="label">備考</label>
                    <input className="input" value={item.note || ''}
                      onChange={(e) => updateItem(i, 'note', e.target.value)}
                      placeholder="例: 要学生証" />
                  </div>
                </div>
                {/* Controls row */}
                <div className="flex items-center justify-between mt-2">
                  <div className="flex items-center gap-1">
                    {item.amount === 0 && (
                      <span className="text-xs text-green-600">無料</span>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <button type="button" onClick={() => moveItem(i, -1)} disabled={i === 0}
                      className="text-stone-400 hover:text-stone-600 disabled:opacity-30 text-xs p-1" title="上へ">▲</button>
                    <button type="button" onClick={() => moveItem(i, 1)} disabled={i === pricing.length - 1}
                      className="text-stone-400 hover:text-stone-600 disabled:opacity-30 text-xs p-1" title="下へ">▼</button>
                    <button type="button" onClick={() => duplicateItem(i)}
                      className="text-stone-400 hover:text-stone-600 p-1" title="複製">📋</button>
                    <button type="button" onClick={() => removeItem(i)}
                      className="text-red-500 p-1 hover:bg-red-50 rounded" title="削除">🗑</button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <button type="button" onClick={addItem}
            className="text-sm text-primary-600 hover:text-primary-700 font-medium">
            + 料金区分を追加
          </button>
        </>
      )}

      <div>
        <label className="label">料金全体備考</label>
        <textarea className="input w-full h-16" value={pricingNote} onChange={(e) => onNoteChange(e.target.value)}
          placeholder={"例: 未就学児入場不可\nチケットは○○で販売中\n全席自由・先着順"} />
      </div>
    </div>
  );
}
