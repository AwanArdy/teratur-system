import type { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { db } from '../db/client.js';
import { idempotencyKeys } from '../db/schema/ops.js';
import { HttpError } from './errorHandler.js';
import { eq, and, gt } from 'drizzle-orm';

export const requireIdempotencyKey = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const key = req.headers['idempotency-key'] as string | undefined;

  if (!key) {
    return next(
      new HttpError(
        400,
        'IDEMPOTENCY_KEY_REQUIRED',
        'Header Idempotency-Key wajib diisi'
      )
    );
  }

  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(key)) {
    return next(
      new HttpError(
        400,
        'INVALID_IDEMPOTENCY_KEY',
        'Header Idempotency-Key harus berupa UUID yang valid'
      )
    );
  }

  if (!req.ctx) {
    return next(new HttpError(401, 'UNAUTHORIZED', 'Pengguna belum terautentikasi'));
  }

  const canonicalBody = JSON.stringify(req.body ?? {});
  const requestHash = crypto
    .createHash('sha256')
    .update(canonicalBody)
    .digest('hex');
  const path = req.originalUrl || req.url;
  const method = req.method.toUpperCase();

  try {
    const existing = await db
      .select()
      .from(idempotencyKeys)
      .where(
        and(
          eq(idempotencyKeys.organizationId, req.ctx.organizationId),
          eq(idempotencyKeys.userId, req.ctx.userId),
          eq(idempotencyKeys.method, method),
          eq(idempotencyKeys.path, path),
          eq(idempotencyKeys.key, key),
          gt(idempotencyKeys.expiresAt, new Date())
        )
      )
      .limit(1);

    if (existing.length > 0) {
      const record = existing[0]!;
      if (record.requestHash === requestHash) {
        res.setHeader('X-Idempotent-Replay', 'true');
        return res
          .status(record.responseStatus)
          .json(JSON.parse(record.responseBody));
      } else {
        return next(
          new HttpError(
            409,
            'IDEMPOTENCY_CONFLICT',
            'Idempotency-Key sudah digunakan dengan payload berbeda'
          )
        );
      }
    }

    const originalJson = res.json.bind(res);
    res.json = (body: any) => {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
        db.insert(idempotencyKeys)
          .values({
            organizationId: req.ctx!.organizationId,
            userId: req.ctx!.userId,
            method,
            path,
            key,
            requestHash,
            responseStatus: res.statusCode,
            responseBody: JSON.stringify(body),
            expiresAt,
          })
          .catch(() => {
            // Ignore background save errors or race condition duplicates
          });
      }
      return originalJson(body);
    };

    next();
  } catch (err) {
    next(err);
  }
};
