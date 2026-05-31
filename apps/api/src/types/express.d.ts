import type { AccessTokenPayload } from '@ticketchain/shared';

declare global {
  namespace Express {
    interface Request {
      user?: AccessTokenPayload;
      orgId?: string;
    }
  }
}

export {};
