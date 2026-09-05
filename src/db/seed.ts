import { logger } from '../lib/logger.js';

export const seed = async () => {
  logger.info('Database seed script initialized');
};

if (import.meta.url === `file://${process.argv[1]}`) {
  seed().catch((err) => {
    logger.error('Error running seed:', err);
    process.exit(1);
  });
}
