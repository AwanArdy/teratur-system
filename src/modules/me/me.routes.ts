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

meRouter.get('/sessions', async (req, res, next) => {
  try {
    const result = await meService.listSessions(req.ctx!.userId);
    res.json({ data: result, requestId: req.headers['x-request-id'] });
  } catch (err) {
    next(err);
  }
});

meRouter.delete('/sessions/:id', async (req, res, next) => {
  try {
    const { id } = req.params as { id: string };
    const result = await meService.revokeSession(req.ctx!.userId, id);
    res.json({ data: result, requestId: req.headers['x-request-id'] });
  } catch (err) {
    next(err);
  }
});

meRouter.post('/disable', async (req, res, next) => {
  try {
    const { confirmEmail } = (req.body || {}) as { confirmEmail?: string };
    const result = await meService.disableAccount(req.ctx!.userId, confirmEmail);
    res.json({ data: result, requestId: req.headers['x-request-id'] });
  } catch (err) {
    next(err);
  }
});
