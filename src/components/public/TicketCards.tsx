import React from 'react';
import { Check, Sparkles, AlertCircle, Zap, Shield, Crown } from 'lucide-react';
import { EventConfig, TicketTypeConfig } from '../../types';
import { formatCurrencyBRL } from '../../utils/validators';

interface TicketCardsProps {
  config: EventConfig;
  onSelectTicket: (ticket: TicketTypeConfig) => void;
}

export const TicketCards: React.FC<TicketCardsProps> = ({ config, onSelectTicket }) => {
  const totalSold = config.ticketTypes.reduce((acc, t) => acc + (t.soldQuantity || 0), 0);
  const remainingTotal = Math.max(0, config.totalCapacity - totalSold);
  const isOverallSoldOut = remainingTotal <= 0;

  return (
    <section id="ingressos" className="py-16 sm:py-24 relative">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto mb-12 sm:mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-fuchsia-950/60 border border-fuchsia-500/30 text-xs text-fuchsia-300 font-semibold mb-3">
            <Sparkles className="w-3.5 h-3.5 text-fuchsia-400" />
            <span>Lotes Limitados</span>
          </div>
          <h2 className="text-3xl sm:text-5xl font-black text-white uppercase tracking-tight font-['Syne',sans-serif]">
            Escolha seu Ingresso
          </h2>
          <p className="mt-3 text-sm sm:text-base text-zinc-400">
            Garanta sua entrada antecipada com QR Code seguro. Pagamento instantâneo via Pix com aprovação imediata.
          </p>

          {/* Capacity bar */}
          <div className="mt-6 p-4 rounded-2xl bg-zinc-900/80 border border-zinc-800 text-left">
            <div className="flex items-center justify-between text-xs sm:text-sm text-zinc-300 mb-2">
              <span className="font-medium flex items-center gap-1.5">
                <Shield className="w-4 h-4 text-cyan-400" />
                Ocupação do Evento ({config.venueName})
              </span>
              <span className="font-mono font-bold text-fuchsia-400">
                {totalSold} / {config.totalCapacity} ingressos emitidos
              </span>
            </div>
            <div className="w-full bg-zinc-800 rounded-full h-2.5 overflow-hidden">
              <div
                className="bg-gradient-to-r from-violet-500 to-fuchsia-500 h-2.5 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, (totalSold / config.totalCapacity) * 100)}%` }}
              ></div>
            </div>
            <div className="mt-2 flex items-center justify-between text-[11px] text-zinc-400 font-mono">
              <span>Capacidade Total: {config.totalCapacity} pessoas</span>
              <span>Restam apenas: {remainingTotal} vagas</span>
            </div>
          </div>
        </div>

        {/* Tickets Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {config.ticketTypes.map((ticket) => {
            const sold = ticket.soldQuantity || 0;
            const remaining = Math.max(0, ticket.maxQuantity - sold);
            const isSoldOut = remaining <= 0 || isOverallSoldOut;
            const isAlmostSoldOut = remaining <= 15 && !isSoldOut;
            const isOpenBar = ticket.id === 'open-bar';

            return (
              <div
                key={ticket.id}
                className={`relative rounded-3xl p-6 sm:p-8 flex flex-col justify-between transition-all duration-300 ${
                  isOpenBar
                    ? 'bg-gradient-to-b from-zinc-900/90 to-zinc-950/90 border-2 border-fuchsia-500/50 shadow-2xl shadow-fuchsia-950/40 hover:border-fuchsia-400'
                    : 'bg-zinc-900/70 border border-zinc-800 hover:border-zinc-700 shadow-xl'
                }`}
              >
                {/* Glowing top badge */}
                <div className="flex items-center justify-between gap-2 mb-4">
                  <span
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                      isOpenBar
                        ? 'bg-fuchsia-500/20 text-fuchsia-300 border border-fuchsia-500/40'
                        : 'bg-violet-500/20 text-violet-300 border border-violet-500/40'
                    }`}
                  >
                    {isOpenBar ? <Crown className="w-3.5 h-3.5 text-fuchsia-400" /> : <Zap className="w-3.5 h-3.5 text-violet-400" />}
                    {ticket.badge || (isOpenBar ? 'Open Bar Premium' : 'Entrada Geral')}
                  </span>

                  <span className="text-xs font-mono font-medium text-zinc-400 bg-zinc-800/80 px-2.5 py-0.5 rounded-lg border border-zinc-700/50">
                    {ticket.batchName}
                  </span>
                </div>

                {/* Status Badges */}
                {isSoldOut ? (
                  <div className="mb-4 inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-red-950/70 border border-red-500/50 text-red-300 text-xs font-bold animate-pulse">
                    <AlertCircle className="w-4 h-4" />
                    <span>ESGOTADO NESTE LOTE</span>
                  </div>
                ) : isAlmostSoldOut ? (
                  <div className="mb-4 inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-amber-950/70 border border-amber-500/50 text-amber-300 text-xs font-bold animate-pulse">
                    <AlertCircle className="w-4 h-4" />
                    <span>ÚLTIMAS {remaining} UNIDADES DISPONÍVEIS!</span>
                  </div>
                ) : (
                  <div className="mb-4 text-xs text-zinc-400 flex items-center justify-between font-mono">
                    <span>Disponibilidade:</span>
                    <span className="text-emerald-400 font-bold">{remaining} de {ticket.maxQuantity} vagas</span>
                  </div>
                )}

                {/* Title & Price */}
                <div>
                  <h3 className="text-2xl sm:text-3xl font-extrabold text-white font-['Syne',sans-serif]">
                    {ticket.name}
                  </h3>
                  <p className="mt-2 text-xs sm:text-sm text-zinc-400 leading-relaxed min-h-[40px]">
                    {ticket.description}
                  </p>

                  <div className="mt-6 flex items-baseline gap-2">
                    <span className="text-4xl sm:text-5xl font-black text-white font-mono tracking-tight">
                      {ticket.price > 0 ? formatCurrencyBRL(ticket.price) : 'R$ --,--'}
                    </span>
                    <span className="text-xs text-zinc-400 font-medium">/ unidade</span>
                  </div>
                  {isOpenBar && (
                    <p className="text-[11px] text-fuchsia-300 font-medium mt-1">
                      * Limite rigoroso de apenas 60 pessoas com open bar liberado
                    </p>
                  )}
                </div>

                {/* Features List */}
                <div className="mt-8 pt-6 border-t border-zinc-800/80">
                  <p className="text-xs uppercase font-semibold text-zinc-400 tracking-wider mb-4">
                    O que está incluso:
                  </p>
                  <ul className="space-y-3">
                    {ticket.features.map((feature, idx) => (
                      <li key={idx} className="flex items-start gap-2.5 text-xs sm:text-sm text-zinc-300">
                        <div className="mt-0.5 rounded-full p-0.5 bg-fuchsia-500/20 text-fuchsia-400 shrink-0">
                          <Check className="w-3.5 h-3.5" />
                        </div>
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Buy Button */}
                <div className="mt-8">
                  <button
                    disabled={isSoldOut || !config.salesEnabled}
                    onClick={() => onSelectTicket(ticket)}
                    className={`w-full py-3.5 sm:py-4 px-6 rounded-2xl font-extrabold text-sm sm:text-base tracking-wide transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer ${
                      isSoldOut || !config.salesEnabled
                        ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed border border-zinc-700'
                        : isOpenBar
                        ? 'bg-gradient-to-r from-fuchsia-600 to-pink-600 hover:from-fuchsia-500 hover:to-pink-500 text-white shadow-lg shadow-fuchsia-600/30 hover:scale-[1.02] active:scale-[0.98]'
                        : 'bg-zinc-800 hover:bg-zinc-700 text-white border border-zinc-700 hover:border-violet-500 hover:scale-[1.02] active:scale-[0.98]'
                    }`}
                  >
                    {isSoldOut ? (
                      'INGRESSO ESGOTADO'
                    ) : !config.salesEnabled ? (
                      'VENDAS PAUSADAS'
                    ) : (
                      <>
                        <span>COMPRAR {ticket.name.toUpperCase()}</span>
                        <Zap className="w-4 h-4 text-amber-300" />
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
