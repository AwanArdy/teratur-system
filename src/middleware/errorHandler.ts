import type { Request, Response, NextFunction } from "express";
import { ZodError } from "zod/v4";
import { logger } from "../lib/logger.js";
import { request } from "node:http";
import { requestId } from "./requestId.js";

export class HttpError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    message: string,
    public details?: unknown
  ) {
    super(message);
  }
}

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
) => {
  const reqId = (req.headers['x-request-id'] as string) || 'unknown';

  if (err instanceof HttpError) {
    return res.status(err.statusCode).json({
      error: {
        code: err.code,
        message: err.message,
        details: err.details,
      },
      requestId: reqId,
    });
  }

  if (err instanceof ZodError) {
    return res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Data request tidak valid',
        details: err.issues.map((e) => ({
          path: e.path.join('.'),
          message: e.message,
        })),
      },
      requestId: reqId,
    });
  }

  logger.error({ err, requestId: reqId }, 'Unhandled server error');

  return res.status(500).json({
    error: {
      code: 'INTERNAL_ERROR',
      message: 'Terjadi kesalahan pada server',
    },
    requestId: reqId,
  });
};
