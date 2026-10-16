import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  MessageSquare,
  Ticket,
  Settings,
  Users,
  BookOpen,
  LogOut,
  Sparkles,
  TrendingUp,
  DollarSign,
  UserCheck,
  Clock,
  Search,
  Download,
  Plus,
  Copy,
  Check,
  Trash2,
  AlertTriangle,
  QrCode,
  Flame,
  Palette,
  ExternalLink,
  Shield,
  RefreshCw,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import {
  EventConfig,
  DashboardMetrics,
  Order,
  WhatsAppGroup,
  AppUser,
} from '../types';
import {
  fetchEventConfig,
  updateEventConfig,
  fetchDashboardMetrics,
  fetchAdminOrders,
  cancelAdminOrder,
  fetchWhatsAppGroups,
  saveWhatsAppGroup,
  fetchAdminTeam,
  addAdminTeamMember,
  removeAdminTeamMember,
} from '../services/api';
import { formatCurrencyBRL, maskCPF, formatCPF } from '../utils/validators';

export const AdminPage: React.FC = () => {
  const { currentUser, isAdmin, isStaff, login, logout, loginAsDemo } = useAuth();
  const navigate = useNavigate();

  // Login form state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPass, setLoginPass] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);

  // Active Tab
  const [activeTab, setActiveTab] = useState<'dashboard' | 'whatsapp' | 'orders' | 'config' | 'team' | 'setup'>('dashboard');

  // Data states
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [groups, setGroups] = useState<WhatsAppGroup[]>([]);
  const [team, setTeam] = useState<AppUser[]>([]);
  const [config, setConfig] = useState<EventConfig | null>(null);
  const [loadingData, setLoadingData] = useState(false);

  // Orders filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [groupFilter, setGroupFilter] = useState('all');

  // WhatsApp group modal/form
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupSlug, setNewGroupSlug] = useState('');
  const [newGroupDesc, setNewGroupDesc] = useState('');
  const [copiedSlug, setCopiedSlug] = useState<string | null>(null);

  // Team form
  const [newTeamEmail, setNewTeamEmail] = useState('');
  const [newTeamName, setNewTeamName] = useState('');
  const [newTeamRole, setNewTeamRole] = useState<'admin' | 'staff'>('staff');

  // Config save feedback
  const [savingConfig, setSavingConfig] = useState(false);
  const [configSavedToast, setConfigSavedToast] = useState(false);

  const loadAllData = async () => {
    setLoadingData(true);
    try {
      const [m, o, g, t, c] = await Promise.all([
        fetchDashboardMetrics(),
        fetchAdminOrders({ search: searchQuery, status: statusFilter, group: groupFilter }),
        fetchWhatsAppGroups(),
        fetchAdminTeam(),
        fetchEventConfig(),
      ]);
      setMetrics(m);
      setOrders(o);
      setGroups(g);
      setTeam(t);
      setConfig(c);
    } catch (err) {
      console.error('Erro ao carregar dados admin:', err);
    } finally {
      setLoadingData(false);
    }
  };

  useEffect(() => {
    if (isStaff) {
      loadAllData();
    }
  }, [isStaff]);

  useEffect(() => {
    if (isStaff) {
      fetchAdminOrders({ search: searchQuery, status: statusFilter, group: groupFilter })
        .then(setOrders)
        .catch(console.error);
    }
  }, [searchQuery, statusFilter, groupFilter]);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setLoginLoading(true);
    try {
      await login(loginEmail, loginPass);
    } catch (err: any) {
      setLoginError(err.message || 'Credenciais inválidas');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleSaveGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroupName || !newGroupSlug) return;
    try {
      await saveWhatsAppGroup({
        name: newGroupName,
        slug: newGroupSlug,
        description: newGroupDesc,
      });
      setNewGroupName('');
      setNewGroupSlug('');
      setNewGroupDesc('');
      const updatedGroups = await fetchWhatsAppGroups();
      setGroups(updatedGroups);
      const updatedMetrics = await fetchDashboardMetrics();
      setMetrics(updatedMetrics);
    } catch (err: any) {
      alert(err.message || 'Erro ao criar grupo');
    }
  };

  const handleCopyLink = (slug: string) => {
    const origin = window.location.origin;
    const fullLink = `${origin}?g=${slug}`;
    navigator.clipboard.writeText(fullLink);
    setCopiedSlug(slug);
    setTimeout(() => setCopiedSlug(null), 2500);
  };

  const handleCancelOrder = async (orderId: string) => {
    if (!confirm('Deseja realmente cancelar este pedido e invalidar todos os seus ingressos?')) return;
    try {
      await cancelAdminOrder(orderId);
      loadAllData();
    } catch (err: any) {
      alert('Erro ao cancelar pedido: ' + err.message);
    }
  };

  const handleExportCSV = () => {
    if (orders.length === 0) {
      alert('Não há dados para exportar.');
      return;
    }

    const headers = ['Pedido', 'Data', 'Nome', 'CPF', 'WhatsApp', 'Email', 'Ingresso', 'Qtd', 'Valor', 'Status', 'Origem'];
    const rows = orders.map((o) => [
      o.orderNumber,
      new Date(o.createdAt).toLocaleString('pt-BR'),
      `"${o.customerName}"`,
      `"${o.customerCpf}"`,
      `"${o.customerWhatsapp}"`,
      o.customerEmail,
      `"${o.ticketTypeName}"`,
      o.quantity,
      o.totalAmount.toFixed(2),
      o.status,
      o.originGroupSlug,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `relatorio-vendas-vibepass-${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleAddTeamMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTeamEmail || !newTeamName) return;
    try {
      const updated = await addAdminTeamMember({
        email: newTeamEmail,
        name: newTeamName,
        role: newTeamRole,
      });
      setTeam(updated);
      setNewTeamEmail('');
      setNewTeamName('');
    } catch (err: any) {
      alert(err.message || 'Erro ao adicionar membro');
    }
  };

  const handleRemoveTeamMember = async (uid: string) => {
    if (!confirm('Remover este membro da equipe?')) return;
    try {
      const updated = await removeAdminTeamMember(uid);
      setTeam(updated);
    } catch (err: any) {
      alert(err.message || 'Erro ao remover');
    }
  };

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!config) return;
    setSavingConfig(true);
    try {
      const updated = await updateEventConfig(config);
      setConfig(updated);
      setConfigSavedToast(true);
      setTimeout(() => setConfigSavedToast(false), 3000);
    } catch (err: any) {
      alert('Erro ao salvar configurações: ' + err.message);
    } finally {
      setSavingConfig(false);
    }
  };

  // ==========================================
  // TELA DE LOGIN ADMIN SE NÃO AUTENTICADO
  // ==========================================
  if (!isStaff) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-zinc-900 border border-zinc-800 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-48 h-48 bg-fuchsia-600/10 rounded-full blur-[80px] pointer-events-none"></div>

          <div className="text-center mb-6">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-fuchsia-600 to-violet-600 p-0.5 shadow-lg shadow-fuchsia-950/50 mx-auto mb-3 flex items-center justify-center">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-2xl font-black text-white font-['Syne',sans-serif]">
              PAINEL ADMINISTRATIVO
            </h1>
            <p className="text-xs text-zinc-400 mt-1">
              Acesso restrito para organizadores e portaria
            </p>
          </div>

          {loginError && (
            <div className="p-3 mb-4 rounded-xl bg-red-950/60 border border-red-500/40 text-xs text-red-300 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
              <span>{loginError}</span>
            </div>
          )}

          <form onSubmit={handleLoginSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase text-zinc-400 mb-1.5">
                E-mail de Acesso
              </label>
              <input
                type="email"
                required
                placeholder="admin@vibepass.com"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 focus:border-fuchsia-500 rounded-xl px-4 py-3 text-sm text-white focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase text-zinc-400 mb-1.5">
                Senha
              </label>
              <input
                type="password"
                required
                placeholder="••••••••"
                value={loginPass}
                onChange={(e) => setLoginPass(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 focus:border-fuchsia-500 rounded-xl px-4 py-3 text-sm text-white focus:outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={loginLoading}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-fuchsia-600 to-violet-600 hover:from-fuchsia-500 hover:to-violet-500 text-white font-bold text-sm tracking-wide shadow-lg shadow-fuchsia-600/30 cursor-pointer transition-all disabled:opacity-50"
            >
              {loginLoading ? 'Entrando...' : 'Entrar no Painel'}
            </button>
          </form>

          {/* Atalhos de Demonstração / Teste Rápido */}
          <div className="mt-6 pt-6 border-t border-zinc-800/80">
            <p className="text-[11px] font-mono uppercase text-zinc-500 text-center mb-3">
              Acesso Rápido para Demonstração:
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => loginAsDemo('admin')}
                className="py-2 px-3 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-fuchsia-300 border border-zinc-700 transition-colors"
              >
                Entrar como Admin
              </button>
              <button
                type="button"
                onClick={() => loginAsDemo('staff')}
                className="py-2 px-3 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-emerald-300 border border-zinc-700 transition-colors"
              >
                Entrar como Portaria
              </button>
            </div>
          </div>

          <div className="mt-4 text-center">
            <Link to="/" className="text-xs text-zinc-400 hover:text-white transition-colors">
              ← Voltar ao site público
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // PAINEL AUTENTICADO
  // ==========================================
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col md:flex-row">
      {/* Sidebar de Navegação */}
      <aside className="w-full md:w-64 bg-zinc-900 border-r border-zinc-800 flex flex-col justify-between shrink-0">
        <div>
          {/* Top Brand */}
          <div className="p-5 border-b border-zinc-800 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-fuchsia-600 to-violet-600 flex items-center justify-center font-bold text-white text-sm">
                VP
              </div>
              <div>
                <span className="font-extrabold text-sm tracking-wide text-white font-['Syne',sans-serif]">
                  ADMIN VIBEPASS
                </span>
                <p className="text-[10px] text-zinc-400 uppercase font-mono">
                  {currentUser?.role === 'admin' ? 'Administrador Geral' : 'Operador Portaria'}
                </p>
              </div>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="p-3 space-y-1 text-sm font-medium">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-colors cursor-pointer ${
                activeTab === 'dashboard'
                  ? 'bg-fuchsia-600/20 text-fuchsia-400 border border-fuchsia-500/30 font-bold'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60'
              }`}
            >
              <LayoutDashboard className="w-4 h-4" />
              <span>Dashboard</span>
            </button>

            {/* Grupos de WhatsApp: SOMENTE ADMIN, Staff não vê */}
            {isAdmin && (
              <button
                onClick={() => setActiveTab('whatsapp')}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-colors cursor-pointer ${
                  activeTab === 'whatsapp'
                    ? 'bg-fuchsia-600/20 text-fuchsia-400 border border-fuchsia-500/30 font-bold'
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60'
                }`}
              >
                <MessageSquare className="w-4 h-4" />
                <span>Grupos de WhatsApp</span>
              </button>
            )}

            <button
              onClick={() => setActiveTab('orders')}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-colors cursor-pointer ${
                activeTab === 'orders'
                  ? 'bg-fuchsia-600/20 text-fuchsia-400 border border-fuchsia-500/30 font-bold'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60'
              }`}
            >
              <Ticket className="w-4 h-4" />
              <span>Vendas e Ingressos</span>
            </button>

            {isAdmin && (
              <button
                onClick={() => setActiveTab('config')}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-colors cursor-pointer ${
                  activeTab === 'config'
                    ? 'bg-fuchsia-600/20 text-fuchsia-400 border border-fuchsia-500/30 font-bold'
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60'
                }`}
              >
                <Settings className="w-4 h-4" />
                <span>Configurações Festa</span>
              </button>
            )}

            {isAdmin && (
              <button
                onClick={() => setActiveTab('team')}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-colors cursor-pointer ${
                  activeTab === 'team'
                    ? 'bg-fuchsia-600/20 text-fuchsia-400 border border-fuchsia-500/30 font-bold'
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60'
                }`}
              >
                <Users className="w-4 h-4" />
                <span>Equipe & Portaria</span>
              </button>
            )}

            <button
              onClick={() => setActiveTab('setup')}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-colors cursor-pointer ${
                activeTab === 'setup'
                  ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 font-bold'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60'
              }`}
            >
              <BookOpen className="w-4 h-4 text-cyan-400" />
              <span>Guia de Setup & Pix</span>
            </button>
          </nav>
        </div>

        {/* Bottom Actions */}
        <div className="p-4 border-t border-zinc-800 space-y-2">
          <Link
            to="/scanner"
            className="w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-800/80 text-emerald-300 font-bold text-xs transition-colors"
          >
            <QrCode className="w-4 h-4" />
            <span>Abrir Portaria Scanner</span>
          </Link>

          <Link
            to="/"
            target="_blank"
            className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>Ver Site da Festa</span>
          </Link>

          <button
            onClick={logout}
            className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-red-400 hover:bg-red-950/40 text-xs transition-colors cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sair ({currentUser?.email})</span>
          </button>
        </div>
      </aside>

      {/* Área de Conteúdo Principal */}
      <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-6">
        {/* =========================================================================
            ABA 1: DASHBOARD
           ========================================================================= */}
        {activeTab === 'dashboard' && metrics && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl sm:text-3xl font-black text-white font-['Syne',sans-serif]">
                  Visão Geral do Evento
                </h2>
                <p className="text-xs sm:text-sm text-zinc-400">
                  {config?.eventName} • {config?.venueName} ({config?.eventDate})
                </p>
              </div>

              <button
                onClick={loadAllData}
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-xs text-zinc-300 transition-colors self-start sm:self-auto cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Atualizar Métricas</span>
              </button>
            </div>

            {/* Cards de Métricas Principais */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-5 rounded-2xl bg-zinc-900/90 border border-zinc-800 shadow-lg">
                <div className="flex items-center justify-between text-zinc-400 text-xs font-semibold uppercase">
                  <span>Faturamento Total</span>
                  <DollarSign className="w-4 h-4 text-emerald-400" />
                </div>
                <div className="mt-2 text-2xl sm:text-3xl font-black text-white font-mono">
                  {formatCurrencyBRL(metrics.totalRevenue)}
                </div>
                <p className="mt-1 text-[11px] text-zinc-500">Pagamentos confirmados via Pix</p>
              </div>

              <div className="p-5 rounded-2xl bg-zinc-900/90 border border-zinc-800 shadow-lg">
                <div className="flex items-center justify-between text-zinc-400 text-xs font-semibold uppercase">
                  <span>Ingressos Emitidos</span>
                  <Ticket className="w-4 h-4 text-fuchsia-400" />
                </div>
                <div className="mt-2 text-2xl sm:text-3xl font-black text-white font-mono">
                  {metrics.totalTicketsSold}
                </div>
                <p className="mt-1 text-[11px] text-zinc-500">
                  Restam {metrics.availableTickets} de {metrics.totalCapacity} vagas
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-zinc-900/90 border border-zinc-800 shadow-lg">
                <div className="flex items-center justify-between text-zinc-400 text-xs font-semibold uppercase">
                  <span>Check-ins Portaria</span>
                  <UserCheck className="w-4 h-4 text-cyan-400" />
                </div>
                <div className="mt-2 text-2xl sm:text-3xl font-black text-white font-mono">
                  {metrics.checkedInCount}
                </div>
                <p className="mt-1 text-[11px] text-emerald-400 font-semibold">
                  Taxa de entrada: {metrics.checkInRate}%
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-zinc-900/90 border border-zinc-800 shadow-lg">
                <div className="flex items-center justify-between text-zinc-400 text-xs font-semibold uppercase">
                  <span>Pix Pendentes</span>
                  <Clock className="w-4 h-4 text-amber-400" />
                </div>
                <div className="mt-2 text-2xl sm:text-3xl font-black text-white font-mono">
                  {metrics.pendingOrdersCount}
                </div>
                <p className="mt-1 text-[11px] text-zinc-500">Aguardando compensação</p>
              </div>
            </div>

            {/* Vendas por Tipo (Pista vs Open Bar) */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="p-6 rounded-2xl bg-zinc-900 border border-zinc-800 space-y-4">
                <h3 className="text-base font-bold text-white uppercase tracking-wider font-['Syne',sans-serif]">
                  Vendas por Categoria de Ingresso
                </h3>

                <div className="space-y-4">
                  {Object.entries(metrics.salesByType).map(([id, t]) => {
                    const pct = t.max > 0 ? Math.min(100, Math.round((t.sold / t.max) * 100)) : 0;
                    return (
                      <div key={id} className="p-4 rounded-xl bg-zinc-950 border border-zinc-800/80 space-y-2">
                        <div className="flex items-center justify-between text-xs sm:text-sm">
                          <span className="font-bold text-white">{t.name}</span>
                          <span className="font-mono text-fuchsia-400 font-bold">
                            {formatCurrencyBRL(t.revenue)}
                          </span>
                        </div>
                        <div className="w-full bg-zinc-800 rounded-full h-2 overflow-hidden">
                          <div
                            className="bg-fuchsia-500 h-2 rounded-full"
                            style={{ width: `${pct}%` }}
                          ></div>
                        </div>
                        <div className="flex justify-between text-[11px] text-zinc-400 font-mono">
                          <span>{t.sold} vendidos de {t.max}</span>
                          <span>{pct}% do lote</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Ranking Rápido dos Grupos de WhatsApp */}
              <div className="p-6 rounded-2xl bg-zinc-900 border border-zinc-800 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold text-white uppercase tracking-wider font-['Syne',sans-serif]">
                    Top Grupos de WhatsApp
                  </h3>
                  {isAdmin && (
                    <button
                      onClick={() => setActiveTab('whatsapp')}
                      className="text-xs text-fuchsia-400 hover:underline"
                    >
                      Gerenciar Grupos
                    </button>
                  )}
                </div>

                {metrics.topGroups.length === 0 ? (
                  <p className="text-xs text-zinc-500 py-6 text-center">
                    Nenhum grupo com vendas registradas ainda.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {metrics.topGroups.slice(0, 4).map((g, idx) => (
                      <div
                        key={g.slug}
                        className="p-3 rounded-xl bg-zinc-950 border border-zinc-800/80 flex items-center justify-between text-xs"
                      >
                        <div className="flex items-center gap-3">
                          <span
                            className={`w-6 h-6 rounded-full flex items-center justify-center font-bold font-mono text-[11px] ${
                              idx === 0
                                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                                : 'bg-zinc-800 text-zinc-400'
                            }`}
                          >
                            {idx + 1}
                          </span>
                          <div>
                            <p className="font-bold text-white">{g.name}</p>
                            <p className="text-[10px] text-zinc-500 font-mono">?g={g.slug}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-mono font-bold text-emerald-400">{g.sales} ingressos</p>
                          <p className="text-[10px] text-zinc-400">Conv: {g.conversionRate}%</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* =========================================================================
            ABA 2: GRUPOS DE WHATSAPP (Rastreamento de Origem)
           ========================================================================= */}
        {activeTab === 'whatsapp' && isAdmin && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl sm:text-3xl font-black text-white font-['Syne',sans-serif]">
                  Grupos de Divulgação WhatsApp
                </h2>
                <p className="text-xs sm:text-sm text-zinc-400">
                  Crie links com parâmetros <code className="text-fuchsia-400">?g=slug</code> para rastrear cliques, conversão e faturamento por comunidade.
                </p>
              </div>
            </div>

            {/* Formulário Novo Grupo */}
            <div className="p-6 rounded-2xl bg-zinc-900 border border-zinc-800">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4 flex items-center gap-2">
                <Plus className="w-4 h-4 text-fuchsia-400" />
                <span>Cadastrar Novo Link de Grupo</span>
              </h3>

              <form onSubmit={handleSaveGroup} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <input
                    type="text"
                    required
                    placeholder="Nome (Ex: Baladas Goiânia VIP)"
                    value={newGroupName}
                    onChange={(e) => setNewGroupName(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 focus:border-fuchsia-500 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none"
                  />
                </div>
                <div>
                  <input
                    type="text"
                    required
                    placeholder="Slug (Ex: baladas-vip)"
                    value={newGroupSlug}
                    onChange={(e) => setNewGroupSlug(e.target.value.toLowerCase().replace(/\s+/g, '-'))}
                    className="w-full bg-zinc-950 border border-zinc-800 focus:border-fuchsia-500 rounded-xl px-3.5 py-2.5 text-xs text-white font-mono focus:outline-none"
                  />
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Observação (opcional)"
                    value={newGroupDesc}
                    onChange={(e) => setNewGroupDesc(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 focus:border-fuchsia-500 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none"
                  />
                  <button
                    type="submit"
                    className="px-5 py-2.5 rounded-xl bg-fuchsia-600 hover:bg-fuchsia-500 text-white font-bold text-xs shrink-0 cursor-pointer transition-colors"
                  >
                    Salvar
                  </button>
                </div>
              </form>
            </div>

            {/* Tabela de Grupos com Ranking de Conversão */}
            <div className="rounded-2xl bg-zinc-900 border border-zinc-800 overflow-hidden shadow-xl">
              <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
                <span className="text-xs font-bold uppercase text-zinc-400">
                  Ranking de Performance por Grupo
                </span>
                <span className="text-xs text-zinc-500 font-mono">
                  {groups.length} grupos monitorados
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-zinc-950/80 text-zinc-400 font-mono uppercase text-[11px] border-b border-zinc-800">
                    <tr>
                      <th className="p-3.5">Grupo</th>
                      <th className="p-3.5">Link de Divulgação</th>
                      <th className="p-3.5 text-center">Visitas (Cliques)</th>
                      <th className="p-3.5 text-center">Ingressos Vendidos</th>
                      <th className="p-3.5 text-right">Faturamento</th>
                      <th className="p-3.5 text-center">Conversão</th>
                      <th className="p-3.5 text-right">Ação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/60 font-mono">
                    {groups.map((g, idx) => {
                      const conv = g.visitsCount > 0 ? ((g.salesCount / g.visitsCount) * 100).toFixed(1) : '0.0';
                      const isTop = idx === 0 && g.salesCount > 0;

                      return (
                        <tr key={g.id} className="hover:bg-zinc-800/30 transition-colors">
                          <td className="p-3.5 font-sans">
                            <div className="flex items-center gap-2">
                              {isTop && (
                                <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/40 text-[10px] font-bold">
                                  LÍDER 🏆
                                </span>
                              )}
                              <span className="font-bold text-white text-sm">{g.name}</span>
                            </div>
                            {g.description && (
                              <p className="text-[11px] text-zinc-500 font-sans mt-0.5">{g.description}</p>
                            )}
                          </td>
                          <td className="p-3.5 text-zinc-400">
                            <span className="bg-zinc-950 px-2 py-1 rounded border border-zinc-800 text-[11px] text-fuchsia-300">
                              ?g={g.slug}
                            </span>
                          </td>
                          <td className="p-3.5 text-center text-zinc-300">{g.visitsCount || 0}</td>
                          <td className="p-3.5 text-center font-bold text-white">{g.salesCount || 0}</td>
                          <td className="p-3.5 text-right font-bold text-emerald-400">
                            {formatCurrencyBRL(g.totalRevenue || 0)}
                          </td>
                          <td className="p-3.5 text-center">
                            <span className="px-2 py-1 rounded-full bg-zinc-800 text-zinc-300 font-bold text-[11px]">
                              {conv}%
                            </span>
                          </td>
                          <td className="p-3.5 text-right">
                            <button
                              onClick={() => handleCopyLink(g.slug)}
                              className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-bold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                            >
                              {copiedSlug === g.slug ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                              <span>{copiedSlug === g.slug ? 'Copiado!' : 'Copiar Link'}</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* =========================================================================
            ABA 3: VENDAS E INGRESSOS
           ========================================================================= */}
        {activeTab === 'orders' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl sm:text-3xl font-black text-white font-['Syne',sans-serif]">
                  Vendas & Ingressos Emitidos
                </h2>
                <p className="text-xs sm:text-sm text-zinc-400">
                  Consulte pedidos, reenvie ingressos e gerencie cancelamentos.
                </p>
              </div>

              <button
                onClick={handleExportCSV}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-white text-xs font-bold transition-colors cursor-pointer self-start sm:self-auto"
              >
                <Download className="w-4 h-4 text-emerald-400" />
                <span>Exportar Relatório CSV</span>
              </button>
            </div>

            {/* Barra de Busca e Filtros */}
            <div className="p-4 rounded-2xl bg-zinc-900 border border-zinc-800 grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="relative">
                <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-3" />
                <input
                  type="text"
                  placeholder="Buscar por Nome, CPF, WhatsApp..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 focus:border-fuchsia-500 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white focus:outline-none"
                />
              </div>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-zinc-950 border border-zinc-800 focus:border-fuchsia-500 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none"
              >
                <option value="all">Todos os Status</option>
                <option value="paid">Pago / Confirmado</option>
                <option value="pending">Pendente (Pix)</option>
                <option value="cancelled">Cancelado</option>
              </select>

              <select
                value={groupFilter}
                onChange={(e) => setGroupFilter(e.target.value)}
                className="bg-zinc-950 border border-zinc-800 focus:border-fuchsia-500 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none"
              >
                <option value="all">Todas as Origens</option>
                <option value="direto">Acesso Direto</option>
                {groups.map((g) => (
                  <option key={g.slug} value={g.slug}>
                    Grupo: {g.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Lista de Pedidos */}
            <div className="rounded-2xl bg-zinc-900 border border-zinc-800 overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-zinc-950/80 text-zinc-400 font-mono uppercase text-[11px] border-b border-zinc-800">
                    <tr>
                      <th className="p-3.5">Pedido</th>
                      <th className="p-3.5">Comprador</th>
                      <th className="p-3.5">Ingresso & Qtd</th>
                      <th className="p-3.5">Origem</th>
                      <th className="p-3.5 text-center">Status</th>
                      <th className="p-3.5 text-right">Valor</th>
                      <th className="p-3.5 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/60 font-mono">
                    {orders.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="p-8 text-center text-zinc-500 font-sans">
                          Nenhum pedido encontrado para os filtros selecionados.
                        </td>
                      </tr>
                    ) : (
                      orders.map((o) => (
                        <tr key={o.id} className="hover:bg-zinc-800/30 transition-colors">
                          <td className="p-3.5 text-zinc-300 font-bold">
                            #{o.orderNumber}
                            <div className="text-[10px] text-zinc-500 font-normal">
                              {new Date(o.createdAt).toLocaleDateString('pt-BR')}
                            </div>
                          </td>
                          <td className="p-3.5 font-sans">
                            <p className="font-bold text-white">{o.customerName}</p>
                            <p className="text-[11px] text-zinc-400 font-mono">
                              CPF: {maskCPF(o.customerCpf)}
                            </p>
                            <p className="text-[11px] text-zinc-500">{o.customerWhatsapp}</p>
                          </td>
                          <td className="p-3.5 font-sans">
                            <span className="font-semibold text-zinc-200">{o.ticketTypeName}</span>
                            <div className="text-[11px] text-zinc-400 font-mono">{o.quantity} un.</div>
                          </td>
                          <td className="p-3.5">
                            <span className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 text-[10px] uppercase">
                              {o.originGroupSlug}
                            </span>
                          </td>
                          <td className="p-3.5 text-center">
                            {o.status === 'paid' ? (
                              <span className="px-2.5 py-1 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800 text-[10px] font-bold">
                                PAGO
                              </span>
                            ) : o.status === 'pending' ? (
                              <span className="px-2.5 py-1 rounded-full bg-amber-950 text-amber-400 border border-amber-800 text-[10px] font-bold">
                                PENDENTE
                              </span>
                            ) : (
                              <span className="px-2.5 py-1 rounded-full bg-red-950 text-red-400 border border-red-800 text-[10px] font-bold">
                                CANCELADO
                              </span>
                            )}
                          </td>
                          <td className="p-3.5 text-right font-bold text-white">
                            {formatCurrencyBRL(o.totalAmount)}
                          </td>
                          <td className="p-3.5 text-right space-x-2 font-sans">
                            {o.tickets && o.tickets.length > 0 && (
                              <Link
                                to={`/ingresso/${o.tickets[0].qrToken}`}
                                target="_blank"
                                className="px-2.5 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs inline-block"
                                title="Ver ingresso gerado"
                              >
                                Ver QR
                              </Link>
                            )}

                            {isAdmin && o.status !== 'cancelled' && (
                              <button
                                onClick={() => handleCancelOrder(o.id)}
                                className="px-2 py-1 rounded text-red-400 hover:bg-red-950/60 text-xs transition-colors cursor-pointer"
                                title="Cancelar Pedido"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* =========================================================================
            ABA 4: CONFIGURAÇÕES DA FESTA
           ========================================================================= */}
        {activeTab === 'config' && isAdmin && config && (
          <form onSubmit={handleSaveConfig} className="space-y-6 max-w-4xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl sm:text-3xl font-black text-white font-['Syne',sans-serif]">
                  Configurações da Festa & Tema
                </h2>
                <p className="text-xs sm:text-sm text-zinc-400">
                  Todas as alterações refletem imediatamente no site sem precisar mexer no código.
                </p>
              </div>

              <button
                type="submit"
                disabled={savingConfig}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-fuchsia-600 to-violet-600 hover:from-fuchsia-500 hover:to-violet-500 text-white font-bold text-xs uppercase tracking-wider shadow-lg shadow-fuchsia-600/30 cursor-pointer transition-all self-start sm:self-auto"
              >
                {savingConfig ? 'Salvando...' : 'Salvar Alterações'}
              </button>
            </div>

            {configSavedToast && (
              <div className="p-3 rounded-xl bg-emerald-950 border border-emerald-500 text-emerald-300 text-xs font-bold flex items-center gap-2">
                <Check className="w-4 h-4" />
                <span>Configurações atualizadas com sucesso!</span>
              </div>
            )}

            {/* Interruptores Gerais */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-between">
                <div>
                  <p className="font-bold text-sm text-white">Vendas Ativas no Site</p>
                  <p className="text-xs text-zinc-400">Permitir que clientes comprem ingressos</p>
                </div>
                <input
                  type="checkbox"
                  checked={config.salesEnabled}
                  onChange={(e) => setConfig({ ...config, salesEnabled: e.target.checked })}
                  className="w-5 h-5 rounded bg-zinc-950 text-fuchsia-600"
                />
              </div>

              <div className="p-4 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-between">
                <div>
                  <p className="font-bold text-sm text-amber-300 flex items-center gap-1.5">
                    <Flame className="w-4 h-4 text-amber-400" />
                    Modo Simulação Pix (Teste)
                  </p>
                  <p className="text-xs text-zinc-400">Aprova Pix em 1 clique sem banco real</p>
                </div>
                <input
                  type="checkbox"
                  checked={config.simulatePaymentMode}
                  onChange={(e) => setConfig({ ...config, simulatePaymentMode: e.target.checked })}
                  className="w-5 h-5 rounded bg-zinc-950 text-amber-500"
                />
              </div>
            </div>

            {/* Informações Básicas do Evento */}
            <div className="p-6 rounded-2xl bg-zinc-900 border border-zinc-800 space-y-4">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider font-['Syne',sans-serif]">
                Dados Principais do Evento
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase text-zinc-400 mb-1">
                    Nome da Festa / Boate
                  </label>
                  <input
                    type="text"
                    value={config.eventName}
                    onChange={(e) => setConfig({ ...config, eventName: e.target.value })}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase text-zinc-400 mb-1">
                    Subtítulo / Chamada
                  </label>
                  <input
                    type="text"
                    value={config.eventSubtitle}
                    onChange={(e) => setConfig({ ...config, eventSubtitle: e.target.value })}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase text-zinc-400 mb-1">
                    Data (AAAA-MM-DD)
                  </label>
                  <input
                    type="date"
                    value={config.eventDate}
                    onChange={(e) => setConfig({ ...config, eventDate: e.target.value })}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase text-zinc-400 mb-1">
                    Horário de Início
                  </label>
                  <input
                    type="text"
                    value={config.eventTime}
                    onChange={(e) => setConfig({ ...config, eventTime: e.target.value })}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase text-zinc-400 mb-1">
                    Local do Evento
                  </label>
                  <input
                    type="text"
                    value={config.venueName}
                    onChange={(e) => setConfig({ ...config, venueName: e.target.value })}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase text-zinc-400 mb-1">
                    Cidade / Estado
                  </label>
                  <input
                    type="text"
                    value={config.venueCity}
                    onChange={(e) => setConfig({ ...config, venueCity: e.target.value })}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase text-zinc-400 mb-1">
                    Capacidade Total da Festa (Padrão 320)
                  </label>
                  <input
                    type="number"
                    value={config.totalCapacity}
                    onChange={(e) => setConfig({ ...config, totalCapacity: parseInt(e.target.value, 10) || 320 })}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase text-zinc-400 mb-1">
                    Idade Mínima Obrigatória
                  </label>
                  <input
                    type="number"
                    value={config.minAge}
                    onChange={(e) => setConfig({ ...config, minAge: parseInt(e.target.value, 10) || 18 })}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Ingressos e Lotes (Pista e Open Bar) */}
            <div className="p-6 rounded-2xl bg-zinc-900 border border-zinc-800 space-y-4">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider font-['Syne',sans-serif]">
                Tipos de Ingressos, Preços e Limites
              </h3>

              <div className="space-y-4">
                {config.ticketTypes.map((tt, idx) => (
                  <div key={tt.id} className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white text-sm">{tt.name}</span>
                      <span className="text-xs font-mono text-zinc-400">ID: {tt.id}</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
                      <div>
                        <label className="text-zinc-500 uppercase text-[10px]">Nome de Exibição</label>
                        <input
                          type="text"
                          value={tt.name}
                          onChange={(e) => {
                            const updated = [...config.ticketTypes];
                            updated[idx].name = e.target.value;
                            setConfig({ ...config, ticketTypes: updated });
                          }}
                          className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-white"
                        />
                      </div>

                      <div>
                        <label className="text-zinc-500 uppercase text-[10px]">Lote</label>
                        <input
                          type="text"
                          value={tt.batchName}
                          onChange={(e) => {
                            const updated = [...config.ticketTypes];
                            updated[idx].batchName = e.target.value;
                            setConfig({ ...config, ticketTypes: updated });
                          }}
                          className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-white"
                        />
                      </div>

                      <div>
                        <label className="text-zinc-500 uppercase text-[10px]">Preço (R$)</label>
                        <input
                          type="number"
                          step="0.01"
                          value={tt.price}
                          onChange={(e) => {
                            const updated = [...config.ticketTypes];
                            updated[idx].price = parseFloat(e.target.value) || 0;
                            setConfig({ ...config, ticketTypes: updated });
                          }}
                          className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-white font-mono"
                        />
                      </div>

                      <div>
                        <label className="text-zinc-500 uppercase text-[10px]">
                          Limite Máximo {tt.id === 'open-bar' ? '(Open Bar máx 60)' : ''}
                        </label>
                        <input
                          type="number"
                          value={tt.maxQuantity}
                          onChange={(e) => {
                            const updated = [...config.ticketTypes];
                            updated[idx].maxQuantity = parseInt(e.target.value, 10) || 0;
                            setConfig({ ...config, ticketTypes: updated });
                          }}
                          className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-white font-mono"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Identidade Visual & Placeholders de Imagem */}
            <div className="p-6 rounded-2xl bg-zinc-900 border border-zinc-800 space-y-4">
              <div className="flex items-center gap-2">
                <Palette className="w-4 h-4 text-fuchsia-400" />
                <h3 className="text-sm font-bold text-white uppercase tracking-wider font-['Syne',sans-serif]">
                  Identidade Visual & Imagens (Placeholders)
                </h3>
              </div>
              <p className="text-xs text-zinc-400">
                Cole aqui as URLs diretas das suas imagens finais quando prontas (hospedadas no Imgur, Cloudinary, AWS S3 ou Firebase Storage).
              </p>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="block text-zinc-400 uppercase text-[11px] font-semibold mb-1">
                    URL do Banner Principal da Festa
                  </label>
                  <input
                    type="url"
                    value={config.theme.bannerUrl}
                    onChange={(e) =>
                      setConfig({ ...config, theme: { ...config.theme, bannerUrl: e.target.value } })
                    }
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-white font-mono"
                  />
                </div>

                <div>
                  <label className="block text-zinc-400 uppercase text-[11px] font-semibold mb-1">
                    URL da Foto do DJ / Atração Principal
                  </label>
                  <input
                    type="url"
                    value={config.theme.djPhotoUrl}
                    onChange={(e) =>
                      setConfig({ ...config, theme: { ...config.theme, djPhotoUrl: e.target.value } })
                    }
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-white font-mono"
                  />
                </div>

                <div>
                  <label className="block text-zinc-400 uppercase text-[11px] font-semibold mb-1">
                    Nome da Atração Principal (DJ)
                  </label>
                  <input
                    type="text"
                    value={config.theme.djName}
                    onChange={(e) =>
                      setConfig({ ...config, theme: { ...config.theme, djName: e.target.value } })
                    }
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-white"
                  />
                </div>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={savingConfig}
                className="w-full py-4 rounded-xl bg-gradient-to-r from-fuchsia-600 to-violet-600 hover:from-fuchsia-500 hover:to-violet-500 text-white font-black text-sm uppercase tracking-wider shadow-xl shadow-fuchsia-600/30 cursor-pointer"
              >
                {savingConfig ? 'Gravando Alterações...' : 'Salvar Todas as Configurações'}
              </button>
            </div>
          </form>
        )}

        {/* =========================================================================
            ABA 5: EQUIPE E PORTARIA
           ========================================================================= */}
        {activeTab === 'team' && isAdmin && (
          <div className="space-y-6 max-w-4xl">
            <div>
              <h2 className="text-2xl sm:text-3xl font-black text-white font-['Syne',sans-serif]">
                Gerenciamento de Equipe
              </h2>
              <p className="text-xs sm:text-sm text-zinc-400">
                Cadastre e remova administradores gerais e operadores da portaria (/scanner).
              </p>
            </div>

            {/* Adicionar Membro */}
            <div className="p-6 rounded-2xl bg-zinc-900 border border-zinc-800">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4 flex items-center gap-2">
                <Plus className="w-4 h-4 text-emerald-400" />
                <span>Adicionar Novo Membro</span>
              </h3>

              <form onSubmit={handleAddTeamMember} className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <input
                  type="text"
                  required
                  placeholder="Nome do operador"
                  value={newTeamName}
                  onChange={(e) => setNewTeamName(e.target.value)}
                  className="bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white"
                />

                <input
                  type="email"
                  required
                  placeholder="e-mail de login"
                  value={newTeamEmail}
                  onChange={(e) => setNewTeamEmail(e.target.value)}
                  className="bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white"
                />

                <select
                  value={newTeamRole}
                  onChange={(e) => setNewTeamRole(e.target.value as 'admin' | 'staff')}
                  className="bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white"
                >
                  <option value="staff">Operador de Portaria (Staff)</option>
                  <option value="admin">Administrador Geral</option>
                </select>

                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase cursor-pointer"
                >
                  Adicionar
                </button>
              </form>
            </div>

            {/* Lista da Equipe */}
            <div className="rounded-2xl bg-zinc-900 border border-zinc-800 overflow-hidden shadow-xl">
              <div className="p-4 border-b border-zinc-800 text-xs font-bold uppercase text-zinc-400">
                Membros com Acesso Autorizado ({team.length})
              </div>

              <div className="divide-y divide-zinc-800 text-xs">
                {team.map((member) => (
                  <div key={member.uid} className="p-4 flex items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white text-sm">{member.name}</span>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase font-mono ${
                            member.role === 'admin'
                              ? 'bg-fuchsia-950 text-fuchsia-400 border border-fuchsia-800'
                              : 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                          }`}
                        >
                          {member.role === 'admin' ? 'Administrador' : 'Portaria (Staff)'}
                        </span>
                      </div>
                      <p className="text-zinc-400 font-mono text-[11px] mt-0.5">{member.email}</p>
                    </div>

                    {member.email !== currentUser?.email && (
                      <button
                        onClick={() => handleRemoveTeamMember(member.uid)}
                        className="p-2 text-red-400 hover:bg-red-950/60 rounded-lg transition-colors cursor-pointer"
                        title="Remover acesso"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* =========================================================================
            ABA 6: GUIA DE SETUP & PIX (README INTEGRADO)
           ========================================================================= */}
        {activeTab === 'setup' && (
          <div className="space-y-6 max-w-4xl">
            <div>
              <h2 className="text-2xl sm:text-3xl font-black text-white font-['Syne',sans-serif]">
                Guia de Instalação, Firebase & Pix
              </h2>
              <p className="text-xs sm:text-sm text-zinc-400">
                Instruções passo a passo para conectar o Firebase real, plugar o Pix e publicar as regras de segurança.
              </p>
            </div>

            {/* Checklist de Itens Pendentes */}
            <div className="p-6 rounded-2xl bg-zinc-900 border-2 border-fuchsia-500/40 space-y-4">
              <h3 className="text-sm font-bold text-fuchsia-400 uppercase tracking-wider flex items-center gap-2">
                <Sparkles className="w-4 h-4" />
                <span>O que você ainda precisa preencher antes de inaugurar:</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800">
                  <strong className="text-white block mb-1">1. Artes e Banners Finais:</strong>
                  <span className="text-zinc-400">
                    Ajustar na aba "Configurações Festa" a URL do banner principal (1600x800) e a foto do DJ.
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800">
                  <strong className="text-white block mb-1">2. Preços e Lotes Finais:</strong>
                  <span className="text-zinc-400">
                    Ajustar os valores em Reais da Pista e do Camarote Open Bar (máx 60).
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800">
                  <strong className="text-white block mb-1">3. Chave Pix Real:</strong>
                  <span className="text-zinc-400">
                    Definir <code className="text-fuchsia-300">MERCADO_PAGO_ACCESS_TOKEN</code> ou <code className="text-fuchsia-300">ASAAS_API_KEY</code> nas variáveis de ambiente.
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800">
                  <strong className="text-white block mb-1">4. Desativar Modo Simulação:</strong>
                  <span className="text-zinc-400">
                    Desmarcar a chave "Modo Simulação Pix" nas configurações para começar a receber pagamentos bancários reais.
                  </span>
                </div>
              </div>
            </div>

            {/* Passo a Passo Firebase */}
            <div className="p-6 rounded-2xl bg-zinc-900 border border-zinc-800 space-y-4 text-xs leading-relaxed text-zinc-300">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                Como Criar o Projeto no Firebase e Publicar as Regras
              </h3>

              <ol className="list-decimal list-inside space-y-3 text-zinc-400">
                <li>
                  <strong className="text-white">Criar Projeto:</strong> Acesse <a href="https://console.firebase.google.com" target="_blank" rel="noreferrer" className="text-fuchsia-400 underline">console.firebase.google.com</a>, clique em "Adicionar projeto" e escolha um nome.
                </li>
                <li>
                  <strong className="text-white">Ativar Firestore Database:</strong> No menu lateral, clique em "Firestore Database" &gt; "Criar banco de dados" &gt; Modo Produção.
                </li>
                <li>
                  <strong className="text-white">Ativar Authentication:</strong> Em "Authentication" &gt; "Método de login", ative o provedor "E-mail/senha".
                </li>
                <li>
                  <strong className="text-white">Publicar as Security Rules:</strong> No Firestore Database, clique na aba "Regras" (Rules), copie todo o conteúdo do arquivo <code className="text-white bg-zinc-950 px-1 py-0.5 rounded">firestore.rules</code> presente na raiz deste projeto e clique em "Publicar".
                </li>
                <li>
                  <strong className="text-white">Cadastrar o Primeiro Administrador:</strong> Crie um usuário no Firebase Auth com o seu e-mail e adicione um documento na coleção <code className="text-white bg-zinc-950 px-1 py-0.5 rounded">admins/{'{'}userId{'}'}</code> para liberar acesso permanente.
                </li>
              </ol>
            </div>

            {/* Passo a Passo Pagamentos Pix */}
            <div className="p-6 rounded-2xl bg-zinc-900 border border-zinc-800 space-y-4 text-xs leading-relaxed text-zinc-300">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                Como Plugar Mercado Pago ou Asaas
              </h3>

              <div className="space-y-3">
                <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 space-y-1.5">
                  <p className="font-bold text-white text-sm">Opção 1: Mercado Pago Pix</p>
                  <p className="text-zinc-400">
                    Gere suas credenciais em: <code className="text-fuchsia-300">https://www.mercadopago.com.br/developers/panel/app</code>
                  </p>
                  <p className="text-zinc-400">
                    No seu arquivo <code className="text-zinc-200">.env</code>, preencha:
                  </p>
                  <pre className="p-2.5 rounded bg-zinc-900 border border-zinc-800 font-mono text-[11px] text-fuchsia-300">
                    MERCADO_PAGO_ACCESS_TOKEN="APP_USR-..."
                  </pre>
                  <p className="text-[11px] text-zinc-500">
                    O Webhook automático já está configurado no endpoint: <code className="text-zinc-300">https://seu-dominio/api/payment/webhook?provider=mercadopago</code>
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 space-y-1.5">
                  <p className="font-bold text-white text-sm">Opção 2: Asaas Pix</p>
                  <p className="text-zinc-400">
                    Obtenha sua chave de API em: <code className="text-fuchsia-300">Configurações &gt; Integrações &gt; Chaves de API</code> no painel Asaas.
                  </p>
                  <pre className="p-2.5 rounded bg-zinc-900 border border-zinc-800 font-mono text-[11px] text-fuchsia-300">
                    ASAAS_API_KEY="$aact_YTU5..."
                  </pre>
                  <p className="text-[11px] text-zinc-500">
                    Webhook do Asaas: <code className="text-zinc-300">https://seu-dominio/api/payment/webhook?provider=asaas</code>
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
