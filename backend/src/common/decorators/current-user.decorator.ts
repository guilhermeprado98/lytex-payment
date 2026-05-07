import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export type JwtUserPayload = { userId: string; email: string };

export const CurrentUser = createParamDecorator(
  (data: keyof JwtUserPayload | undefined, ctx: ExecutionContext): string | JwtUserPayload => {
    const request = ctx.switchToHttp().getRequest<{ user?: JwtUserPayload }>();
    const user = request.user;
    if (!user) {
      return data ? '' : ({} as JwtUserPayload);
    }
    return data ? user[data] : user;
  },
);
