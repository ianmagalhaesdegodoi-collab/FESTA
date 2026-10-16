import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Html5Qrcode } from 'html5-qrcode';
import {
  Camera,
  Search,
  Wifi,
  WifiOff,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RotateCcw,
  Shield,
  LogOut,
  ArrowLeft,
  Volume2,
  UserCheck,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { CheckinValidationResult, DashboardMetrics } from '../types';
import { validateTicketQR, performCheckin, fetchDashboardMetrics } from '../services/api';
import { playSuccessSound, playErrorSound } from '../utils/audio';

export const ScannerPage: React.FC = () => {
  const { currentUser, isStaff, logout, loginAsDemo } = useAuth();
  const navigate = useNavigate();

  // Scanner state
  const [isScanning, setIsScanning] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [manualCode, setManualCode] = useState('');
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [validationResult, setValidationResult] = useState<CheckinValidationResult | null>(null);
  const [isProcessingCheckin, setIsProcessingCheckin] = useState(false);
  const [checkinSuccessMessage, setCheckinSuccessMessage] = useState('');
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const scannerContainerId = 'qr-reader-container';

  // Monitorar conectividade
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Carregar métricas de check-in em tempo real
  const loadMetrics = async () => {
    try {
      const data = await fetchDashboardMetrics();
      setMetrics(data);
    } catch (e) {}
  };

  useEffect(() => {
    loadMetrics();
    const interval = setInterval(loadMetrics, 6000);
    return () => clearInterval(interval);
  }, []);

  // Iniciar scanner de câmera
  const startScanner = async () => {
    setCameraError('');
    setValidationResult(null);
    setCheckinSuccessMessage('');

    try {
      if (!scannerRef.current) {
        scannerRef.current = new Html5Qrcode(scannerContainerId);
      }

      const devices = await Html5Qrcode.getCameras();
      if (!devices || devices.length === 0) {
        throw new Error('Nenhuma câmera encontrada no dispositivo.');
      }

      // Prefere câmera traseira em celulares
      const backCamera = devices.find((d) => d.label.toLowerCase().includes('back') || d.label.toLowerCase().includes('traseira')) || devices[0];

      await scannerRef.current.start(
        backCamera.id,
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0,
        },
        onScanSuccess,
        (_error) => {
          // Erros de frame contínuo ignorados
        }
      );

      setIsScanning(true);
    } catch (err: any) {
      console.error('Erro ao iniciar câmera:', err);
      setCameraError(err.message || 'Permissão de câmera negada. Use a busca manual abaixo.');
      setIsScanning(false);
    }
  };

  const stopScanner = async () => {
    if (scannerRef.current && isScanning) {
      try {
        await scannerRef.current.stop();
        scannerRef.current.clear();
      } catch (e) {
        console.warn('Erro ao parar scanner:', e);
      }
      setIsScanning(false);
    }
  };

  useEffect(() => {
    return () => {
      if (scannerRef.current && isScanning) {
        scannerRef.current.stop().catch(console.error);
      }
    };
  }, [isScanning]);

  // Callback de leitura do QR Code
  const onScanSuccess = async (decodedText: string) => {
    // Pausa o scanner enquanto valida
    await stopScanner();
    await handleValidate(decodedText);
  };

  const handleValidate = async (tokenOrCode: string) => {
    setCheckinSuccessMessage('');
    try {
      const res = await validateTicketQR({ qrToken: tokenOrCode });
      setValidationResult(res);

      if (res.valid) {
        playSuccessSound();
      } else {
        playErrorSound();
      }
    } catch (err) {
      playErrorSound();
      setValidationResult({
        valid: false,
        status: 'not_found',
        message: 'Erro ao validar ingresso no servidor.',
      });
    }
  };

  const handleManualSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualCode.trim()) return;
    handleValidate(manualCode.trim());
  };

  // Efetivar Check-in Atômico
  const handleConfirmCheckin = async () => {
    if (!validationResult?.ticket?.id) return;
    setIsProcessingCheckin(true);

    try {
      const operatorName = currentUser?.name || 'Operador Portaria';
      const res = await performCheckin(validationResult.ticket.id, operatorName);

      if (res.success) {
        playSuccessSound();
        setCheckinSuccessMessage(`ENTRADA LIBERADA! #${validationResult.ticket.id.slice(-6)}`);
        setValidationResult(null);
        setManualCode('');
        loadMetrics();
      } else {
        playErrorSound();
        setValidationResult({
          valid: false,
          status: 'already_used',
          message: res.message || 'Falha ao liberar entrada.',
          ticket: validationResult.ticket,
        });
      }
    } catch (err: any) {
      playErrorSound();
      alert('Erro de conexão ao salvar check-in: ' + err.message);
    } finally {
      setIsProcessingCheckin(false);
    }
  };

  const handleReject = () => {
    playErrorSound();
    setValidationResult(null);
    setManualCode('');
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col">
      {/* Header Portaria Mobile */}
      <header className="sticky top-0 z-40 bg-zinc-900 border-b border-zinc-800 p-4">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Link to="/" className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-black text-sm uppercase tracking-wider text-emerald-400">
                  PORTARIA / SCANNER
                </span>
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              </div>
              <p className="text-[11px] text-zinc-400">
                {currentUser ? `Operador: ${currentUser.name}` : 'Modo Portaria Ativo'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Indicador de Internet */}
            <div
              className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-mono font-bold ${
                isOnline
                  ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-800'
                  : 'bg-red-950 text-red-300 border border-red-800 animate-pulse'
              }`}
            >
              {isOnline ? <Wifi className="w-3.5 h-3.5 text-emerald-400" /> : <WifiOff className="w-3.5 h-3.5 text-red-400" />}
              <span>{isOnline ? 'ONLINE' : 'OFFLINE'}</span>
            </div>

            {currentUser && (
              <button
                onClick={logout}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800"
                title="Sair"
              >
                <LogOut className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Contador de Entradas em Tempo Real */}
        {metrics && (
          <div className="max-w-md mx-auto mt-3 p-2.5 rounded-xl bg-zinc-950 border border-zinc-800 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-emerald-400" />
              <span className="text-zinc-300 font-medium">Entradas Validadas:</span>
            </div>
            <div className="font-mono font-bold">
              <span className="text-emerald-400 text-sm">{metrics.checkedInCount}</span>
              <span className="text-zinc-500"> / {metrics.totalCapacity} ({metrics.checkInRate}%)</span>
            </div>
          </div>
        )}
      </header>

      {/* Offline Alert */}
      {!isOnline && (
        <div className="bg-red-600 text-white p-3 text-center text-xs font-bold flex items-center justify-center gap-2">
          <WifiOff className="w-4 h-4" />
          <span>SEM CONEXÃO COM A INTERNET. Utilize a busca manual caso o QR falhe.</span>
        </div>
      )}

      {/* Conteúdo Principal */}
      <main className="flex-1 max-w-md w-full mx-auto p-4 flex flex-col justify-start space-y-4">
        {/* Banner de sucesso temporário */}
        {checkinSuccessMessage && (
          <div className="p-4 rounded-2xl bg-emerald-950 border-2 border-emerald-500 text-emerald-200 text-center font-bold text-sm shadow-xl flex items-center justify-center gap-2 animate-bounce">
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            <span>{checkinSuccessMessage}</span>
          </div>
        )}

        {/* ================= TELA DE VALIDAÇÃO DO INGRESSO (RESULTADO) ================= */}
        {validationResult && (
          <div className="space-y-4">
            {/* CARD VERDE: VÁLIDO */}
            {validationResult.valid && validationResult.ticket && (
              <div className="bg-zinc-900 border-4 border-emerald-500 rounded-3xl p-6 shadow-2xl space-y-5 animate-in fade-in">
                <div className="text-center space-y-1">
                  <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 border-2 border-emerald-500 flex items-center justify-center mx-auto mb-2 shadow-lg shadow-emerald-500/20">
                    <CheckCircle2 className="w-10 h-10 stroke-[2.5]" />
                  </div>
                  <span className="px-3 py-1 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-600 text-xs font-black uppercase tracking-wider">
                    INGRESSO VÁLIDO
                  </span>
                  <h2 className="text-2xl font-black text-white uppercase font-['Syne',sans-serif] mt-2">
                    {validationResult.ticket.attendeeName}
                  </h2>
                </div>

                <div className="p-4 rounded-2xl bg-zinc-950 border border-zinc-800 space-y-2.5 text-xs font-mono">
                  <div className="flex justify-between items-center pb-2 border-b border-zinc-800/80">
                    <span className="text-zinc-500">Tipo de Ingresso:</span>
                    <span className="text-fuchsia-400 font-bold text-sm">
                      {validationResult.ticket.ticketTypeName}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-zinc-500">Documento (CPF):</span>
                    <span className="text-white font-bold text-sm">
                      {validationResult.ticket.maskedCpf}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-zinc-500">Lote Oficial:</span>
                    <span className="text-zinc-300">{validationResult.ticket.ticketBatch}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-zinc-500">WhatsApp:</span>
                    <span className="text-zinc-300">{validationResult.ticket.attendeeWhatsapp}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-zinc-500">Origem:</span>
                    <span className="text-zinc-400 uppercase">{validationResult.ticket.originGroupSlug}</span>
                  </div>
                </div>

                {/* BOTÕES DE AÇÃO GIGANTES */}
                <div className="space-y-3">
                  <button
                    onClick={handleConfirmCheckin}
                    disabled={isProcessingCheckin}
                    className="w-full py-5 rounded-2xl bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-400 hover:to-green-500 text-zinc-950 font-black text-lg tracking-wider shadow-2xl shadow-emerald-500/40 flex items-center justify-center gap-2 cursor-pointer transition-transform active:scale-95 disabled:opacity-50"
                  >
                    <CheckCircle2 className="w-6 h-6 stroke-[3]" />
                    <span>{isProcessingCheckin ? 'LIBERANDO...' : 'LIBERAR ENTRADA'}</span>
                  </button>

                  <button
                    onClick={handleReject}
                    className="w-full py-3.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-400 font-bold text-xs uppercase transition-colors"
                  >
                    NEGAR / CANCELAR
                  </button>
                </div>
              </div>
            )}

            {/* CARD VERMELHO: JÁ UTILIZADO */}
            {!validationResult.valid && validationResult.status === 'already_used' && (
              <div className="bg-zinc-900 border-4 border-red-500 rounded-3xl p-6 shadow-2xl space-y-5 animate-in fade-in">
                <div className="text-center space-y-1">
                  <div className="w-16 h-16 rounded-full bg-red-500/20 text-red-400 border-2 border-red-500 flex items-center justify-center mx-auto mb-2 shadow-lg shadow-red-500/30">
                    <XCircle className="w-10 h-10 stroke-[2.5]" />
                  </div>
                  <span className="px-3 py-1 rounded-full bg-red-950 text-red-300 border border-red-600 text-xs font-black uppercase tracking-wider">
                    INGRESSO JÁ UTILIZADO!
                  </span>
                  <h2 className="text-xl font-bold text-white uppercase mt-2">
                    {validationResult.ticket?.attendeeName || 'Não Liberado'}
                  </h2>
                </div>

                <div className="p-4 rounded-2xl bg-red-950/40 border border-red-900/60 text-xs text-red-200 space-y-2">
                  <p className="font-bold text-sm">Atenção Portaria:</p>
                  <p>{validationResult.message}</p>
                  {validationResult.ticket && (
                    <p className="text-[11px] font-mono text-zinc-400 pt-1">
                      CPF: {validationResult.ticket.maskedCpf} • {validationResult.ticket.ticketTypeName}
                    </p>
                  )}
                </div>

                <button
                  onClick={() => setValidationResult(null)}
                  className="w-full py-4 rounded-2xl bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-sm uppercase transition-colors"
                >
                  VOLTAR AO SCANNER
                </button>
              </div>
            )}

            {/* CARD AMARELO: PAGAMENTO PENDENTE */}
            {!validationResult.valid && validationResult.status === 'pending_payment' && (
              <div className="bg-zinc-900 border-4 border-amber-500 rounded-3xl p-6 shadow-2xl space-y-5 animate-in fade-in">
                <div className="text-center space-y-1">
                  <div className="w-16 h-16 rounded-full bg-amber-500/20 text-amber-400 border-2 border-amber-500 flex items-center justify-center mx-auto mb-2">
                    <AlertTriangle className="w-10 h-10" />
                  </div>
                  <span className="px-3 py-1 rounded-full bg-amber-950 text-amber-300 border border-amber-600 text-xs font-black uppercase">
                    PAGAMENTO NÃO CONFIRMADO
                  </span>
                  <p className="text-xs text-zinc-300 mt-2">
                    O Pix deste pedido ainda consta como pendente no banco.
                  </p>
                </div>

                <button
                  onClick={() => setValidationResult(null)}
                  className="w-full py-4 rounded-2xl bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-sm uppercase"
                >
                  VOLTAR AO SCANNER
                </button>
              </div>
            )}

            {/* CARD VERMELHO: NÃO ENCONTRADO OU CANCELADO */}
            {!validationResult.valid && ['not_found', 'cancelled'].includes(validationResult.status) && (
              <div className="bg-zinc-900 border-4 border-red-500 rounded-3xl p-6 shadow-2xl space-y-5 text-center">
                <div className="w-16 h-16 rounded-full bg-red-500/20 text-red-400 border-2 border-red-500 flex items-center justify-center mx-auto">
                  <XCircle className="w-10 h-10" />
                </div>
                <h3 className="text-xl font-bold text-white uppercase font-['Syne',sans-serif]">
                  {validationResult.message}
                </h3>
                <p className="text-xs text-zinc-400">
                  Verifique se o cliente abriu o ingresso correto ou tente buscar pelo CPF abaixo.
                </p>
                <button
                  onClick={() => setValidationResult(null)}
                  className="w-full py-4 rounded-2xl bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-sm uppercase"
                >
                  TENTAR NOVAMENTE
                </button>
              </div>
            )}
          </div>
        )}

        {/* ================= CÂMERA SCANNER EM TEMPO REAL ================= */}
        {!validationResult && (
          <div className="space-y-4">
            <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-4 shadow-xl overflow-hidden relative">
              <div className="flex items-center justify-between mb-3 px-1">
                <span className="text-xs font-bold uppercase text-zinc-400 tracking-wider">
                  Câmera ao Vivo
                </span>
                <span className="text-[11px] text-zinc-500 font-mono">Apontar para o QR Code</span>
              </div>

              {/* Container HTML5-QRCode */}
              <div
                id={scannerContainerId}
                className="w-full min-h-[260px] bg-black rounded-2xl overflow-hidden border-2 border-zinc-800 relative flex items-center justify-center"
              >
                {!isScanning && (
                  <div className="text-center p-6 space-y-3">
                    <Camera className="w-12 h-12 text-zinc-600 mx-auto" />
                    <p className="text-xs text-zinc-400">
                      {cameraError || 'Câmera pausada ou aguardando permissão.'}
                    </p>
                    <button
                      onClick={startScanner}
                      className="px-6 py-2.5 rounded-xl bg-fuchsia-600 hover:bg-fuchsia-500 text-white font-bold text-xs uppercase tracking-wider transition-colors shadow-lg shadow-fuchsia-950/40 cursor-pointer"
                    >
                      ABRIR CÂMERA DO CELULAR
                    </button>
                  </div>
                )}
              </div>

              {isScanning && (
                <div className="mt-3 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs text-emerald-400">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping"></span>
                    <span>Lendo em tempo real...</span>
                  </div>
                  <button
                    onClick={stopScanner}
                    className="text-xs text-zinc-400 hover:text-white underline cursor-pointer"
                  >
                    Pausar Câmera
                  </button>
                </div>
              )}
            </div>

            {/* ================= PLANO B: BUSCA MANUAL POR CPF OU TOKEN ================= */}
            <div className="bg-zinc-900/90 border border-zinc-800 rounded-3xl p-4 shadow-xl">
              <div className="flex items-center gap-2 mb-2 text-xs font-bold uppercase text-zinc-400">
                <Search className="w-4 h-4 text-cyan-400" />
                <span>Plano B: Busca Manual por CPF ou Código</span>
              </div>
              <p className="text-[11px] text-zinc-500 mb-3">
                Caso a tela do celular do cliente esteja com brilho baixo ou trincada.
              </p>

              <form onSubmit={handleManualSearch} className="flex gap-2">
                <input
                  type="text"
                  placeholder="Digite o CPF ou código do ingresso"
                  value={manualCode}
                  onChange={(e) => setManualCode(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 focus:border-cyan-500 rounded-xl px-3 py-2.5 text-xs text-white font-mono focus:outline-none"
                />
                <button
                  type="submit"
                  className="px-4 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs shrink-0 transition-colors"
                >
                  Validar
                </button>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
