import React, { useEffect, useState } from 'react';
import { Clock } from 'lucide-react';
import { useI18n } from '../i18n/I18nContext.tsx';

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  isReached: boolean;
}

// Target: Tuesday, December 1, 2026 at 11:30 AM Africa/Douala (UTC+1) -> 10:30:00Z
const TARGET_WEDDING_TIMESTAMP = new Date('2026-12-01T11:30:00+01:00').getTime();

function computeTimeLeft(): TimeLeft {
  const now = Date.now();
  const diff = TARGET_WEDDING_TIMESTAMP - now;
  if (diff <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, isReached: true };
  }
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
  const minutes = Math.floor((diff / 1000 / 60) % 60);
  const seconds = Math.floor((diff / 1000) % 60);
  return { days, hours, minutes, seconds, isReached: false };
}

export const WeddingCountdown: React.FC<{ variant?: 'hero' | 'card' }> = ({
  variant = 'hero',
}) => {
  const { lang } = useI18n();
  const [timeLeft, setTimeLeft] = useState<TimeLeft>(() => computeTimeLeft());

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(computeTimeLeft());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const units = [
    {
      value: String(timeLeft.days).padStart(2, '0'),
      label: lang === 'fr' ? 'Jours' : 'Days',
    },
    {
      value: String(timeLeft.hours).padStart(2, '0'),
      label: lang === 'fr' ? 'Heures' : 'Hours',
    },
    {
      value: String(timeLeft.minutes).padStart(2, '0'),
      label: lang === 'fr' ? 'Minutes' : 'Minutes',
    },
    {
      value: String(timeLeft.seconds).padStart(2, '0'),
      label: lang === 'fr' ? 'Secondes' : 'Seconds',
    },
  ];

  const isHero = variant === 'hero';

  return (
    <div
      aria-label={
        lang === 'fr'
          ? 'Compte à rebours avant le mariage du 1er décembre 2026'
          : 'Countdown to December 1, 2026 wedding'
      }
      className="w-full"
    >
      <div
        className={`flex items-center justify-center gap-1.5 sm:gap-2 text-[11px] sm:text-xs font-medium tracking-wider sm:tracking-widest uppercase mb-3 sm:mb-4 px-2 text-center ${
          isHero ? 'text-[#F6D6E2]' : 'text-[#A93665]'
        }`}
      >
        <Clock className="w-3.5 h-3.5 shrink-0" />
        <span>
          {lang === 'fr'
            ? 'Compte à rebours · Mardi 1er Décembre 2026'
            : 'Countdown · Tuesday, December 1, 2026'}
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-4 max-w-xl mx-auto">
        {units.map((unit) => (
          <div
            key={unit.label}
            className={`rounded-2xl p-3 sm:p-4 text-center transition-transform ${
              isHero
                ? 'bg-black/45 backdrop-blur-md border border-[#F6D6E2]/35 text-white shadow-[0_8px_30px_rgba(0,0,0,0.35)]'
                : 'bg-[#FFF8FB] border border-[#EEDDE5] text-[#30232B]'
            }`}
          >
            <p
              className={`font-serif-title text-2xl sm:text-4xl md:text-5xl font-semibold tabular-nums leading-none ${
                isHero ? 'text-white' : 'text-[#762747]'
              }`}
            >
              {unit.value}
            </p>
            <p
              className={`text-[11px] sm:text-xs font-medium mt-1.5 tracking-wide ${
                isHero ? 'text-[#F6D6E2]' : 'text-[#796670]'
              }`}
            >
              {unit.label}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};
