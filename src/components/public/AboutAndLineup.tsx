import React, { useState } from 'react';
import { ChevronDown, MapPin, ExternalLink, ShieldAlert, Disc3, Info, Sparkles } from 'lucide-react';
import { EventConfig } from '../../types';

interface AboutAndLineupProps {
  config: EventConfig;
}

export const AboutAndLineup: React.FC<AboutAndLineupProps> = ({ config }) => {
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const toggleFaq = (idx: number) => {
    setOpenFaq(openFaq === idx ? null : idx);
  };

  return (
    <div className="space-y-24 py-12">
      {/* 1. SOBRE A FESTA */}
      <section id="sobre" className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-zinc-900/60 border border-zinc-800 rounded-3xl p-6 sm:p-10 backdrop-blur-md relative overflow-hidden">
          <div className="absolute top-0 right-0 w-72 h-72 bg-fuchsia-600/10 rounded-full blur-[100px] pointer-events-none"></div>

          <div className="flex flex-col md:flex-row items-center gap-8">
            <div className="w-full md:w-1/2 space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-950/60 border border-violet-500/30 text-xs text-violet-300 font-semibold">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Experiência Exclusiva</span>
              </div>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-white font-['Syne',sans-serif]">
                A Noite Mais Esperada de Goiânia
              </h2>
              <p className="text-sm sm:text-base text-zinc-300 leading-relaxed">
                {config.aboutText}
              </p>
              <div className="pt-2 flex flex-wrap gap-3 text-xs text-zinc-400">
                <span className="px-3 py-1.5 rounded-lg bg-zinc-800 border border-zinc-700/60">
                  Som Funktion-One
                </span>
                <span className="px-3 py-1.5 rounded-lg bg-zinc-800 border border-zinc-700/60">
                  Iluminação Laser Show
                </span>
                <span className="px-3 py-1.5 rounded-lg bg-zinc-800 border border-zinc-700/60">
                  Ambiente Climatizado
                </span>
                <span className="px-3 py-1.5 rounded-lg bg-zinc-800 border border-zinc-700/60">
                  Estacionamento com Manobrista
                </span>
              </div>
            </div>

            <div className="w-full md:w-1/2 relative rounded-2xl overflow-hidden group shadow-2xl border border-zinc-800">
              <img
                src={config.theme.djPhotoUrl}
                alt={config.theme.djName}
                className="w-full h-72 sm:h-80 object-cover object-center group-hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/20 to-transparent"></div>
              <div className="absolute bottom-4 left-4 right-4">
                <span className="text-[11px] font-mono text-fuchsia-400 uppercase tracking-widest font-bold">
                  Headliner Oficial
                </span>
                <h4 className="text-xl font-bold text-white font-['Syne',sans-serif]">
                  {config.theme.djName}
                </h4>
                <p className="text-xs text-zinc-400">
                  Foto do DJ e atrações editáveis no painel admin
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. LINE-UP / DJS */}
      <section id="lineup" className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/60 border border-cyan-500/30 text-xs text-cyan-300 font-semibold mb-3">
            <Disc3 className="w-3.5 h-3.5 text-cyan-400 animate-spin" />
            <span>Horários & Atrações</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white font-['Syne',sans-serif] uppercase">
            Line-Up Oficial
          </h2>
          <p className="text-xs sm:text-sm text-zinc-400 mt-2">
            Sets ininterruptos do warm-up ao amanhecer
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
          {config.lineup.map((item, idx) => (
            <div
              key={idx}
              className="bg-zinc-900/80 border border-zinc-800 hover:border-fuchsia-500/50 rounded-2xl overflow-hidden transition-all duration-300 hover:-translate-y-1 group"
            >
              <div className="h-48 overflow-hidden relative">
                <img
                  src={item.image}
                  alt={item.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute top-3 right-3 px-2.5 py-1 rounded-md bg-zinc-950/80 backdrop-blur-md border border-zinc-700/60 text-[11px] font-mono text-fuchsia-400 font-bold">
                  {item.time}
                </div>
              </div>
              <div className="p-5">
                <h3 className="text-lg font-bold text-white font-['Syne',sans-serif] group-hover:text-fuchsia-400 transition-colors">
                  {item.name}
                </h3>
                <p className="text-xs text-zinc-400 mt-1">{item.role}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 3. COMO CHEGAR (Espaço 82 Eventos, Goiânia) */}
      <section id="local" className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-zinc-900/60 border border-zinc-800 rounded-3xl p-6 sm:p-8 backdrop-blur-md">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-6">
            <div>
              <div className="inline-flex items-center gap-1.5 text-xs text-cyan-400 font-semibold mb-2">
                <MapPin className="w-4 h-4" />
                <span>Localização Privilegiada</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-white font-['Syne',sans-serif]">
                Como Chegar no {config.venueName}
              </h2>
              <p className="text-sm text-zinc-400 mt-1">
                {config.venueAddress} • {config.venueCity}
              </p>
            </div>

            <a
              href={config.venueMapUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-white text-xs sm:text-sm font-semibold transition-all shadow-md self-start md:self-auto"
            >
              <span>Abrir no Google Maps</span>
              <ExternalLink className="w-4 h-4 text-cyan-400" />
            </a>
          </div>

          <div className="w-full h-64 sm:h-80 rounded-2xl overflow-hidden border border-zinc-800 relative bg-zinc-950">
            <iframe
              title="Mapa Espaço 82 Eventos Goiânia"
              src={config.venueEmbedUrl}
              width="100%"
              height="100%"
              style={{ border: 0, filter: 'invert(90%) hue-rotate(180deg)' }}
              allowFullScreen={false}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            ></iframe>
          </div>
        </div>
      </section>

      {/* 4. REGRAS DE ENTRADA (18+) */}
      <section id="regras" className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-gradient-to-r from-red-950/30 via-zinc-900/80 to-zinc-900/80 border border-red-900/40 rounded-3xl p-6 sm:p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 rounded-xl bg-red-900/30 border border-red-700/50 text-red-400">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-white font-['Syne',sans-serif]">
                Regras de Entrada & Classificação ({config.minAge}+)
              </h2>
              <p className="text-xs text-zinc-400">
                Leia com atenção para garantir acesso tranquilo ao evento
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {config.rules.map((rule, idx) => (
              <div
                key={idx}
                className="flex items-start gap-3 p-3.5 rounded-xl bg-zinc-950/60 border border-zinc-800/80 text-xs sm:text-sm text-zinc-300"
              >
                <span className="font-mono font-bold text-red-400 mt-0.5">{idx + 1}.</span>
                <span>{rule}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 5. FAQ SANFONADO */}
      <section id="faq" className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-1.5 text-xs text-fuchsia-400 font-semibold mb-2">
            <Info className="w-4 h-4" />
            <span>Tire Suas Dúvidas</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white font-['Syne',sans-serif]">
            Perguntas Frequentes
          </h2>
        </div>

        <div className="space-y-3">
          {config.faqs.map((faq, idx) => {
            const isOpen = openFaq === idx;
            return (
              <div
                key={idx}
                className="rounded-2xl border border-zinc-800/80 bg-zinc-900/60 overflow-hidden transition-colors"
              >
                <button
                  onClick={() => toggleFaq(idx)}
                  className="w-full p-4 sm:p-5 text-left flex items-center justify-between gap-4 cursor-pointer hover:bg-zinc-800/40 transition-colors"
                >
                  <span className="text-sm sm:text-base font-semibold text-zinc-200">
                    {faq.question}
                  </span>
                  <ChevronDown
                    className={`w-5 h-5 text-zinc-400 shrink-0 transition-transform duration-200 ${
                      isOpen ? 'rotate-180 text-fuchsia-400' : ''
                    }`}
                  />
                </button>
                {isOpen && (
                  <div className="px-5 pb-5 pt-1 text-xs sm:text-sm text-zinc-400 leading-relaxed border-t border-zinc-800/40">
                    {faq.answer}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
};
