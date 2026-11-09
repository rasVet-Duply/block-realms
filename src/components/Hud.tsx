import { AnimatePresence, motion } from 'framer-motion';
import { Pause, Crown, Coins, Zap } from 'lucide-react';

export interface ComboInfo { streak: number; lines: number; gain: number; key: number }
export interface Banner { text: string; sub?: string; key: number }
const WORDS = ['', 'Отлично!', 'Супер!', 'Потрясающе!', 'Невероятно!', 'Легендарно!'];

export default function Hud({ score, best, coins, boost, combo, banner, onPause }:
  { score: number; best: number; coins: string; boost: number; combo: ComboInfo | null; banner: Banner | null; onPause(): void }) {
  return (
    <div className="absolute inset-0 pointer-events-none">
      <div className="flex items-start justify-between p-3 gap-2">
        <button onClick={onPause} aria-label="Пауза" className="pointer-events-auto btn-soft w-12 h-12 flex items-center justify-center"><Pause className="w-5 h-5 fill-current" /></button>
        <div className="text-center">
          <motion.div key={score} initial={{ scale: 1.2 }} animate={{ scale: 1 }} className="font-display font-bold text-5xl leading-none text-white text-shadow tabular-nums">{score.toLocaleString()}</motion.div>
          <div className="mt-1 inline-flex items-center gap-1.5 text-xs text-white/80 bg-black/30 rounded-full px-3 py-0.5"><Crown className="w-3.5 h-3.5 text-primary" /> {best.toLocaleString()}</div>
        </div>
        <div className="h-12 min-w-12 px-3 rounded-2xl bg-black/30 border border-primary/40 flex items-center gap-1 font-display font-bold text-primary backdrop-blur-md">
          <Coins className="w-4 h-4" /> {coins}
        </div>
      </div>
      <AnimatePresence>
        {boost > 0 && (
          <motion.div key="boost" initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0, opacity: 0 }}
            className="absolute top-[88px] left-1/2 -translate-x-1/2 rounded-full bg-gradient-to-r from-primary to-accent text-primary-foreground font-display font-bold px-4 py-1.5 flex items-center gap-1.5 shadow-[0_0_30px_-4px_hsl(var(--primary))]">
            <Zap className="w-4 h-4 fill-current" /> БУСТ x2 · {boost} {boost === 1 ? 'ход' : 'хода'}
          </motion.div>
        )}
      </AnimatePresence>
      {combo && combo.streak > 1 && <div className="absolute top-[88px] right-3 rounded-full bg-accent text-accent-foreground font-display font-bold px-3 py-1 text-sm shadow-lg">КОМБО x{combo.streak}</div>}
      <AnimatePresence>
        {combo && combo.key !== -1 && (
          <motion.div key={combo.key} className="absolute top-[28%] inset-x-0 text-center" initial={{ scale: 0.4, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ opacity: 0, y: -40 }} transition={{ type: 'spring', damping: 10, stiffness: 260 }}>
            <div className="font-display font-bold text-5xl text-white text-shadow">{WORDS[Math.min(combo.lines + (combo.streak > 2 ? 1 : 0), 5)]}</div>
            <div className="font-display font-bold text-2xl text-primary text-shadow">+{combo.gain.toLocaleString()}{combo.streak > 1 && <span className="text-accent"> · Комбо x{combo.streak}</span>}</div>
          </motion.div>
        )}
        {banner && (
          <motion.div key={banner.key} className="absolute top-[44%] inset-x-0 flex justify-center" initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ opacity: 0, scale: 1.2 }}>
            <div className="glass rounded-2xl px-6 py-3 text-center">
              <div className="font-display font-bold text-2xl">{banner.text}</div>
              {banner.sub && <div className="text-sm text-muted-foreground">{banner.sub}</div>}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
