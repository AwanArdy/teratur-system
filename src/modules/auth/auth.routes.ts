import { Router } from "express";
import { authService } from "./auth.service.js";
import {
  registerStartSchema,
  otpVerifySchema,
  registerCompleteSchema,
  loginSchema,
  refreshSchema,
  changePasswordSchema
} from './auth.schemas.js';
import { authenticate } from "../../middleware/authenticate.js";

export const authRouter = Router();

authRouter.post('/register', async (req, res, next) => {
  try {
    const body = registerStartSchema.parse(req.body);
    const result = await authService.registerStart(body);
    res.status(201).json({ data: result, requestId: req.headers['x-request-id'] });
  } catch (err) {
    next(err);
  }
});

authRouter.post('/otp/verify', async (req, res, next) => {
  try {
    const body = otpVerifySchema.parse(req.body);
    const result = await authService.verifyOtp(body);
    res.json({ data: result, requestId: req.headers['x-request-id'] });
  } catch (err) {
    next(err);
  }
});

authRouter.post('/register/complete', async (req, res, next) => {
  try {
    const body = registerCompleteSchema.parse(req.body);
    const result = await authService.registerComplete(body);
    res.status(201).json({ data: result, requestId: req.headers['x-request-id'] });
  } catch (err) {
    next(err);
  }
});

authRouter.post('/login', async (req, res, next) => {
  try {
    const body = loginSchema.parse(req.body);
    const result = await authService.login(body);
    res.json({ data: result, requestId: req.headers['x-request-id'] });
  } catch (err) {
    next(err);
  }
});

authRouter.post('/refresh', async (req, res, next) => {
  try {
    const body = refreshSchema.parse(req.body);
    const result = await authService.refresh(body.refreshToken);
    res.json({ data: result, requestId: req.headers['x-request-id'] });
  } catch (err) {
    next(err);
  }
});

authRouter.post('/logout', async (req, res, next) => {
  try {
    await authService.logout(req.body?.refreshToken);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

authRouter.post('/change-password', authenticate, async (req, res, next) => {
  try {
    const body = changePasswordSchema.parse(req.body);
    // Logika ganti password
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});
