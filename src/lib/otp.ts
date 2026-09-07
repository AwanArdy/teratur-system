import crypto from 'node:crypto';
import { env } from '../config/env.js';

export const generateOtpCode = (): string => {
  return crypto.randomInt(100000, 1000000).toString();
};

export const hashOtpCode = (email: string, code: string): string => {
  return crypto
    .createHash('sha256')
    .update(`${env.OTP_PEPPER}:${email.toLowerCase()}:${code}`)
    .digest('hex');
};

export const generateOpaqueToken = (): string => {
  return crypto.randomBytes(32).toString('hex');
};

export const hashToken = (rawToken: string): string => {
  return crypto.createHash('sha256').update(rawToken).digest('hex');
};
