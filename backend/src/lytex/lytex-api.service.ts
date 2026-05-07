import { HttpService } from '@nestjs/axios';
import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { AxiosError } from 'axios';

export type PaymentMethodKind = 'PIX' | 'BOLETO' | 'CREDIT_CARD';

@Injectable()
export class LytexApiService {
  private readonly logger = new Logger(LytexApiService.name);
  private cachedToken: string | null = null;
  private tokenExpiresAt = 0;

  constructor(
    private readonly http: HttpService,
    private readonly config: ConfigService,
  ) {}

  private baseUrl(): string {
    return (
      this.config.get<string>('LYTEX_API_BASE')?.replace(/\/$/, '') ??
      'https://sandbox-api-pay.lytex.com.br/v2'
    );
  }

  private clientId(): string {
    const v = this.config.get<string>('LYTEX_CLIENT_ID');
    if (!v) {
      throw new BadRequestException('LYTEX_CLIENT_ID não configurado');
    }
    return v;
  }

  private clientSecret(): string {
    const v = this.config.get<string>('LYTEX_CLIENT_SECRET');
    if (!v) {
      throw new BadRequestException('LYTEX_CLIENT_SECRET não configurado');
    }
    return v;
  }

  async obtainToken(): Promise<string> {
    const now = Date.now();
    if (this.cachedToken && now < this.tokenExpiresAt - 30_000) {
      return this.cachedToken;
    }
    const url = `${this.baseUrl()}/auth/obtain_token`;
    try {
      const { data } = await firstValueFrom(
        this.http.post<Record<string, unknown>>(url, {
          clientId: this.clientId(),
          clientSecret: this.clientSecret(),
        }),
      );
      const token =
        (data['accessToken'] as string) ||
        (data['token'] as string) ||
        (data['access_token'] as string);
      if (!token) {
        this.logger.warn(`Resposta de token sem campo conhecido: ${JSON.stringify(data)}`);
        throw new BadRequestException('Resposta da Lytex sem token');
      }
      this.cachedToken = token;
      const expIn =
        (data['expiresIn'] as number) ||
        (data['expires_in'] as number);
      let ttlSec = 3600;
      if (typeof expIn === 'number' && expIn > 0 && expIn < 86400 * 30) {
        ttlSec = expIn;
      }
      this.tokenExpiresAt = Date.now() + ttlSec * 1000;
      return token;
    } catch (e) {
      this.cachedToken = null;
      this.tokenExpiresAt = 0;
      throw this.mapAxios(e, 'Falha ao obter token Lytex');
    }
  }

  async createPaymentLink(params: {
    totalValueCents: number;
    description: string;
    website: string;
    method: PaymentMethodKind;
  }): Promise<Record<string, unknown>> {
    const token = await this.obtainToken();
    const url = `${this.baseUrl()}/payment_links`;
    const body = this.buildPaymentLinkBody(params);
    try {
      const { data } = await firstValueFrom(
        this.http.post<Record<string, unknown>>(url, body, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      );
      return data;
    } catch (e) {
      throw this.mapAxios(e, 'Falha ao criar link de pagamento na Lytex');
    }
  }

  async createCardToken(body: {
    cpfCnpj: string;
    number: string;
    holder: string;
    expiry: string;
    cvc: string;
  }): Promise<Record<string, unknown>> {
    const token = await this.obtainToken();
    const url = `${this.baseUrl()}/invoices/card_token`;
    try {
      const { data } = await firstValueFrom(
        this.http.post<Record<string, unknown>>(url, body, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      );
      return data;
    } catch (e) {
      throw this.mapAxios(e, 'Falha ao tokenizar cartão na Lytex');
    }
  }

  async payInvoice(body: {
    _invoiceId: string;
    _cardTokenId: string;
    parcels: number;
    creditCardHolder?: Record<string, unknown>;
  }): Promise<Record<string, unknown>> {
    const token = await this.obtainToken();
    const url = `${this.baseUrl()}/invoices/pay`;
    try {
      const { data } = await firstValueFrom(
        this.http.post<Record<string, unknown>>(
          url,
          {
            _invoiceId: body._invoiceId,
            _cardTokenId: body._cardTokenId,
            parcels: body.parcels,
            marketTransaction: true,
            creditCardHolder: body.creditCardHolder,
          },
          { headers: { Authorization: `Bearer ${token}` } },
        ),
      );
      return data;
    } catch (e) {
      throw this.mapAxios(e, 'Falha ao pagar fatura na Lytex');
    }
  }

  private buildPaymentLinkBody(params: {
    totalValueCents: number;
    description: string;
    website: string;
    method: PaymentMethodKind;
  }): Record<string, unknown> {
    const { totalValueCents, description, website, method } = params;
    const paymentMethods: Record<string, unknown> = {
      pix: { enable: method === 'PIX' },
      boleto: { enable: method === 'BOLETO' },
      creditCard: {
        enable: method === 'CREDIT_CARD',
        maxParcels: 12,
        isRatesToPayer: false,
      },
    };
    return {
      paymentType: 'invoice',
      description,
      website,
      totalValue: totalValueCents,
      items: [
        {
          _productId: 'lytex-payment-app',
          name: description.slice(0, 120) || 'Cobrança',
          quantity: 1,
          value: totalValueCents,
        },
      ],
      paymentMethods,
      observation: description,
    };
  }

  private mapAxios(err: unknown, fallback: string): BadRequestException {
    if (err instanceof AxiosError) {
      const msg =
        (err.response?.data as { message?: string })?.message ||
        (typeof err.response?.data === 'string' ? err.response.data : JSON.stringify(err.response?.data)) ||
        err.message;
      return new BadRequestException(`${fallback}: ${msg}`);
    }
    return new BadRequestException(fallback);
  }
}
