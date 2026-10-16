import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, Ticket as TicketIcon, ArrowLeft, ArrowRight, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Ticket, EventConfig } from '../types';
import { lookupTickets } from '../services/api';
import { formatCPF, formatWhatsApp, maskCPF } from '../utils/validators';

export const MyTicketsSearchPage: React.FC = () => {
  const [cpf, setCpf] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [eventConfig, setEventConfig] = useState<EventConfig | null>(null);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState('');

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSearched(false);
    setLoading(true);

    try {
      const data = await lookupTickets({ cpf, whatsapp });
      setTickets(data.tickets || []);
      setEventConfig(data.config);
      setSearched(true);
    } catch (err: any) {
      setError(err.message || 'Nenhum ingresso localizado com os dados informados.');
      setSearched(true);
      setTickets([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 py-12 px-4 sm:px-6">
      <div className="max-w-xl mx-auto space-y-6">
        {/* Back Link */}
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Voltar ao site do evento</span>
        </Link>

        {/* Header */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-fuchsia-600/20 border border-fuchsia-500/40 text-fuchsia-400 flex items-center justify-center mx-auto mb-3 shadow-lg shadow-fuchsia-950/40">
            <TicketIcon className="w-6 h-6" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white font-['Syne',sans-serif]">
            Localizar Meus Ingressos
          </h1>
          <p className="text-xs sm:text-sm text-zinc-400">
            Informe o mesmo CPF e WhatsApp cadastrados no momento da compra Pix.
          </p>
        </div>

        {/* Search Card */}
        <div className="bg-zinc-900/80 border border-zinc-800 rounded-3xl p-6 shadow-xl backdrop-blur-md">
          <form onSubmit={handleSearch} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase text-zinc-400 mb-1.5">
                CPF do Comprador
              </label>
              <input
                type="text"
                required
                placeholder="000.000.000-00"
                value={cpf}
                onChange={(e) => setCpf(formatCPF(e.target.value))}
                maxLength={14}
                className="w-full bg-zinc-950 border border-zinc-800 focus:border-fuchsia-500 rounded-xl px-4 py-3 text-sm text-white font-mono focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase text-zinc-400 mb-1.5">
                WhatsApp com DDD
              </label>
              <input
                type="tel"
                required
                placeholder="(62) 99999-9999"
                value={whatsapp}
                onChange={(e) => setWhatsapp(formatWhatsApp(e.target.value))}
                maxLength={15}
                className="w-full bg-zinc-950 border border-zinc-800 focus:border-fuchsia-500 rounded-xl px-4 py-3 text-sm text-white font-mono focus:outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-fuchsia-600 to-violet-600 hover:from-fuchsia-500 hover:to-violet-500 text-white font-bold text-sm tracking-wide shadow-lg shadow-fuchsia-600/20 flex items-center justify-center gap-2 cursor-pointer transition-all disabled:opacity-50"
            >
              <Search className="w-4 h-4" />
              <span>{loading ? 'Buscando Ingressos...' : 'Consultar Ingressos'}</span>
            </button>
          </form>
        </div>

        {/* Error message */}
        {error && (
          <div className="p-4 rounded-2xl bg-red-950/60 border border-red-500/40 flex items-start gap-3 text-xs text-red-300">
            <AlertCircle className="w-5 h-5 shrink-0 text-red-400 mt-0.5" />
            <div>
              <p className="font-bold">Nenhum ingresso encontrado</p>
              <p className="mt-0.5 text-zinc-400">{error}</p>
            </div>
          </div>
        )}

        {/* Results */}
        {searched && tickets.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-sm font-bold text-zinc-300 uppercase tracking-wider">
              Ingressos Encontrados ({tickets.length}):
            </h2>

            <div className="space-y-3">
              {tickets.map((t) => (
                <div
                  key={t.id}
                  className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-zinc-700 transition-colors"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-white uppercase">{t.ticketTypeName}</span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-800 text-zinc-400">
                        {t.ticketBatch}
                      </span>
                      {t.status === 'used' ? (
                        <span className="text-[10px] px-2 py-0.5 rounded bg-red-950 text-red-400 font-bold">
                          UTILIZADO
                        </span>
                      ) : (
                        <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 font-bold">
                          VÁLIDO
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-zinc-400">Titular: {t.attendeeName}</p>
                    <p className="text-[11px] text-zinc-500 font-mono">CPF: {maskCPF(t.attendeeCpf)}</p>
                  </div>

                  <Link
                    to={`/ingresso/${t.qrToken}`}
                    className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-fuchsia-600 hover:bg-fuchsia-500 text-white text-xs font-bold transition-colors shrink-0"
                  >
                    <span>Ver QR Code</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
