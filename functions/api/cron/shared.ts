// Shared utility functions used by both scrape.ts and maintenance.ts
// Extracted to avoid code duplication

/**
 * Auto-classify concert category from title keywords
 */
export function classifyCategory(title: string): string {
  const t = title.normalize('NFKC');
  if (/定期演奏会/.test(t)) return 'teiki';
  if (/卒業演奏会|卒業/.test(t)) return 'sotsugyou';
  if (/学位審査|学位/.test(t)) return 'gakui';
  if (/修了演奏会/.test(t)) return 'sotsugyou';
  if (/オペラ|opera/i.test(t)) return 'opera';
  if (/オーケストラ|管弦楽団|orchestra/i.test(t)) return 'orchestra';
  if (/ウインドオーケストラ|吹奏楽|ウィンド/i.test(t)) return 'wind';
  if (/リサイタル|recital/i.test(t)) return 'recital';
  if (/室内楽|チェンバー|chamber/i.test(t)) return 'chamber';
  if (/アンサンブル|ensemble/i.test(t)) return 'ensemble';
  if (/弦楽合奏|弦楽/.test(t)) return 'chamber';
  if (/声楽|vocal/i.test(t)) return 'vocal';
  if (/ピアノ|piano/i.test(t)) return 'piano';
  if (/作曲作品演奏会|作曲/.test(t)) return 'ensemble';
  if (/ドクトラル|博士/.test(t)) return 'recital';
  return 'daigaku';
}

/**
 * Parse pricing text into structured pricing items.
 * @param text - Raw pricing text from the university site
 * @param defaultForEmpty - What to return when text is empty.
 *   scrape.ts uses [{ label: '入場料', amount: 0 }] (default pricing for new scrapes).
 *   maintenance.ts uses [] (no pricing found).
 */
export function parsePricingFromText(
  text: string,
  defaultForEmpty: Array<{ label: string; amount: number }> = []
): Array<{ label: string; amount: number; note?: string }> {
  const t = text.normalize('NFKC').trim();
  if (!t) return defaultForEmpty;
  // Check for explicitly free (must be at the start or the whole text)
  if (/^(無料|入場無料|入場料無料|free)([（(、,\s]|$)/i.test(t)) {
    return [{ label: '入場料', amount: 0 }];
  }
  // Handle "全席自由・入場無料" pattern where free follows seat info
  if (/(?:全席[自指][由定]|自由席)\s*[・,、]\s*(?:無料|入場無料)/i.test(t)) {
    return [{ label: '入場料', amount: 0 }];
  }
  const items: Array<{ label: string; amount: number; note?: string }> = [];
  // Process line by line to avoid cross-segment matching
  const lines = t.split(/[\n\r]+/);
  for (const line of lines) {
    // Try 'label：price円' format (with colon separator)
    const colonMatch = line.match(/^(.+?)\s*[:：]\s*(\d[\d,]*)\s*円/);
    if (colonMatch) {
      let label = colonMatch[1].trim();
      if (/^[（(].*[）)]$/.test(label)) label = label.slice(1, -1);
      const amount = parseInt(colonMatch[2].replace(/,/g, ''), 10);
      if (amount <= 100000 && label.length >= 1 && label.length <= 30 && !/^\d+月|^\d+時|^※|^【/.test(label)) {
        items.push({ label, amount });
        continue;
      }
    }
    // Try 'price円（label）' format (price before label)
    const priceFirstPattern = /(\d[\d,]*)\s*円\s*[（(]([^）)]+)[）)]/g;
    let pf;
    let priceFirstMatched = false;
    while ((pf = priceFirstPattern.exec(line)) !== null) {
      const amount = parseInt(pf[1].replace(/,/g, ''), 10);
      const label = pf[2].trim();
      if (amount <= 100000 && label.length >= 1 && label.length <= 30) {
        items.push({ label, amount });
        priceFirstMatched = true;
      }
    }
    if (priceFirstMatched) continue;
    // Try inline patterns: 'label price円' or 'labelN,NNN円'
    const inlinePattern = /([^\d\n]{2,}?)\s*(\d[\d,]*)\s*円/g;
    let m;
    while ((m = inlinePattern.exec(line)) !== null) {
      let label = m[1].trim().replace(/^[（(]/, '').replace(/[）)：:]$/, '').trim();
      if (/^\d+月|^\d+時|^※|^【/.test(label)) continue;
      // Strip any embedded price from label (e.g. "メイト1,350円" residue)
      label = label.replace(/\d[\d,]*\s*円/g, '').trim();
      if (label.length < 1 || label.length > 30) continue;
      const amount = parseInt(m[2].replace(/,/g, ''), 10);
      if (amount > 100000) continue;
      items.push({ label, amount });
    }
  }
  if (items.length > 0) return items;
  // Fallback: single naked price
  const singleMatch = t.match(/(\d[\d,]*)\s*円/);
  if (singleMatch) {
    return [{ label: '入場料', amount: parseInt(singleMatch[1].replace(/,/g, ''), 10) }];
  }
  return defaultForEmpty;
}
