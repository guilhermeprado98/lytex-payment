function pickString(obj: Record<string, unknown>, keys: string[]): string | undefined {
  for (const k of keys) {
    const v = obj[k];
    if (typeof v === 'string' && v.length > 0) {
      return v;
    }
  }
  return undefined;
}

function dig(obj: unknown, path: string[]): unknown {
  let cur: unknown = obj;
  for (const p of path) {
    if (cur === null || cur === undefined || typeof cur !== 'object') {
      return undefined;
    }
    cur = (cur as Record<string, unknown>)[p];
  }
  return cur;
}

function asId(v: unknown): string | undefined {
  if (typeof v === 'string' && v.length > 0) {
    return v;
  }
  return undefined;
}

export function extractLytexIds(data: Record<string, unknown>): {
  externalId?: string;
  paymentUrl?: string;
  lytexInvoiceId?: string;
} {
  const rootId = asId(data['_id']) || asId(data['id']);
  const externalId =
    rootId || pickString(data, ['referenceId', 'paymentLinkId']);

  const paymentUrl = pickString(data, [
    'linkCheckout',
    'linkBoleto',
    'url',
    'paymentUrl',
    'link',
    'shortUrl',
    'checkoutUrl',
    'publicUrl',
    'payUrl',
    'invoiceUrl',
  ]);

  const inv =
    dig(data, ['_invoiceId']) ??
    dig(data, ['invoice', '_id']) ??
    dig(data, ['_invoice', '_id']) ??
    dig(data, ['data', '_invoiceId']);

  const lytexInvoiceId =
    asId(inv) || pickString(data, ['_invoiceId', 'invoiceId']) || rootId;

  return {
    externalId,
    paymentUrl,
    lytexInvoiceId,
  };
}

export function extractCardTokenId(data: Record<string, unknown>): string | undefined {
  return (
    pickString(data, ['_cardTokenId', 'cardTokenId']) ||
    asId(data['_id']) ||
    asId(data['id'])
  );
}
