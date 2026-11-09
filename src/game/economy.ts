import type { ClearFx } from './themes';

export type ItemKind = 'clear' | 'place' | 'frame' | 'pet' | 'wings' | 'crown' | 'glasses';
export type Rarity = 'common' | 'rare' | 'epic' | 'legendary' | 'divine';
export interface ShopItem { id: string; kind: ItemKind; name: string; desc: string; price: number; rarity: Rarity; colors: string[] }
export interface FxItem extends ShopItem { count: number; gravity: number; speed: number; ring?: string; ring2?: string; beam?: string; beamW?: number; override?: ClearFx }
export interface FrameItem extends ShopItem { ornament: 'none' | 'laurel' | 'flame' | 'snow' | 'zap' | 'crown' | 'skull'; gems: number; speed: number; wings?: boolean }

export const RARITY: Record<Rarity, { label: string; color: string }> = {
  common: { label: 'Обычный', color: '#9aa4b2' }, rare: { label: 'Редкий', color: '#3d9bff' },
  epic: { label: 'Эпический', color: '#b45cff' }, legendary: { label: 'Легендарный', color: '#ffad1f' },
  divine: { label: 'Божественный', color: '#fff27a' },
};

export const CLEAR_FX: FxItem[] = [
  { id: 'clear_world', kind: 'clear', name: 'Эффект мира', desc: 'Родной эффект каждого мира', price: 0, rarity: 'common', colors: ['#ffffff'], count: 0, gravity: 0, speed: 0 },
  { id: 'clear_gold', kind: 'clear', name: 'Золотой дождь', desc: 'Линии рассыпаются золотыми монетами', price: 1500, rarity: 'rare', colors: ['#ffd700', '#ffb300', '#fff4b0'], count: 10, gravity: -9, speed: 6, ring: '#ffd700' },
  { id: 'clear_rainbow', kind: 'clear', name: 'Радужный взрыв', desc: 'Взрыв всех цветов радуги', price: 4000, rarity: 'epic', colors: ['#ff3b3b', '#ff9f1c', '#ffe81c', '#3bff6a', '#1cc8ff', '#a03bff'], count: 14, gravity: -4, speed: 8, ring: '#ffffff', ring2: '#ff5ae0' },
  { id: 'clear_thunder', kind: 'clear', name: 'Громовой удар', desc: 'Молния разбивает блоки вдребезги', price: 8000, rarity: 'epic', colors: ['#bfe8ff', '#5ab8ff', '#ffffff'], count: 12, gravity: -2, speed: 10, beam: '#7fd0ff', beamW: 0.5, override: 'shatter' },
  { id: 'clear_blackhole', kind: 'clear', name: 'Чёрная дыра', desc: 'Блоки затягивает в воронку', price: 15000, rarity: 'legendary', colors: ['#8a2be2', '#ff4af0', '#2a0050'], count: 12, gravity: 0, speed: 4, ring: '#8a2be2', ring2: '#ff4af0', override: 'vortex' },
  { id: 'clear_divine', kind: 'clear', name: 'Божественный свет', desc: 'Небеса забирают блоки в столпе света', price: 30000, rarity: 'divine', colors: ['#ffffff', '#fff3a0', '#ffd34a'], count: 16, gravity: 4, speed: 5, beam: '#fff2a8', beamW: 1.6, ring: '#ffe27a', ring2: '#ffffff', override: 'sparkle' },
];

export const PLACE_FX: FxItem[] = [
  { id: 'place_none', kind: 'place', name: 'Без эффекта', desc: 'Классическая установка', price: 0, rarity: 'common', colors: ['#ffffff'], count: 0, gravity: 0, speed: 0 },
  { id: 'place_dust', kind: 'place', name: 'Искры', desc: 'Маленький сноп искр', price: 800, rarity: 'common', colors: ['#ffffff', '#ffe9a0'], count: 10, gravity: -6, speed: 4 },
  { id: 'place_fire', kind: 'place', name: 'Адское пламя', desc: 'Огненное кольцо при установке', price: 3000, rarity: 'rare', colors: ['#ff5a00', '#ffb000', '#ff2a00'], count: 18, gravity: 4, speed: 4, ring: '#ff6a00' },
  { id: 'place_frost', kind: 'place', name: 'Ледяная волна', desc: 'Морозная волна и снежинки', price: 5000, rarity: 'epic', colors: ['#e0f8ff', '#8fdcff', '#ffffff'], count: 20, gravity: -2, speed: 5, ring: '#8fdcff', ring2: '#ffffff' },
  { id: 'place_thunder', kind: 'place', name: 'Молния Зевса', desc: 'Удар молнии с небес', price: 10000, rarity: 'legendary', colors: ['#ffffff', '#7fc8ff', '#ffee80'], count: 22, gravity: -3, speed: 8, beam: '#9fd8ff', beamW: 0.35, ring: '#7fc8ff' },
  { id: 'place_divine', kind: 'place', name: 'Божественное явление', desc: 'Столп небесного света, двойной нимб и золотые искры', price: 25000, rarity: 'divine', colors: ['#ffffff', '#fff3a0', '#ffd34a'], count: 30, gravity: 3, speed: 5, beam: '#fff2a8', beamW: 1.4, ring: '#ffe27a', ring2: '#ffffff' },
];

export const FRAMES: FrameItem[] = [
  { id: 'frame_basic', kind: 'frame', name: 'Базовая', desc: 'Простая рамка', price: 0, rarity: 'common', colors: ['#6a6f85', '#a0a6bd'], ornament: 'none', gems: 0, speed: 12 },
  { id: 'frame_gold', kind: 'frame', name: 'Золотой лавр', desc: 'Лавровый венок чемпиона', price: 2000, rarity: 'rare', colors: ['#ffd700', '#b8860b', '#fff2a0'], ornament: 'laurel', gems: 2, speed: 8 },
  { id: 'frame_fire', kind: 'frame', name: 'Драконье пламя', desc: 'Пылающий огонь дракона', price: 6000, rarity: 'epic', colors: ['#ff2a00', '#ff9a00', '#ffe000', '#ff2a00'], ornament: 'flame', gems: 3, speed: 3 },
  { id: 'frame_ice', kind: 'frame', name: 'Ледяная корона', desc: 'Кристаллы вечной мерзлоты', price: 9000, rarity: 'epic', colors: ['#bff4ff', '#4ac8ff', '#ffffff', '#7a9cff'], ornament: 'snow', gems: 4, speed: 6 },
  { id: 'frame_neon', kind: 'frame', name: 'Неоновый импульс', desc: 'Пульсирующий киберсвет', price: 12000, rarity: 'legendary', colors: ['#00f0ff', '#ff2bd6', '#fffb00', '#00f0ff'], ornament: 'zap', gems: 6, speed: 2 },
  { id: 'frame_divine', kind: 'frame', name: 'Божественный нимб', desc: 'Крылья, корона и сияющий нимб', price: 25000, rarity: 'divine', colors: ['#fffbe0', '#ffd34a', '#ffffff', '#ffe98a'], ornament: 'crown', gems: 8, speed: 4, wings: true },
  { id: 'frame_void', kind: 'frame', name: 'Разлом пустоты', desc: 'Тьма, что смотрит в ответ', price: 35000, rarity: 'divine', colors: ['#2a0050', '#a24aff', '#ff4af0', '#000000'], ornament: 'skull', gems: 8, speed: 1.6, wings: true },
];

export interface Perks { score: number; coins: number; bonus: number; boostMoves: number; bomb: number }
export interface PetItem extends ShopItem { perk: string; perks: Partial<Perks> }

export const PETS: PetItem[] = [
  { id: 'pet_cat', kind: 'pet', name: 'Котик Мурзик', desc: 'Пушистый рыжий друг', perk: '+10% очков', perks: { score: 1.1 }, price: 3000, rarity: 'rare', colors: ['#ffb36b', '#fff1dc'] },
  { id: 'pet_bunny', kind: 'pet', name: 'Зайка Пушок', desc: 'Прыгучий и ушастый', perk: '+20% монет', perks: { coins: 1.2 }, price: 5000, rarity: 'rare', colors: ['#f4f0ff', '#ffb3cf'] },
  { id: 'pet_chick', kind: 'pet', name: 'Цыплёнок Пик', desc: 'Машет крылышками', perk: 'Бонусы на поле чаще в 1.7 раза', perks: { bonus: 1.7 }, price: 8000, rarity: 'epic', colors: ['#ffe14a', '#ff8a1a'] },
  { id: 'pet_panda', kind: 'pet', name: 'Панда Бао', desc: 'Спокойная и мудрая', perk: 'Буст длится 5 ходов · +10% очков', perks: { boostMoves: 5, score: 1.1 }, price: 14000, rarity: 'legendary', colors: ['#ffffff', '#222028'] },
  { id: 'pet_dragon', kind: 'pet', name: 'Дракончик Искра', desc: 'Маленький, но огненный', perk: '+30% очков · бомбы чаще · +20% монет', perks: { score: 1.3, bomb: 0.25, coins: 1.2 }, price: 30000, rarity: 'divine', colors: ['#5ad08a', '#ff8a5a'] },
];
export const ACCESSORIES: ShopItem[] = [
  { id: 'wings_angel', kind: 'wings', name: 'Ангельские крылья', desc: 'Машут перьями · +5% очков', price: 6000, rarity: 'epic', colors: ['#ffffff', '#fff3a0'] },
  { id: 'wings_butterfly', kind: 'wings', name: 'Крылья бабочки', desc: 'Светящиеся и прозрачные · +5% очков', price: 4000, rarity: 'rare', colors: ['#ff7ad9', '#ffffff'] },
  { id: 'wings_fire', kind: 'wings', name: 'Крылья феникса', desc: 'Пылающие перья · +5% очков', price: 12000, rarity: 'legendary', colors: ['#ff6a1a', '#ffd000'] },
  { id: 'crown_gold', kind: 'crown', name: 'Золотая корона', desc: 'С рубинами и искрами · +5% очков', price: 5000, rarity: 'epic', colors: ['#ffcc33', '#ff2a4a'] },
  { id: 'crown_diamond', kind: 'crown', name: 'Алмазная корона', desc: 'Сияет ледяным светом · +5% очков', price: 15000, rarity: 'divine', colors: ['#bff4ff', '#4ac8ff'] },
  { id: 'glasses_cool', kind: 'glasses', name: 'Крутые очки', desc: 'Стиль босса · +5% очков', price: 2500, rarity: 'rare', colors: ['#333333', '#ffffff'] },
  { id: 'glasses_heart', kind: 'glasses', name: 'Очки-сердечки', desc: 'Милота на максимум · +5% очков', price: 3500, rarity: 'epic', colors: ['#ff3a6a', '#ffb3c8'] },
  { id: 'glasses_neon', kind: 'glasses', name: 'Неоновые очки', desc: 'Светятся в темноте · +5% очков', price: 7000, rarity: 'legendary', colors: ['#00f0ff', '#ff2bd6'] },
];

export function computePerks(p: Profile): Perks {
  const base: Perks = { score: 1, coins: 1, bonus: 1, boostMoves: 3, bomb: 0 };
  const pet = PETS.find((x) => x.id === p.equipped.pet);
  if (pet) Object.assign(base, pet.perks);
  const acc = [p.equipped.wings, p.equipped.crown, p.equipped.glasses].filter(Boolean).length;
  base.score = +(base.score + (pet ? acc * 0.05 : 0)).toFixed(2);
  return base;
}

export const ALL_ITEMS: ShopItem[] = [...CLEAR_FX, ...PLACE_FX, ...FRAMES, ...PETS, ...ACCESSORIES];
export const getClearFx = (id: string) => CLEAR_FX.find((i) => i.id === id) ?? CLEAR_FX[0];
export const getPlaceFx = (id: string) => PLACE_FX.find((i) => i.id === id) ?? PLACE_FX[0];
export const getFrame = (id: string) => FRAMES.find((i) => i.id === id) ?? FRAMES[0];

// ---------- profile & leaderboard ----------
export interface Bot { name: string; score: number; coins: number; frame: string }
export interface Profile {
  name: string; coins: number; totalScore: number; totalCoins: number; owned: string[];
  equipped: { clear: string; place: string; frame: string; pet: string; wings: string; crown: string; glasses: string }; redeemed: string[]; admin: boolean; infinite: boolean; lastPlayed: number; lastTick: number; bots: Bot[];
}

const KEY = 'block-realms-profile';
const NAMES = ['defXx', 'xX_Sh4dow_Xx', 'NoobSlayer228', 'KiraBlast', 'zTr1ckYz', 'MegaBlock_Pro', 'Lunar_Wolf', 'ProGamer777', 'qwertyKing'];
const BOT_SCORES = [380000, 260000, 190000, 140000, 95000, 60000, 35000, 18000, 7000];
const BOT_COINS = [9500, 7200, 5400, 4100, 3000, 2100, 1300, 700, 250];
const BOT_FRAMES = ['frame_void', 'frame_divine', 'frame_neon', 'frame_fire', 'frame_ice', 'frame_gold', 'frame_fire', 'frame_gold', 'frame_basic'];

function fresh(): Profile {
  const now = Date.now();
  return {
    name: 'Ты', coins: 0, totalScore: 0, totalCoins: 0, owned: ['clear_world', 'place_none', 'frame_basic'],
    equipped: { clear: 'clear_world', place: 'place_none', frame: 'frame_basic', pet: '', wings: '', crown: '', glasses: '' }, redeemed: [], admin: false, infinite: false, lastPlayed: now, lastTick: now,
    bots: NAMES.map((name, i) => ({ name, score: BOT_SCORES[i], coins: BOT_COINS[i], frame: BOT_FRAMES[i] })),
  };
}

/** Bots keep climbing while the player is away — so idle players slide down the ranks. */
function applyAbsence(p: Profile): Profile {
  const now = Date.now(); const day = 86400000;
  const away = now - p.lastPlayed > day / 2;
  const days = (now - p.lastTick) / day;
  if (!away || days < 0.05) return { ...p, lastTick: away ? p.lastTick : now };
  const top = Math.max(p.totalScore, ...p.bots.map((b) => b.score));
  const topC = Math.max(p.totalCoins, ...p.bots.map((b) => b.coins));
  return {
    ...p, lastTick: now,
    bots: p.bots.map((b, i) => ({ ...b,
      score: Math.round(b.score + top * days * (0.05 + (9 - i) * 0.006) * (0.7 + Math.random() * 0.6)),
      coins: Math.round(b.coins + topC * days * (0.05 + (9 - i) * 0.006) * (0.7 + Math.random() * 0.6)) })),
  };
}

export function loadProfile(): Profile {
  try { const s = localStorage.getItem(KEY); const f = fresh(); if (!s) return f; const d = JSON.parse(s); return applyAbsence({ ...f, ...d, equipped: { ...f.equipped, ...d.equipped } }); } catch { return fresh(); }
}
export const saveProfile = (p: Profile) => localStorage.setItem(KEY, JSON.stringify(p));

/** After a game: player gains fully, bots gain a fraction — so steady play takes you to #1. */
export function finishGame(p: Profile, score: number, coins: number): Profile {
  const now = Date.now();
  return {
    ...p, coins: p.coins + coins, totalScore: p.totalScore + score, totalCoins: p.totalCoins + coins, lastPlayed: now, lastTick: now,
    bots: p.bots.map((b) => ({ ...b, score: b.score + Math.round(score * (0.1 + Math.random() * 0.3)), coins: b.coins + Math.round(coins * (0.1 + Math.random() * 0.3)) })),
  };
}

export const coinsForScore = (score: number) => Math.floor(score / 30);
