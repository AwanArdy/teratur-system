import { sql } from 'drizzle-orm';
import { documentCounters } from '../db/schema/ops.js';
import { getWitaDateString } from './time.js';

export async function generateDocumentNo(
  tx: any,
  organizationId: string,
  outletId: string,
  kind: 'sales' | 'transfers' | string
): Promise<string> {
  const yyyymmdd = getWitaDateString().replace(/-/g, '');
  const prefix = kind === 'sales' ? 'INV' : kind.toUpperCase();

  const [counter] = await tx
    .insert(documentCounters)
    .values({
      organizationId,
      outletId,
      kind,
      yyyymmdd,
      lastValue: 1,
    })
    .onConflictDoUpdate({
      target: [
        documentCounters.organizationId,
        documentCounters.outletId,
        documentCounters.kind,
        documentCounters.yyyymmdd,
      ],
      set: {
        lastValue: sql`${documentCounters.lastValue} + 1`,
      },
    })
    .returning({ lastValue: documentCounters.lastValue });

  const seq = String(counter.lastValue).padStart(3, '0');
  return `${prefix}/${yyyymmdd}/${seq}`;
}
