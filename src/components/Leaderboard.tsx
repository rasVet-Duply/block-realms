import { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Trophy, Coins, Star, TrendingDown } from 'lucide-react';
import type { Profile } from '../game/economy';
import AvatarFrame from './AvatarFrame';
import { cn } from '@project/components/lib/utils';

const MEDAL = ['#ffd23a', '#d6dbe6', '#e0915a'];

export default function Leaderboard({ profile, onBack }: { profile: Profile; onBack(): void }) {
  const [tab, setTab] = useState<'score' | 'coins'>('score');
  const rows = [
    ...profile.bots.map((b) => ({ name: b.name, frame: b.frame, value: tab === 'score' ? b.score : b.coins, me: false })),
    { name: profile.name, frame: profile.equipped.frame, value: tab === 'score' ? profile.totalScore : profile.totalCoins, me: true },
  ].sort((a, b) => b.value - a.value);
  const myRank = rows.findIndex((r) => r.me) + 1;
  const away = Date.now() - profile.lastPlayed > 43200000;
  return (
    <motion.div className="absolute inset-0 glass flex flex-col" initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', damping: 24, stiffness: 220 }}>
      <div className="flex items-center gap-3 p-4">
        <button onClick={onBack} className="btn-soft w-11 h-11 flex items-center justify-center"><ArrowLeft className="w-5 h-5" /></button>
        <h2 className="font-display text-2xl font-bold flex-1">Таблица лидеров</h2>
        <div className="rounded-full bg-accent/20 border border-accent/40 px-3 py-1 font-display font-bold text-sm">Ты #{myRank}</div>
      </div>
      <div className="grid grid-cols-2 gap-2 px-4">
        <button onClick={() => setTab('score')} className={cn('h-11 rounded-xl font-display font-semibold flex items-center justify-center gap-2', tab === 'score' ? 'bg-primary text-primary-foreground' : 'bg-white/10')}><Star className="w-4 h-4" /> Очки</button>
        <button onClick={() => setTab('coins')} className={cn('h-11 rounded-xl font-display font-semibold flex items-center justify-center gap-2', tab === 'coins' ? 'bg-primary text-primary-foreground' : 'bg-white/10')}><Coins className="w-4 h-4" /> Заработок</button>
      </div>
      {away && (
        <div className="mx-4 mt-3 rounded-xl bg-destructive/15 border border-destructive/40 p-3 text-sm flex items-center gap-2">
          <TrendingDown className="w-4 h-4 text-destructive shrink-0" /> Пока тебя не было, соперники ушли вперёд. Играй, чтобы вернуть место!
        </div>
      )}
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {rows.map((r, i) => (
          <motion.div key={r.name + tab} layout initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}
            className={cn('flex items-center gap-3 rounded-2xl p-2.5 pr-4 border', r.me ? 'bg-primary/15 border-primary/60 shadow-[0_0_24px_-8px_hsl(var(--primary))]' : 'bg-card/60 border-white/10')}>
            <div className="w-8 text-center font-display font-bold text-lg" style={{ color: MEDAL[i] }}>
              {i < 3 ? <Trophy className="w-6 h-6 mx-auto" style={{ color: MEDAL[i], fill: MEDAL[i] }} /> : i + 1}
            </div>
            <AvatarFrame frameId={r.frame} name={r.name} size={44} />
            <div className="flex-1 min-w-0 font-semibold truncate">{r.name}{r.me && <span className="ml-2 text-xs text-primary">(ты)</span>}</div>
            <div className="font-display font-bold tabular-nums flex items-center gap-1">
              {tab === 'coins' && <Coins className="w-4 h-4 text-primary" />}{r.value.toLocaleString()}
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
