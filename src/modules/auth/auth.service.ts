import { eq, and } from "drizzle-orm";
import { db } from "../../db/client.js";
import { authRepo } from "./auth.repo.js";
import { hashPassword, verifyPassword } from "../../lib/password.js";
import { 
  generateOtpCode,
  hashOtpCode,
  generateOpaqueToken,
  hashToken
} from "../../lib/otp.js";
import { 
  generateAccessToken,
  generateOnboardingToken,
  verifyOnboardingToken
} from "../../lib/jwt.js";
import { HttpError } from "../../middleware/errorHandler.js";
import { logger } from "../../lib/logger.js";
import { 
  organizations, 
  organizationMembers, 
  outlets, 
  refreshTokens, 
  registrations, 
  subscriptions 
} from "../../db/schema/identity.js";

export const authService = {
  async registerStart(body: {
    fullName: string;
    email: string;
    phone: string;
    password: string;
  }) {
    const existing = await authRepo.findUserByEmail(body.email);
    if (existing) {
      throw new HttpError(400, 'VALIDATION_ERROR', 'Email sudah terdaftar dalam sistem');
    }

    const passwordHash = await hashPassword(body.password);
    const user = await authRepo.createUser({
      fullName: body.fullName,
      email: body.email.toLowerCase(),
      phone: body.phone,
      passwordHash,
      status: 'pending'
    });

    const reg = await authRepo.createRegistration(user.id);
    const otpCode = generateOtpCode();
    const codeHash = hashOtpCode(user.email, otpCode);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await authRepo.createOtp({
      email: user.email,
      userId: user.id,
      purpose: 'register',
      codeHash,
      expiresAt,
      lastSentAt: new Date(),
    });

    logger.info(`[DEV OTP] Email: ${user.email} | OTP Code: ${otpCode}`);

    return {
      registrationId: reg.id,
      email: user.email,
      otpExpiresAt: expiresAt.toISOString(),
    };
  },

  async verifyOtp(body: { registrationId: string, otp: string }) {
    const reg = await authRepo.findRegistrationById(body.registrationId);
    if (!reg) {
      throw new HttpError(404, 'NOT_FOUND', 'Registrasi tidak ditemukan');
    }

    const otpRecord = await authRepo.findLatestotp(reg.userId, 'register');
    if (!otpRecord || otpRecord.consumedAt) {
      throw new HttpError(400, 'OTP_INVALID', 'Kode OTP tidak ditemukan atau sudah digunakan');
    }

    if (otpRecord.lockedUntil && otpRecord.lockedUntil > new Date()) {
      throw new HttpError(429, 'RATE_LIMITED', 'Terlalu banyak percobaan. Silakan coba lagi nanti');
    }

    if (otpRecord.expiresAt < new Date()) {
      throw new HttpError(400, 'OTP_EXPIRED', 'Kode OTP telah kadaluarsa');
    }

    const user = await authRepo.findUserByEmail(otpRecord.email);
    if (!user) throw new HttpError(404, 'NOT_FOUND', 'User tidak ditemukan');

    const inputHash = hashOtpCode(user.email, body.otp);
    if (inputHash !== otpRecord.codeHash) {
      const attempts = otpRecord.attempts + 1;
      const lockedUntil = attempts >= otpRecord.maxAttempts ? new Date(Date.now() + 15 * 60 * 1000) : undefined;
      await authRepo.updateOtpAttempts(otpRecord.id, attempts, lockedUntil);
      throw new HttpError(400, 'OTP_INVALID', 'Kode OTP salah');
    }

    await authRepo.markOtpConsumed(otpRecord.id);

    const onboardingToken = await generateOnboardingToken(user.id, reg.id);
    const onboardingHash = hashToken(onboardingToken);
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    await authRepo.updateRegistrationOnboarding(reg.id, onboardingHash, expiresAt);
    
    return { onboardingToken, expiresIn: 900 };
  },

  async registrationComplete(body: {
    onboardingToken: string;
    businessName: string;
    businessType: 'restaurant' | 'retail' | 'service';
    country: string;
    province: string;
    city: string;
    plan: string;
  }) {
    const payload = await verifyOnboardingToken(body.onboardingToken);
    if (!payload) {
      throw new HttpError(401, 'UNAUTHORIZED', 'Token onboarding tidak valid atau kadaluarsa');
    }

    const reg = await authRepo.findRegistrationById(payload.reg);
    if (!reg || reg.completedAt) {
      throw new HttpError(400, 'CONFLICT', 'Proses registrasi ini sudah diselesaikan')
    }

    let planCode: 'free_trial' | 'starter' | 'growth' | 'pro' | 'business' = 'starter';
    if (body.plan === 'Teratur Free' || body.plan === 'free_trial') planCode = 'free_trial';
    else if (body.plan === 'Teratur Pro' || body.plan === 'pro') planCode = 'pro';
    else if (['growth', 'business'].includes(body.plan)) planCode = body.plan as any;

    const { org, outlet, sub } = await authRepo.createFullOrganization({
      userId: payload.sub,
      businessName: body.businessName,
      businessType: body.businessType,
      country: body.country,
      province: body.province,
      city: body.city,
      planCode,
    });

    const user = await authRepo.findUserByEmail(payload.sub);

    const refreshTokenRaw = generateOpaqueToken();
    const refreshHash = hashToken(refreshTokenRaw);
    const expiresAt = new Date(Date.now() + 12 * 3600 * 1000);

    const session = await authRepo.createRefreshToken({
      userId: payload.sub,
      organizationId: org.id,
      tokenHash: refreshHash,
      expiresAt
    });

    const accessToken = await generateAccessToken({
      sub: payload.sub,
      org: org.id,
      role: 'owner',
      sid: session.id,
    });

    return {
      accessToken,
      refreshToken: refreshTokenRaw,
      expiresIn: 900,
      user: {
        id: user?.id || payload.sub,
        fullName: user?.fullName || '',
        email: user?.email || '',
        phone: user?.phone || '',
        jobTitle: 'Owner / Pemilik Usaha',
      },
      organization: { id: org.id, name: org.name },
      outlet: { id: outlet.id, name: outlet.name },
      subscription: { planCode: sub.planCode, status: sub.status },
    };
  },

  async login(body: { email: string; password: string; rememberMe: boolean }) {
    const user = await authRepo.findUserByEmail(body.email);
    if (!user) {
      throw new HttpError(401, 'INVALID_CREDENTIALS', 'Email atau password salah');
    }

    const isValid = await verifyPassword(user.passwordHash, body.password);
    if (!isValid) {
      throw new HttpError(401, 'INVALID_CREDENTIALS', 'Email atau password salah');
    }

    if (user.status === 'pending') {
      throw new HttpError(403, 'ONBOARDING_REQUIRED', 'Selesaikan pendaftaran bisnis anda terlebih dahulu')
    }

    const [member] = await db
      .select()
      .from(organizationMembers)
      .where(eq(organizationMembers.userId, user.id));

    if (!member) {
      throw new HttpError(403, 'ONBOARDING_REQUIRED', 'User belum terikat dengan organisasi manapun');
    }

    const orgId = member.organizationId;
    const [org] = await db
      .select()
      .from(organizations)
      .where(eq(organizations.id, orgId));

    if (!org) {
      throw new HttpError(404, 'NOT_FOUND', 'Organisasi tidak ditemukan');
    }

    const [outlet] = await db
      .select()
      .from(outlets)
      .where(eq(outlets.organizationId, orgId));

    const [sub] = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.organizationId, orgId));

    const ttlDays = body.rememberMe ? 30 : 0.5;
    const expiresAt = new Date(Date.now() + ttlDays * 24 * 3600 * 1000);
    const refreshTokenRaw = generateOpaqueToken();
    const refreshHash = hashToken(refreshTokenRaw);

    const session = await authRepo.createRefreshToken({
      userId: user.id,
      organizationId: orgId,
      tokenHash: refreshHash,
      expiresAt
    });

    const accessToken = await generateAccessToken({
      sub: user.id,
      org: orgId,
      role: member.orgRole,
      sid: session.id,
    });

    return {
      accessToken,
      refreshToken: refreshTokenRaw,
      expiresIn: 900,
      user: {
        id: user.id,
        fullName: user.fullName,
        phone: user.phone,
        jobTitle: user.jobTitle || 'Owner / Pemilik Usaha'
      },
      organization: { id: orgId, name: org.name },
      outlet: outlet ? { id: outlet.id, name: outlet.name } : { id: '', name: '' },
      subscription: { planCode: sub?.planCode || 'starter', status: sub?.status || 'active' }
    };
  },

  async refresh(refreshTokenRaw: string) {
    const hash = hashToken(refreshTokenRaw);
    const session = await authRepo.findRefreshTokenByHash(hash);

    if (!session || session.revokedAt || session.expiresAt < new Date()) {
      throw new HttpError(401, 'UNAUTHORIZED', 'Refresh token tidak valid atau kadaluarsa');
    }

    await authRepo.revokeRefreshToken(session.id);

    const newRefreshRaw = generateOpaqueToken();
    const newRefreshHash = hashToken(newRefreshRaw);
    const expiresAt = new Date(Date.now() + 12 * 3600 * 1000);

    const newSession = await authRepo.createRefreshToken({
      userId: session.userId,
      organizationId: session.organizationId,
      tokenHash: newRefreshHash,
      expiresAt,
    });

    const [member] = await db
      .select()
      .from(organizationMembers)
      .where(
        and(
          eq(organizationMembers.userId, session.userId),
          eq(organizationMembers.organizationId, session.organizationId)
        )
      );

    const accessToken = await generateAccessToken({
      sub: session.userId,
      org: session.organizationId,
      role: member?.orgRole || 'owner',
      sid: newSession.id
    });

    return {
      accessToken,
      refreshToken: newRefreshRaw,
      expiresIn: 900
    };
  },

  async logout(refreshTokenRaw?: string) {
    if (refreshTokenRaw) {
      const hash = hashToken(refreshTokenRaw);
      const session = await authRepo.findRefreshTokenByHash(hash);
      if (session) {
        await authRepo.revokeRefreshToken(session.id);
      }
    }
  },

  async resendOtp(body: { registrationId: string }) {
    const reg = await authRepo.findRegistrationById(body.registrationId);
    if (!reg) {
      throw new HttpError(404, 'NOT_FOUND', 'Registrasi tidak ditemukan');
    }
    if (reg.completedAt) {
      throw new HttpError(400, 'CONFLICT', 'Registrasi sudah diselesaikan');
    }
    const user = await authRepo.findUserById(reg.userId);
    if (!user) throw new HttpError(404, 'NOT_FOUND', 'User tidak ditemukan');

    const latest = await authRepo.findLatestotp(user.email, 'register');
    if (latest && latest.lastSentAt) {
      const elapsed = Date.now() - new Date(latest.lastSentAt).getTime();
      if (elapsed < 60 * 1000) {
        throw new HttpError(429, 'RATE_LIMITED', 'Tunggu 60 detik sebelum meminta OTP lagi');
      }
      if (latest.lockedUntil && new Date(latest.lockedUntil) > new Date()) {
        throw new HttpError(429, 'RATE_LIMITED', 'Terlalu banyak percobaan. Silakan coba lagi nanti');
      }
    }

    const otpCode = generateOtpCode();
    const codeHash = hashOtpCode(user.email, otpCode);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
    await authRepo.createOtp({
      email: user.email,
      userId: user.id,
      purpose: 'register',
      codeHash,
      expiresAt,
      lastSentAt: new Date(),
    });
    logger.info(`[DEV OTP RESEND] Email: ${user.email} | OTP Code: ${otpCode}`);
    return { email: user.email, otpExpiresAt: expiresAt.toISOString() };
  },

  async forgotPassword(body: { email: string }) {
    // Selalu 202 di route (anti enumeration). Di sini hanya buat token bila user ada.
    const user = await authRepo.findUserByEmail(body.email);
    if (!user) return;
    const raw = generateOpaqueToken();
    const tokenHash = hashToken(raw);
    await authRepo.createPasswordResetToken({
      userId: user.id,
      tokenHash,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    });
    logger.info(`[DEV RESET] Email: ${user.email} | ResetToken: ${raw}`);
  },

  async resetPassword(body: { token: string; newPassword: string }) {
    const tokenHash = hashToken(body.token);
    const record = await authRepo.findPasswordResetTokenByHash(tokenHash);
    if (!record || record.consumedAt || new Date(record.expiresAt) < new Date()) {
      throw new HttpError(400, 'VALIDATION_ERROR', 'Token reset tidak valid atau kadaluarsa');
    }
    const passwordHash = await hashPassword(body.newPassword);
    await authRepo.updateUserPassword(record.userId, passwordHash);
    await authRepo.consumePasswordResetToken(record.id);
    await authRepo.revokeAllUserRefreshTokens(record.userId);
  },

  async changePassword(userId: string, body: { oldPassword: string; newPassword: string }) {
    const user = await authRepo.findUserById(userId);
    if (!user) throw new HttpError(404, 'NOT_FOUND', 'User tidak ditemukan');
    const valid = await verifyPassword(user.passwordHash, body.oldPassword);
    if (!valid) {
      throw new HttpError(401, 'UNAUTHORIZED', 'Password lama salah');
    }
    const passwordHash = await hashPassword(body.newPassword);
    await authRepo.updateUserPassword(userId, passwordHash);
    await authRepo.revokeAllUserRefreshTokens(userId);
  },
};
