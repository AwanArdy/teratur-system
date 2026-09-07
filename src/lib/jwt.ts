import { SignJWT, jwtVerify } from "jose";
import { env } from "../config/env.js";

const accessSecret = new TextEncoder().encode(env.JWT_ACCESS_SECRET);

export type AccessTokenPayload = {
  sub: string;
  org: string;
  role: 'owner' | 'admin' | 'staff';
  sid: string;
  typ: 'access';
};

export type OnboardingTokenPayload = {
  sub: string;
  reg: string;
  typ: 'onboarding';
};

export const generateAccessToken = async (
  payload: Omit<AccessTokenPayload, 'typ'>
): Promise<string> => {
  return new SignJWT({ ...payload, typ: 'access' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('15m')
    .sign(accessSecret);
};

export const verifyAccessToken = async (token: string): Promise<AccessTokenPayload | null> => {
  try {
    const { payload } = await jwtVerify(token, accessSecret);
    if (payload.typ !== 'access') return null;
    return payload as unknown as AccessTokenPayload;
  } catch {
    return null;
  }
};

export const generateOnboardingToken = async (userId: string, registrationId: string): Promise<string> => {
  return new SignJWT({ sub: userId, reg: registrationId, typ: 'onboarding' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('15m')
    .sign(accessSecret);
};

export const verifyOnboardingToken = async (token: string): Promise<OnboardingTokenPayload | null> => {
  try {
    const { payload } = await jwtVerify(token, accessSecret);
    if (payload.typ !== 'onboarding') return null;
    return payload as unknown as OnboardingTokenPayload;
  } catch {
    return null;
  }
}
