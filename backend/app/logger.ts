import winston from 'winston';

// Define log levels
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

// Create a custom format for console output
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.simple()
);

// Create a custom format for file output
const fileFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.printf(
    (info) => `${info.timestamp} ${info.level}: ${info.message}`
  )
);

// Create the logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  levels,
  transports: [
    new winston.transports.Console({
      format: consoleFormat,
      level: 'info', // This will log info, warn, and error to console
    }),
    new winston.transports.File({ 
      filename: 'error.log', 
      level: 'error',
      format: fileFormat,
    }),
    new winston.transports.File({ 
      filename: 'combined.log',
      format: fileFormat,
    }),
  ],
});

// Export a function to log user-visible messages to console
export const logToUser = (message: string) => {
  console.log(message);
};

export { logger };