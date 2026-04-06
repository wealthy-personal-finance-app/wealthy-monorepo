import winston from 'winston';
import path from 'path';
import { fileURLToPath } from 'url';

const { combine, timestamp, printf, colorize, errors } = winston.format;

// Get the root directory of the monorepo
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// Move up from common/utils to the root
const rootLogPath = path.resolve(__dirname, '../../logs');

const logFormat = printf(({ level, message, timestamp, stack, service }) => {
  return `${timestamp} [${service || 'System'}] ${level}: ${stack || message}`;
});

const logger = winston.createLogger({
  level: 'info',
  format: combine(
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    errors({ stack: true }),
    logFormat
  ),
  transports: [
    // All errors from all services go here
    new winston.transports.File({ 
      filename: path.join(rootLogPath, 'error.log'), 
      level: 'error' 
    }),
    // Every single log message goes here
    new winston.transports.File({ 
      filename: path.join(rootLogPath, 'combined.log') 
    }),
  ],
});

if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: combine(colorize(), logFormat),
  }));
}

export default logger;