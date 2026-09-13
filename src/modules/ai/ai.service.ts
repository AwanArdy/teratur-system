import { aiRepo } from "./ai.repo.js";
import { HttpError } from "../../middleware/errorHandler.js";
import type { RequestContext } from "../../types/express.js";
import { Http2ServerRequest } from "http2";
import { date } from "zod/v4";

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
    const today = new Date();
    const todayStr = today.toISOString().slice(0, 10);

    if (range === 'yesterday') {
      const y = new Date(Date.now() - 24 * 3600 * 1000).toISOString().slice(0, 10);
      return { from: y, to: y };
    }

    if (range === "month") {
      const m = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString().slice(0, 10);
      return { from: m, to: todayStr };
    }

    const w = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString().slice(0, 10);
    return { from: w, to: todayStr };
  },
};
