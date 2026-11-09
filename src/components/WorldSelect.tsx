import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, MapPin } from 'lucide-react';
import { THEMES, type Theme } from '../game/themes';
import { themePreview } from '../game/preview';
import { cn } from '@project/components/lib/utils';

function Card({ t, i, active }: { t: Theme; i: number; active: boolean }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => { const id = setTimeout(() => setUrl(themePreview(t)), 40 + i * 25); return () => clearTimeout(id); }, [t, i]);
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.025 }}
      className={cn('relative rounded-2xl overflow-hidden border-2', active ? 'border-primary shadow-[0_0_0_4px_hsl(var(--primary)/0.25)]' : 'border-white/10')}>
      <div className="aspect-square relative" style={{ background: `radial-gradient(circle at 50% 40%, ${t.sky[1]}, ${t.sky[0]})` }}>
        {url && <img src={url} alt={t.name} className="absolute inset-0 w-full h-full object-contain p-1" />}
        <span className="absolute top-2 left-2 text-[10px] font-bold rounded-full bg-black/40 px-2 py-0.5 text-white">{String(i + 1).padStart(2, '0')}</span>
        {active && <span className="absolute top-2 right-2 bg-primary text-primary-foreground rounded-full px-2 py-0.5 text-[10px] font-bold flex items-center gap-1"><MapPin className="w-3 h-3" />Ты здесь</span>}
      </div>
      <div className="p-2.5 bg-card/90">
        <div className="font-display font-semibold text-sm leading-tight truncate">{t.name}</div>
        <div className="text-[11px] text-muted-foreground truncate">{t.tagline}</div>
      </div>
      <div className="absolute bottom-0 left-0 right-0 h-1" style={{ background: t.accent }} />
    </motion.div>
  );
}

export default function WorldSelect({ current, onBack }: { current: string; onBack(): void }) {
  return (
    <motion.div className="absolute inset-x-0 bottom-0 h-[74%] glass rounded-t-[2rem] flex flex-col"
      initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 24, stiffness: 220 }}>
      <div className="flex items-center gap-3 p-4 pb-2">
        <button onClick={onBack} className="btn-soft w-11 h-11 flex items-center justify-center"><ArrowLeft className="w-5 h-5" /></button>
        <div>
          <h2 className="font-display text-2xl font-bold leading-none">Путь миров</h2>
          <p className="text-xs text-muted-foreground mt-1">Мир меняется сам каждые 6 очищенных линий</p>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto px-4 pb-8 pt-2">
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3">
          {THEMES.map((t, i) => <Card key={t.id} t={t} i={i} active={t.id === current} />)}
        </div>
      </div>
    </motion.div>
  );
}
