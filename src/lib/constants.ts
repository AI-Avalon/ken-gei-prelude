// Crescendo — 愛知県立芸術大学 演奏会情報ポータル

export const SITE_NAME = 'Crescendo';
export const SITE_NAME_JP = 'クレッシェンド';
export const SITE_URL = 'https://ken-gei-prelude.pages.dev';
export const SITE_DESCRIPTION = '愛知県立芸術大学 演奏会情報ポータル';
export const SITE_TAGLINE = '若き音楽家たちの響きを、あなたの手のひらに。';
export const CREATOR_NAME = 'Crescendo Team';
// Creator display name is loaded at runtime to avoid exposing plain text in source.
function decodeUtf8Base64(value: string): string {
  const bytes = Uint8Array.from(atob(value), (char) => char.charCodeAt(0));
  return new TextDecoder('utf-8').decode(bytes);
}

export const CREATOR_DISPLAY_NAME = decodeUtf8Base64('5qKF55Sw5bm45Y+y5pyX');
export const CREATOR_HANDLE = '';
export const CREATOR_EMAIL = '';

export const UNIVERSITY = {
  name: '愛知県立芸術大学',
  nameEn: 'Aichi University of the Arts',
  address: '愛知県長久手市岩作三ケ峯1-114',
  postal: '480-1194',
  lat: 35.1833,
  lng: 137.0547,
  tel: '0561-76-2492',
  website: 'https://www.aichi-fam-u.ac.jp/',
  eventPage: 'https://www.aichi-fam-u.ac.jp/event/music/',
  access: [
    'リニモ（東部丘陵線）「芸大通駅」下車 徒歩約10〜15分',
    '名鉄バス「愛知県立芸術大学」下車すぐ（藤が丘駅・長久手古戦場駅より運行）',
  ],
};

export interface KnownVenuePreset {
  name: string;
  keywords: string[];
  address: string;
  lat: number;
  lng: number;
  access: string[];
  parking: string;
  googleMapsUrl: string;
  isCampus?: boolean;
}

/** 愛知県立芸術大学の学内会場 — 選択時に自動入力されるデータ */
export const UNIVERSITY_VENUES: Record<string, KnownVenuePreset> = {
  chamber_hall: {
    name: '愛知県立芸術大学 室内楽ホール',
    keywords: ['室内楽ホール'],
    address: '愛知県長久手市岩作三ケ峯1-114',
    lat: 35.1694718,
    lng: 137.0702776,
    access: [
      'リニモ「芸大通駅」下車 徒歩約10分（正門より音楽学部エリアへ）',
      '名鉄バス「愛知県立芸術大学」バス停下車 徒歩約5分',
    ],
    parking: '学内駐車場あり（台数制限あり・公共交通機関をご利用ください）',
    googleMapsUrl: 'https://www.google.com/maps/search/?api=1&query=%E6%84%9B%E7%9F%A5%E7%9C%8C%E7%AB%8B%E8%8A%B8%E8%A1%93%E5%A4%A7%E5%AD%A6+%E5%AE%A4%E5%86%85%E6%A5%BD%E3%83%9B%E3%83%BC%E3%83%AB',
    isCampus: true,
  },
  concert_hall: {
    name: '愛知県立芸術大学 奏楽堂',
    keywords: ['奏楽堂'],
    address: '愛知県長久手市岩作三ケ峯1-114',
    lat: 35.18392,
    lng: 137.05519,
    access: [
      'リニモ「芸大通駅」下車 徒歩約10分（正門正面エリア）',
      '名鉄バス「愛知県立芸術大学」バス停下車 徒歩約3分',
    ],
    parking: '学内駐車場あり（台数制限あり・公共交通機関をご利用ください）',
    googleMapsUrl: 'https://www.google.com/maps/search/?api=1&query=%E6%84%9B%E7%9F%A5%E7%9C%8C%E7%AB%8B%E8%8A%B8%E8%A1%93%E5%A4%A7%E5%AD%A6+%E5%A5%8F%E6%A5%BD%E5%A0%82',
    isCampus: true,
  },
  lecture_hall: {
    name: '愛知県立芸術大学 講義棟ホール',
    keywords: ['講義棟ホール', '大講義室'],
    address: '愛知県長久手市岩作三ケ峯1-114',
    lat: 35.18350,
    lng: 137.05480,
    access: [
      'リニモ「芸大通駅」下車 徒歩約10分',
      '名鉄バス「愛知県立芸術大学」バス停下車 徒歩約5分',
    ],
    parking: '学内駐車場あり（台数制限あり）',
    googleMapsUrl: 'https://www.google.com/maps/search/?api=1&query=%E6%84%9B%E7%9F%A5%E7%9C%8C%E7%AB%8B%E8%8A%B8%E8%A1%93%E5%A4%A7%E5%AD%A6',
    isCampus: true,
  },
  new_lecture_hall: {
    name: '愛知県立芸術大学 新講義棟',
    keywords: ['新講義棟'],
    address: '愛知県長久手市岩作三ケ峯1-114',
    lat: 35.18370,
    lng: 137.05500,
    access: [
      'リニモ「芸大通駅」下車 徒歩約10分',
      '名鉄バス「愛知県立芸術大学」バス停下車 徒歩約5分',
    ],
    parking: '学内駐車場あり（台数制限あり）',
    googleMapsUrl: 'https://www.google.com/maps/search/?api=1&query=%E6%84%9B%E7%9F%A5%E7%9C%8C%E7%AB%8B%E8%8A%B8%E8%A1%93%E5%A4%A7%E5%AD%A6',
    isCampus: true,
  },
  music_building: {
    name: '愛知県立芸術大学 音楽学部棟',
    keywords: ['音楽学部', '愛知県立芸術大学'],
    address: '愛知県長久手市岩作三ケ峯1-114',
    lat: 35.18360,
    lng: 137.05460,
    access: [
      'リニモ「芸大通駅」下車 徒歩約12分',
      '名鉄バス「愛知県立芸術大学」バス停下車 徒歩約5分',
    ],
    parking: '学内駐車場あり（台数制限あり）',
    googleMapsUrl: 'https://www.google.com/maps/search/?api=1&query=%E6%84%9B%E7%9F%A5%E7%9C%8C%E7%AB%8B%E8%8A%B8%E8%A1%93%E5%A4%A7%E5%AD%A6',
    isCampus: true,
  },
};

/** 東海エリアの主要コンサートホール — 会場名から自動で座標・アクセス情報を補完 */
export const REGIONAL_VENUES: Record<string, KnownVenuePreset> = {
  aichi_arts_center: {
    name: '愛知県芸術劇場 コンサートホール',
    keywords: ['愛知県芸術劇場', '愛知芸術文化センター'],
    address: '愛知県名古屋市東区東桜1-13-2',
    lat: 35.1711,
    lng: 136.9102,
    access: [
      '地下鉄東山線・名城線「栄駅」または名鉄瀬戸線「栄町駅」オアシス21連絡通路経由 徒歩約3分',
    ],
    parking: 'アートパーク東海駐車場（有料）',
    googleMapsUrl: 'https://www.google.com/maps/search/?api=1&query=%E6%84%9B%E7%9F%A5%E7%9C%8C%E8%8A%B8%E8%A1%93%E5%8A%87%E5%A0%B4+%E3%82%B3%E3%83%B3%E3%82%B5%E3%83%BC%E3%83%88%E3%83%9B%E3%83%BC%E3%83%AB',
    isCampus: false,
  },
  denki_bunka: {
    name: '電気文化会館 ザ・コンサートホール',
    keywords: ['電気文化会館', 'ザ・コンサートホール'],
    address: '愛知県名古屋市中区栄2-2-5',
    lat: 35.1679,
    lng: 136.9006,
    access: [
      '地下鉄東山線・鶴舞線「伏見駅」4番出口より徒歩約2分',
    ],
    parking: '館内有料駐車場あり',
    googleMapsUrl: 'https://www.google.com/maps/search/?api=1&query=%E9%9B%BB%E6%B0%97%E6%96%87%E5%8C%96%E4%BC%9A%E9%A4%A8+%E3%82%B6%E3%83%BB%E3%82%B3%E3%83%B3%E3%82%B5%E3%83%BC%E3%83%88%E3%83%9B%E3%83%BC%E3%83%AB',
    isCampus: false,
  },
  munetsugu_hall: {
    name: '宗次ホール',
    keywords: ['宗次ホール'],
    address: '愛知県名古屋市中区栄4-5-14',
    lat: 35.1684,
    lng: 136.9125,
    access: [
      '地下鉄東山線・名城線「栄駅」12番出口より徒歩約4分',
    ],
    parking: '近隣コインパーキングをご利用ください',
    googleMapsUrl: 'https://www.google.com/maps/search/?api=1&query=%E5%AE%97%E6%AC%A1%E3%83%9B%E3%83%BC%E3%83%AB',
    isCampus: false,
  },
  toyota_concert_hall: {
    name: '豊田市コンサートホール',
    keywords: ['豊田市コンサートホール', '参合館'],
    address: '愛知県豊田市西町1-200 豊田参合館10F',
    lat: 35.0873,
    lng: 137.1578,
    access: [
      '名鉄三河線・豊田線「豊田市駅」東口より徒歩約3分',
      '愛知環状鉄道「新豊田駅」より徒歩約5分',
    ],
    parking: '豊田市駅周辺フリーパーキング対応駐車場あり',
    googleMapsUrl: 'https://www.google.com/maps/search/?api=1&query=%E8%B1%8A%E7%94%B0%E5%B8%82%E3%82%B3%E3%83%B3%E3%82%B5%E3%83%BC%E3%83%88%E3%83%9B%E3%83%BC%E3%83%AB',
    isCampus: false,
  },
  nagakute_bunka: {
    name: '長久手市文化の家',
    keywords: ['長久手市文化の家', '森のホール', '風のホール'],
    address: '愛知県長久手市野田農201',
    lat: 35.1763,
    lng: 137.0378,
    access: [
      'リニモ（東部丘陵線）「はなみずき通駅」1番出口より徒歩約7分',
    ],
    parking: '無料駐車場あり（約280台）',
    googleMapsUrl: 'https://www.google.com/maps/search/?api=1&query=%E9%95%B7%E4%B9%85%E6%89%8B%E5%B8%82%E6%96%87%E5%8C%96%E3%81%AE%E5%AE%B6',
    isCampus: false,
  },
  shirakawa_hall: {
    name: '三井住友海上しらかわホール',
    keywords: ['しらかわホール'],
    address: '愛知県名古屋市中区栄2-9-15',
    lat: 35.1649,
    lng: 136.9006,
    access: [
      '地下鉄東山線・鶴舞線「伏見駅」5番出口より徒歩約3分',
    ],
    parking: '近隣コインパーキングをご利用ください',
    googleMapsUrl: 'https://www.google.com/maps/search/?api=1&query=%E4%B8%89%E4%BA%95%E4%BD%8F%E5%8F%8B%E6%B5%B7%E4%B8%8A%E3%81%97%E3%82%89%E3%81%8B%E3%82%8F%E3%83%9B%E3%83%BC%E3%83%AB',
    isCampus: false,
  },
};

export const CATEGORIES: Record<string, { label: string; color: string; icon: string }> = {
  teiki: { label: '定期演奏会', color: 'bg-primary-100 text-primary-800', icon: '🎵' },
  major_teiki: { label: '専攻定期', color: 'bg-sky-100 text-sky-800', icon: '🎼' },
  self_planned: { label: '自主企画', color: 'bg-lime-100 text-lime-800', icon: '✨' },
  sotsugyou: { label: '卒業演奏会', color: 'bg-purple-100 text-purple-800', icon: '🎓' },
  gakui: { label: '学位審査演奏会', color: 'bg-indigo-100 text-indigo-800', icon: '📜' },
  recital: { label: 'リサイタル', color: 'bg-pink-100 text-pink-800', icon: '🎤' },
  chamber: { label: '室内楽', color: 'bg-amber-100 text-amber-800', icon: '🎻' },
  orchestra: { label: 'オーケストラ', color: 'bg-red-100 text-red-800', icon: '🎼' },
  ensemble: { label: 'アンサンブル', color: 'bg-teal-100 text-teal-800', icon: '🎶' },
  opera: { label: 'オペラ', color: 'bg-rose-100 text-rose-800', icon: '🎭' },
  wind: { label: '吹奏楽', color: 'bg-cyan-100 text-cyan-800', icon: '🎺' },
  vocal: { label: '声楽', color: 'bg-yellow-100 text-yellow-800', icon: '🎙️' },
  piano: { label: 'ピアノ', color: 'bg-gray-100 text-gray-800', icon: '🎹' },
  daigaku: { label: '大学主催', color: 'bg-green-100 text-green-800', icon: '🏛️' },
  other: { label: 'その他', color: 'bg-gray-100 text-gray-600', icon: '🎵' },
};

export const DEPARTMENTS: Record<string, { label: string; icon: string }> = {
  strings: { label: '弦楽器', icon: '🎻' },
  wind_brass: { label: '管楽器', icon: '🎺' },
  percussion: { label: '打楽器', icon: '🥁' },
  keyboard: { label: '鍵盤楽器', icon: '🎹' },
  vocal_dept: { label: '声楽', icon: '🎙️' },
  composition: { label: '作曲', icon: '📝' },
  musicology: { label: '音楽学', icon: '📚' },
  conducting: { label: '指揮', icon: '🎼' },
  ensemble: { label: 'アンサンブル', icon: '🎶' },
};

export const INQUIRY_SUBJECTS = [
  { value: 'listing', label: '掲載依頼' },
  { value: 'correction', label: '情報修正' },
  { value: 'bug', label: 'バグ報告' },
  { value: 'other', label: 'その他' },
];

export const SEATING_OPTIONS = [
  { value: '', label: '未設定' },
  { value: '全席自由', label: '全席自由' },
  { value: '全席指定', label: '全席指定' },
  { value: '自由席', label: '自由席' },
];

export const DAY_OF_WEEK = ['日', '月', '火', '水', '木', '金', '土'];
