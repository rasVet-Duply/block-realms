import { Crown, Flame, Snowflake, Zap, Skull, Leaf, Feather } from 'lucide-react';
import { getFrame } from '../game/economy';

const ORN = { laurel: Leaf, flame: Flame, snow: Snowflake, zap: Zap, crown: Crown, skull: Skull } as const;

/** Layered, animated avatar frame: glow, rotating conic ring, counter-rotating dashes, orbiting gems, ornament & wings. */
export default function AvatarFrame({ frameId, name, size = 64 }: { frameId: string; name: string; size?: number }) {
  const f = getFrame(frameId); const c = f.colors;
  const Orn = f.ornament !== 'none' ? ORN[f.ornament] : null;
  const fancy = f.rarity !== 'common';
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      {fancy && <div className="absolute -inset-[18%] rounded-full blur-md frame-pulse" style={{ background: `radial-gradient(circle, ${c[0]}aa, transparent 68%)` }} />}
      {f.wings && (['left', 'right'] as const).map((side) => (
        <Feather key={side} className="absolute top-1/2 frame-pulse" strokeWidth={1.5}
          style={{ width: size * 0.55, height: size * 0.55, color: c[1], [side]: -size * 0.38, transform: `translateY(-50%) rotate(${side === 'left' ? -60 : 150}deg) scaleX(${side === 'left' ? 1 : -1})`, filter: `drop-shadow(0 0 6px ${c[0]})` }} />
      ))}
      <div className="absolute inset-0 rounded-full frame-rot" style={{ background: `conic-gradient(${[...c, c[0]].join(',')})`, animationDuration: `${f.speed}s` }} />
      <div className="absolute inset-[7%] rounded-full bg-background" />
      {fancy && <div className="absolute inset-[9%] rounded-full border-2 border-dashed frame-rot-rev opacity-80" style={{ borderColor: c[1], animationDuration: `${f.speed * 2.5}s` }} />}
      <div className="absolute inset-[15%] rounded-full flex items-center justify-center font-display font-bold text-white overflow-hidden"
        style={{ background: `linear-gradient(145deg, ${c[0]}, ${c[c.length > 2 ? 2 : 1]} 60%, #00000066)`, fontSize: size * 0.32, textShadow: '0 1px 4px rgba(0,0,0,.6)' }}>
        <span className="absolute inset-0 bg-gradient-to-b from-white/35 to-transparent h-1/2" />
        <span className="relative">{name.slice(0, 2).toUpperCase()}</span>
      </div>
      {f.gems > 0 && (
        <div className="absolute inset-0 frame-rot" style={{ animationDuration: `${f.speed * 1.5}s` }}>
          {Array.from({ length: f.gems }).map((_, i) => {
            const a = (i / f.gems) * Math.PI * 2; const r = size / 2 - size * 0.035;
            return <span key={i} className="absolute rounded-[2px] rotate-45" style={{
              width: size * 0.09, height: size * 0.09, left: size / 2 + Math.cos(a) * r - size * 0.045, top: size / 2 + Math.sin(a) * r - size * 0.045,
              background: `linear-gradient(135deg, #fff, ${c[i % c.length]})`, boxShadow: `0 0 6px ${c[i % c.length]}` }} />;
          })}
        </div>
      )}
      {Orn && (
        <div className="absolute left-1/2 top-0 frame-float" style={{ filter: `drop-shadow(0 0 6px ${c[0]})` }}>
          <Orn style={{ width: size * 0.36, height: size * 0.36, color: c[1], fill: c[0] }} strokeWidth={1.5} />
        </div>
      )}
    </div>
  );
}
