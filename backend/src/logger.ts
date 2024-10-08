import winston from 'winston';

const logger = winston.createLogger({
  level: 'debug',
  format: winston.format.simple(),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' }),
  ],
});

// Function to redact sensitive information
function redactSensitiveInfo(obj: any): any {
  const sensitiveKeys = ['api_key', 'password', 'token'];
  return JSON.parse(JSON.stringify(obj), (key, value) => 
    sensitiveKeys.includes(key) ? '[REDACTED]' : value
  );
}

export { logger, redactSensitiveInfo };
    