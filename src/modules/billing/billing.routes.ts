import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate.js';
import { billingService } from './billing.service.js';

export const billingRouter = Router();
billingRouter.use(authenticate);

billingRouter.get('/subscription', async (req, res, next) => {
  try {
    const result = await billingService.getSubscriptionDetails(req.ctx!.organizationId);
    res.json({ data: result, requestId: req.headers['x-request-id'] });
  } catch (err) {
    next(err);
  }
});
