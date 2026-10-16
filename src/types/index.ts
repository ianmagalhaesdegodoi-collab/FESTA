export type UserRole = 'admin' | 'staff';

export interface AppUser {
  uid: string;
  email: string;
  name: string;
  role: UserRole;
  createdAt: string;
}

export interface TicketTypeConfig {
  id: string;
  name: string;
  badge: string;
  description: string;
  price: number; // in BRL, e.g. 50.00
  batchName: string; // e.g. "1º Lote"
  maxQuantity: number; // e.g. 60 for Open Bar, 260 for Pista
  soldQuantity: number;
  features: string[];
  color: string; // accent color hex/tailwind class
  active: boolean;
}

export interface VisualTheme {
  primaryColor: string; // e.g. "#ec4899" (neon pink)
  secondaryColor: string; // e.g. "#8b5cf6" (violet)
  accentColor: string; // e.g. "#06b6d4" (cyan)
  headingFont: string; // 'Syne' | 'Plus Jakarta Sans' | 'Space Grotesk'
  bodyFont: string; // 'Plus Jakarta Sans' | 'Inter'
  logoUrl: string;
  bannerUrl: string;
  djPhotoUrl: string;
  djName: string;
  ambientEffect: 'party-lights' | 'subtle-glow' | 'cyberpunk';
}

export interface EventConfig {
  eventName: string;
  eventSubtitle: string;
  eventDate: string; // YYYY-MM-DD
  eventTime: string; // HH:MM
  venueName: string;
  venueAddress: string;
  venueCity: string;
  venueMapUrl: string;
  venueEmbedUrl: string;
  minAge: number;
  totalCapacity: number;
  salesEnabled: boolean;
  simulatePaymentMode: boolean; // Test mode for instant simulation
  contactWhatsapp: string;
  contactEmail: string;
  theme: VisualTheme;
  aboutText: string;
  lineup: Array<{
    name: string;
    role: string;
    time: string;
    image: string;
  }>;
  rules: string[];
  faqs: Array<{
    question: string;
    answer: string;
  }>;
  ticketTypes: TicketTypeConfig[];
}

export interface WhatsAppGroup {
  id: string;
  name: string;
  slug: string;
  description?: string;
  createdAt: string;
  visitsCount: number;
  salesCount: number;
  totalRevenue: number;
}

export interface GroupVisit {
  id: string;
  groupSlug: string;
  timestamp: string;
  ipHash?: string;
  userAgent?: string;
}

export type OrderStatus = 'pending' | 'paid' | 'cancelled' | 'refunded';

export interface Order {
  id: string;
  orderNumber: string;
  customerName: string;
  customerCpf: string;
  customerEmail: string;
  customerWhatsapp: string;
  customerBirthDate: string;
  ticketTypeId: string;
  ticketTypeName: string;
  quantity: number;
  unitPrice: number;
  totalAmount: number;
  status: OrderStatus;
  pixCode: string;
  pixExpiresAt: string;
  pixTxId: string;
  originGroupSlug: string; // 'direto' or slug
  createdAt: string;
  paidAt?: string;
  tickets?: Ticket[];
}

export type TicketStatus = 'valid' | 'used' | 'cancelled';

export interface Ticket {
  id: string;
  orderId: string;
  qrToken: string; // Cryptographic unguessable token
  attendeeName: string;
  attendeeCpf: string;
  attendeeWhatsapp: string;
  attendeeBirthDate: string;
  ticketTypeId: string;
  ticketTypeName: string;
  ticketBatch: string;
  status: TicketStatus;
  originGroupSlug: string;
  createdAt: string;
  checkedInAt?: string;
  checkedInBy?: string;
  checkedInByName?: string;
}

export interface CheckinValidationResult {
  valid: boolean;
  status: 'valid' | 'already_used' | 'pending_payment' | 'not_found' | 'cancelled';
  message: string;
  ticket?: {
    id: string;
    orderId: string;
    attendeeName: string;
    maskedCpf: string;
    attendeeWhatsapp: string;
    ticketTypeName: string;
    ticketBatch: string;
    originGroupSlug: string;
    createdAt: string;
    checkedInAt?: string;
    checkedInByName?: string;
  };
}

export interface DashboardMetrics {
  totalTicketsSold: number;
  totalRevenue: number;
  totalCapacity: number;
  availableTickets: number;
  checkedInCount: number;
  pendingOrdersCount: number;
  checkInRate: number; // percentage
  salesByType: {
    [typeId: string]: {
      name: string;
      sold: number;
      max: number;
      revenue: number;
    };
  };
  salesTimeline: Array<{
    date: string;
    count: number;
    revenue: number;
  }>;
  topGroups: Array<{
    name: string;
    slug: string;
    visits: number;
    sales: number;
    revenue: number;
    conversionRate: number;
  }>;
}
