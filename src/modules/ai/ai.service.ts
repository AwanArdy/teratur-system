import { aiRepo } from "./ai.repo.js";
import { HttpError } from "../../middleware/errorHandler.js";
import type { RequestContext } from "../../types/express.js";
import { db } from "../../db/client.js";
import { eq, and, isNull } from "drizzle-orm";
import { aiConversations, aiMessages } from "../../db/schema/ai.js";
import { getWitaDateString, getWitaDateNDaysAgo, getWitaYesterdayString } from "../../lib/time.js";

export const aiService = {
  async getAggregatedContext(
    organizationId: string,
    outletId: string | null,
    range: 'today' | 'yesterday' | 'week' | 'month'
  ) {
    const dates = this.resolveDates(range);
    return await aiRepo.getBusinessContext(organizationId, outletId, dates.from, dates.to);
  },

  async forwardToRagService(ctx: RequestContext, prompt: string, range: 'today' | 'yesterday' | 'week' | 'month') {
    const businessContext = await this.getAggregatedContext(
      ctx.organizationId,
      ctx.activeOutletId,
      range
    );

    const ragServiceUrl = process.env.RAG_SERVICE_URL;
    const ragApiKey = process.env.RAG_SERVICE_API_KEY;

    const payload = {
      organizationId: ctx.organizationId,
      outletId: ctx.activeOutletId,
      userId: ctx.userId,
      userRole: ctx.orgRole,
      planCode: ctx.planCode,
      prompt,
      context: businessContext
    };

    if (!ragServiceUrl) {
      return {
        answer: `[MOCK RAG RESPONSE] Server RAG belum dihubungkan (RAG_SERVICE_URL belum diset). Berikut data context yang telah disiapkan untuk di-forward`,
        forwardPayload: payload,
      };
    }

    try {
      const response = await fetch(`${ragServiceUrl}/v1/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(ragApiKey ? { 'authorization': `Bearer ${ragApiKey}` } : {}),
          'X-Request-Id': ctx.requestId,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new HttpError(
          502,
          'BAD_GATEWAY',
          `Gagal mendapatkan respon dari RAG Service: ${response.statusText}`,
          { details: errText }
        );
      }

      const result = await response.json();
      return result;
    } catch (err: any) {
      if (err instanceof HttpError) throw err;
      throw new HttpError(503, 'SERVICE_UNAVAILABLE', 'RAG Service tidak dapat dihubungi', {
        message: err.message,
      });
    }
  },

  resolveDates(range: string) {
    const todayStr = getWitaDateString();

    if (range === 'yesterday') {
      const y = getWitaYesterdayString();
      return { from: y, to: y };
    }

    if (range === "month") {
      const m = getWitaDateNDaysAgo(30);
      return { from: m, to: todayStr };
    }

    const w = getWitaDateNDaysAgo(7);
    return { from: w, to: todayStr };
  },

  // --- Kontrak DESIGN §11.15: POST /ai/chat (rule-based v1, data tenant nyata) ---
  async chat(ctx: RequestContext, body: { conversationId?: string | undefined; message: string; clientMessageId?: string | undefined }) {
    let conversationId = body.conversationId;
    if (conversationId) {
      const [conv] = await db
        .select()
        .from(aiConversations)
        .where(
          and(
            eq(aiConversations.id, conversationId),
            eq(aiConversations.organizationId, ctx.organizationId),
            isNull(aiConversations.deletedAt),
          ),
        );
      if (!conv) {
        throw new HttpError(404, 'NOT_FOUND', 'Percakapan tidak ditemukan');
      }
    } else {
      const [conv] = await db
        .insert(aiConversations)
        .values({ organizationId: ctx.organizationId, userId: ctx.userId })
        .returning();
      if (!conv) throw new HttpError(500, 'INTERNAL_ERROR', 'Gagal membuat percakapan');
      conversationId = conv.id;
    }

    await db.insert(aiMessages).values({
      organizationId: ctx.organizationId,
      conversationId: conversationId!,
      role: 'user',
      text: body.message,
      ...(body.clientMessageId ? { clientMessageId: body.clientMessageId } : {}),
    });

    const msg = body.message.toLowerCase();
    const dates = this.resolveDates('week');
    const context = await aiRepo.getBusinessContext(
      ctx.organizationId, ctx.activeOutletId, dates.from, dates.to,
    );

    let text: string;
    let suggestions: string[] = [];
    if (/(stok|kritis|reorder|bahan|habis)/.test(msg)) {
      const items = (context.lowStockItems || []).map((i: any) => `• ${i.name} (${i.qtyOnHand} ${i.uom})`).join('\n') || '- tidak ada item kritis -';
      text = `Stok kritis saat ini:\n${items}\nSegera reorder ke supplier agar operasional tidak terganggu.`;
      suggestions = ['Buatkan rekomendasi reorder', 'Lihat laporan stok'];
    } else if (/(omset|penjualan|laris|revenue|transaksi)/.test(msg)) {
      const f = context.financials || {};
      const top = (context.topProducts || []).map((p: any) => `• ${p.name} (${p.totalQty}x)`).join('\n') || '- belum ada penjualan -';
      text = `Omset periode ini Rp ${Number(f.omsetNetIdr || 0).toLocaleString('id-ID')} dari ${f ? '' : ''}menu terlaris:\n${top}`;
      suggestions = ['Analisa margin menu', 'Lihat dashboard'];
    } else if (/(promo|bundel|bundle|diskon|hpp|margin)/.test(msg)) {
      const top = (context.topProducts || []).slice(0, 2).map((p: any) => p.name).join(' + ') || 'menu terlaris';
      text = `Saran bundling: gabungkan ${top} dengan margin tertinggi sebagai paket hemat. Tetapkan diskon maksimal 10% agar margin tetap sehat.`;
      suggestions = ['Hitung HPP produk', 'Lihat margin menu'];
    } else {
      text = 'Halo! Saya asisten Teratur. Saya bisa bantu info omset, stok kritis, HPP, dan ide bundling dari data outlet Anda. Coba tanya "stok kritis apa saja?" atau "menu apa yang paling laris?"';
      suggestions = ['Stok kritis apa saja?', 'Menu apa yang paling laris?', 'Beri ide bundling'];
    }

    const [assistantMsg] = await db
      .insert(aiMessages)
      .values({
        organizationId: ctx.organizationId,
        conversationId: conversationId!,
        role: 'assistant',
        text,
        suggestions,
      })
      .returning();

    return {
      conversationId: conversationId!,
      message: {
        id: assistantMsg!.id,
        role: 'assistant',
        text,
        createdAt: assistantMsg!.createdAt,
        suggestions,
      },
    };
  },

  async getConversation(ctx: RequestContext, conversationId: string) {
    const [conv] = await db
      .select()
      .from(aiConversations)
      .where(
        and(
          eq(aiConversations.id, conversationId),
          eq(aiConversations.organizationId, ctx.organizationId),
          isNull(aiConversations.deletedAt),
        ),
      );
    if (!conv) throw new HttpError(404, 'NOT_FOUND', 'Percakapan tidak ditemukan');
    const messages = await db
      .select()
      .from(aiMessages)
      .where(eq(aiMessages.conversationId, conversationId))
      .orderBy(aiMessages.createdAt);
    return { id: conv.id, messages };
  },

  async resetConversation(ctx: RequestContext, conversationId: string) {
    const [conv] = await db
      .select()
      .from(aiConversations)
      .where(
        and(
          eq(aiConversations.id, conversationId),
          eq(aiConversations.organizationId, ctx.organizationId),
          isNull(aiConversations.deletedAt),
        ),
      );
    if (!conv) throw new HttpError(404, 'NOT_FOUND', 'Percakapan tidak ditemukan');
    await db
      .update(aiConversations)
      .set({ deletedAt: new Date() })
      .where(eq(aiConversations.id, conversationId));
    const [fresh] = await db
      .insert(aiConversations)
      .values({ organizationId: ctx.organizationId, userId: ctx.userId })
      .returning();
    return { conversationId: fresh!.id };
  },
};
