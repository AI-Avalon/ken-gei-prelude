#!/usr/bin/env node
// Local scrape & register script
// Phase 1: Fetches all events from Aichi University of Arts and registers them via the public API
// Phase 2: Fetches detail pages and updates events with descriptions, pricing, venue, time

const BASE_URL = 'https://www.aichi-fam-u.ac.jp/event/music/';
const API_URL = 'https://ken-gei-prelude.pages.dev/api/concerts';
const EDIT_PASSWORD = 'auto_scrape_2026';

function classifyCategory(title) {
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

function cleanVenueName(raw) {
  if (!raw) return '愛知県立芸術大学';
  let v = raw.normalize('NFKC').trim();
  v = v.replace(/[（(【][^）)】]*(?:円|入場料|無料|チケット|料金|予約)[^）)】]*[）)】]/g, '');
  v = v
    .replace(/(?:入場料|料金|チケット|全席[自指][由定]|予約|前売|当日券)[^\n]*/g, '')
    .replace(/\d+[\d,]*\s*円[^\n]*/g, '')
    .replace(/無料[^\n]*/g, '')
    .replace(/\s*TEL[:：]?\s*[\d-]+/g, '')
    .replace(/\s*(?:開場|開演)\s*\d{1,2}[:：]\d{2}[^\n]*/g, '')
    .trim();
  v = v.split(/[。\n]/)[0].trim();
  return v || '愛知県立芸術大学';
}

function parsePricingFromText(text) {
  const t = text.normalize('NFKC').trim();
  if (!t) return [];
  if (/^(無料|入場無料|入場料無料|free)([（(、,\s]|$)/i.test(t)) {
    return [{ label: '入場料', amount: 0 }];
  }
  if (/(?:全席[自指][由定]|自由席)\s*[・,、]\s*(?:無料|入場無料)/i.test(t)) {
    return [{ label: '入場料', amount: 0 }];
  }
  const items = [];
  const lines = t.split(/[\n\r]+/);
  for (const line of lines) {
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
    const priceFirstPattern = /(\d[\d,]*)\s*円\s*[（(]([^）)]+)[）)]/g;
    let pf;
    let priceFirstMatched = false;
    while ((pf = priceFirstPattern.exec(line)) !== null) {
      const amount = parseInt(pf[1].replace(/,/g, ''), 10);
      const parenContent = pf[2].trim();
      const innerPriceMatch = parenContent.match(/^(.+?)\s*(\d[\d,]*)\s*円$/);
      if (innerPriceMatch) {
        const innerLabel = innerPriceMatch[1].trim();
        const innerAmount = parseInt(innerPriceMatch[2].replace(/,/g, ''), 10);
        if (innerAmount <= 100000 && innerLabel.length >= 1 && innerLabel.length <= 30) {
          items.push({ label: innerLabel, amount: innerAmount });
        }
        const outerStart = pf.index;
        const beforeOuter = line.slice(0, outerStart);
        const outerLabelMatch = beforeOuter.match(/([^\d\s][^\d]*?)\s*$/);
        if (outerLabelMatch) {
          let outerLabel = outerLabelMatch[1].trim().replace(/^[（(]/, '').replace(/[）)：:]$/, '').trim();
          outerLabel = outerLabel.replace(/^全席[自指][由定]\s*/, '').trim();
          if (outerLabel.length >= 1 && outerLabel.length <= 30 && amount <= 100000) {
            items.push({ label: outerLabel, amount });
          }
        } else if (amount <= 100000) {
          items.push({ label: '入場料', amount });
        }
        priceFirstMatched = true;
      } else {
        const label = parenContent;
        if (amount <= 100000 && label.length >= 1 && label.length <= 30) {
          items.push({ label, amount });
          priceFirstMatched = true;
        }
      }
    }
    if (priceFirstMatched) continue;
    const inlinePattern = /([^\d\n]{2,}?)\s*(\d[\d,]*)\s*円/g;
    let m;
    while ((m = inlinePattern.exec(line)) !== null) {
      let label = m[1].trim().replace(/^[（(]/, '').replace(/[）)：:]$/, '').trim();
      if (/^\d+月|^\d+時|^※|^【/.test(label)) continue;
      label = label.replace(/\d[\d,]*\s*円/g, '').trim();
      if (label.length < 1 || label.length > 30) continue;
      const amount = parseInt(m[2].replace(/,/g, ''), 10);
      if (amount > 100000) continue;
      items.push({ label, amount });
    }
  }
  if (items.length > 0) return items;
  const singleMatch = t.match(/(\d[\d,]*)\s*円/);
  if (singleMatch) {
    return [{ label: '入場料', amount: parseInt(singleMatch[1].replace(/,/g, ''), 10) }];
  }
  return [];
}

function parseEventList(html, pageUrl) {
  const events = [];
  const entryPattern = /<a\s+href="(\/event\/\d+\.html)"\s+class="eventList_item event">([\s\S]*?)<\/a>/gi;
  let match;
  while ((match = entryPattern.exec(html)) !== null) {
    const eventPath = match[1];
    const block = match[2];
    const detailUrl = new URL(eventPath, pageUrl).href;
    const dateMatch = block.match(/<p\s+class="event_date">([^<]*)<\/p>/);
    if (!dateMatch) continue;
    const dateParsed = dateMatch[1].trim().match(/(\d{4})年(\d{1,2})月(\d{1,2})日/);
    if (!dateParsed) continue;
    const date = `${dateParsed[1]}-${dateParsed[2].padStart(2, '0')}-${dateParsed[3].padStart(2, '0')}`;
    const titleMatch = block.match(/<p\s+class="event_title">([^<]*)<\/p>/);
    const title = titleMatch ? titleMatch[1].trim().replace(/\s+/g, ' ') : '';
    if (!title) continue;
    const infoMatch = block.match(/<p\s+class="event_info">([^<]*)<\/p>/);
    const venue = cleanVenueName(infoMatch ? infoMatch[1] : '');
    // Extract listing image
    const imgMatch = block.match(/<img\s+src="([^"]+)"/);
    const imageUrl = imgMatch ? new URL(imgMatch[1], pageUrl).href : null;
    if (events.some(e => e.date === date && e.title === title)) continue;
    events.push({ title, date, venue, detailUrl, imageUrl, category: classifyCategory(title) });
  }
  return events;
}

function parseDetailPage(html) {
  const extra = {};

  // Extract detail div
  const detailMatch = html.match(/<div class="detail">([\s\S]*?)<\/div>\s*<\/div>\s*<\/div>/);
  const detailHtml = detailMatch ? detailMatch[1] : html;

  // Extract sections by <h2> headings
  const sections = {};
  const sectionPattern = /<h2>([^<]+)<\/h2>([\s\S]*?)(?=<h2>|<\/div>\s*<\/div>|$)/gi;
  let sMatch;
  while ((sMatch = sectionPattern.exec(detailHtml)) !== null) {
    const heading = sMatch[1].trim();
    const body = sMatch[2]
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
    sections[heading] = body;
  }

  // Parse time from 日時 section
  const timeSection = sections['日時'] || '';
  const startMatch = timeSection.match(/(\d{1,2})[：:](\d{2})\s*開演/);
  if (startMatch) {
    extra.timeStart = `${startMatch[1].padStart(2, '0')}:${startMatch[2]}`;
  }
  const openMatch = timeSection.match(/(\d{1,2})[：:](\d{2})\s*開場/);
  if (openMatch) {
    extra.timeOpen = `${openMatch[1].padStart(2, '0')}:${openMatch[2]}`;
  }

  // Parse venue from 場所 section
  if (sections['場所']) {
    extra.venue = cleanVenueName(sections['場所']);
  }

  // Build description from 概要 + performers + program
  const descParts = [];
  if (sections['概要']) descParts.push(sections['概要']);

  const performerMatch = detailHtml.match(/<h4>出演<\/h4>([\s\S]*?)(?=<h[2-4]>|$)/);
  if (performerMatch) {
    const performers = performerMatch[1].replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, '').trim();
    if (performers) descParts.push('【出演】\n' + performers);
  }

  const programMatch = detailHtml.match(/<h4>プログラム<\/h4>([\s\S]*?)(?=<h[2-4]>|$)/);
  if (programMatch) {
    const program = programMatch[1].replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, '').trim();
    if (program) descParts.push('【プログラム】\n' + program);
  }

  if (descParts.length > 0) {
    extra.description = descParts.join('\n\n').slice(0, 2000);
  }

  // Parse pricing
  const pricingSection = sections['入場料'] || sections['料金'] || sections['チケット'] || '';
  if (pricingSection) {
    const pricing = parsePricingFromText(pricingSection);
    if (pricing.length > 0) {
      extra.pricing = pricing;
    }
  }

  // Extract PDF flyer URLs from detail page
  const pdfMatches = [...detailHtml.matchAll(/href="([^"]*\.pdf)"/g)];
  const seenPdfs = new Set();
  const pdfUrls = [];
  for (const pm of pdfMatches) {
    if (!seenPdfs.has(pm[1])) {
      seenPdfs.add(pm[1]);
      pdfUrls.push(pm[1]);
    }
  }
  if (pdfUrls.length > 0) {
    extra.pdfUrls = pdfUrls;
  }

  return extra;
}

async function main() {
  const args = process.argv.slice(2);
  const skipPhase1 = args.includes('--phase2-only') || args.includes('--fix-pricing') || args.includes('--flyers-only');
  const fixPricingOnly = args.includes('--fix-pricing');
  const flyersOnly = args.includes('--flyers-only');

  console.log('=== Crescendo Local Scraper ===\n');

  // Step 1: Scrape all pages to get event list
  const allEvents = [];
  for (let page = 1; page <= 20; page++) {
    const url = page === 1 ? BASE_URL : `${BASE_URL}index_${page}.html`;
    process.stdout.write(`Page ${page}: `);
    try {
      const res = await fetch(url);
      if (!res.ok) {
        if (res.status === 404) {
          console.log('404 — last page reached');
          break;
        }
        console.log(`HTTP ${res.status} — skipping`);
        continue;
      }
      const html = await res.text();
      const events = parseEventList(html, url);
      console.log(`${events.length} events found`);
      allEvents.push(...events);
    } catch (err) {
      console.log(`Error: ${err.message}`);
      continue;
    }
  }

  console.log(`\nTotal: ${allEvents.length} events scraped\n`);

  // Phase 1: Register basic info (skip if --phase2-only)
  if (!skipPhase1) {
    console.log('--- Phase 1: Register basic events ---\n');
    let registered = 0;
    let duplicates = 0;
    let errors = 0;

    for (let i = 0; i < allEvents.length; i++) {
      const ev = allEvents[i];
      process.stdout.write(`[${i + 1}/${allEvents.length}] ${ev.title.slice(0, 30)}... `);

      try {
        const res = await fetch(API_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: ev.title,
            date: ev.date,
            time_start: '14:00',
            venue: { name: ev.venue },
            category: ev.category,
            source: 'auto_scrape',
            source_url: ev.detailUrl,
            edit_password: EDIT_PASSWORD,
            is_published: true,
          }),
        });
        const data = await res.json();
        if (data.ok) {
          console.log('✅ registered');
          registered++;
        } else if (res.status === 409) {
          console.log('⏭ duplicate');
          duplicates++;
        } else {
          console.log(`❌ ${data.error}`);
          errors++;
        }
      } catch (err) {
        console.log(`❌ ${err.message}`);
        errors++;
      }

      await new Promise(r => setTimeout(r, 50));
    }

    console.log(`\nPhase 1 Done: Registered=${registered} Duplicates=${duplicates} Errors=${errors}\n`);
  }

  // Phase 2: Fetch detail pages and update each event via PUT
  if (flyersOnly) {
    console.log('--- Phase 2: Skipped (flyers-only mode) ---\n');
  } else {
  console.log('--- Phase 2: Fetch details & update events ---\n');

  // First, get all existing concerts from our API to find slugs (paginate since limit=100 max)
  let existingConcerts = [];
  try {
    let page = 1;
    const pageSize = 100;
    while (true) {
      const listRes = await fetch(`${API_URL}?limit=${pageSize}&page=${page}`);
      const listData = await listRes.json();
      const batch = listData.data || [];
      existingConcerts.push(...batch);
      if (batch.length < pageSize) break;
      page++;
    }
    console.log(`Found ${existingConcerts.length} concerts in DB\n`);
  } catch (err) {
    console.error(`Failed to fetch concert list: ${err.message}`);
    return;
  }

  let updated = 0;
  let skipped = 0;
  let detailErrors = 0;

  for (let i = 0; i < allEvents.length; i++) {
    const ev = allEvents[i];
    process.stdout.write(`[${i + 1}/${allEvents.length}] ${ev.title.slice(0, 30)}... `);

    // Find matching concert in DB by title + date
    const match = existingConcerts.find(c =>
      c.title === ev.title && c.date === ev.date
    );

    if (!match) {
      console.log('⚠ not in DB, skipping');
      skipped++;
      continue;
    }

    // Already has description? Skip unless fix-pricing mode
    if (!fixPricingOnly && match.description && match.description.length > 10) {
      console.log('⏭ already has details');
      skipped++;
      continue;
    }

    // Fetch detail page
    if (!ev.detailUrl) {
      console.log('⏭ no detail URL');
      skipped++;
      continue;
    }

    try {
      const detailRes = await fetch(ev.detailUrl, {
        headers: { 'User-Agent': 'Crescendo-Bot/1.0', 'Accept': 'text/html' },
      });
      if (!detailRes.ok) {
        console.log(`❌ detail page HTTP ${detailRes.status}`);
        detailErrors++;
        continue;
      }
      const detailHtml = await detailRes.text();
      const details = parseDetailPage(detailHtml);

      // Build update payload
      const updatePayload = { edit_password: EDIT_PASSWORD };
      if (fixPricingOnly) {
        // Only update pricing
        if (details.pricing) {
          updatePayload.pricing = details.pricing;
        } else {
          console.log('⏭ no pricing found');
          skipped++;
          continue;
        }
      } else {
        if (details.description) updatePayload.description = details.description;
        if (details.venue) updatePayload.venue = { name: details.venue };
        if (details.timeStart) updatePayload.time_start = details.timeStart;
        if (details.timeOpen) updatePayload.time_open = details.timeOpen;
        if (details.pricing) updatePayload.pricing = details.pricing;
      }

      // Only update if we have something new
      const hasUpdate = fixPricingOnly ? details.pricing : (details.description || details.venue || details.timeStart || details.pricing);
      if (!hasUpdate) {
        console.log('⏭ no new details found');
        skipped++;
        continue;
      }

      // PUT update
      const putRes = await fetch(`${API_URL}/${match.slug}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatePayload),
      });
      const putData = await putRes.json();
      if (putData.ok) {
        const parts = [];
        if (details.description) parts.push('desc');
        if (details.venue) parts.push('venue');
        if (details.timeStart) parts.push('time');
        if (details.pricing) parts.push('pricing');
        console.log(`✅ updated (${parts.join(', ')})`);
        updated++;
      } else {
        console.log(`❌ PUT failed: ${putData.error}`);
        detailErrors++;
      }
    } catch (err) {
      console.log(`❌ ${err.message}`);
      detailErrors++;
    }

    // Rate limit: 100ms between detail page requests
    await new Promise(r => setTimeout(r, 100));
  }

  console.log(`\nPhase 2 Done: Updated=${updated} Skipped=${skipped} Errors=${detailErrors}`);
  } // end if !flyersOnly

  // Phase 3: Download flyer images/PDFs and upload via /api/upload
  if (args.includes('--skip-flyers')) {
    console.log('\n=== All Done (flyers skipped) ===');
    return;
  }

  console.log('\n--- Phase 3: Upload flyer images & PDFs ---\n');

  const UPLOAD_URL = 'https://ken-gei-prelude.pages.dev/api/upload';
  let flyerUploaded = 0;
  let flyerSkipped = 0;
  let flyerErrors = 0;

  // Re-fetch existing concerts to check which ones already have flyers
  existingConcerts = [];
  try {
    let pg = 1;
    while (true) {
      const listRes = await fetch(`${API_URL}?limit=100&page=${pg}`);
      const listData = await listRes.json();
      const batch = listData.data || [];
      existingConcerts.push(...batch);
      if (batch.length < 100) break;
      pg++;
    }
  } catch (err) {
    console.error(`Failed to refresh concert list: ${err.message}`);
    return;
  }

  for (let i = 0; i < allEvents.length; i++) {
    const ev = allEvents[i];
    process.stdout.write(`[${i + 1}/${allEvents.length}] ${ev.title.slice(0, 30)}... `);

    const match = existingConcerts.find(c => c.title === ev.title && c.date === ev.date);
    if (!match) {
      console.log('⚠ not in DB');
      flyerSkipped++;
      continue;
    }

    // Skip if already has flyer images
    if (match.flyer && match.flyer.length > 0) {
      console.log('⏭ already has flyers');
      flyerSkipped++;
      continue;
    }

    // Collect files to upload: listing image + PDFs from detail page
    const filesToUpload = [];

    // 1. Listing page image
    if (ev.imageUrl) {
      filesToUpload.push({ url: ev.imageUrl, type: 'image' });
    }

    // 2. PDFs from detail page (need to fetch detail page if not already done)
    if (ev.detailUrl) {
      try {
        const detailRes = await fetch(ev.detailUrl, {
          headers: { 'User-Agent': 'Crescendo-Bot/1.0', 'Accept': 'text/html' },
        });
        if (detailRes.ok) {
          const detailHtml = await detailRes.text();
          const pdfMatches = [...detailHtml.matchAll(/href="([^"]*\.pdf)"/g)];
          const seenPdfs = new Set();
          for (const pm of pdfMatches) {
            if (!seenPdfs.has(pm[1])) {
              seenPdfs.add(pm[1]);
              filesToUpload.push({
                url: new URL(pm[1], ev.detailUrl).href,
                type: 'pdf',
              });
            }
          }
        }
      } catch { /* detail page fetch failed */ }
    }

    if (filesToUpload.length === 0) {
      console.log('⏭ no flyer files found');
      flyerSkipped++;
      continue;
    }

    // Upload each file
    const uploadedParts = [];
    for (const fileInfo of filesToUpload) {
      try {
        const fileRes = await fetch(fileInfo.url, {
          headers: { 'User-Agent': 'Crescendo-Bot/1.0' },
        });
        if (!fileRes.ok) continue;

        const contentType = fileRes.headers.get('content-type') || '';
        const buffer = await fileRes.arrayBuffer();

        // Determine MIME type for the upload
        let mimeType;
        if (fileInfo.type === 'pdf') {
          mimeType = 'application/pdf';
        } else if (contentType.includes('png')) {
          mimeType = 'image/png';
        } else if (contentType.includes('gif')) {
          mimeType = 'image/gif';
        } else if (contentType.includes('webp')) {
          mimeType = 'image/webp';
        } else {
          mimeType = 'image/jpeg';
        }

        // Build FormData for upload
        const blob = new Blob([buffer], { type: mimeType });
        const ext = fileInfo.type === 'pdf' ? 'pdf' : 'jpg';
        const formData = new FormData();
        formData.append('file', blob, `flyer.${ext}`);
        formData.append('concert_slug', match.slug);
        formData.append('batch_password', EDIT_PASSWORD);

        const uploadRes = await fetch(UPLOAD_URL, {
          method: 'POST',
          body: formData,
        });
        const uploadData = await uploadRes.json();
        if (uploadData.ok) {
          uploadedParts.push(fileInfo.type);
        } else {
          console.log(`⚠ upload fail: ${uploadData.error}`);
        }
      } catch (err) {
        // Individual file upload failed, continue with next
      }

      // 200ms between uploads
      await new Promise(r => setTimeout(r, 200));
    }

    if (uploadedParts.length > 0) {
      console.log(`✅ uploaded (${uploadedParts.join(', ')})`);
      flyerUploaded++;
    } else {
      console.log('❌ no files uploaded');
      flyerErrors++;
    }

    // Rate limit between events
    await new Promise(r => setTimeout(r, 100));
  }

  console.log(`\nPhase 3 Done: Uploaded=${flyerUploaded} Skipped=${flyerSkipped} Errors=${flyerErrors}`);
  console.log('\n=== All Done ===');
}

main().catch(console.error);
