import { useState } from 'react';
import { motion } from 'framer-motion';
import { Gift, ShieldCheck } from 'lucide-react';
import { Input } from '@project/components/ui/input';
import { ArrowLeft, Volume2, Music, Gauge, Trophy, Box, Square } from 'lucide-react';
import { Switch } from '@project/components/ui/switch';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@project/components/ui/alert-dialog';
import type { Quality, Settings } from '../game/storage';
import { cn } from '@project/components/lib/utils';

function Row({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl bg-white/5 border border-white/10 p-4">
      <div className="flex items-center gap-3 font-medium">{icon}{label}</div>
      {children}
    </div>
  );
}
const seg = (on: boolean) => cn('h-10 rounded-xl font-display font-semibold transition flex items-center justify-center gap-1.5', on ? 'bg-primary text-primary-foreground' : 'bg-white/10 hover:bg-white/15');
const QL: Record<Quality, string> = { low: 'Низкое', medium: 'Среднее', high: 'Высокое' };

interface Props { s: Settings; onChange(p: Partial<Settings>): void; onBack(): void; admin: boolean; infinite: boolean; onRedeem(code: string): void; onInfinite(v: boolean): void }

export default function SettingsPanel({ s, onChange, onBack, admin, infinite, onRedeem, onInfinite }: Props) {
  const [code, setCode] = useState('');
  return (
    <motion.div className="absolute inset-0 flex items-center justify-center p-5 bg-black/40" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <motion.div className="glass rounded-[2rem] w-full max-w-sm p-5 space-y-3 max-h-full overflow-y-auto" initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }}>
        <div className="flex items-center gap-3 mb-2">
          <button onClick={onBack} className="btn-soft w-11 h-11 flex items-center justify-center"><ArrowLeft className="w-5 h-5" /></button>
          <h2 className="font-display text-2xl font-bold">Настройки</h2>
        </div>
        <div className="rounded-2xl bg-white/5 border border-white/10 p-4">
          <div className="font-medium mb-3">Вид доски</div>
          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => onChange({ view: '2d' })} className={seg(s.view === '2d')}><Square className="w-4 h-4" /> 2D</button>
            <button onClick={() => onChange({ view: '3d' })} className={seg(s.view === '3d')}><Box className="w-4 h-4" /> 3D</button>
          </div>
          <p className="text-xs text-muted-foreground mt-2">2D — ровная доска сверху, фигуры остаются объёмными.</p>
        </div>
        <Row icon={<Volume2 className="w-5 h-5 text-primary" />} label="Звуки"><Switch checked={s.sound} onCheckedChange={(v) => onChange({ sound: v })} /></Row>
        <Row icon={<Music className="w-5 h-5 text-primary" />} label="Музыка"><Switch checked={s.music} onCheckedChange={(v) => onChange({ music: v })} /></Row>
        <div className="rounded-2xl bg-white/5 border border-white/10 p-4">
          <div className="flex items-center gap-3 font-medium mb-3"><Gauge className="w-5 h-5 text-primary" />Качество графики</div>
          <div className="grid grid-cols-3 gap-2">
            {(['low', 'medium', 'high'] as Quality[]).map((q) => <button key={q} onClick={() => onChange({ quality: q })} className={seg(s.quality === q)}>{QL[q]}</button>)}
          </div>
        </div>
        <div className="rounded-2xl bg-white/5 border border-white/10 p-4">
          <div className="flex items-center gap-3 font-medium mb-3"><Gift className="w-5 h-5 text-primary" />Промокод</div>
          <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); if (code.trim()) { onRedeem(code.trim()); setCode(''); } }}>
            <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="Введи код" className="h-11 bg-black/30" />
            <button type="submit" className="btn-primary h-11 px-4 text-sm shrink-0">Ввести</button>
          </form>
        </div>
        {admin && (
          <Row icon={<ShieldCheck className="w-5 h-5 text-accent" />} label="Админ: бесконечные монеты"><Switch checked={infinite} onCheckedChange={onInfinite} /></Row>
        )}
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <button className="btn-soft w-full h-12 flex items-center justify-center gap-2 text-destructive"><Trophy className="w-4 h-4" /> Сбросить рекорд</button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Сбросить рекорд?</AlertDialogTitle>
              <AlertDialogDescription>Рекорд {s.best.toLocaleString()} будет обнулён.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Отмена</AlertDialogCancel>
              <AlertDialogAction onClick={() => onChange({ best: 0 })}>Сбросить</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </motion.div>
    </motion.div>
  );
}
