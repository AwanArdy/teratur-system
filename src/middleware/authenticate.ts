import type { Request, Response, NextFunction } from "express";
import { verifyAccessToken } from "../lib/jwt.js";
import { db } from "../db/client.js";
import { HttpError } from "./errorHandler.js";
import { eq, and, isNull } from "drizzle-orm";
import { users, organizationMembers, subscriptions, outlets, refreshTokens } from "../db/schema/identity.js";
import { staff} from "../db/schema/staff.js";

export const authenticate = async (req: Request, _res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return next(new HttpError(401, 'UNAUTHORIZED', 'Token otentikasi tidak ditemukan'));
  }

  const token = authHeader.substring(7);
  const payload = await verifyAccessToken(token);

  if (!payload) {
    return next(new HttpError(401, 'UNAUTHORIZED', 'Token tidak valid atau telah kadaluwarsa'))
  }

  const [session] = await db
    .select()
    .from(refreshTokens)
    .where(and(eq(refreshTokens.id, payload.sid), isNull(refreshTokens.revokedAt)));

  if (!session) {
    return next(new HttpError(401, 'UNAUTHORIZED', 'Sesi login telah dibatalkan'));
  }

  const [user] = await db.select().from(users).where(eq(users.id, payload.sub));
  if (!user || user.status === 'disabled') {
    return next(new HttpError(401, 'UNAUTHORIZED', 'Akun tidak aktif atau tidak temukan'));
  }

  const [member] = await db
    .select()
    .from(organizationMembers)
    .where(
      and(
        eq(organizationMembers.userId, payload.sub),
        eq(organizationMembers.organizationId, payload.org)
      )
    );

  if (!member) {
    return next(new HttpError(401, 'UNAUTHORIZED', 'Membership organisasi tidak terdaftar'))
  }

  const [sub] = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.organizationId, payload.org));

  const allOutlets = await db
    .select({ id: outlets.id })
    .from(outlets)
    .where(and(eq(outlets.organizationId, payload.org), isNull(outlets.deletedAt)));
  const outletIds = allOutlets.map((o) => o.id);

  const [staffMember] = await db
    .select()
    .from(staff)
    .where(and(eq(staff.userId, user.id), eq(staff.organizationId, payload.org), isNull(staff.deletedAt)));

  // PRD §8.2 & DESIGN §5.2: Owner & Admin dapat mengakses semua outlet organisasi.
  // Staf operasional (manager, kasir, dll) hanya berhak atas outlet yang ditugaskan kepada mereka.
  let permittedOutletIds: string[];
  if (member.orgRole === 'owner' || member.orgRole === 'admin') {
    permittedOutletIds = outletIds;
  } else {
    const assignedOutletId = staffMember?.outletId || member.defaultOutletId;
    permittedOutletIds = assignedOutletId && outletIds.includes(assignedOutletId)
      ? [assignedOutletId]
      : [];
  }

  const activeOutletHeader = req.headers['x-outlet-id'] as string | undefined;
  const activeOutletId = activeOutletHeader && permittedOutletIds.includes(activeOutletHeader)
    ? activeOutletHeader
    : (activeOutletHeader ? null : (permittedOutletIds[0] || null));

  req.ctx = {
    requestId: (req.headers['x-request-id'] as string) || 'unknown',
    userId: user.id,
    organizationId: payload.org,
    orgRole: member.orgRole,
    staffRole: staffMember?.staffRole || null,
    staffId: staffMember?.id || null,
    outletIds: permittedOutletIds,
    activeOutletId,
    planCode: sub?.planCode || 'starter',
    planStatus: sub?.status || 'active',
  };

  next();
};
