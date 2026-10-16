import {
  EventConfig,
  Order,
  Ticket,
  WhatsAppGroup,
  AppUser,
  CheckinValidationResult,
  DashboardMetrics,
} from '../types';

const BASE_URL = '';

export async function fetchEventConfig(): Promise<EventConfig> {
  const res = await fetch(`${BASE_URL}/api/config`);
  const data = await res.json();
  if (!data.success) throw new Error(data.error || 'Erro ao carregar configurações');
  return data.data;
}

export async function updateEventConfig(config: EventConfig): Promise<EventConfig> {
  const res = await fetch(`${BASE_URL}/api/config`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(config),
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error || 'Erro ao atualizar configurações');
  return data.data;
}

export async function recordGroupVisit(slug: string): Promise<void> {
  try {
    await fetch(`${BASE_URL}/api/whatsapp-groups/visit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slug }),
    });
  } catch (err) {
    console.warn('[Visit Track Error]', err);
  }
}

export async function createOrder(payload: {
  customerName: string;
  customerCpf: string;
  customerEmail: string;
  customerWhatsapp: string;
  customerBirthDate: string;
  ticketTypeId: string;
  quantity: number;
  originGroupSlug?: string;
}): Promise<{ order: Order; pixInfo: any }> {
  const res = await fetch(`${BASE_URL}/api/orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error || 'Erro ao criar pedido');
  return data.data;
}

export async function checkOrderStatus(orderId: string): Promise<{
  id: string;
  status: string;
  paidAt?: string;
  ticketsCount: number;
  tickets: Array<{ id: string; qrToken: string; attendeeName: string; status: string }>;
}> {
  const res = await fetch(`${BASE_URL}/api/orders/${orderId}/status`);
  const data = await res.json();
  if (!data.success) throw new Error(data.error || 'Erro ao consultar status');
  return data.data;
}

export async function simulateOrderPayment(orderId: string): Promise<{
  order: Order;
  tickets: Ticket[];
}> {
  const res = await fetch(`${BASE_URL}/api/orders/${orderId}/simulate-pay`, {
    method: 'POST',
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error || 'Erro ao simular pagamento');
  return data.data;
}

export async function lookupTickets(params: {
  token?: string;
  cpf?: string;
  whatsapp?: string;
}): Promise<{
  ticket?: Ticket;
  tickets?: Ticket[];
  order?: Order;
  config: EventConfig;
}> {
  const query = new URLSearchParams();
  if (params.token) query.set('token', params.token);
  if (params.cpf) query.set('cpf', params.cpf);
  if (params.whatsapp) query.set('whatsapp', params.whatsapp);

  const res = await fetch(`${BASE_URL}/api/tickets/lookup?${query.toString()}`);
  const data = await res.json();
  if (!data.success) throw new Error(data.error || 'Ingresso não encontrado');
  return data.data;
}

export async function validateTicketQR(payload: {
  qrToken?: string;
  manualCode?: string;
}): Promise<CheckinValidationResult> {
  const res = await fetch(`${BASE_URL}/api/tickets/validate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return await res.json();
}

export async function performCheckin(ticketId: string, operatorName?: string): Promise<{
  success: boolean;
  message: string;
  data?: Ticket;
}> {
  const res = await fetch(`${BASE_URL}/api/tickets/checkin`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ticketId, operatorName }),
  });
  return await res.json();
}

export async function fetchDashboardMetrics(): Promise<DashboardMetrics> {
  const res = await fetch(`${BASE_URL}/api/admin/metrics`);
  const data = await res.json();
  if (!data.success) throw new Error(data.error || 'Erro ao carregar métricas');
  return data.data;
}

export async function fetchAdminOrders(filters?: {
  search?: string;
  status?: string;
  group?: string;
}): Promise<Order[]> {
  const query = new URLSearchParams();
  if (filters?.search) query.set('search', filters.search);
  if (filters?.status) query.set('status', filters.status);
  if (filters?.group) query.set('group', filters.group);

  const res = await fetch(`${BASE_URL}/api/admin/orders?${query.toString()}`);
  const data = await res.json();
  if (!data.success) throw new Error(data.error || 'Erro ao listar pedidos');
  return data.data;
}

export async function cancelAdminOrder(orderId: string): Promise<void> {
  const res = await fetch(`${BASE_URL}/api/admin/orders/${orderId}/cancel`, {
    method: 'POST',
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error || 'Erro ao cancelar pedido');
}

export async function fetchWhatsAppGroups(): Promise<WhatsAppGroup[]> {
  const res = await fetch(`${BASE_URL}/api/whatsapp-groups`);
  const data = await res.json();
  if (!data.success) throw new Error(data.error || 'Erro ao carregar grupos');
  return data.data;
}

export async function saveWhatsAppGroup(group: {
  name: string;
  slug: string;
  description?: string;
}): Promise<WhatsAppGroup> {
  const res = await fetch(`${BASE_URL}/api/whatsapp-groups`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(group),
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error || 'Erro ao salvar grupo');
  return data.data;
}

export async function fetchAdminTeam(): Promise<AppUser[]> {
  const res = await fetch(`${BASE_URL}/api/admin/team`);
  const data = await res.json();
  if (!data.success) throw new Error(data.error || 'Erro ao carregar equipe');
  return data.data;
}

export async function addAdminTeamMember(member: {
  email: string;
  name: string;
  role: 'admin' | 'staff';
}): Promise<AppUser[]> {
  const res = await fetch(`${BASE_URL}/api/admin/team`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(member),
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error || 'Erro ao adicionar membro');
  return data.data;
}

export async function removeAdminTeamMember(uid: string): Promise<AppUser[]> {
  const res = await fetch(`${BASE_URL}/api/admin/team/${uid}`, {
    method: 'DELETE',
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error || 'Erro ao remover membro');
  return data.data;
}
