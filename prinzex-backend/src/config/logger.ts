import winston from 'winston';
import { env } from './env';

/**
 * Winston logger — structured JSON logs everywhere; prettified console
 * lines in development for readability.
 */
export const logger = winston.createLogger({
  level: env.isProduction ? 'info' : 'debug',
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
    winston.format.errors({ stack: true }),
    winston.format.json(),
  ),
  defaultMeta: { service: 'prinzex-backend' },
  transports: [
    new winston.transports.Console({
      format: env.isProduction
        ? winston.format.json()
        : winston.format.combine(
            winston.format.colorize(),
            winston.format.printf(({ timestamp, level, message, ...meta }) => {
              const metaString = Object.keys(meta).length > 1 ? ` ${JSON.stringify(meta)}` : '';
              return `${String(timestamp)} ${level}: ${String(message)}${metaString}`;
            }),
          ),
    }),
  ],
  exitOnError: false,
});
