import { motion } from 'framer-motion';
import { Play, Globe2, Settings as Cog, Crown, ShoppingBag, Trophy, Coins } from 'lucide-react';
import type { Theme } from '../game/themes';
import type { Profile } from '../game/economy';
import { themePreview } from '../game/preview';
import AvatarFrame from './AvatarFrame';

interface Props { theme: Theme; best: number; profile: Profile; canContinue: boolean; onPlay(): void; onNew(): void; onWorlds(): void; onSettings(): void; onShop(): void; onLeaders(): void }

export default function MainMenu({ theme, best, profile, canContinue, onPlay, onNew, onWorlds, onSettings, onShop, onLeaders }: Props) {
  return (
    <motion.div className="absolute inset-0 flex flex-col items-center justify-between p-5 pb-8" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-black/70 pointer-events-none" />
      <div className="relative w-full max-w-sm flex items-center justify-between">
        <button onClick={onLeaders} className="flex items-center gap-2 glass rounded-full pr-4 p-1">
          <AvatarFrame frameId={profile.equipped.frame} name={profile.name} size={44} />
          <div className="text-left"><div className="text-[10px] text-white/60 uppercase tracking-wider">Рекорд</div><div className="font-display font-bold leading-none flex items-center gap-1"><Crown className="w-3.5 h-3.5 text-primary" />{best.toLocaleString()}</div></div>
        </button>
        <button onClick={onShop} className="flex items-center gap-1.5 rounded-full bg-primary/20 border border-primary/50 px-4 py-2 font-display font-bold text-primary backdrop-blur-md">
          <Coins className="w-4 h-4" /> {profile.infinite ? '∞' : profile.coins.toLocaleString()}
        </button>
      </div>
      <motion.div className="relative text-center" initial={{ y: -40, scale: 0.9 }} animate={{ y: 0, scale: 1 }} transition={{ type: 'spring', damping: 12 }}>
        <p className="text-xs tracking-[0.4em] text-white/70 font-semibold">20 МИРОВ · 3D ГОЛОВОЛОМКА</p>
        <h1 className="font-display font-bold leading-[0.85] text-6xl sm:text-7xl text-shadow mt-2">
          <span className="block text-white">BLOCK</span>
          <span className="block bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">REALMS</span>
        </h1>
      </motion.div>
      <motion.div className="relative w-full max-w-xs space-y-3" initial={{ y: 60, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.15, type: 'spring', damping: 14 }}>
        <button onClick={onWorlds} className="w-full glass rounded-2xl p-2.5 flex items-center gap-3 text-left hover:bg-white/10 transition">
          <img src={themePreview(theme)} alt="" className="w-12 h-12 rounded-xl" style={{ background: `linear-gradient(160deg, ${theme.sky[0]}, ${theme.sky[1]})` }} />
          <div className="flex-1 min-w-0">
            <div className="text-[11px] uppercase tracking-widest text-white/60">Текущий мир</div>
            <div className="font-display text-lg font-semibold truncate">{theme.name}</div>
          </div>
          <Globe2 className="w-5 h-5 text-white/60 mr-2" />
        </button>
        <button onClick={onPlay} className="btn-primary w-full h-16 text-2xl flex items-center justify-center gap-3">
          <Play className="w-7 h-7 fill-current" /> {canContinue ? 'Продолжить' : 'Играть'}
        </button>
        {canContinue && <button onClick={onNew} className="btn-soft w-full h-12 text-lg">Новая игра</button>}
        <div className="grid grid-cols-2 gap-3">
          <button onClick={onShop} className="btn-soft h-12 flex items-center justify-center gap-2"><ShoppingBag className="w-5 h-5" /> Магазин</button>
          <button onClick={onLeaders} className="btn-soft h-12 flex items-center justify-center gap-2"><Trophy className="w-5 h-5" /> Рейтинг</button>
          <button onClick={onWorlds} className="btn-soft h-12 flex items-center justify-center gap-2"><Globe2 className="w-5 h-5" /> Миры</button>
          <button onClick={onSettings} className="btn-soft h-12 flex items-center justify-center gap-2"><Cog className="w-5 h-5" /> Настройки</button>
        </div>
      </motion.div>
    </motion.div>
  );
}
