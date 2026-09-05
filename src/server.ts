import { app } from "./app.js";
import { env } from "./config/env.js";
import { logger } from "./lib/logger.js";

const server = app.listen(env.PORT, () => {
  logger.info(`Server running di port ${env.PORT} [${env.NODE_ENV}]`);
});

const shutdown = () => {
  logger.info('Menerima sinyal shutdown, menutup server...');
  server.close(() => {
    logger.info('Server berhasil ditutup');
    process.exit(0);
  });
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
