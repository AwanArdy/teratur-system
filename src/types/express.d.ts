import { PlanCode, StaffRole } from '../db/schema/enums.js';

export type RequestContext = {
  requestId: string;
  userId: string;
  organizationId: string;
  orgRole: 'owner' | 'admin' | 'staff';
  staffRole: StaffRole | null;
  staffId: string | null;
  outletIds: string[];
  activeOutletId: string | null;
  planCode: PlanCode;
  planStatus: 'trialing' | 'active' | 'expired';
};

declare global {
  namespace Express {
    interface Request {
      ctx?: RequestContext;
    }
  }
}
