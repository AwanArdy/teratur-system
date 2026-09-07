import { db } from "../../db/client.js";
import { eq, and, desc } from "drizzle-orm";
import { 
  users,
  organizations,
  organizationMembers,
  outlets,
  warehouses,
  subscriptions,
  emailOtps,
  registrations,
  refreshTokens
} from "../../db/schema/identity.js";

export const authRepo = {
  async findUserByEmail(email: string) {
    const [user] = await db.select().from(users).where(eq(users.email, email.toLowerCase()));
    return user || null;
  },

  async findUserById(id: string) {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || null;
  },

  async createUser(data: typeof users.$inferInsert) {
    const [user] = await db.insert(users).values(data).returning();
    if (!user) throw new Error('Gagal membuat user');
    return user;
  },

  async createRegistration(userId: string) {
    const [reg] = await db.insert(registrations).values({ userId }).returning();
    if (!reg) throw new Error('Gagal membuat registrasi');
    return reg;
  },

  async findRegistrationById(id: string) {
    const [reg] = await db.select().from(registrations).where(eq(registrations.id, id));
    return reg || null;
  },

  async createOtp(data: typeof emailOtps.$inferInsert) {
    const [otp] = await db.insert(emailOtps).values(data).returning();
    if (!otp) throw new Error('Gagal membuat OTP');
    return otp;
  },

  async findLatestotp(email: string, purpose: 'register' | 'email_change') {
    const [otp] = await db
      .select()
      .from(emailOtps)
      .where(and(eq(emailOtps.email, email.toLowerCase()), eq(emailOtps.purpose, purpose)))
      .orderBy(desc(emailOtps.createdAt))
      .limit(1);
    return otp || null;
  },

  async updateOtpAttempts(id: string, attempts: number, lockedUntil?: Date) {
    await db
      .update(emailOtps)
      .set({ 
        attempts, 
        ...(lockedUntil ? { lockedUntil } : {}),
      })
      .where(eq(emailOtps.id, id));
  },

  async markOtpConsumed(id: string) {
    await db.update(emailOtps).set({ consumedAt: new Date() }).where(eq(emailOtps.id, id));
  },

  async updateRegistrationOnboarding(id: string, tokenHash: string, expiresAt: Date) {
    await db
      .update(registrations)
      .set({ onboardingTokenHash: tokenHash, onboardingExpiresAt: expiresAt })
      .where(eq(registrations.id, id));
  },

  async createFullOrganization(params: {
    userId: string;
    businessName: string;
    businessType: 'restaurant' | 'retail' | 'service';
    country: string;
    province: string;
    city: string;
    planCode: 'free_trial' | 'starter' | 'growth' | 'pro' | 'business';
  }) {
    return await db.transaction(async (tx) => {
      const [org] = await tx
        .insert(organizations)
        .values({
          name: params.businessName,
          country: params.country,
          province: params.province,
          city: params.city,
          registerBusinessType: params.businessType,
          acceptedTermsAt: new Date(),
        })
        .returning();

      if (!org) throw new Error('Gagal membuat organisasi');

      const [outlet] = await tx
        .insert(outlets)
        .values({
          organizationId: org.id,
          name: `${params.businessName} Flagship`,
          address: `${params.city}, ${params.province}`,
          city: params.city,
        })
        .returning();

      if (!outlet) throw new Error('Gagal membuat outlet');

      const [warehouse] = await tx
        .insert(warehouses)
        .values({
          organizationId: org.id,
          outletId: outlet.id,
          name: 'Gudang Utama',
          code: 'WH-MAIN',
          isDefault: true
        })
        .returning();

      if (!warehouse) throw new Error('Gagal membuat gudang');

      await tx.insert(organizationMembers).values({
        organizationId: org.id,
        userId: params.userId,
        orgRole: 'owner',
        defaultOutletId: outlet.id,
      });

      const trialEnds = new Date();
      trialEnds.setDate(trialEnds.getDate() + 14);

      const [sub] = await tx
        .insert(subscriptions)
        .values({
          organizationId: org.id,
          planCode: params.planCode,
          status: params.planCode === "free_trial" ? 'trialing' : 'active',
          trialEndsAt: params.planCode === 'free_trial' ? trialEnds : null,
          outletLimit: params.planCode === 'business' ? 5 : 1,
        })
        .returning();

      if (!sub) throw new Error('Gagal membuat subscription');

      await tx
        .update(users)
        .set({ status: 'active', emailVerifiedAt: new Date() })
        .where(eq(users.id, params.userId));

      return { org, outlet, warehouse, sub };
    });
  },

  async createRefreshToken(data: typeof refreshTokens.$inferInsert) {
    const [token] = await db.insert(refreshTokens).values(data).returning();
    if (!token) throw new Error('Gagal membuat refresh token');
    return token;
  },

  async findRefreshTokenByHash(hash: string) {
    const [token] = await db.select().from(refreshTokens).where(eq(refreshTokens.tokenHash, hash));
    return token || null;
  },

  async revokeRefreshToken(id: string) {
    await db.update(refreshTokens).set({ revokedAt: new Date() }).where(eq(refreshTokens.id, id));
  },

  async revokeAllUserRefreshTokens(userId: string) {
    await db.update(refreshTokens).set({ revokedAt: new Date() }).where(eq(refreshTokens.userId, userId));
  },
};
