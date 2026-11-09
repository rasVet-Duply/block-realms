import { motion } from 'framer-motion';
import { Crown, Play, RotateCcw, ShoppingBag, Settings as Cog, Home, Coins } from 'lucide-react';

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <motion.div className="absolute inset-0 flex items-center justify-center p-5 bg-black/50 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <motion.div className="glass rounded-[2rem] w-full max-w-xs p-6 text-center space-y-3" initial={{ scale: 0.8, y: 30 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9 }} transition={{ type: 'spring', damping: 14 }}>
        {children}
      </motion.div>
    </motion.div>
  );
}

export function PauseOverlay({ onResume, onRestart, onShop, onSettings, onMenu }: Record<'onResume' | 'onRestart' | 'onShop' | 'onSettings' | 'onMenu', () => void>) {
  return (
    <Shell>
      <h2 className="font-display text-4xl font-bold mb-2">Пауза</h2>
      <button onClick={onResume} className="btn-primary w-full h-14 text-xl flex items-center justify-center gap-2"><Play className="w-5 h-5 fill-current" /> Продолжить</button>
      <button onClick={onRestart} className="btn-soft w-full h-12 flex items-center justify-center gap-2"><RotateCcw className="w-4 h-4" /> Заново</button>
      <div className="grid grid-cols-3 gap-2">
        <button onClick={onShop} aria-label="Магазин" className="btn-soft h-12 flex items-center justify-center"><ShoppingBag className="w-5 h-5" /></button>
        <button onClick={onSettings} aria-label="Настройки" className="btn-soft h-12 flex items-center justify-center"><Cog className="w-5 h-5" /></button>
        <button onClick={onMenu} aria-label="Меню" className="btn-soft h-12 flex items-center justify-center"><Home className="w-5 h-5" /></button>
      </div>
    </Shell>
  );
}

export function GameOverOverlay({ score, best, isNew, coins, onAgain, onShop, onMenu }:
  { score: number; best: number; isNew: boolean; coins: number; onAgain(): void; onShop(): void; onMenu(): void }) {
  return (
    <Shell>
      <p className="text-sm uppercase tracking-[0.3em] text-white/60">Ходов больше нет</p>
      {isNew && <motion.div initial={{ scale: 0 }} animate={{ scale: 1, rotate: [-6, 6, 0] }} className="inline-flex items-center gap-1.5 rounded-full bg-primary text-primary-foreground font-display font-bold px-3 py-1"><Crown className="w-4 h-4" /> Новый рекорд!</motion.div>}
      <div className="font-display font-bold text-6xl">{score.toLocaleString()}</div>
      <div className="text-sm text-muted-foreground flex items-center justify-center gap-1"><Crown className="w-4 h-4 text-primary" /> Рекорд {best.toLocaleString()}</div>
      <motion.div initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.3 }} className="inline-flex items-center gap-1.5 rounded-full bg-primary/15 border border-primary/50 px-4 py-1.5 font-display font-bold text-primary">
        <Coins className="w-4 h-4" /> +{coins.toLocaleString()} монет
      </motion.div>
      <button onClick={onAgain} className="btn-primary w-full h-14 text-xl flex items-center justify-center gap-2 mt-2"><RotateCcw className="w-5 h-5" /> Ещё раз</button>
      <div className="grid grid-cols-2 gap-2">
        <button onClick={onShop} className="btn-soft h-12 flex items-center justify-center gap-2"><ShoppingBag className="w-4 h-4" /> Магазин</button>
        <button onClick={onMenu} className="btn-soft h-12 flex items-center justify-center gap-2"><Home className="w-4 h-4" /> Меню</button>
      </div>
    </Shell>
  );
}
