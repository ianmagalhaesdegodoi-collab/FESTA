import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Ticket, QrCode, Shield, Sparkles } from 'lucide-react';
import { EventConfig } from '../../types';

interface NavbarProps {
  config: EventConfig;
  originGroupSlug?: string;
}

export const Navbar: React.FC<NavbarProps> = ({ config, originGroupSlug }) => {
  const location = useLocation();

  return (
    <header className="sticky top-0 z-50 backdrop-blur-xl bg-zinc-950/80 border-b border-zinc-800/60">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 sm:h-20 flex items-center justify-between">
        {/* Brand / Logo */}
        <Link to="/" className="flex items-center gap-3 group">
          <div className="relative w-10 h-10 rounded-xl overflow-hidden bg-gradient-to-tr from-fuchsia-600 to-violet-600 p-0.5 shadow-lg shadow-fuchsia-500/20 group-hover:scale-105 transition-transform">
            <img
              src={config.theme.logoUrl}
              alt="Logo"
              className="w-full h-full object-cover rounded-[10px]"
              onError={(e) => {
                // Fallback icon se a imagem falhar
                (e.target as HTMLElement).style.display = 'none';
              }}
            />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold tracking-wider text-base sm:text-lg text-white font-['Syne',sans-serif]">
                {config.eventName}
              </span>
              <Sparkles className="w-3.5 h-3.5 text-fuchsia-400 animate-pulse hidden sm:inline" />
            </div>
            <p className="text-[10px] text-zinc-400 uppercase tracking-widest font-mono">
              {config.venueCity || 'Goiânia - GO'}
            </p>
          </div>
        </Link>

        {/* Center / Navigation Links */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-zinc-300">
          <a href="#ingressos" className="hover:text-fuchsia-400 transition-colors">
            Ingressos
          </a>
          <a href="#lineup" className="hover:text-fuchsia-400 transition-colors">
            Line-up
          </a>
          <a href="#local" className="hover:text-fuchsia-400 transition-colors">
            Como Chegar
          </a>
          <a href="#regras" className="hover:text-fuchsia-400 transition-colors">
            Regras (18+)
          </a>
          <a href="#faq" className="hover:text-fuchsia-400 transition-colors">
            FAQ
          </a>
        </nav>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 sm:gap-3">
          <Link
            to="/meus-ingressos"
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs sm:text-sm font-medium text-zinc-300 hover:text-white bg-zinc-900/80 hover:bg-zinc-800 border border-zinc-800 rounded-full transition-all"
            title="Consultar ingresso comprado com CPF"
          >
            <Ticket className="w-4 h-4 text-fuchsia-400" />
            <span>Meu Ingresso</span>
          </Link>

          <Link
            to="/scanner"
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-400 bg-emerald-950/40 hover:bg-emerald-900/60 border border-emerald-800/60 rounded-full transition-all"
            title="Acesso rápido para equipe de portaria"
          >
            <QrCode className="w-3.5 h-3.5" />
            <span>Portaria</span>
          </Link>

          <Link
            to="/admin"
            className="p-2 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900 border border-transparent hover:border-zinc-800 rounded-lg transition-all"
            title="Painel Administrativo"
          >
            <Shield className="w-4 h-4" />
          </Link>
        </div>
      </div>

      {originGroupSlug && originGroupSlug !== 'direto' && (
        <div className="bg-gradient-to-r from-violet-900/80 via-fuchsia-900/80 to-violet-900/80 border-t border-fuchsia-500/20 py-1 text-center text-[11px] text-fuchsia-200">
          Você está acessando pelo link de convite VIP do grupo: <span className="font-bold underline uppercase">{originGroupSlug}</span>
        </div>
      )}
    </header>
  );
};
