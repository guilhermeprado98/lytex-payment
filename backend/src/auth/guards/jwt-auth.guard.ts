import { ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

function jwtInfoMessage(info: unknown): string {
  if (info && typeof info === 'object') {
    const name = (info as { name?: string }).name;
    if (name === 'TokenExpiredError') {
      return 'Sessão expirada. Faça login novamente.';
    }
    if (name === 'JsonWebTokenError') {
      return 'Token inválido ou alterado. Faça login novamente (ex.: JWT_SECRET mudou no servidor).';
    }
  }
  return 'Token inválido ou ausente. Use o accessToken de POST /auth/login no header Authorization: Bearer.';
}

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  override handleRequest<TUser>(
    err: Error | undefined,
    user: TUser | false,
    info: unknown,
    _context: ExecutionContext,
    _status?: unknown,
  ): TUser {
    if (err) {
      throw err instanceof UnauthorizedException ? err : new UnauthorizedException(jwtInfoMessage(info));
    }
    if (!user) {
      throw new UnauthorizedException(jwtInfoMessage(info));
    }
    return user;
  }
}
