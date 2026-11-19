import pino from 'pino';
import { env } from '../config/env.js';

export const logger = pino({
  level: env.LOG_LEVEL,
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      'headers.authorization',
      'headers.cookie',
      'authorization',
      'password',
      'token',
      'refreshToken',
      'accessToken',
      'resetToken',
      'otpCode',
    ],
    censor: '[REDACTED]',
  },
  ...(env.NODE_ENV === "development"
    ? { transport: { target: 'pino-pretty' } }
    : {})
});
