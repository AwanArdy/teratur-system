import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate.js';
import { meService } from './me.service.js';
import { updateProfileSchema, updateNotificationPrefrencesSchema } from './me.schemas.js';

export const meRouter = Router();
meRouter.use(authenticate);

meRouter.get('/', async (req, res, next) => {
  try {
    const result = await meService.getProfile(req.ctx!.userId);
    res.json({ data: result, requestId: req.headers['x-request-id'] });
  } catch (err) {
    next(err);
  }
});

meRouter.patch('/', async (req, res, next) => {
  try {
    const body = updateProfileSchema.parse(req.body);
    const result = await meService.updateProfile(req.ctx!.userId, body);
    res.json({ data: result, requestId: req.headers['x-request-id'] });
  } catch (err) {
    next(err);
  }
});

meRouter.patch('/notification-preferences', async (req, res, next) => {
  try {
    const body = updateNotificationPrefrencesSchema.parse(req.body);
    const result = await meService.updateNotificationPreferences(
      req.ctx!.userId,
      req.ctx!.organizationId,
      body
    );
    res.json({ data: result, requestId: req.headers['x-request-id'] });
  } catch (err) {
    next(err);
  }
});
