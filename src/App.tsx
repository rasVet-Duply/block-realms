import { useEffect, useRef, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { toast, Toaster } from 'sonner';
import { Engine, type BonusType } from './game/Engine';
import { getTheme } from './game/themes';
import { loadSettings, saveSettings, type Settings } from './game/storage';
import { loadProfile, saveProfile, finishGame, coinsForScore, computePerks, type Profile, type ShopItem } from './game/economy';
import { sfx } from './game/audio';
import MainMenu from './components/MainMenu';
import WorldSelect from './components/WorldSelect';
import SettingsPanel from './components/SettingsPanel';
import Shop from './components/Shop';
import Leaderboard from './components/Leaderboard';
import Hud, { type ComboInfo, type Banner } from './components/Hud';
import { PauseOverlay, GameOverOverlay } from './components/Overlays';

type Screen = 'menu' | 'game' | 'worlds' | 'settings' | 'shop' | 'leaders';

const BONUS_TEXT: Record<BonusType, Banner['text']> = {
  coins: '💰 +40 монет',
  line: '⚡ Линия очистки!',
  bomb: '💣 Взрыв 3×3!'
};

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engine = useRef<Engine | null>(null);

  const [settings, setSettings] = useState<Settings>(loadSettings);
  const [profile, setProfile] = useState<Profile>(loadProfile);

  const sRef = useRef(settings);
  sRef.current = settings;

  const perksRef = useRef(computePerks(profile));
  perksRef.current = computePerks(profile);

  const [screen, setScreen] = useState<Screen>('menu');
  const [back, setBack] = useState<Screen>('menu');
  const [paused, setPaused] = useState(false);
  const [started, setStarted] = useState(false);
  const [score, setScore] = useState(0);
  const [boost, setBoost] = useState(0);
  const [combo, setCombo] = useState<ComboInfo | null>(null);
  const [banner, setBanner] = useState<Banner | null>(null);

  const [over, setOver] = useState<{
    score: number;
    isNew: boolean;
    coins: number;
  } | null>(null);

  const bestAtStart = useRef(settings.best);

  const update = (p: Partial<Settings>) =>
    setSettings((s) => {
      const n = { ...s, ...p };
      saveSettings(n);
      return n;
    });

  const updateProfile = (fn: (p: Profile) => Profile) =>
    setProfile((p) => {
      const n = fn(p);
      saveProfile(n);
      return n;
    });

  const showBanner = (text: string, sub?: string) => {
    const key = Date.now() + Math.random();
    setBanner({ text, sub, key });

    setTimeout(() => {
      setBanner((b) => (b?.key === key ? null : b));
    }, 1500);
  };

  useEffect(() => {
    document.documentElement.classList.add('dark');

    const s = sRef.current;

    sfx.setSound(s.sound);
    sfx.setMusic(s.music);

    const e = new Engine(
      canvasRef.current!,
      s.quality,
      s.themeId,
      s.view,
      {
        onScore: (v) => {
          setScore(v);
          if (v > sRef.current.best) update({ best: v });
        },

        onCombo: (streak, lines, gain) => {
          const key = Date.now();
          setCombo({ streak, lines, gain, key });

          setTimeout(() => {
            setCombo((c) =>
              c?.key === key ? { ...c, key: -1 } : c
            );
          }, 1200);
        },

        onCoins: (raw) => {
          const n = Math.round(raw * perksRef.current.coins);

          updateProfile((p) => ({
            ...p,
            coins: p.coins + n,
            totalCoins: p.totalCoins + n
          }));
        },

        onBoost: (m) =>
          setBoost((prev) => {
            if (m > prev) {
              showBanner(
                '🔥 БУСТ x2!',
                `2 очистки подряд — двойные очки ${m} хода`
              );
            }
            return m;
          }),

        onWorld: (id) => {
          update({ themeId: id });
          showBanner('🌍 Новый мир', getTheme(id).name);
        },

        onBonus: (t) => showBanner(BONUS_TEXT[t]),

        onGameOver: (v) => {
          const coins = Math.round(
            coinsForScore(v) * perksRef.current.coins
          );

          updateProfile((p) => finishGame(p, v, coins));

          setOver({
            score: v,
            isNew: v > bestAtStart.current && v > 0,
            coins
          });
        }
      }
    );

    const p = loadProfile();

    e.setEffects(p.equipped.clear, p.equipped.place);

    engine.current = e;

    return () => e.dispose();
  }, []);

  useEffect(() => {
    const e = engine.current;
    const q = profile.equipped;

    e?.setEffects(q.clear, q.place);
    e?.setPerks(computePerks(profile));

    e?.setPet(
      q.pet
        ? {
            pet: q.pet,
            wings: q.wings,
            crown: q.crown,
            glasses: q.glasses
          }
        : null
    );
  }, [profile.equipped]);

  useEffect(() => {
    engine.current?.setPaused(
      screen !== 'game' || paused || !!over
    );

    engine.current?.setMenuMode(screen === 'menu');
  }, [screen, paused, over]);

  const click = () => {
    sfx.unlock();
    sfx.play('click');
  };

  const newGame = () => {
    click();
    bestAtStart.current = sRef.current.best;

    engine.current?.newGame();

    setOver(null);
    setPaused(false);
    setCombo(null);
    setStarted(true);
    setScreen('game');
  };

  const play = () => {
    if (!started || over) {
      newGame();
    } else {
      click();
      setPaused(false);
      setScreen('game');
    }
  };

  const open = (s: Screen) => {
    click();
    setBack(screen);
    setScreen(s);
  };

  const goBack = () => {
    click();
    setScreen(back);
  };

  const changeSettings = (p: Partial<Settings>) => {
    click();
    update(p);

    if (p.sound !== undefined) sfx.setSound(p.sound);
    if (p.music !== undefined) sfx.setMusic(p.music);
    if (p.quality) engine.current?.setQuality(p.quality);
    if (p.view) engine.current?.setView(p.view);

    if (p.best === 0) bestAtStart.current = 0;
  };

  const buy = (i: ShopItem) => {
    sfx.unlock();
    sfx.play('combo');

    updateProfile((p) => ({
      ...p,
      coins: p.infinite ? p.coins : p.coins - i.price,
      owned: [...p.owned, i.id],
      equipped: {
        ...p.equipped,
        [i.kind]: i.id
      }
    }));

    toast.success(`Куплено: ${i.name}`);
  };

  const equip = (i: ShopItem) => {
    click();

    updateProfile((p) => ({
      ...p,
      equipped: {
        ...p.equipped,
        [i.kind]: i.id
      }
    }));
  };

  const unequip = (i: ShopItem) => {
    click();

    updateProfile((p) => ({
      ...p,
      equipped: {
        ...p.equipped,
        [i.kind]: ''
      }
    }));
  };

  const redeem = (code: string) => {
    sfx.unlock();

    if (code.toLowerCase() === 'welcome1') {
      if (profile.redeemed.includes('welcome1')) {
        toast.error('Этот промокод уже использован');
        return;
      }

      updateProfile((p) => ({
        ...p,
        coins: p.coins + 1000,
        totalCoins: p.totalCoins + 1000,
        redeemed: [...p.redeemed, 'welcome1']
      }));

      sfx.play('combo');
      toast.success('+1000 монет!');

    } else if (code === 'rasder') {
      updateProfile((p) => ({
        ...p,
        admin: true
      }));

      sfx.play('combo');
      toast.success('Админ-режим открыт');

    } else {
      toast.error('Неверный промокод');
    }
  };

  const theme = getTheme(settings.themeId);

  const inGame =
    screen === 'game' ||
    (back === 'game' && screen !== 'menu');

  return (
    <div className="fixed inset-0 overflow-hidden bg-background">

      <div className="absolute inset-0">
        <canvas
          ref={canvasRef}
          className="block w-full h-full"
        />
      </div>

      {inGame && (
        <Hud
          score={score}
          best={settings.best}
          coins={
            profile.infinite
              ? '∞'
              : profile.coins.toLocaleString()
          }
          boost={boost}
          combo={screen === 'game' ? combo : null}
          banner={screen === 'game' ? banner : null}
          onPause={() => {
            click();
            setPaused(true);
          }}
        />
      )}

      <AnimatePresence>

        {screen === 'menu' && (
          <MainMenu
            key="menu"
            theme={theme}
            best={settings.best}
            profile={profile}
            canContinue={started && !over}
            onPlay={play}
            onNew={newGame}
            onWorlds={() => open('worlds')}
            onSettings={() => open('settings')}
            onShop={() => open('shop')}
            onLeaders={() => open('leaders')}
          />
        )}

        {screen === 'game' && paused && !over && (
          <PauseOverlay
            key="pause"
            onResume={() => {
              click();
              setPaused(false);
            }}
            onRestart={newGame}
            onShop={() => open('shop')}
            onSettings={() => open('settings')}
            onMenu={() => {
              click();
              setPaused(false);
              setScreen('menu');
            }}
          />
        )}

        {screen === 'game' && over && (
          <GameOverOverlay
            key="over"
            score={over.score}
            best={settings.best}
            isNew={over.isNew}
            coins={over.coins}
            onAgain={newGame}
            onShop={() => open('shop')}
            onMenu={() => {
              click();
              setScreen('menu');
            }}
          />
        )}

        {screen === 'worlds' && (
          <WorldSelect
            key="worlds"
            current={settings.themeId}
            onBack={goBack}
          />
        )}

        {screen === 'settings' && (
          <SettingsPanel
            key="settings"
            s={settings}
            onChange={changeSettings}
            onBack={goBack}
            admin={profile.admin}
            infinite={profile.infinite}
            onRedeem={redeem}
            onInfinite={(v) => {
              click();
              updateProfile((p) => ({
                ...p,
                infinite: v
              }));
            }}
          />
        )}

        {screen === 'shop' && (
          <Shop
            key="shop"
            profile={profile}
            onBuy={buy}
            onEquip={equip}
            onUnequip={unequip}
            onBack={goBack}
          />
        )}

        {screen === 'leaders' && (
          <Leaderboard
            key="leaders"
            profile={profile}
            onBack={goBack}
          />
        )}

      </AnimatePresence>

      <Toaster position="top-center" />

    </div>
  );
            }
