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
      if (record.responseStatus === 0) {
        return next(
          new HttpError(
            409,
            'REQUEST_IN_PROGRESS',
            'Permintaan dengan Idempotency-Key yang sama sedang diproses'
          )
        );
      }
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

    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    let reserved = false;
    try {
      await db.insert(idempotencyKeys).values({
        organizationId: req.ctx.organizationId,
        userId: req.ctx.userId,
        method,
        path,
        key,
        requestHash,
        responseStatus: 0,
        responseBody: '',
        expiresAt,
      });
      reserved = true;
    } catch (insertErr: any) {
      // Race condition: concurrent request with same key
      const retryExisting = await db
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

      if (retryExisting.length > 0) {
        const record = retryExisting[0]!;
        if (record.responseStatus === 0) {
          return next(
            new HttpError(
              409,
              'REQUEST_IN_PROGRESS',
              'Permintaan dengan Idempotency-Key yang sama sedang diproses'
            )
          );
        }
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
    }

    const originalJson = res.json.bind(res);
    res.json = (body: any) => {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        if (reserved) {
          db.update(idempotencyKeys)
            .set({
              responseStatus: res.statusCode,
              responseBody: JSON.stringify(body),
            })
            .where(
              and(
                eq(idempotencyKeys.organizationId, req.ctx!.organizationId),
                eq(idempotencyKeys.userId, req.ctx!.userId),
                eq(idempotencyKeys.method, method),
                eq(idempotencyKeys.path, path),
                eq(idempotencyKeys.key, key)
              )
            )
            .catch(() => {});
        } else {
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
            .catch(() => {});
        }
      } else if (reserved) {
        db.delete(idempotencyKeys)
          .where(
            and(
              eq(idempotencyKeys.organizationId, req.ctx!.organizationId),
              eq(idempotencyKeys.userId, req.ctx!.userId),
              eq(idempotencyKeys.method, method),
              eq(idempotencyKeys.path, path),
              eq(idempotencyKeys.key, key),
              eq(idempotencyKeys.responseStatus, 0)
            )
          )
          .catch(() => {});
      }
      return originalJson(body);
    };

    next();
  } catch (err) {
    next(err);
  }
};
