import { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Coins, Check, Sparkles, Hammer, Frame as FrameIcon, Lock, PawPrint, Feather, Crown, Glasses, Infinity as Inf } from 'lucide-react';
import { toast } from 'sonner';
import { CLEAR_FX, PLACE_FX, FRAMES, PETS, ACCESSORIES, RARITY, type ShopItem, type Profile, type ItemKind } from '../game/economy';
import AvatarFrame from './AvatarFrame';
import PetViewer from './PetViewer';
import { cn } from '@project/components/lib/utils';

type Tab = 'place' | 'clear' | 'frame' | 'pets';
const TABS: { id: Tab; label: string; icon: typeof Sparkles }[] = [
  { id: 'pets', label: 'Питомцы', icon: PawPrint }, { id: 'place', label: 'Установка', icon: Hammer },
  { id: 'clear', label: 'Очистка', icon: Sparkles }, { id: 'frame', label: 'Рамки', icon: FrameIcon },
];
const KIND_ICON: Partial<Record<ItemKind, typeof Sparkles>> = { pet: PawPrint, wings: Feather, crown: Crown, glasses: Glasses, place: Hammer, clear: Sparkles };

function Preview({ item }: { item: ShopItem }) {
  if (item.kind === 'frame') return <AvatarFrame frameId={item.id} name="Ты" size={64} />;
  const c = item.colors; const Icon = KIND_ICON[item.kind] ?? Sparkles;
  return (
    <div className="relative w-16 h-16">
      <div className="absolute inset-0 rounded-full blur-lg frame-pulse" style={{ background: `radial-gradient(circle, ${c[0]}, transparent 70%)` }} />
      <div className="absolute inset-1.5 rounded-full frame-rot" style={{ background: `conic-gradient(${[...c, c[0]].join(',')})`, animationDuration: '3s' }} />
      <div className="absolute inset-3.5 rounded-full bg-background/85 flex items-center justify-center"><Icon className="w-5 h-5" style={{ color: c[0] === '#ffffff' ? c[1] : c[0] }} /></div>
    </div>
  );
}

interface Props { profile: Profile; onBuy(i: ShopItem): void; onEquip(i: ShopItem): void; onUnequip(i: ShopItem): void; onBack(): void }

export default function Shop({ profile, onBuy, onEquip, onUnequip, onBack }: Props) {
  const [tab, setTab] = useState<Tab>('pets');
  const [preview, setPreview] = useState<ShopItem | null>(null);
  const items: ShopItem[] = tab === 'pets' ? [...PETS, ...ACCESSORIES] : tab === 'place' ? PLACE_FX : tab === 'clear' ? CLEAR_FX : FRAMES;
  const eq = profile.equipped;
  const pv = preview && tab === 'pets' ? preview : null;
  const cfg = { pet: pv?.kind === 'pet' ? pv.id : eq.pet || 'pet_cat', wings: pv?.kind === 'wings' ? pv.id : eq.wings, crown: pv?.kind === 'crown' ? pv.id : eq.crown, glasses: pv?.kind === 'glasses' ? pv.id : eq.glasses };
  const optional = (k: ItemKind) => k === 'pet' || k === 'wings' || k === 'crown' || k === 'glasses';

  return (
    <motion.div className="absolute inset-0 glass flex flex-col" initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 24, stiffness: 220 }}>
      <div className="flex items-center gap-3 p-4 pb-3">
        <button onClick={onBack} className="btn-soft w-11 h-11 flex items-center justify-center"><ArrowLeft className="w-5 h-5" /></button>
        <h2 className="font-display text-2xl font-bold flex-1">Магазин</h2>
        <div className="flex items-center gap-1.5 rounded-full bg-primary/15 border border-primary/40 px-3 py-1.5 font-display font-bold text-primary">
          <Coins className="w-4 h-4" /> {profile.infinite ? <Inf className="w-5 h-5" /> : profile.coins.toLocaleString()}
        </div>
      </div>
      <div className="grid grid-cols-4 gap-1.5 px-4">
        {TABS.map((t) => (
          <button key={t.id} onClick={() => { setTab(t.id); setPreview(null); }} className={cn('h-11 rounded-xl font-display font-semibold flex flex-col sm:flex-row items-center justify-center sm:gap-1.5 text-[11px] sm:text-sm transition', tab === t.id ? 'bg-primary text-primary-foreground' : 'bg-white/10')}>
            <t.icon className="w-4 h-4" /> {t.label}
          </button>
        ))}
      </div>
      <div className="flex-1 overflow-y-auto p-4 pt-3">
        {tab === 'pets' && (
          <div className="relative rounded-3xl overflow-hidden mb-3 border border-white/10" style={{ background: 'radial-gradient(circle at 50% 35%, #4a3a80, #120c24)' }}>
            <PetViewer cfg={cfg} className="h-52 sm:h-60 w-full" />
            <div className="absolute bottom-2 inset-x-0 text-center text-xs text-white/70">{pv ? `Примерка: ${pv.name}` : 'Нажми на питомца — он подпрыгнет!'}</div>
            {!eq.pet && !pv && <div className="absolute top-3 inset-x-0 text-center text-xs text-white/70">Купи питомца — он будет болеть за тебя на поле и давать бонусы</div>}
          </div>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {items.map((item, i) => {
            const owned = profile.owned.includes(item.id);
            const equipped = (eq as Record<string, string>)[item.kind] === item.id;
            const r = RARITY[item.rarity]; const afford = profile.infinite || profile.coins >= item.price;
            const perk = (item as { perk?: string }).perk;
            return (
              <motion.div key={item.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
                onClick={() => tab === 'pets' && setPreview(item)}
                className={cn('relative rounded-2xl border bg-card/70 p-3 flex items-center gap-3 overflow-hidden', tab === 'pets' && 'cursor-pointer', pv?.id === item.id && 'ring-2 ring-primary')}
                style={{ borderColor: `${r.color}66`, boxShadow: item.rarity === 'divine' ? `0 0 24px -6px ${r.color}` : undefined }}>
                <div className="absolute inset-0 opacity-15" style={{ background: `linear-gradient(120deg, ${r.color}, transparent 60%)` }} />
                <div className="relative p-1"><Preview item={item} /></div>
                <div className="relative flex-1 min-w-0">
                  <div className="text-[10px] font-bold uppercase tracking-wider" style={{ color: r.color }}>{r.label}</div>
                  <div className="font-display font-semibold leading-tight">{item.name}</div>
                  <div className="text-xs text-muted-foreground">{item.desc}</div>
                  {perk && <div className="text-xs font-semibold text-primary mt-0.5">⚡ {perk}</div>}
                  <div className="mt-2" onClick={(e) => e.stopPropagation()}>
                    {equipped ? (
                      optional(item.kind)
                        ? <button onClick={() => onUnequip(item)} className="btn-soft h-9 px-4 text-sm inline-flex items-center gap-1"><Check className="w-4 h-4 text-primary" /> Снять</button>
                        : <span className="inline-flex items-center gap-1 text-sm font-semibold text-primary"><Check className="w-4 h-4" /> Надето</span>
                    ) : owned ? (
                      <button onClick={() => onEquip(item)} className="btn-soft h-9 px-4 text-sm">Надеть</button>
                    ) : (
                      <button onClick={() => (afford ? onBuy(item) : toast.error(`Не хватает ${(item.price - profile.coins).toLocaleString()} монет`))}
                        className={cn('h-9 px-4 text-sm inline-flex items-center gap-1.5', afford ? 'btn-primary' : 'btn-soft opacity-70')}>
                        {afford ? <Coins className="w-4 h-4" /> : <Lock className="w-4 h-4" />} {item.price.toLocaleString()}
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
}
