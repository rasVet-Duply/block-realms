import { THEMES } from './themes';

export type Quality = 'low' | 'medium' | 'high';
export interface Settings { sound: boolean; music: boolean; quality: Quality; themeId: string; best: number; unlocked: string[]; view: '2d' | '3d' }

const KEY = 'block-realms-3d';
const defaultQuality = (): Quality => (window.innerWidth < 700 || navigator.hardwareConcurrency <= 4 ? 'medium' : 'high');

export function loadSettings(): Settings {
  const base: Settings = { sound: true, music: true, quality: defaultQuality(), themeId: 'candy', best: 0, view: '3d', unlocked: THEMES.map((t) => t.id) };
  try {
    const s = JSON.parse(localStorage.getItem(KEY) || '{}');
    return { ...base, ...s, unlocked: THEMES.map((t) => t.id) };
  } catch {
    return base;
  }
}

export function saveSettings(s: Settings) {
  localStorage.setItem(KEY, JSON.stringify(s));
}
