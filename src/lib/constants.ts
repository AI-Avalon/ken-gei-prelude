// Ken-Gei Prelude — Constants

export const SITE_NAME = 'Ken-Gei Prelude';
export const SITE_NAME_JP = '県芸プレリュード';
export const SITE_URL = 'https://ken-gei-prelude.pages.dev';
export const SITE_DESCRIPTION = '愛知県立芸術大学 音楽学部 演奏会情報ポータル';

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
  access: ['リニモ「芸大通」下車 徒歩約10分'],
};

export const CATEGORIES: Record<string, { label: string; color: string; icon: string }> = {
  teiki: { label: '定期演奏会', color: 'bg-blue-100 text-blue-800', icon: '🎵' },
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
