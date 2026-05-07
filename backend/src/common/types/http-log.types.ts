/** Campos gravados em cada linha de log de requisição HTTP. */
export type HttpLogPayload = {
  ts: string;
  method: string;
  path: string;
  query: string;
  status: number;
  durationMs: number;
  ip: string;
  userAgent: string;
  userId: string | null;
  userEmail: string | null;
};
