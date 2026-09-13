import { describe, it, expect, vi, beforeEach } from 'vitest';
import { requireIdempotencyKey } from '../src/middleware/idempotency.js';
import { db } from '../src/db/client.js';
import { HttpError } from '../src/middleware/errorHandler.js';
import crypto from 'crypto';
import type { Request, Response, NextFunction } from 'express';

describe('3. Idempotensi & Finansial (pos-idempotency.test.ts)', () => {
  const mockCtx = {
    organizationId: 'org-123',
    userId: 'user-456',
  };

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  // Skenario 1: Double Submit POS
  it('1. Double Submit POS: Kirim POST /sales 2x dengan Idempotency-Key sama -> Cuma 1 transaksi & mutasi stok tercatat (2nd request return replay header)', async () => {
    const idempotencyKey = 'a1b2c3d4-e5f6-7890-abcd-1234567890ab';
    const payload = {
      orderType: 'dine_in',
      paymentMethod: 'qris',
      items: [{ productId: 'prod-kopi', qty: 2 }],
    };

    const canonicalBody = JSON.stringify(payload);
    const expectedHash = crypto
      .createHash('sha256')
      .update(canonicalBody)
      .digest('hex');

    const cachedResponse = {
      data: {
        id: 'sale-001',
        noNota: 'INV/2026/09/0001',
        totalIdr: 50000,
        status: 'paid',
      },
    };

    // Mock DB select returning cached idempotency key for replay request
    vi.spyOn(db, 'select').mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([
            {
              id: 'idempotency-rec-1',
              organizationId: mockCtx.organizationId,
              userId: mockCtx.userId,
              method: 'POST',
              path: '/api/v1/sales',
              key: idempotencyKey,
              requestHash: expectedHash,
              responseStatus: 201,
              responseBody: JSON.stringify(cachedResponse),
              expiresAt: new Date(Date.now() + 86400000),
            },
          ]),
        }),
      }),
    } as any);

    const req: Partial<Request> = {
      headers: { 'idempotency-key': idempotencyKey },
      ctx: mockCtx as any,
      body: payload,
      originalUrl: '/api/v1/sales',
      method: 'POST',
    };

    const headersSet: Record<string, string> = {};
    let statusSent = 0;
    let jsonSent: any = null;

    const res: Partial<Response> = {
      setHeader: vi.fn((key: string, value: string) => {
        headersSet[key] = value;
        return res as Response;
      }),
      status: vi.fn((code: number) => {
        statusSent = code;
        return res as Response;
      }),
      json: vi.fn((body: any) => {
        jsonSent = body;
        return res as Response;
      }),
    };

    const next = vi.fn() as NextFunction;

    await requireIdempotencyKey(req as Request, res as Response, next);

    // Verify replayed response
    expect(headersSet['X-Idempotent-Replay']).toBe('true');
    expect(statusSent).toBe(201);
    expect(jsonSent).toEqual(cachedResponse);
    expect(next).not.toHaveBeenCalled();
  });

  // Skenario 2: Conflict Payload
  it('2. Conflict Payload: Key sama tapi payload beda -> Return 409 IDEMPOTENCY_CONFLICT', async () => {
    const idempotencyKey = 'a1b2c3d4-e5f6-7890-abcd-1234567890ab';
    const originalPayload = {
      orderType: 'dine_in',
      paymentMethod: 'qris',
      items: [{ productId: 'prod-kopi', qty: 2 }],
    };

    const conflictingPayload = {
      orderType: 'dine_in',
      paymentMethod: 'cash', // Changed payment method
      items: [{ productId: 'prod-kopi', qty: 5 }], // Changed qty
    };

    const originalHash = crypto
      .createHash('sha256')
      .update(JSON.stringify(originalPayload))
      .digest('hex');

    // Mock DB select returning cached key with original Hash
    vi.spyOn(db, 'select').mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([
            {
              id: 'idempotency-rec-1',
              organizationId: mockCtx.organizationId,
              userId: mockCtx.userId,
              method: 'POST',
              path: '/api/v1/sales',
              key: idempotencyKey,
              requestHash: originalHash,
              responseStatus: 201,
              responseBody: JSON.stringify({ data: { id: 'sale-001' } }),
              expiresAt: new Date(Date.now() + 86400000),
            },
          ]),
        }),
      }),
    } as any);

    const req: Partial<Request> = {
      headers: { 'idempotency-key': idempotencyKey },
      ctx: mockCtx as any,
      body: conflictingPayload,
      originalUrl: '/api/v1/sales',
      method: 'POST',
    };

    const res: Partial<Response> = {
      setHeader: vi.fn(),
      status: vi.fn(),
      json: vi.fn(),
    };

    let errorPassedToNext: HttpError | null = null;
    const next = vi.fn((err?: any) => {
      if (err) errorPassedToNext = err;
    }) as NextFunction;

    await requireIdempotencyKey(req as Request, res as Response, next);

    expect(next).toHaveBeenCalled();
    expect(errorPassedToNext).not.toBeNull();
    expect(errorPassedToNext!.statusCode).toBe(409);
    expect(errorPassedToNext!.code).toBe('IDEMPOTENCY_CONFLICT');
  });
});
