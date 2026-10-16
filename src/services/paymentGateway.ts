import { Order } from '../types';

export interface PixPaymentResponse {
  pixCode: string; // Copia e Cola EMV
  qrCodeUrl?: string; // QR code image URL or base64
  txId: string;
  expiresAt: string;
  provider: 'simulation' | 'mercadopago' | 'asaas';
  isSimulation: boolean;
}

export interface WebhookResult {
  orderId: string;
  txId?: string;
  status: 'paid' | 'failed' | 'ignored';
  amount?: number;
  raw?: unknown;
}

export interface PaymentGateway {
  name: string;
  createPixPayment(order: Order): Promise<PixPaymentResponse>;
  checkPaymentStatus?(txId: string): Promise<'pending' | 'paid' | 'cancelled'>;
  processWebhook(payload: unknown, headers?: Record<string, string>): Promise<WebhookResult>;
}

/**
 * 1. MODO SIMULAÇÃO
 * Usado para testes locais e demonstração sem gastar dinheiro real nem exigir chaves
 */
export class SimulationPaymentGateway implements PaymentGateway {
  name = 'Modo Simulação (Ambiente de Testes)';

  async createPixPayment(order: Order): Promise<PixPaymentResponse> {
    const txId = `SIM_TX_${order.id.slice(0, 8)}_${Date.now()}`;
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString(); // 15 min

    // Código Pix EMV fictício válido estruturalmente para testes de copia-e-cola
    const simulatedPixCode = `00020126580014br.gov.bcb.pix0136${txId}5204000053039865405${order.totalAmount.toFixed(
      2
    )}5802BR5920VIBEPASS FESTAS6008GOIANIA62070503***6304TEST`;

    return {
      pixCode: simulatedPixCode,
      txId,
      expiresAt,
      provider: 'simulation',
      isSimulation: true,
    };
  }

  async checkPaymentStatus(_txId: string): Promise<'pending' | 'paid' | 'cancelled'> {
    return 'pending';
  }

  async processWebhook(payload: unknown): Promise<WebhookResult> {
    const data = payload as { orderId: string; status: string; secret?: string };
    return {
      orderId: data.orderId || '',
      txId: 'simulated_webhook',
      status: data.status === 'paid' ? 'paid' : 'failed',
    };
  }
}

/**
 * 2. MERCADO PAGO GATEWAY
 * Ativado quando MERCADO_PAGO_ACCESS_TOKEN estiver preenchido no .env
 */
export class MercadoPagoGateway implements PaymentGateway {
  name = 'Mercado Pago Pix';
  private accessToken: string;

  constructor(token: string) {
    this.accessToken = token;
  }

  async createPixPayment(order: Order): Promise<PixPaymentResponse> {
    try {
      const response = await fetch('https://api.mercadopago.com/v1/payments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.accessToken}`,
          'X-Idempotency-Key': `order_${order.id}`,
        },
        body: JSON.stringify({
          transaction_amount: order.totalAmount,
          description: `Ingresso VibePass: ${order.ticketTypeName} #${order.orderNumber}`,
          payment_method_id: 'pix',
          payer: {
            email: order.customerEmail,
            first_name: order.customerName.split(' ')[0],
            last_name: order.customerName.split(' ').slice(1).join(' ') || 'Cliente',
            identification: {
              type: 'CPF',
              number: order.customerCpf.replace(/\D/g, ''),
            },
          },
          external_reference: order.id,
          notification_url: `${process.env.APP_URL || ''}/api/payment/webhook?provider=mercadopago`,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Erro Mercado Pago: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      const pixInfo = data.point_of_interaction?.transaction_data;

      return {
        pixCode: pixInfo?.qr_code || '',
        qrCodeUrl: pixInfo?.qr_code_base64 ? `data:image/png;base64,${pixInfo.qr_code_base64}` : undefined,
        txId: String(data.id),
        expiresAt: data.date_of_expiration || new Date(Date.now() + 15 * 60 * 1000).toISOString(),
        provider: 'mercadopago',
        isSimulation: false,
      };
    } catch (err) {
      console.error('[MercadoPagoGateway Error]', err);
      throw err;
    }
  }

  async processWebhook(payload: unknown): Promise<WebhookResult> {
    const data = payload as { type?: string; topic?: string; data?: { id?: string }; id?: string };
    const paymentId = data.data?.id || data.id;

    if (!paymentId) {
      return { orderId: '', status: 'ignored' };
    }

    // Consulta status real na API do Mercado Pago
    const checkRes = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: { Authorization: `Bearer ${this.accessToken}` },
    });
    if (!checkRes.ok) throw new Error('Falha ao consultar pagamento no Mercado Pago');
    
    const paymentData = await checkRes.json();
    const orderId = paymentData.external_reference;
    const isApproved = paymentData.status === 'approved';

    return {
      orderId,
      txId: String(paymentId),
      status: isApproved ? 'paid' : 'failed',
      amount: paymentData.transaction_amount,
      raw: paymentData,
    };
  }
}

/**
 * 3. ASAAS GATEWAY
 * Ativado quando ASAAS_API_KEY estiver preenchido no .env
 */
export class AsaasGateway implements PaymentGateway {
  name = 'Asaas Pix';
  private apiKey: string;
  private baseUrl: string;

  constructor(apiKey: string, isSandbox = false) {
    this.apiKey = apiKey;
    this.baseUrl = isSandbox ? 'https://sandbox.asaas.com/api/v3' : 'https://api.asaas.com/v3';
  }

  async createPixPayment(order: Order): Promise<PixPaymentResponse> {
    try {
      // 1. Criar ou consultar cliente
      const customerRes = await fetch(`${this.baseUrl}/customers`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          access_token: this.apiKey,
        },
        body: JSON.stringify({
          name: order.customerName,
          cpfCnpj: order.customerCpf.replace(/\D/g, ''),
          email: order.customerEmail,
          mobilePhone: order.customerWhatsapp.replace(/\D/g, ''),
        }),
      });

      const customerData = await customerRes.json();
      const customerId = customerData.id;

      // 2. Criar cobrança PIX
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 1);

      const paymentRes = await fetch(`${this.baseUrl}/payments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          access_token: this.apiKey,
        },
        body: JSON.stringify({
          customer: customerId,
          billingType: 'PIX',
          value: order.totalAmount,
          dueDate: dueDate.toISOString().split('T')[0],
          description: `Ingresso VibePass: ${order.ticketTypeName} #${order.orderNumber}`,
          externalReference: order.id,
        }),
      });

      const paymentData = await paymentRes.json();
      const paymentId = paymentData.id;

      // 3. Obter QR Code PIX
      const qrRes = await fetch(`${this.baseUrl}/payments/${paymentId}/pixQrCode`, {
        headers: { access_token: this.apiKey },
      });
      const qrData = await qrRes.json();

      return {
        pixCode: qrData.payload || '',
        qrCodeUrl: qrData.encodedImage ? `data:image/png;base64,${qrData.encodedImage}` : undefined,
        txId: paymentId,
        expiresAt: qrData.expirationDate || new Date(Date.now() + 15 * 60 * 1000).toISOString(),
        provider: 'asaas',
        isSimulation: false,
      };
    } catch (err) {
      console.error('[AsaasGateway Error]', err);
      throw err;
    }
  }

  async processWebhook(payload: unknown): Promise<WebhookResult> {
    const data = payload as { event?: string; payment?: { externalReference?: string; id?: string; value?: number } };
    const orderId = data.payment?.externalReference || '';
    const status = data.event === 'PAYMENT_RECEIVED' || data.event === 'PAYMENT_CONFIRMED' ? 'paid' : 'failed';

    return {
      orderId,
      txId: data.payment?.id,
      status,
      amount: data.payment?.value,
      raw: payload,
    };
  }
}

/**
 * Factory que resolve o Gateway adequado
 */
export function resolvePaymentGateway(forceSimulation = false): PaymentGateway {
  if (forceSimulation) {
    return new SimulationPaymentGateway();
  }

  const mpToken = process.env.MERCADO_PAGO_ACCESS_TOKEN;
  if (mpToken && mpToken.trim() !== '' && !mpToken.includes('MY_MERCADO_PAGO')) {
    return new MercadoPagoGateway(mpToken.trim());
  }

  const asaasKey = process.env.ASAAS_API_KEY;
  if (asaasKey && asaasKey.trim() !== '' && !asaasKey.includes('MY_ASAAS')) {
    const isSandbox = process.env.ASAAS_SANDBOX === 'true';
    return new AsaasGateway(asaasKey.trim(), isSandbox);
  }

  return new SimulationPaymentGateway();
}
