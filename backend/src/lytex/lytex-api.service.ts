import { HttpService } from '@nestjs/axios';
import { BadRequestException, HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { AxiosError } from 'axios';

export type PaymentMethodKind = 'PIX' | 'BOLETO' | 'CREDIT_CARD';

/** Dados do pagador em POST /v2/invoices; preenchimento parcial com fallback em variáveis LYTEX_INVOICE_* */
export type LytexInvoicePayerInput = {
  cpfCnpj?: string;
  name?: string;
  email?: string;
  cellphone?: string;
  zip?: string;
  city?: string;
  street?: string;
  state?: string;
  zone?: string;
  treatmentPronoun?: string;
};

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

  /**
   * Cria fatura na Lytex (POST /v2/invoices), fluxo compatível com PIX/boleto/cartão.
   * Valores em centavos nos itens, como na documentação/exemplos oficiais.
   */
  async createPaymentLink(params: {
    amountReais: number;
    description: string;
    method: PaymentMethodKind;
    parcels?: number;
    payer?: LytexInvoicePayerInput;
  }): Promise<Record<string, unknown>> {
    const token = await this.obtainToken();
    const url = `${this.baseUrl()}/invoices`;
    const body = this.buildInvoiceBody(params);
    try {
      const { data } = await firstValueFrom(
        this.http.post<Record<string, unknown>>(url, body, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      );
      return data;
    } catch (e) {
      throw this.mapAxios(e, 'Falha ao criar fatura na Lytex');
    }
  }

  /** GET /v2/invoices — uma página (results + paginate). */
  async listInvoicesPage(
    page = 1,
    perPage = 100,
  ): Promise<{
    results: Record<string, unknown>[];
    paginate?: { page: number; pages: number; perPage: number; total: number };
  }> {
    const token = await this.obtainToken();
    const url = `${this.baseUrl()}/invoices`;
    try {
      const { data } = await firstValueFrom(
        this.http.get<Record<string, unknown>>(url, {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/json',
          },
          params: { page, perPage },
        }),
      );
      const raw = data['results'];
      const results = Array.isArray(raw) ? (raw as Record<string, unknown>[]) : [];
      const paginate = data['paginate'] as
        | { page: number; pages: number; perPage: number; total: number }
        | undefined;
      return { results, paginate };
    } catch (e) {
      throw this.mapAxios(e, 'Falha ao listar faturas na Lytex');
    }
  }

  /** Percorre todas as páginas e retorna faturas + quantidade de páginas lidas. */
  async listAllInvoices(perPage = 100): Promise<{
    invoices: Record<string, unknown>[];
    pagesFetched: number;
  }> {
    const first = await this.listInvoicesPage(1, perPage);
    const out = [...first.results];
    const pages = Math.max(1, Math.floor(first.paginate?.pages ?? 1));
    for (let p = 2; p <= pages; p++) {
      const next = await this.listInvoicesPage(p, perPage);
      out.push(...next.results);
    }
    return { invoices: out, pagesFetched: pages };
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

  private buildInvoiceBody(params: {
    amountReais: number;
    description: string;
    method: PaymentMethodKind;
    parcels?: number;
    payer?: LytexInvoicePayerInput;
  }): Record<string, unknown> {
    const { amountReais, description, method } = params;
    const parcels = Math.min(12, Math.max(1, Math.floor(params.parcels ?? 1)));
    const valueCents = Math.round(amountReais * 100);
    if (valueCents < 1) {
      throw new BadRequestException('Valor inválido para fatura');
    }
    const itemName = description.slice(0, 200) || 'Cobrança';
    const dueDays = Math.min(
      365,
      Math.max(
        1,
        Math.floor(Number(this.config.get<string>('LYTEX_INVOICE_DUE_DAYS') ?? '7') || 7),
      ),
    );

    const creditCard: Record<string, unknown> =
      method === 'CREDIT_CARD'
        ? { enable: true, maxParcels: parcels, isRatesToPayer: false }
        : { enable: false };

    return {
      client: this.buildInvoiceClient(params.payer),
      items: [{ name: itemName, quantity: 1, value: valueCents }],
      dueDate: this.invoiceDueDateEndOfUtcDay(dueDays),
      paymentMethods: {
        pix: { enable: method === 'PIX' },
        boleto: { enable: method === 'BOLETO' },
        creditCard,
      },
    };
  }

  /** Mesmo formato do exemplo Lytex: fim do dia em UTC (23:59:59.999Z). */
  private invoiceDueDateEndOfUtcDay(daysFromToday: number): string {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() + daysFromToday);
    d.setUTCHours(23, 59, 59, 999);
    return d.toISOString();
  }

  private buildInvoiceClient(payer?: LytexInvoicePayerInput): Record<string, unknown> {
    const fromDto = payer?.cpfCnpj?.replace(/\D/g, '') ?? '';
    const fromEnv =
      this.config.get<string>('LYTEX_INVOICE_CLIENT_CPF_CNPJ')?.replace(/\D/g, '') ?? '';
    const cpfCnpj = fromDto || fromEnv;
    if (cpfCnpj.length !== 11 && cpfCnpj.length !== 14) {
      throw new BadRequestException(
        'Informe o CPF/CNPJ do pagador no corpo da cobrança (payerCpfCnpj) ou configure LYTEX_INVOICE_CLIENT_CPF_CNPJ no .env (11 ou 14 dígitos).',
      );
    }
    const type = cpfCnpj.length === 14 ? 'pj' : 'pf';
    const name =
      payer?.name?.trim() ||
      this.config.get<string>('LYTEX_INVOICE_CLIENT_NAME')?.trim() ||
      'Pagador Sandbox';
    const email =
      payer?.email?.trim() ||
      this.config.get<string>('LYTEX_INVOICE_CLIENT_EMAIL')?.trim() ||
      'pagador@exemplo.com';
    const cellphone =
      payer?.cellphone?.replace(/\D/g, '') ||
      this.config.get<string>('LYTEX_INVOICE_CLIENT_CELLPHONE')?.replace(/\D/g, '') ||
      '11999999999';
    const pronoun =
      payer?.treatmentPronoun?.trim() ||
      this.config.get<string>('LYTEX_INVOICE_CLIENT_TREATMENT_PRONOUN')?.trim() ||
      'you';
    const zip =
      payer?.zip?.replace(/\D/g, '') ||
      this.config.get<string>('LYTEX_INVOICE_CLIENT_ZIP')?.replace(/\D/g, '') ||
      '01310100';
    const city =
      payer?.city?.trim() ||
      this.config.get<string>('LYTEX_INVOICE_CLIENT_CITY')?.trim() ||
      'São Paulo';
    const street =
      payer?.street?.trim() ||
      this.config.get<string>('LYTEX_INVOICE_CLIENT_STREET')?.trim() ||
      'Rua Exemplo';
    const state =
      payer?.state?.trim() ||
      this.config.get<string>('LYTEX_INVOICE_CLIENT_STATE')?.trim() ||
      'SP';
    const zone =
      payer?.zone?.trim() ||
      this.config.get<string>('LYTEX_INVOICE_CLIENT_ZONE')?.trim() ||
      'Centro';

    return {
      treatmentPronoun: pronoun,
      name,
      type,
      cpfCnpj,
      email,
      cellphone,
      address: { zip, city, street, state, zone },
    };
  }

  private mapAxios(err: unknown, fallback: string): HttpException {
    if (err instanceof AxiosError) {
      const data = err.response?.data;
      let msg: string | undefined;
      if (typeof data === 'string') {
        msg = data;
      } else if (data && typeof data === 'object') {
        const o = data as Record<string, unknown>;
        msg =
          (typeof o['message'] === 'string' && o['message']) ||
          (typeof o['error'] === 'string' && o['error']) ||
          (typeof o['msg'] === 'string' && o['msg']) ||
          undefined;
        if (!msg && Array.isArray(o['errors'])) {
          msg = JSON.stringify(o['errors']);
        }
        if (!msg) {
          msg = JSON.stringify(data);
        }
      }
      if (!msg) {
        msg = err.message;
      }
      const status =
        typeof err.response?.status === 'number' &&
        err.response.status >= 400 &&
        err.response.status < 600
          ? err.response.status
          : HttpStatus.BAD_GATEWAY;
      return new HttpException(`${fallback}: ${msg}`, status);
    }
    return new HttpException(fallback, HttpStatus.BAD_GATEWAY);
  }
}
