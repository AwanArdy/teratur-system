import { Router } from "express";
import { authenticate } from "../../middleware/authenticate.js";
import { aiService } from "./ai.service.js";
import { askAdvisorSchema, aiChatSchema } from "./ai.schemas.js";

export const aiRouter = Router();
aiRouter.use(authenticate);

// Kontrak DESIGN §11.15 (dipakai FE chat-ai + aplikasi kasir)
aiRouter.post('/chat', async (req, res, next) => {
  try {
    const body = aiChatSchema.parse(req.body);
    const result = await aiService.chat(req.ctx!, body);
    res.json({ data: result, requestId: req.headers['x-request-id'] });
  } catch (err) {
    next(err);
  }
});

aiRouter.get('/conversations/:id', async (req, res, next) => {
  try {
    const { id } = req.params as { id: string };
    const result = await aiService.getConversation(req.ctx!, id);
    res.json({ data: result, requestId: req.headers['x-request-id'] });
  } catch (err) {
    next(err);
  }
});

aiRouter.post('/conversations/:id/reset', async (req, res, next) => {
  try {
    const { id } = req.params as { id: string };
    const result = await aiService.resetConversation(req.ctx!, id);
    res.json({ data: result, requestId: req.headers['x-request-id'] });
  } catch (err) {
    next(err);
  }
});

// Endpoint lama dipertahankan untuk kompatibilitas
aiRouter.post('/advisor', async (req, res, next) => {
  try {
    const body = askAdvisorSchema.parse(req.body);
    const result = await aiService.forwardToRagService(req.ctx!, body.prompt, body.range);
    res.json({ data: result, requestId: req.headers['x-request-id'] });
  } catch (err) {
    next(err);
  }
});

aiRouter.get('/context', async (req, res, next) => {
  try {
    const range = (req.query.range as any) || 'week';
    const result = await aiService.getAggregatedContext(
      req.ctx!.organizationId,
      req.ctx!.activeOutletId,
      range
    );
    res.json({ data: result, requestId: req.headers['x-request-id'] });
  } catch (err) {
    next(err);
  }
});
