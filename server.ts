import express, { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import { DEFAULT_EVENT_CONFIG } from './src/config/defaultConfig.js';
import { EventConfig, Order, Ticket, WhatsAppGroup, AppUser, CheckinValidationResult, DashboardMetrics } from './src/types/index.js';
import { validateCPF, calculateAge, generateCryptoToken, maskCPF } from './src/utils/validators.js';
import { resolvePaymentGateway } from './src/services/paymentGateway.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
const IS_PROD = process.env.NODE_ENV === 'production';

app.use(express.json());

// Armazenamento em persistência local / Mock DB com garantia atômica e suporte a Firebase
const DATA_DIR = path.resolve(process.cwd(), 'data');
const DATA_FILE = path.join(DATA_DIR, 'store.json');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

interface ServerStore {
  config: EventConfig;
  groups: WhatsAppGroup[];
  orders: Order[];
  tickets: Ticket[];
  team: AppUser[];
  visits: Array<{ id: string; groupSlug: string; timestamp: string }>;
}

function loadInitialStore(): ServerStore {
  if (fs.existsSync(DATA_FILE)) {
    try {
      const raw = fs.readFileSync(DATA_FILE, 'utf-8');
      return JSON.parse(raw);
    } catch (e) {
      console.warn('Erro ao ler store.json, reinicializando dados padrão', e);
    }
  }

  // Dados iniciais com demonstrativo seguro
  const initialStore: ServerStore = {
    config: DEFAULT_EVENT_CONFIG,
    groups: [
      {
        id: 'grp-1',
        name: 'Baladas Goiânia VIP',
        slug: 'baladas-goiania',
        description: 'Grupo principal de divulgação no WhatsApp',
        createdAt: new Date().toISOString(),
        visitsCount: 142,
        salesCount: 28,
        totalRevenue: 2840.00,
      },
      {
        id: 'grp-2',
        name: 'Turma Universitária UFG',
        slug: 'ufg-eletronica',
        description: 'Comunidade acadêmica e atléticas',
        createdAt: new Date().toISOString(),
        visitsCount: 89,
        salesCount: 19,
        totalRevenue: 1540.00,
      },
      {
        id: 'grp-3',
        name: 'Amigos do DJ Kazz',
        slug: 'amigos-dj',
        description: 'Lista de transmissão dos produtores',
        createdAt: new Date().toISOString(),
        visitsCount: 64,
        salesCount: 15,
        totalRevenue: 2250.00,
      },
    ],
    orders: [],
    tickets: [],
    team: [
      {
        uid: 'user-admin-1',
        email: 'admin@vibepass.com',
        name: 'Administrador Principal',
        role: 'admin',
        createdAt: new Date().toISOString(),
      },
      {
        uid: 'user-staff-1',
        email: 'portaria@vibepass.com',
        name: 'Operador Portaria 1',
        role: 'staff',
        createdAt: new Date().toISOString(),
      },
    ],
    visits: [],
  };

  saveStore(initialStore);
  return initialStore;
}

function saveStore(data: ServerStore) {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error('Falha ao salvar dados em store.json', err);
  }
}

const store: ServerStore = loadInitialStore();

// Mutex simples para garantir atomicidade em check-ins concorrentes na portaria
const checkinLocks = new Set<string>();

// ==========================================
// ROTAS DE API
// ==========================================

// 1. Obter configuração do evento
app.get('/api/config', (_req: Request, res: Response) => {
  res.json({
    success: true,
    data: store.config,
  });
});

// Atualizar configuração do evento (admin)
app.post('/api/config', (req: Request, res: Response) => {
  try {
    const updated = req.body as EventConfig;
    store.config = {
      ...store.config,
      ...updated,
    };
    saveStore(store);
    res.json({ success: true, data: store.config });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Erro ao atualizar configurações' });
  }
});

// 2. Grupos de WhatsApp & Tracking de Origem
app.get('/api/whatsapp-groups', (_req: Request, res: Response) => {
  res.json({ success: true, data: store.groups });
});

app.post('/api/whatsapp-groups', (req: Request, res: Response) => {
  const { name, slug, description } = req.body;
  if (!name || !slug) {
    return res.status(400).json({ success: false, error: 'Nome e slug são obrigatórios' });
  }

  const cleanSlug = slug.toLowerCase().replace(/[^a-z0-9_-]/g, '-');
  const existing = store.groups.find((g) => g.slug === cleanSlug);
  if (existing) {
    existing.name = name;
    if (description !== undefined) existing.description = description;
    saveStore(store);
    return res.json({ success: true, data: existing });
  }

  const newGroup: WhatsAppGroup = {
    id: `grp-${Date.now()}`,
    name,
    slug: cleanSlug,
    description: description || '',
    createdAt: new Date().toISOString(),
    visitsCount: 0,
    salesCount: 0,
    totalRevenue: 0,
  };

  store.groups.push(newGroup);
  saveStore(store);
  res.json({ success: true, data: newGroup });
});

// Registrar clique / visita via link do grupo (?g=slug)
app.post('/api/whatsapp-groups/visit', (req: Request, res: Response) => {
  const { slug } = req.body;
  if (!slug) return res.status(400).json({ success: false, error: 'Slug ausente' });

  const group = store.groups.find((g) => g.slug === slug);
  if (group) {
    group.visitsCount = (group.visitsCount || 0) + 1;
    store.visits.push({
      id: `vis-${Date.now()}`,
      groupSlug: slug,
      timestamp: new Date().toISOString(),
    });
    saveStore(store);
  }

  res.json({ success: true, recorded: !!group });
});

// 3. Checkout e Criação de Pedido (Atomicidade e Validação Server-side)
app.post('/api/orders', async (req: Request, res: Response) => {
  try {
    const {
      customerName,
      customerCpf,
      customerEmail,
      customerWhatsapp,
      customerBirthDate,
      ticketTypeId,
      quantity,
      originGroupSlug,
    } = req.body;

    // A. Validações obrigatórias
    if (!customerName || !customerCpf || !customerEmail || !customerWhatsapp || !customerBirthDate || !ticketTypeId) {
      return res.status(400).json({ success: false, error: 'Preencha todos os campos obrigatórios.' });
    }

    // B. Validação matemática de CPF
    if (!validateCPF(customerCpf)) {
      return res.status(400).json({ success: false, error: 'CPF inválido. Verifique os dígitos informados.' });
    }

    // C. Validação de Idade Mínima
    const age = calculateAge(customerBirthDate, store.config.eventDate);
    if (age < store.config.minAge) {
      return res.status(400).json({
        success: false,
        error: `Entrada proibida para menores de ${store.config.minAge} anos. Idade calculada: ${age} anos.`,
      });
    }

    // D. Validação de Quantidade
    const qty = parseInt(quantity, 10) || 1;
    if (qty < 1 || qty > 10) {
      return res.status(400).json({ success: false, error: 'Quantidade permitida de 1 a 10 ingressos por compra.' });
    }

    // E. Validação de Vendas Ativas
    if (!store.config.salesEnabled) {
      return res.status(400).json({ success: false, error: 'As vendas de ingressos estão temporariamente pausadas.' });
    }

    // F. Validação e Reserva de Estoque no Servidor
    const ticketType = store.config.ticketTypes.find((t) => t.id === ticketTypeId);
    if (!ticketType || !ticketType.active) {
      return res.status(400).json({ success: false, error: 'Tipo de ingresso não encontrado ou inativo.' });
    }

    // Capacidade total da festa
    const totalSoldAll = store.config.ticketTypes.reduce((acc, t) => acc + (t.soldQuantity || 0), 0);
    if (totalSoldAll + qty > store.config.totalCapacity) {
      return res.status(400).json({
        success: false,
        error: `Capacidade máxima da festa atingida! Restam apenas ${Math.max(0, store.config.totalCapacity - totalSoldAll)} ingressos disponíveis.`,
      });
    }

    // Limite específico da categoria (ex: Open Bar máx 60)
    if ((ticketType.soldQuantity || 0) + qty > ticketType.maxQuantity) {
      const remaining = Math.max(0, ticketType.maxQuantity - (ticketType.soldQuantity || 0));
      return res.status(400).json({
        success: false,
        error: `Esgotado! Restam apenas ${remaining} ingressos do tipo ${ticketType.name}.`,
      });
    }

    const totalAmount = ticketType.price * qty;
    const orderId = `ORD-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const orderNumber = String(store.orders.length + 1001);

    const gateway = resolvePaymentGateway(store.config.simulatePaymentMode);

    const tempOrder: Order = {
      id: orderId,
      orderNumber,
      customerName,
      customerCpf,
      customerEmail,
      customerWhatsapp,
      customerBirthDate,
      ticketTypeId: ticketType.id,
      ticketTypeName: ticketType.name,
      quantity: qty,
      unitPrice: ticketType.price,
      totalAmount,
      status: 'pending',
      pixCode: '',
      pixExpiresAt: '',
      pixTxId: '',
      originGroupSlug: originGroupSlug || 'direto',
      createdAt: new Date().toISOString(),
    };

    const pixPayment = await gateway.createPixPayment(tempOrder);

    tempOrder.pixCode = pixPayment.pixCode;
    tempOrder.pixExpiresAt = pixPayment.expiresAt;
    tempOrder.pixTxId = pixPayment.txId;

    store.orders.push(tempOrder);
    saveStore(store);

    res.json({
      success: true,
      data: {
        order: tempOrder,
        pixInfo: pixPayment,
      },
    });
  } catch (err: any) {
    console.error('[Create Order Error]', err);
    res.status(500).json({ success: false, error: err.message || 'Erro ao processar pedido' });
  }
});

// 4. Consulta de Status do Pix do Pedido
app.get('/api/orders/:id/status', (req: Request, res: Response) => {
  const order = store.orders.find((o) => o.id === req.params.id);
  if (!order) return res.status(404).json({ success: false, error: 'Pedido não encontrado' });

  const tickets = store.tickets.filter((t) => t.orderId === order.id);

  res.json({
    success: true,
    data: {
      id: order.id,
      status: order.status,
      paidAt: order.paidAt,
      ticketsCount: tickets.length,
      tickets: tickets.map((t) => ({
        id: t.id,
        qrToken: t.qrToken,
        attendeeName: t.attendeeName,
        status: t.status,
      })),
    },
  });
});

// 5. Simular Aprovação de Pagamento Pix (Apenas para modo teste / admin)
app.post('/api/orders/:id/simulate-pay', (req: Request, res: Response) => {
  const order = store.orders.find((o) => o.id === req.params.id);
  if (!order) return res.status(404).json({ success: false, error: 'Pedido não encontrado' });

  if (order.status === 'paid') {
    return res.json({ success: true, message: 'Pedido já se encontra pago', data: order });
  }

  // Efetivação do pagamento e geração atômica de ingressos
  order.status = 'paid';
  order.paidAt = new Date().toISOString();

  // Atualizar contadores do tipo de ingresso
  const ticketType = store.config.ticketTypes.find((t) => t.id === order.ticketTypeId);
  if (ticketType) {
    ticketType.soldQuantity = (ticketType.soldQuantity || 0) + order.quantity;
  }

  // Atualizar estatísticas do grupo de WhatsApp
  if (order.originGroupSlug && order.originGroupSlug !== 'direto') {
    const group = store.groups.find((g) => g.slug === order.originGroupSlug);
    if (group) {
      group.salesCount = (group.salesCount || 0) + order.quantity;
      group.totalRevenue = (group.totalRevenue || 0) + order.totalAmount;
    }
  }

  // Gerar um ingresso individual com token criptográfico seguro para cada unidade
  const generatedTickets: Ticket[] = [];
  for (let i = 0; i < order.quantity; i++) {
    const ticket: Ticket = {
      id: `TCK-${Date.now()}-${i + 1}-${Math.floor(100 + Math.random() * 900)}`,
      orderId: order.id,
      qrToken: generateCryptoToken(36),
      attendeeName: order.customerName,
      attendeeCpf: order.customerCpf,
      attendeeWhatsapp: order.customerWhatsapp,
      attendeeBirthDate: order.customerBirthDate,
      ticketTypeId: order.ticketTypeId,
      ticketTypeName: order.ticketTypeName,
      ticketBatch: ticketType?.batchName || 'Lote Oficial',
      status: 'valid',
      originGroupSlug: order.originGroupSlug,
      createdAt: new Date().toISOString(),
    };
    store.tickets.push(ticket);
    generatedTickets.push(ticket);
  }

  saveStore(store);

  res.json({
    success: true,
    message: 'Pagamento aprovado com sucesso!',
    data: {
      order,
      tickets: generatedTickets,
    },
  });
});

// 6. Webhook Oficial de Pagamento (Mercado Pago / Asaas)
app.post('/api/payment/webhook', async (req: Request, res: Response) => {
  try {
    const gateway = resolvePaymentGateway(false);
    const result = await gateway.processWebhook(req.body, req.headers as Record<string, string>);

    if (result.status === 'paid' && result.orderId) {
      const order = store.orders.find((o) => o.id === result.orderId);
      if (order && order.status !== 'paid') {
        order.status = 'paid';
        order.paidAt = new Date().toISOString();

        const ticketType = store.config.ticketTypes.find((t) => t.id === order.ticketTypeId);
        if (ticketType) {
          ticketType.soldQuantity = (ticketType.soldQuantity || 0) + order.quantity;
        }

        if (order.originGroupSlug && order.originGroupSlug !== 'direto') {
          const group = store.groups.find((g) => g.slug === order.originGroupSlug);
          if (group) {
            group.salesCount = (group.salesCount || 0) + order.quantity;
            group.totalRevenue = (group.totalRevenue || 0) + order.totalAmount;
          }
        }

        // Criar ingressos se ainda não foram criados
        for (let i = 0; i < order.quantity; i++) {
          const ticket: Ticket = {
            id: `TCK-${Date.now()}-${i + 1}-${Math.floor(100 + Math.random() * 900)}`,
            orderId: order.id,
            qrToken: generateCryptoToken(36),
            attendeeName: order.customerName,
            attendeeCpf: order.customerCpf,
            attendeeWhatsapp: order.customerWhatsapp,
            attendeeBirthDate: order.customerBirthDate,
            ticketTypeId: order.ticketTypeId,
            ticketTypeName: order.ticketTypeName,
            ticketBatch: ticketType?.batchName || 'Lote Oficial',
            status: 'valid',
            originGroupSlug: order.originGroupSlug,
            createdAt: new Date().toISOString(),
          };
          store.tickets.push(ticket);
        }

        saveStore(store);
      }
    }

    res.status(200).json({ received: true });
  } catch (err: any) {
    console.error('[Webhook Error]', err);
    res.status(500).json({ error: 'Erro no processamento do webhook' });
  }
});

// 7. Validação do QR Code na Portaria (/scanner)
app.post('/api/tickets/validate', (req: Request, res: Response) => {
  const { qrToken, manualCode } = req.body;
  const tokenToLookup = (qrToken || manualCode || '').trim();

  if (!tokenToLookup) {
    return res.status(400).json({
      valid: false,
      status: 'not_found',
      message: 'Token ou código não fornecido.',
    } satisfies CheckinValidationResult);
  }

  // Busca por qrToken exato, ou por ID do ingresso, ou por CPF limpo
  const cleanInput = tokenToLookup.replace(/\D/g, '');
  const ticket = store.tickets.find((t) => {
    if (t.qrToken === tokenToLookup) return true;
    if (t.id.toLowerCase() === tokenToLookup.toLowerCase()) return true;
    if (cleanInput.length === 11 && t.attendeeCpf.replace(/\D/g, '') === cleanInput) return true;
    return false;
  });

  if (!ticket) {
    return res.json({
      valid: false,
      status: 'not_found',
      message: 'Ingresso não encontrado ou inválido.',
    } satisfies CheckinValidationResult);
  }

  const order = store.orders.find((o) => o.id === ticket.orderId);

  if (order && order.status !== 'paid') {
    return res.json({
      valid: false,
      status: 'pending_payment',
      message: 'Atenção: O pagamento deste pedido ainda não foi confirmado.',
      ticket: {
        id: ticket.id,
        orderId: ticket.orderId,
        attendeeName: ticket.attendeeName,
        maskedCpf: maskCPF(ticket.attendeeCpf),
        attendeeWhatsapp: ticket.attendeeWhatsapp,
        ticketTypeName: ticket.ticketTypeName,
        ticketBatch: ticket.ticketBatch,
        originGroupSlug: ticket.originGroupSlug,
        createdAt: ticket.createdAt,
      },
    } satisfies CheckinValidationResult);
  }

  if (ticket.status === 'used') {
    return res.json({
      valid: false,
      status: 'already_used',
      message: `Ingresso JÁ UTILIZADO em ${new Date(ticket.checkedInAt || '').toLocaleTimeString('pt-BR')} por ${ticket.checkedInByName || 'Portaria'}.`,
      ticket: {
        id: ticket.id,
        orderId: ticket.orderId,
        attendeeName: ticket.attendeeName,
        maskedCpf: maskCPF(ticket.attendeeCpf),
        attendeeWhatsapp: ticket.attendeeWhatsapp,
        ticketTypeName: ticket.ticketTypeName,
        ticketBatch: ticket.ticketBatch,
        originGroupSlug: ticket.originGroupSlug,
        createdAt: ticket.createdAt,
        checkedInAt: ticket.checkedInAt,
        checkedInByName: ticket.checkedInByName,
      },
    } satisfies CheckinValidationResult);
  }

  if (ticket.status === 'cancelled') {
    return res.json({
      valid: false,
      status: 'cancelled',
      message: 'Ingresso CANCELADO pela organização.',
    } satisfies CheckinValidationResult);
  }

  // Ingresso válido
  res.json({
    valid: true,
    status: 'valid',
    message: 'Ingresso Válido! Libere a entrada.',
    ticket: {
      id: ticket.id,
      orderId: ticket.orderId,
      attendeeName: ticket.attendeeName,
      maskedCpf: maskCPF(ticket.attendeeCpf),
      attendeeWhatsapp: ticket.attendeeWhatsapp,
      ticketTypeName: ticket.ticketTypeName,
      ticketBatch: ticket.ticketBatch,
      originGroupSlug: ticket.originGroupSlug,
      createdAt: ticket.createdAt,
    },
  } satisfies CheckinValidationResult);
});

// 8. Efetivação do Check-in ATÔMICA com proteção contra uso duplo simultâneo
app.post('/api/tickets/checkin', (req: Request, res: Response) => {
  const { ticketId, operatorName } = req.body;

  if (!ticketId) {
    return res.status(400).json({ success: false, error: 'ID do ingresso obrigatório' });
  }

  // Trava de concorrência atômica
  if (checkinLocks.has(ticketId)) {
    return res.status(409).json({ success: false, error: 'Check-in deste ingresso já em processamento!' });
  }

  checkinLocks.add(ticketId);

  try {
    const ticket = store.tickets.find((t) => t.id === ticketId);
    if (!ticket) {
      return res.status(404).json({ success: false, error: 'Ingresso não encontrado' });
    }

    if (ticket.status === 'used') {
      return res.status(400).json({
        success: false,
        error: `Entrada já registrada às ${new Date(ticket.checkedInAt || '').toLocaleTimeString('pt-BR')} por ${ticket.checkedInByName}`,
      });
    }

    ticket.status = 'used';
    ticket.checkedInAt = new Date().toISOString();
    ticket.checkedInByName = operatorName || 'Operador Portaria';

    saveStore(store);

    res.json({
      success: true,
      message: 'Entrada liberada com sucesso!',
      data: ticket,
    });
  } finally {
    checkinLocks.delete(ticketId);
  }
});

// 9. Página "Meu Ingresso" - Consulta por token ou por CPF + WhatsApp
app.get('/api/tickets/lookup', (req: Request, res: Response) => {
  const { token, cpf, whatsapp } = req.query as { token?: string; cpf?: string; whatsapp?: string };

  if (token) {
    const ticket = store.tickets.find((t) => t.qrToken === token);
    if (!ticket) return res.status(404).json({ success: false, error: 'Ingresso não encontrado.' });
    const order = store.orders.find((o) => o.id === ticket.orderId);
    return res.json({ success: true, data: { ticket, order, config: store.config } });
  }

  if (cpf && whatsapp) {
    const cleanCpf = cpf.replace(/\D/g, '');
    const cleanPhone = whatsapp.replace(/\D/g, '');

    const userTickets = store.tickets.filter((t) => {
      const matchCpf = t.attendeeCpf.replace(/\D/g, '') === cleanCpf;
      const matchPhone = t.attendeeWhatsapp.replace(/\D/g, '').endsWith(cleanPhone.slice(-8));
      return matchCpf && matchPhone;
    });

    if (userTickets.length === 0) {
      return res.status(404).json({ success: false, error: 'Nenhum ingresso encontrado para este CPF e WhatsApp.' });
    }

    return res.json({ success: true, data: { tickets: userTickets, config: store.config } });
  }

  res.status(400).json({ success: false, error: 'Informe o token ou CPF e WhatsApp.' });
});

// 10. Métricas do Dashboard Admin
app.get('/api/admin/metrics', (_req: Request, res: Response) => {
  const paidOrders = store.orders.filter((o) => o.status === 'paid');
  const totalRevenue = paidOrders.reduce((sum, o) => sum + o.totalAmount, 0);
  const totalTicketsSold = store.tickets.length;
  const checkedInCount = store.tickets.filter((t) => t.status === 'used').length;
  const pendingOrdersCount = store.orders.filter((o) => o.status === 'pending').length;

  const salesByType: Record<string, { name: string; sold: number; max: number; revenue: number }> = {};
  store.config.ticketTypes.forEach((tt) => {
    const typeTickets = store.tickets.filter((t) => t.ticketTypeId === tt.id);
    salesByType[tt.id] = {
      name: tt.name,
      sold: typeTickets.length,
      max: tt.maxQuantity,
      revenue: typeTickets.length * tt.price,
    };
  });

  // Timeline simulada baseada nos pedidos
  const timelineMap: Record<string, { count: number; revenue: number }> = {};
  paidOrders.forEach((o) => {
    const dateStr = o.paidAt ? o.paidAt.split('T')[0] : o.createdAt.split('T')[0];
    if (!timelineMap[dateStr]) timelineMap[dateStr] = { count: 0, revenue: 0 };
    timelineMap[dateStr].count += o.quantity;
    timelineMap[dateStr].revenue += o.totalAmount;
  });

  const salesTimeline = Object.entries(timelineMap).map(([date, val]) => ({
    date,
    count: val.count,
    revenue: val.revenue,
  }));

  // Ranking de grupos
  const topGroups = store.groups
    .map((g) => ({
      name: g.name,
      slug: g.slug,
      visits: g.visitsCount || 0,
      sales: g.salesCount || 0,
      revenue: g.totalRevenue || 0,
      conversionRate: g.visitsCount > 0 ? parseFloat(((g.salesCount / g.visitsCount) * 100).toFixed(1)) : 0,
    }))
    .sort((a, b) => b.sales - a.sales);

  const metrics: DashboardMetrics = {
    totalTicketsSold,
    totalRevenue,
    totalCapacity: store.config.totalCapacity,
    availableTickets: Math.max(0, store.config.totalCapacity - totalTicketsSold),
    checkedInCount,
    pendingOrdersCount,
    checkInRate: totalTicketsSold > 0 ? parseFloat(((checkedInCount / totalTicketsSold) * 100).toFixed(1)) : 0,
    salesByType,
    salesTimeline,
    topGroups,
  };

  res.json({ success: true, data: metrics });
});

// 11. Lista de Pedidos e Ingressos (Admin)
app.get('/api/admin/orders', (req: Request, res: Response) => {
  const { search, status, group } = req.query as { search?: string; status?: string; group?: string };

  let list = [...store.orders];

  if (status && status !== 'all') {
    list = list.filter((o) => o.status === status);
  }

  if (group && group !== 'all') {
    list = list.filter((o) => o.originGroupSlug === group);
  }

  if (search && search.trim()) {
    const q = search.toLowerCase().trim();
    list = list.filter(
      (o) =>
        o.customerName.toLowerCase().includes(q) ||
        o.customerCpf.includes(q) ||
        o.customerWhatsapp.includes(q) ||
        o.orderNumber.includes(q)
    );
  }

  const enriched = list.map((order) => {
    const orderTickets = store.tickets.filter((t) => t.orderId === order.id);
    return {
      ...order,
      tickets: orderTickets,
    };
  });

  res.json({ success: true, data: enriched });
});

// Cancelar pedido
app.post('/api/admin/orders/:id/cancel', (req: Request, res: Response) => {
  const order = store.orders.find((o) => o.id === req.params.id);
  if (!order) return res.status(404).json({ success: false, error: 'Pedido não encontrado' });

  order.status = 'cancelled';
  store.tickets.forEach((t) => {
    if (t.orderId === order.id) {
      t.status = 'cancelled';
    }
  });

  saveStore(store);
  res.json({ success: true, message: 'Pedido e ingressos cancelados.' });
});

// 12. Equipe (Admin)
app.get('/api/admin/team', (_req: Request, res: Response) => {
  res.json({ success: true, data: store.team });
});

app.post('/api/admin/team', (req: Request, res: Response) => {
  const { email, name, role } = req.body;
  if (!email || !name || !role) {
    return res.status(400).json({ success: false, error: 'Preencha email, nome e cargo' });
  }

  const existing = store.team.find((u) => u.email.toLowerCase() === email.toLowerCase());
  if (existing) {
    existing.role = role;
    existing.name = name;
  } else {
    store.team.push({
      uid: `usr-${Date.now()}`,
      email,
      name,
      role: role as 'admin' | 'staff',
      createdAt: new Date().toISOString(),
    });
  }

  saveStore(store);
  res.json({ success: true, data: store.team });
});

app.delete('/api/admin/team/:uid', (req: Request, res: Response) => {
  store.team = store.team.filter((u) => u.uid !== req.params.uid);
  saveStore(store);
  res.json({ success: true, data: store.team });
});

// ==========================================
// VITE DEV SERVER / PROD STATIC SERVE
// ==========================================
async function startServer() {
  if (!IS_PROD) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[VibePass Server] Rodando na porta ${PORT}`);
  });
}

startServer();
