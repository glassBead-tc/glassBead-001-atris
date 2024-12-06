import winston from 'winston';
import path from 'path';

// Create logs directory if it doesn't exist
const logsDir = path.join(process.cwd(), 'logs');

// Create separate loggers for different concerns
export const stateLogger = winston.createLogger({
  level: 'debug',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ 
      filename: path.join(logsDir, 'state-transitions.log'),
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    })
  ]
});

// Specific logger for API responses
export const apiLogger = winston.createLogger({
  level: 'debug',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ 
      filename: path.join(logsDir, 'api-responses.log'),
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    })
  ]
});

// Helper function to safely stringify large objects
export const safeStringify = (obj: any): string => {
  const seen = new WeakSet();
  return JSON.stringify(obj, (key, value) => {
    if (typeof value === 'object' && value !== null) {
      if (seen.has(value)) {
        return '[Circular]';
      }
      seen.add(value);
    }
    return value;
  }, 2);
};

// Helper to log state transitions
export const logStateTransition = (
  nodeName: string, 
  state: any, 
  type: 'entry' | 'exit'
) => {
  const relevantState = {
    queryType: state.queryType,
    entityType: state.entityType,
    parameters: state.parameters,
    bestApi: state.bestApi ? {
      api_name: state.bestApi.api_name,
      required_parameters: state.bestApi.required_parameters,
    } : null,
  };

  stateLogger.debug({
    node: nodeName,
    type,
    state: relevantState,
  });
};