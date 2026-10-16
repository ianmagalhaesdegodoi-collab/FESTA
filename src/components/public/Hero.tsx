import React, { useState, useEffect } from 'react';
import { Calendar, Clock, MapPin, Sparkles, ArrowRight, ShieldCheck, Flame } from 'lucide-react';
import { EventConfig } from '../../types';

interface HeroProps {
  config: EventConfig;
  onBuyClick: () => void;
}

export const Hero: React.FC<HeroProps> = ({ config, onBuyClick }) => {
  const [timeLeft, setTimeLeft] = useState<{ days: number; hours: number; minutes: number; seconds: number }>({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
  });

  useEffect(() => {
    const calculateTime = () => {
      const eventTarget = new Date(`${config.eventDate}T${config.eventTime}:00`);
      const now = new Date();
      const diff = eventTarget.getTime() - now.getTime();

      if (diff <= 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
      const minutes = Math.floor((diff / 1000 / 60) % 60);
      const seconds = Math.floor((diff / 1000) % 60);

      setTimeLeft({ days, hours, minutes, seconds });
    };

    calculateTime();
    const interval = setInterval(calculateTime, 1000);
    return () => clearInterval(interval);
  }, [config.eventDate, config.eventTime]);

  const formattedDate = new Date(`${config.eventDate}T${config.eventTime}`).toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return (
    <div className="relative overflow-hidden pt-8 pb-16 sm:pb-24 lg:pt-12">
      {/* Background Banner with gradient vignette overlay */}
      <div className="absolute inset-0 z-0">
        <img
          src={config.theme.bannerUrl}
          alt={config.eventName}
          className="w-full h-full object-cover object-center opacity-30 filter brightness-75 scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-zinc-950/70 via-zinc-950/85 to-zinc-950"></div>
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-fuchsia-600/20 rounded-full blur-[140px] pointer-events-none"></div>
        <div className="absolute top-1/3 -left-40 w-[400px] h-[400px] bg-violet-600/20 rounded-full blur-[120px] pointer-events-none"></div>
      </div>

      <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        {/* Banner Edit Tip Banner */}
        <div className="inline-flex items-center gap-2 px-3 py-1 mb-6 rounded-full bg-zinc-900/90 border border-fuchsia-500/30 text-xs text-zinc-300 shadow-lg shadow-fuchsia-950/40">
          <Sparkles className="w-3.5 h-3.5 text-fuchsia-400" />
          <span className="text-zinc-200 font-medium">Visual Premium & Noturno</span>
          <span className="text-zinc-500">•</span>
          <span className="text-zinc-400 text-[11px]">Artes e Textos Editáveis no Painel Admin</span>
        </div>

        {/* Main Event Title */}
        <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black tracking-tight text-white font-['Syne',sans-serif] uppercase leading-[1.08] drop-shadow-2xl">
          <span className="bg-gradient-to-r from-white via-zinc-200 to-zinc-400 bg-clip-text text-transparent">
            {config.eventName}
          </span>
        </h1>

        {/* Subtitle */}
        <p className="mt-4 sm:mt-6 text-base sm:text-xl text-zinc-300 max-w-2xl mx-auto font-normal leading-relaxed">
          {config.eventSubtitle}
        </p>

        {/* Info Badges (Date, Time, Venue) */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3 sm:gap-4 text-xs sm:text-sm">
          <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-zinc-900/80 border border-zinc-800 text-zinc-200 backdrop-blur-md">
            <Calendar className="w-4 h-4 text-fuchsia-400" />
            <span className="capitalize">{formattedDate}</span>
          </div>

          <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-zinc-900/80 border border-zinc-800 text-zinc-200 backdrop-blur-md">
            <Clock className="w-4 h-4 text-violet-400" />
            <span>Abertura: {config.eventTime}h</span>
          </div>

          <a
            href="#local"
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-zinc-900/80 hover:bg-zinc-800 border border-zinc-800 text-zinc-200 backdrop-blur-md transition-colors"
          >
            <MapPin className="w-4 h-4 text-cyan-400" />
            <span>{config.venueName} • {config.venueCity}</span>
          </a>
        </div>

        {/* Countdown Timer */}
        <div className="mt-10 max-w-md mx-auto">
          <p className="text-xs uppercase tracking-widest text-zinc-400 mb-3 font-semibold">
            Contagem regressiva para a festa
          </p>
          <div className="grid grid-cols-4 gap-2 sm:gap-3">
            {[
              { label: 'Dias', value: timeLeft.days },
              { label: 'Horas', value: timeLeft.hours },
              { label: 'Min', value: timeLeft.minutes },
              { label: 'Seg', value: timeLeft.seconds },
            ].map((unit, idx) => (
              <div
                key={idx}
                className="bg-zinc-900/90 border border-zinc-800/80 rounded-2xl p-2.5 sm:p-3 text-center shadow-lg relative overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-t from-fuchsia-600/10 to-transparent pointer-events-none"></div>
                <div className="text-2xl sm:text-3xl font-black text-white font-mono">
                  {String(unit.value).padStart(2, '0')}
                </div>
                <div className="text-[10px] sm:text-xs text-zinc-400 font-medium uppercase mt-0.5">
                  {unit.label}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* CTA Button */}
        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
          <button
            onClick={onBuyClick}
            className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-gradient-to-r from-fuchsia-600 via-pink-600 to-violet-600 hover:from-fuchsia-500 hover:to-violet-500 text-white font-extrabold text-base sm:text-lg tracking-wide shadow-xl shadow-fuchsia-600/30 hover:shadow-fuchsia-600/50 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3 cursor-pointer"
          >
            <Flame className="w-5 h-5 text-amber-300 animate-pulse" />
            <span>GARANTIR INGRESSO PIX</span>
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>

        {/* Micro guarantees */}
        <div className="mt-6 flex flex-wrap items-center justify-center gap-6 text-xs text-zinc-400">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Emissão Instantânea com QR Code</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping"></span>
            <span>Pix Automático com Confirmação Rápida</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-amber-400 font-bold">18+</span>
            <span>Acesso Restrito a Maiores de Idade</span>
          </div>
        </div>
      </div>
    </div>
  );
};
