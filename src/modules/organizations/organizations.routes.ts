import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate.js';
import { authorize } from '../../middleware/authorize.js';
import { organizationsService } from './organizations.service.js';
import { updateOrganizationSchema } from './organizations.schemas.js';

export const organizationsRouter = Router();
organizationsRouter.use(authenticate);

organizationsRouter.get('/current', async (req, res, next) => {
  try {
    const result = await organizationsService.getCurrentOrg(req.ctx!.organizationId);
    res.json({ data: result, requestId: req.headers['x-request-id'] });
  } catch (err) {
    next(err);
  }
});

organizationsRouter.patch('/current', authorize('owner'), async (req, res, next) => {
  try {
    const body = updateOrganizationSchema.parse(req.body);
    const result = await organizationsService.updateCurrentOrg(req.ctx!.organizationId, body);
    res.json({ data: result, requestId: req.headers['x-request-id'] });
  } catch (err) {
    next(err);
  }
});
