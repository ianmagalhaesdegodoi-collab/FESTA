import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import QRCode from 'qrcode';
import confetti from 'canvas-confetti';
import {
  X,
  Copy,
  Check,
  AlertCircle,
  Clock,
  ShieldCheck,
  ArrowRight,
  Flame,
  CheckCircle2,
  Lock,
} from 'lucide-react';
import { EventConfig, TicketTypeConfig, Order } from '../../types';
import {
  validateCPF,
  formatCPF,
  formatWhatsApp,
  calculateAge,
  formatCurrencyBRL,
} from '../../utils/validators';
import { createOrder, checkOrderStatus, simulateOrderPayment } from '../../services/api';

interface CheckoutModalProps {
  config: EventConfig;
  selectedTicket: TicketTypeConfig | null;
  originGroupSlug: string;
  onClose: () => void;
}

export const CheckoutModal: React.FC<CheckoutModalProps> = ({
  config,
  selectedTicket,
  originGroupSlug,
  onClose,
}) => {
  const navigate = useNavigate();

  // Form State
  const [customerName, setCustomerName] = useState('');
  const [customerCpf, setCustomerCpf] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerWhatsapp, setCustomerWhatsapp] = useState('');
  const [customerBirthDate, setCustomerBirthDate] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [acceptedTerms, setAcceptedTerms] = useState(true);

  // Flow State
  const [step, setStep] = useState<'form' | 'pix' | 'success'>('form');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Pix Payment State
  const [createdOrder, setCreatedOrder] = useState<Order | null>(null);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState('');
  const [copiedPix, setCopiedPix] = useState(false);
  const [expiresInSeconds, setExpiresInSeconds] = useState(15 * 60);
  const [confirmedToken, setConfirmedToken] = useState<string>('');

  if (!selectedTicket) return null;

  const totalAmount = selectedTicket.price * quantity;
  const remainingStock = Math.max(0, selectedTicket.maxQuantity - (selectedTicket.soldQuantity || 0));

  // Gerar QR code quando a ordem é criada
  useEffect(() => {
    if (createdOrder && createdOrder.pixCode) {
      QRCode.toDataURL(createdOrder.pixCode, {
        width: 280,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#ffffff',
        },
      })
        .then((url) => setQrCodeDataUrl(url))
        .catch(console.error);
    }
  }, [createdOrder]);

  // Contagem regressiva de expiração do Pix (15 minutos)
  useEffect(() => {
    if (step !== 'pix') return;

    const interval = setInterval(() => {
      setExpiresInSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [step]);

  // Polling automático para detectar aprovação do pagamento
  useEffect(() => {
    if (step !== 'pix' || !createdOrder) return;

    const checkInterval = setInterval(async () => {
      try {
        const statusData = await checkOrderStatus(createdOrder.id);
        if (statusData.status === 'paid') {
          clearInterval(checkInterval);
          handlePaymentSuccess(statusData.tickets?.[0]?.qrToken || '');
        }
      } catch (err) {
        // Silencioso em caso de oscilação momentânea
      }
    }, 3000);

    return () => clearInterval(checkInterval);
  }, [step, createdOrder]);

  const handlePaymentSuccess = (firstTicketToken: string) => {
    setStep('success');
    setConfirmedToken(firstTicketToken);
    try {
      confetti({
        particleCount: 120,
        spread: 80,
        origin: { y: 0.6 },
        colors: ['#d946ef', '#8b5cf6', '#06b6d4', '#10b981'],
      });
    } catch (e) {}
  };

  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    // Validação de Nome
    if (customerName.trim().split(' ').length < 2) {
      setErrorMessage('Por favor, digite seu nome e sobrenome completos.');
      return;
    }

    // Validação de CPF
    if (!validateCPF(customerCpf)) {
      setErrorMessage('CPF inválido! Verifique os números digitados.');
      return;
    }

    // Validação de Idade Mínima
    const calculatedAge = calculateAge(customerBirthDate, config.eventDate);
    if (calculatedAge < config.minAge) {
      setErrorMessage(
        `Acesso proibido para menores de ${config.minAge} anos. Sua idade na data do evento será ${calculatedAge} anos.`
      );
      return;
    }

    // Validação de WhatsApp
    const rawPhone = customerWhatsapp.replace(/\D/g, '');
    if (rawPhone.length < 10) {
      setErrorMessage('Por favor, informe um número de WhatsApp válido com DDD.');
      return;
    }

    // Validação de E-mail
    if (!customerEmail.includes('@') || !customerEmail.includes('.')) {
      setErrorMessage('Por favor, informe um endereço de e-mail válido.');
      return;
    }

    // Termos de aceite
    if (!acceptedTerms) {
      setErrorMessage('Você deve concordar com os Termos do Evento e a Política de Privacidade.');
      return;
    }

    setLoading(true);
    try {
      const result = await createOrder({
        customerName: customerName.trim(),
        customerCpf: customerCpf.trim(),
        customerEmail: customerEmail.trim().toLowerCase(),
        customerWhatsapp: customerWhatsapp.trim(),
        customerBirthDate,
        ticketTypeId: selectedTicket.id,
        quantity,
        originGroupSlug: originGroupSlug || 'direto',
      });

      setCreatedOrder(result.order);
      setStep('pix');
    } catch (err: any) {
      setErrorMessage(err.message || 'Erro ao gerar o pedido. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyPix = () => {
    if (!createdOrder?.pixCode) return;
    navigator.clipboard.writeText(createdOrder.pixCode);
    setCopiedPix(true);
    setTimeout(() => setCopiedPix(false), 2500);
  };

  const handleSimulatePayment = async () => {
    if (!createdOrder) return;
    setLoading(true);
    try {
      const res = await simulateOrderPayment(createdOrder.id);
      handlePaymentSuccess(res.tickets[0]?.qrToken || '');
    } catch (err: any) {
      setErrorMessage('Erro ao simular pagamento: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const formatCountdown = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/85 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-lg bg-zinc-900 border border-zinc-800 rounded-3xl shadow-2xl overflow-hidden my-6">
        {/* Header Modal */}
        <div className="flex items-center justify-between p-5 sm:p-6 border-b border-zinc-800 bg-zinc-950/60">
          <div>
            <div className="text-[10px] font-mono uppercase tracking-widest text-fuchsia-400 font-bold">
              Finalização de Compra
            </div>
            <h3 className="text-lg sm:text-xl font-bold text-white font-['Syne',sans-serif]">
              {selectedTicket.name} • {selectedTicket.batchName}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ================= STEP 1: FORMULÁRIO DE DADOS ================= */}
        {step === 'form' && (
          <form onSubmit={handleSubmitForm} className="p-5 sm:p-6 space-y-4">
            {errorMessage && (
              <div className="p-3.5 rounded-xl bg-red-950/60 border border-red-500/50 flex items-start gap-2.5 text-xs text-red-300">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-400" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Origem tracking banner se presente */}
            {originGroupSlug && originGroupSlug !== 'direto' && (
              <div className="p-2.5 rounded-xl bg-violet-950/50 border border-violet-800/40 text-[11px] text-violet-300 flex items-center justify-between">
                <span>Link VIP com identificação de grupo:</span>
                <span className="font-mono font-bold uppercase">{originGroupSlug}</span>
              </div>
            )}

            {/* Quantidade */}
            <div>
              <label className="block text-xs font-semibold uppercase text-zinc-400 mb-1.5">
                Quantidade de Ingressos
              </label>
              <div className="flex items-center gap-3">
                <select
                  value={quantity}
                  onChange={(e) => setQuantity(parseInt(e.target.value, 10))}
                  className="w-full bg-zinc-950 border border-zinc-800 focus:border-fuchsia-500 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none"
                >
                  {Array.from({ length: Math.min(10, remainingStock || 1) }, (_, i) => i + 1).map(
                    (num) => (
                      <option key={num} value={num}>
                        {num} {num === 1 ? 'ingresso' : 'ingressos'} ({formatCurrencyBRL(selectedTicket.price * num)})
                      </option>
                    )
                  )}
                </select>
              </div>
            </div>

            {/* Nome Completo */}
            <div>
              <label className="block text-xs font-semibold uppercase text-zinc-400 mb-1.5">
                Nome Completo do Titular *
              </label>
              <input
                type="text"
                required
                placeholder="Ex: Gabriel Lucas Silveira"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 focus:border-fuchsia-500 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none"
              />
            </div>

            {/* CPF e Data de Nascimento (Row) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold uppercase text-zinc-400 mb-1.5">
                  CPF (com validação) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="000.000.000-00"
                  value={customerCpf}
                  onChange={(e) => setCustomerCpf(formatCPF(e.target.value))}
                  maxLength={14}
                  className="w-full bg-zinc-950 border border-zinc-800 focus:border-fuchsia-500 rounded-xl px-4 py-2.5 text-sm text-white font-mono focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-zinc-400 mb-1.5">
                  Nascimento ({config.minAge}+) *
                </label>
                <input
                  type="date"
                  required
                  value={customerBirthDate}
                  onChange={(e) => setCustomerBirthDate(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 focus:border-fuchsia-500 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none"
                />
              </div>
            </div>

            {/* WhatsApp e Email */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold uppercase text-zinc-400 mb-1.5">
                  WhatsApp (DDD + Número) *
                </label>
                <input
                  type="tel"
                  required
                  placeholder="(62) 99999-9999"
                  value={customerWhatsapp}
                  onChange={(e) => setCustomerWhatsapp(formatWhatsApp(e.target.value))}
                  maxLength={15}
                  className="w-full bg-zinc-950 border border-zinc-800 focus:border-fuchsia-500 rounded-xl px-4 py-2.5 text-sm text-white font-mono focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-zinc-400 mb-1.5">
                  E-mail para envio *
                </label>
                <input
                  type="email"
                  required
                  placeholder="seu@email.com"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 focus:border-fuchsia-500 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none"
                />
              </div>
            </div>

            {/* Resumo do Pedido */}
            <div className="p-4 rounded-2xl bg-zinc-950 border border-zinc-800 space-y-2 text-xs">
              <div className="flex justify-between text-zinc-400">
                <span>
                  {quantity}x {selectedTicket.name} ({formatCurrencyBRL(selectedTicket.price)})
                </span>
                <span>{formatCurrencyBRL(totalAmount)}</span>
              </div>
              <div className="flex justify-between text-zinc-400">
                <span>Taxa de Emissão</span>
                <span className="text-emerald-400 font-bold">R$ 0,00 (Grátis via Pix)</span>
              </div>
              <div className="pt-2 border-t border-zinc-800 flex justify-between text-sm font-bold text-white">
                <span>Total a Pagar</span>
                <span className="text-base text-fuchsia-400 font-mono">
                  {formatCurrencyBRL(totalAmount)}
                </span>
              </div>
            </div>

            {/* Termos e LGPD */}
            <div className="space-y-2 pt-1">
              <label className="flex items-start gap-2.5 text-xs text-zinc-400 cursor-pointer">
                <input
                  type="checkbox"
                  checked={acceptedTerms}
                  onChange={(e) => setAcceptedTerms(e.target.checked)}
                  className="mt-0.5 rounded bg-zinc-950 border-zinc-700 text-fuchsia-600 focus:ring-0"
                />
                <span>
                  Declaro ter 18 anos ou mais, apresentar documento oficial com foto na portaria do {config.venueName} e concordo com os termos de privacidade (LGPD).
                </span>
              </label>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-fuchsia-600 via-pink-600 to-violet-600 hover:from-fuchsia-500 hover:to-violet-500 text-white font-extrabold text-sm sm:text-base tracking-wide shadow-lg shadow-fuchsia-600/30 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                'Gerando Pix Seguro...'
              ) : (
                <>
                  <span>GERAR PIX DE {formatCurrencyBRL(totalAmount)}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        )}

        {/* ================= STEP 2: PAGAMENTO PIX ================= */}
        {step === 'pix' && createdOrder && (
          <div className="p-5 sm:p-6 space-y-5 text-center">
            {/* Aviso de Modo Simulação / Teste */}
            {config.simulatePaymentMode && (
              <div className="p-3 rounded-2xl bg-amber-500/20 border border-amber-500/50 text-amber-300 text-xs text-left flex items-start gap-3">
                <Flame className="w-5 h-5 shrink-0 text-amber-400 mt-0.5" />
                <div>
                  <div className="font-bold uppercase tracking-wider">
                    Modo Simulação Ativo (Pagamento de Teste)
                  </div>
                  <p className="text-[11px] text-amber-200/90 mt-0.5">
                    Este ambiente está configurado para testes sem cobrança real. Clique no botão de simulação abaixo para aprovar instantaneamente!
                  </p>
                </div>
              </div>
            )}

            {/* Expiration Countdown */}
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-zinc-950 border border-zinc-800 text-xs font-mono text-zinc-300">
              <Clock className="w-4 h-4 text-fuchsia-400 animate-spin" />
              <span>
                Pix expira em: <strong className="text-white">{formatCountdown(expiresInSeconds)}</strong>
              </span>
            </div>

            {/* QR Code Canvas / Image */}
            <div className="flex flex-col items-center justify-center">
              <div className="p-3 bg-white rounded-2xl shadow-xl border-4 border-fuchsia-500/40">
                {qrCodeDataUrl ? (
                  <img
                    src={qrCodeDataUrl}
                    alt="QR Code Pix"
                    className="w-52 h-52 sm:w-56 sm:h-56 object-contain"
                  />
                ) : (
                  <div className="w-52 h-52 flex items-center justify-center text-xs text-zinc-500">
                    Carregando QR...
                  </div>
                )}
              </div>
              <p className="text-xs text-zinc-400 mt-2">
                Abra o app do seu banco e escaneie o QR Code acima
              </p>
            </div>

            {/* Copia e Cola Code */}
            <div className="text-left">
              <label className="block text-[11px] font-semibold uppercase text-zinc-400 mb-1">
                Ou copie o código Pix Copia e Cola:
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={createdOrder.pixCode}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-300 font-mono select-all focus:outline-none"
                />
                <button
                  onClick={handleCopyPix}
                  className="px-4 py-2 rounded-xl bg-fuchsia-600 hover:bg-fuchsia-500 text-white text-xs font-bold flex items-center gap-1.5 shrink-0 transition-colors"
                >
                  {copiedPix ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  <span>{copiedPix ? 'Copiado!' : 'Copiar'}</span>
                </button>
              </div>
            </div>

            {/* Auto status check indicator */}
            <div className="p-3 rounded-xl bg-zinc-950/80 border border-zinc-800/80 flex items-center justify-center gap-2.5 text-xs text-zinc-400">
              <div className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping"></div>
              <span>Aguardando confirmação bancária em tempo real...</span>
            </div>

            {/* Test Simulation Button */}
            {config.simulatePaymentMode && (
              <button
                onClick={handleSimulatePayment}
                disabled={loading}
                className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-black text-xs sm:text-sm uppercase tracking-wider shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 cursor-pointer transition-all"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Simular Aprovação Imediata do Pix (Teste)</span>
              </button>
            )}
          </div>
        )}

        {/* ================= STEP 3: SUCESSO E MEU INGRESSO ================= */}
        {step === 'success' && (
          <div className="p-6 sm:p-8 space-y-6 text-center">
            <div className="w-16 h-16 mx-auto rounded-full bg-emerald-500/20 border-2 border-emerald-500 text-emerald-400 flex items-center justify-center shadow-lg shadow-emerald-500/30 animate-bounce">
              <Check className="w-8 h-8 stroke-[3]" />
            </div>

            <div>
              <h3 className="text-2xl font-black text-white font-['Syne',sans-serif]">
                PAGAMENTO CONFIRMADO!
              </h3>
              <p className="text-xs sm:text-sm text-zinc-300 mt-2">
                Seu ingresso para <strong className="text-fuchsia-400">{config.eventName}</strong> está garantido e pronto para uso na portaria!
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-zinc-950 border border-zinc-800 text-left text-xs space-y-2 font-mono">
              <div className="flex justify-between">
                <span className="text-zinc-500">Titular:</span>
                <span className="text-white font-bold">{customerName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Ingresso:</span>
                <span className="text-fuchsia-400 font-bold">{selectedTicket.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Local:</span>
                <span className="text-zinc-300">{config.venueName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Data:</span>
                <span className="text-zinc-300">{config.eventDate} às {config.eventTime}h</span>
              </div>
            </div>

            <div className="space-y-3 pt-2">
              <button
                onClick={() => {
                  onClose();
                  navigate(`/ingresso/${confirmedToken}`);
                }}
                className="w-full py-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-zinc-950 font-black text-sm tracking-wide shadow-xl shadow-emerald-500/30 flex items-center justify-center gap-2 cursor-pointer transition-all"
              >
                <span>VER MEU INGRESSO & QR CODE VIP</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <button
                onClick={onClose}
                className="w-full py-2.5 text-xs text-zinc-400 hover:text-white"
              >
                Fechar janela
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
