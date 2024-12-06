interface ErrorLog {
  query: string;
  error: string;
  stack?: string;
  timestamp: number;
  frequency: number;
}

class ErrorTracker {
  private static errorMap = new Map<string, ErrorLog>();
  
  static logError(query: string, error: Error) {
    const errorKey = `${error.message}:${error.stack?.split('\n')[1] || ''}`;
    
    if (this.errorMap.has(errorKey)) {
      const log = this.errorMap.get(errorKey)!;
      log.frequency++;
      this.errorMap.set(errorKey, log);
    } else {
      this.errorMap.set(errorKey, {
        query,
        error: error.message,
        stack: error.stack,
        timestamp: Date.now(),
        frequency: 1
      });
    }

    // Alert on high-frequency errors
    if (this.errorMap.get(errorKey)!.frequency > 5) {
      console.warn(`High-frequency error detected: ${error.message}`);
    }
  }

  static getErrorReport() {
    return Array.from(this.errorMap.values())
      .sort((a, b) => b.frequency - a.frequency);
  }
} 