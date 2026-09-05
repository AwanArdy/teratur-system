import type { Request, Response, NextFunction } from 'express'
import { ulid } from 'ulid';

export const requestId = (req: Request, res: Response, next: NextFunction) => {
  const reqId = (req.headers['x-request-id'] as string) || `req_${ulid()}`;
  req.headers['x-request-id'] = reqId;
  res.setHeader('X-Request-Id', reqId);
  next();
}
