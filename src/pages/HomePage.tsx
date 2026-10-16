import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Navbar } from '../components/public/Navbar';
import { Hero } from '../components/public/Hero';
import { TicketCards } from '../components/public/TicketCards';
import { AboutAndLineup } from '../components/public/AboutAndLineup';
import { CheckoutModal } from '../components/public/CheckoutModal';
import { EventConfig, TicketTypeConfig } from '../types';
import { fetchEventConfig, recordGroupVisit } from '../services/api';
import { MapPin, Phone, Mail, ShieldCheck, Heart } from 'lucide-react';

export const HomePage: React.FC = () => {
  const [config, setConfig] = useState<EventConfig | null>(null);
  const [selectedTicket, setSelectedTicket] = useState<TicketTypeConfig | null>(null);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [originGroupSlug, setOriginGroupSlug] = useState<string>('direto');

  const location = useLocation();

  // Rastreamento de Origem via ?g=slug-do-grupo
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const gParam = params.get('g');

    if (gParam && gParam.trim()) {
      const cleanSlug = gParam.trim().toLowerCase();
      setOriginGroupSlug(cleanSlug);
      localStorage.setItem('vibepass_origin_group', cleanSlug);
      recordGroupVisit(cleanSlug);
    } else {
      const saved = localStorage.getItem('vibepass_origin_group');
      if (saved) {
        setOriginGroupSlug(saved);
      }
    }
  }, [location.search]);

  // Carregar configurações do evento
  useEffect(() => {
    fetchEventConfig()
      .then(setConfig)
      .catch((err) => console.error('Erro ao buscar config:', err));
  }, []);

  const handleOpenCheckout = (ticket?: TicketTypeConfig) => {
    if (!config) return;
    const target = ticket || config.ticketTypes[0];
    setSelectedTicket(target);
    setIsCheckoutOpen(true);
  };

  const handleCloseCheckout = () => {
    setIsCheckoutOpen(false);
    setSelectedTicket(null);
  };

  if (!config) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center text-zinc-400 font-mono">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-4 border-fuchsia-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-sm">Carregando experiência da balada...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col selection:bg-fuchsia-500 selection:text-white">
      {/* Dynamic Theme Injector */}
      <style>{`
        :root {
          --primary-color: ${config.theme.primaryColor || '#d946ef'};
          --secondary-color: ${config.theme.secondaryColor || '#8b5cf6'};
          --accent-color: ${config.theme.accentColor || '#06b6d4'};
        }
      `}</style>

      {/* Navbar */}
      <Navbar config={config} originGroupSlug={originGroupSlug} />

      {/* Hero Section */}
      <Hero config={config} onBuyClick={() => handleOpenCheckout()} />

      {/* Ingressos Section (Pista & Open Bar) */}
      <TicketCards config={config} onSelectTicket={(t) => handleOpenCheckout(t)} />

      {/* Sobre, Line-up, Espaço 82 Eventos Goiânia, Regras 18+ e FAQ */}
      <AboutAndLineup config={config} />

      {/* Checkout Modal */}
      {isCheckoutOpen && selectedTicket && (
        <CheckoutModal
          config={config}
          selectedTicket={selectedTicket}
          originGroupSlug={originGroupSlug}
          onClose={handleCloseCheckout}
        />
      )}

      {/* Footer */}
      <footer className="mt-auto border-t border-zinc-800 bg-zinc-950/80 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6 text-xs text-zinc-400">
          <div className="space-y-1 text-center md:text-left">
            <p className="font-bold text-white uppercase text-sm font-['Syne',sans-serif]">
              {config.eventName}
            </p>
            <p className="flex items-center justify-center md:justify-start gap-1">
              <MapPin className="w-3.5 h-3.5 text-cyan-400" />
              <span>{config.venueName} • {config.venueAddress}, {config.venueCity}</span>
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-6">
            <span className="flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5 text-fuchsia-400" />
              <span>{config.contactWhatsapp}</span>
            </span>
            <span className="flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-violet-400" />
              <span>{config.contactEmail}</span>
            </span>
            <span className="flex items-center gap-1.5 text-emerald-400 font-bold">
              <ShieldCheck className="w-4 h-4" />
              <span>Checkout 100% Protegido</span>
            </span>
          </div>

          <div className="text-center md:text-right text-[11px] text-zinc-400 font-mono">
            <p>© {new Date().getFullYear()} {config.eventName}. Todos os direitos reservados.</p>
            <p className="text-zinc-400 mt-0.5">Venda de ingressos com validação atômica de portaria.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};
