import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

@Injectable()
export class PaymobService {
  private apiKey: string;
  private integrationId: string;
  private hmacSecret: string;
  private baseUrl = 'https://accept.paymob.com/api';

  constructor(private config: ConfigService) {
    this.apiKey = this.config.get<string>('PAYMOB_API_KEY') || '';
    this.integrationId = this.config.get<string>('PAYMOB_INTEGRATION_ID') || '';
    this.hmacSecret = this.config.get<string>('PAYMOB_HMAC_SECRET') || '';
  }

  // Step 1: Get authentication token
  async getAuthToken(): Promise<string> {
    const response = await fetch(`${this.baseUrl}/auth/tokens`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ api_key: this.apiKey }),
    });
    const data = await response.json() as any;
    if (!data.token) {
      console.error('Paymob Auth Error:', data);
      throw new Error('Failed to authenticate with Paymob');
    }
    return data.token;
  }

  // Step 2: Register the order in PayMob
  async createOrder(token: string, amountCents: number) {
    const response = await fetch(`${this.baseUrl}/ecommerce/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        auth_token: token,
        delivery_needed: false,
        amount_cents: amountCents,
        currency: 'EGP',
        items: [],
      }),
    });
    const data = await response.json() as any;
    if (!data.id) {
      console.error('Paymob Order Error:', data);
      throw new Error('Failed to create order in Paymob');
    }
    return data;
  }

  // Step 3: Get the payment key for charging
  async getPaymentKey(params: {
    token: string;
    orderId: number;
    amountCents: number;
    email: string;
    firstName: string;
    lastName: string;
    phone: string;
  }) {
    const response = await fetch(`${this.baseUrl}/acceptance/payment_keys`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        auth_token: params.token,
        amount_cents: params.amountCents,
        expiration: 3600,
        order_id: params.orderId,
        billing_data: {
          email: params.email,
          first_name: params.firstName,
          last_name: params.lastName,
          phone_number: params.phone,
          apartment: 'NA', street: 'NA', building: 'NA',
          floor: 'NA', city: 'NA', state: 'NA',
          country: 'NA', shipping_method: 'NA', postal_code: 'NA',
        },
        currency: 'EGP',
        integration_id: Number(this.integrationId),
      }),
    });
    const data = await response.json() as any;
    if (!data.token) {
      console.error('Paymob PaymentKey Error:', data);
      throw new Error('Failed to get payment key from Paymob');
    }
    return data.token;
  }

  // Verify the HMAC of the webhook payload to prevent spoofing
  verifyWebhookHmac(data: any, receivedHmac: string): boolean {
    const fields = [
      'amount_cents', 'created_at', 'currency', 'error_occured',
      'has_parent_transaction', 'id', 'integration_id', 'is_3d_secure',
      'is_auth', 'is_capture', 'is_refunded', 'is_standalone_payment',
      'is_voided', 'order', 'owner', 'pending',
      'source_data.pan', 'source_data.sub_type', 'source_data.type', 'success',
    ];

    const concatenated = fields
      .map((field) => {
        const keys = field.split('.');
        let value = data;
        for (const key of keys) value = value?.[key];
        return String(value);
      })
      .join('');

    const calculatedHmac = crypto
      .createHmac('sha512', this.hmacSecret)
      .update(concatenated)
      .digest('hex');

    return calculatedHmac === receivedHmac;
  }
}
