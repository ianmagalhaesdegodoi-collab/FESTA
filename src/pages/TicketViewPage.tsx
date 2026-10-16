import React, { useEffect, useState, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import QRCode from 'qrcode';
import {
  Download,
  Share2,
  Calendar,
  Clock,
  MapPin,
  CheckCircle2,
  AlertTriangle,
  ArrowLeft,
  Sparkles,
  ShieldCheck,
  Crown,
} from 'lucide-react';
import { Ticket, EventConfig, Order } from '../types';
import { lookupTickets } from '../services/api';
import { maskCPF } from '../utils/validators';

export const TicketViewPage: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [config, setConfig] = useState<EventConfig | null>(null);
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [downloading, setDownloading] = useState(false);
  const ticketRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!token) return;

    lookupTickets({ token })
      .then((data) => {
        if (data.ticket) {
          setTicket(data.ticket);
          setConfig(data.config);
          setOrder(data.order || null);

          // Gera QR Code nítido
          QRCode.toDataURL(data.ticket.qrToken, {
            width: 340,
            margin: 2,
            color: {
              dark: '#000000',
              light: '#ffffff',
            },
          }).then(setQrCodeUrl);
        } else {
          setError('Ingresso não localizado.');
        }
      })
      .catch((err) => {
        setError(err.message || 'Erro ao carregar ingresso');
      })
      .finally(() => setLoading(false));
  }, [token]);

  // Função para baixar o ingresso em imagem PNG
  const handleDownloadImage = async () => {
    if (!ticket || !config || !qrCodeUrl) return;
    setDownloading(true);

    try {
      // Cria um canvas em alta resolução para renderizar o ingresso VIP
      const canvas = document.createElement('canvas');
      canvas.width = 800;
      canvas.height = 1200;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Fundo escuro premium
      ctx.fillStyle = '#0a0a10';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Gradiente de borda
      const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
      gradient.addColorStop(0, '#d946ef');
      gradient.addColorStop(0.5, '#8b5cf6');
      gradient.addColorStop(1, '#06b6d4');
      ctx.strokeStyle = gradient;
      ctx.lineWidth = 8;
      ctx.strokeRect(20, 20, canvas.width - 40, canvas.height - 40);

      // Cabeçalho do evento
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 36px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(config.eventName.toUpperCase(), canvas.width / 2, 90);

      ctx.fillStyle = '#d946ef';
      ctx.font = 'bold 22px monospace';
      ctx.fillText(`INGRESSO VIP OFICIAL • ${ticket.ticketBatch.toUpperCase()}`, canvas.width / 2, 130);

      // Divisória tracejada
      ctx.strokeStyle = '#27272a';
      ctx.lineWidth = 3;
      ctx.setLineDash([8, 8]);
      ctx.beginPath();
      ctx.moveTo(40, 160);
      ctx.lineTo(canvas.width - 40, 160);
      ctx.stroke();
      ctx.setLineDash([]);

      // Informações do Titular
      ctx.textAlign = 'left';
      ctx.fillStyle = '#a1a1aa';
      ctx.font = '16px sans-serif';
      ctx.fillText('TITULAR DO INGRESSO', 60, 210);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 26px sans-serif';
      ctx.fillText(ticket.attendeeName.toUpperCase(), 60, 245);

      ctx.fillStyle = '#a1a1aa';
      ctx.font = '16px sans-serif';
      ctx.fillText('DOCUMENTO (CPF)', 60, 290);
      ctx.fillStyle = '#ffffff';
      ctx.font = '22px monospace';
      ctx.fillText(maskCPF(ticket.attendeeCpf), 60, 320);

      ctx.fillStyle = '#a1a1aa';
      ctx.font = '16px sans-serif';
      ctx.fillText('MODALIDADE', 460, 290);
      ctx.fillStyle = '#d946ef';
      ctx.font = 'bold 24px sans-serif';
      ctx.fillText(ticket.ticketTypeName.toUpperCase(), 460, 320);

      // Local e data
      ctx.fillStyle = '#a1a1aa';
      ctx.font = '16px sans-serif';
      ctx.fillText('LOCAL DO EVENTO', 60, 370);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 22px sans-serif';
      ctx.fillText(`${config.venueName} • ${config.venueCity}`, 60, 400);

      ctx.fillStyle = '#a1a1aa';
      ctx.font = '16px sans-serif';
      ctx.fillText('DATA E HORÁRIO', 60, 445);
      ctx.fillStyle = '#ffffff';
      ctx.font = '20px sans-serif';
      ctx.fillText(`${config.eventDate} às ${config.eventTime}h`, 60, 475);

      // QR Code
      const qrImg = new Image();
      qrImg.crossOrigin = 'anonymous';
      qrImg.src = qrCodeUrl;
      await new Promise((resolve) => (qrImg.onload = resolve));

      const qrSize = 380;
      const qrX = (canvas.width - qrSize) / 2;
      const qrY = 530;

      // Fundo branco do QR
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(qrX - 15, qrY - 15, qrSize + 30, qrSize + 30);
      ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize);

      // Token de validação
      ctx.textAlign = 'center';
      ctx.fillStyle = '#a1a1aa';
      ctx.font = '14px monospace';
      ctx.fillText(`TOKEN ÚNICO: ${ticket.qrToken}`, canvas.width / 2, 980);

      // Rodapé de segurança
      ctx.fillStyle = '#71717a';
      ctx.font = '14px sans-serif';
      ctx.fillText('Apresente este QR Code na portaria com documento oficial com foto (18+).', canvas.width / 2, 1040);
      ctx.fillText('Ingresso emitido por VibePass • Validação criptográfica server-side', canvas.width / 2, 1070);

      // Download
      const link = document.createElement('a');
      link.download = `ingresso-${ticket.attendeeName.toLowerCase().replace(/\s+/g, '-')}-${ticket.id}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (err) {
      console.error('Erro ao baixar imagem:', err);
    } finally {
      setDownloading(false);
    }
  };

  const handleShareWhatsApp = () => {
    if (!ticket || !config) return;
    const url = window.location.href;
    const text = encodeURIComponent(
      `Fala! Aqui está o meu ingresso VIP para o evento *${config.eventName}* no ${config.venueName}:\n\n` +
      `🎟️ *Tipo:* ${ticket.ticketTypeName}\n` +
      `👤 *Titular:* ${ticket.attendeeName}\n` +
      `📅 *Data:* ${config.eventDate} às ${config.eventTime}h\n` +
      `📍 *Local:* ${config.venueName}\n\n` +
      `Acesse o QR Code no link:\n${url}`
    );
    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-4 border-fuchsia-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-sm text-zinc-400 font-mono">Carregando ingresso seguro...</p>
        </div>
      </div>
    );
  }

  if (error || !ticket || !config) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-zinc-900 border border-zinc-800 rounded-3xl p-6 text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-red-950/80 border border-red-500/40 text-red-400 flex items-center justify-center mx-auto">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-white font-['Syne',sans-serif]">Ingresso Não Encontrado</h2>
          <p className="text-xs text-zinc-400">{error || 'Verifique o link informado na mensagem.'}</p>
          <Link
            to="/meus-ingressos"
            className="inline-block w-full py-3 rounded-xl bg-fuchsia-600 hover:bg-fuchsia-500 text-white font-bold text-sm transition-colors"
          >
            Buscar com meu CPF e WhatsApp
          </Link>
        </div>
      </div>
    );
  }

  const isUsed = ticket.status === 'used';
  const isOpenBar = ticket.ticketTypeId === 'open-bar';

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 py-8 px-4 sm:px-6">
      <div className="max-w-xl mx-auto space-y-6">
        {/* Navigation Bar */}
        <div className="flex items-center justify-between">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Voltar ao site do evento</span>
          </Link>

          <Link
            to="/meus-ingressos"
            className="text-xs text-fuchsia-400 hover:text-fuchsia-300 font-medium"
          >
            Consultar outros ingressos
          </Link>
        </div>

        {/* Digital VIP Ticket Card */}
        <div
          ref={ticketRef}
          className="relative bg-zinc-900/90 border-2 border-zinc-800 rounded-3xl overflow-hidden shadow-2xl backdrop-blur-md"
        >
          {/* Top Banner */}
          <div
            className={`p-6 text-center border-b border-zinc-800 relative ${
              isOpenBar
                ? 'bg-gradient-to-r from-fuchsia-950/80 via-purple-950/80 to-zinc-950/80'
                : 'bg-zinc-950/80'
            }`}
          >
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-zinc-900 border border-fuchsia-500/30 text-xs text-fuchsia-300 font-bold mb-2">
              {isOpenBar ? <Crown className="w-3.5 h-3.5 text-fuchsia-400" /> : <Sparkles className="w-3.5 h-3.5 text-violet-400" />}
              <span>{isOpenBar ? 'CAMAROTE OPEN BAR VIP' : 'INGRESSO PISTA'}</span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-black text-white font-['Syne',sans-serif] uppercase tracking-tight">
              {config.eventName}
            </h1>
            <p className="text-xs text-zinc-400 font-mono mt-1">
              Lote: {ticket.ticketBatch} • #{ticket.id.slice(-6)}
            </p>
          </div>

          {/* Status Badge */}
          <div className="p-4 bg-zinc-950/50 flex items-center justify-center">
            {isUsed ? (
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-red-950/80 border border-red-500/50 text-red-300 text-xs font-bold">
                <AlertTriangle className="w-4 h-4" />
                <span>
                  INGRESSO JÁ UTILIZADO (Check-in em {new Date(ticket.checkedInAt || '').toLocaleTimeString('pt-BR')})
                </span>
              </div>
            ) : (
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-950/80 border border-emerald-500/50 text-emerald-300 text-xs font-bold">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>INGRESSO VÁLIDO • APRESENTE NA PORTARIA</span>
              </div>
            )}
          </div>

          {/* QR Code Centerpiece */}
          <div className="p-6 sm:p-8 flex flex-col items-center justify-center bg-zinc-950/40">
            <div className="p-4 bg-white rounded-3xl shadow-2xl border-4 border-fuchsia-500/30 relative">
              {qrCodeUrl ? (
                <img
                  src={qrCodeUrl}
                  alt="QR Code do Ingresso"
                  className={`w-64 h-64 object-contain ${isUsed ? 'opacity-30 grayscale' : ''}`}
                />
              ) : (
                <div className="w-64 h-64 flex items-center justify-center text-xs text-zinc-400">
                  Gerando QR...
                </div>
              )}

              {isUsed && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="px-4 py-2 bg-red-600 text-white font-black text-lg rotate-12 rounded-lg shadow-2xl">
                    UTILIZADO
                  </span>
                </div>
              )}
            </div>

            <p className="text-xs text-zinc-400 mt-3 font-mono text-center">
              Ajuste o brilho do celular para facilitar a leitura na portaria
            </p>
          </div>

          {/* Attendee Details */}
          <div className="p-6 space-y-4 border-t border-zinc-800 bg-zinc-950/70 text-xs sm:text-sm">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-zinc-500 text-[11px] uppercase font-semibold">Titular:</span>
                <p className="text-white font-bold text-sm sm:text-base uppercase truncate">
                  {ticket.attendeeName}
                </p>
              </div>

              <div>
                <span className="text-zinc-500 text-[11px] uppercase font-semibold">Documento:</span>
                <p className="text-zinc-300 font-mono font-medium">
                  {maskCPF(ticket.attendeeCpf)}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-2 border-t border-zinc-800/60">
              <div className="flex items-start gap-2">
                <Calendar className="w-4 h-4 text-fuchsia-400 mt-0.5" />
                <div>
                  <span className="text-zinc-500 text-[11px] uppercase font-semibold">Data:</span>
                  <p className="text-zinc-200 font-medium">{config.eventDate}</p>
                </div>
              </div>

              <div className="flex items-start gap-2">
                <Clock className="w-4 h-4 text-violet-400 mt-0.5" />
                <div>
                  <span className="text-zinc-500 text-[11px] uppercase font-semibold">Horário:</span>
                  <p className="text-zinc-200 font-medium">Abertura: {config.eventTime}h</p>
                </div>
              </div>
            </div>

            <div className="pt-2 border-t border-zinc-800/60 flex items-start gap-2">
              <MapPin className="w-4 h-4 text-cyan-400 mt-0.5 shrink-0" />
              <div>
                <span className="text-zinc-500 text-[11px] uppercase font-semibold">Local:</span>
                <p className="text-zinc-200 font-medium">
                  {config.venueName} — {config.venueAddress}, {config.venueCity}
                </p>
              </div>
            </div>
          </div>

          {/* Footer Security Notice */}
          <div className="p-4 bg-zinc-950 border-t border-zinc-800/80 text-[11px] text-zinc-400 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Token Seguro Criptográfico</span>
            </div>
            <span className="font-mono text-zinc-400">Classificação: {config.minAge}+</span>
          </div>
        </div>

        {/* Action Buttons: Baixar Imagem & Enviar por WhatsApp */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            onClick={handleDownloadImage}
            disabled={downloading}
            className="w-full py-3.5 px-4 rounded-2xl bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-colors cursor-pointer border border-zinc-700"
          >
            <Download className="w-4 h-4 text-cyan-400" />
            <span>{downloading ? 'Gerando Imagem...' : 'Baixar Imagem do Ingresso'}</span>
          </button>

          <button
            onClick={handleShareWhatsApp}
            className="w-full py-3.5 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-lg shadow-emerald-950/40"
          >
            <Share2 className="w-4 h-4" />
            <span>Enviar por WhatsApp</span>
          </button>
        </div>
      </div>
    </div>
  );
};
