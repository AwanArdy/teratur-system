import express from "express";
import helmet from "helmet";
import cors from 'cors';
import { pinoHttp } from "pino-http";
import { env } from "./config/env.js";
import { logger } from "./lib/logger.js";
import { requestId } from "./middleware/requestId.js";
import { errorHandler } from "./middleware/errorHandler.js";

export const app = express();

app.use(helmet());
app.use(cors({ origin: env.CORS_ORIGINS.split(',') }));
app.use(requestId)
app.use(express.json({ limit: '1mb' }));
app.use(requestId);
app.use(
  pinoHttp({
    logger,
    customProps: (req) => ({
      requestId: req.headers['x-request-id'],
    }),
  })
);

// healthcheck
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', ts: new Date().toISOString() });
});

const v1Router = express.Router();
v1Router.get('/meta', (req, res) => {
  res.json({
    data: {
      timezone: env.APP_TZ,
      currency: 'IDR',
      apiVersion: 'v1',
    },
    requestId: req.headers['x-request-id'],
  });
});

app.use('/api/v1', v1Router);

app.use((req, res) => {
  res.status(404).json({
    error: {
      code: 'NOT_FOUND',
      message: 'Endpoint tidak ditemukan',
    },
    requestId: req.headers['x-request-id'],
  });
});

app.use(errorHandler);
