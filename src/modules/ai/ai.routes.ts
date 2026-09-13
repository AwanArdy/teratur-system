import { Router } from "express";
import { authenticate } from "../../middleware/authenticate.js";
import { aiService } from "./ai.service.js";
import { askAdvisorSchema } from "./ai.schemas.js";

export const aiRouter = Router();
aiRouter.use(authenticate);

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
