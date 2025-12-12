import fs from 'fs';
import path from 'path';

const LOG_DIR = './logs';

// Ensure logs directory exists
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

// Create a logger function matching moneyman pattern
export function createLogger(moduleName) {
  return function log(...args) {
    const timestamp = new Date().toISOString();
    const prefix = `[${moduleName.toUpperCase()}] ${timestamp}`;
    console.log(`${prefix}`, ...args);
  };
}

// Log to metadata file for persistence (matching moneyman pattern)
export function logToMetadataFile(message, metadata = {}) {
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    message,
    ...metadata
  };
  
  const metadataPath = path.join(LOG_DIR, 'metadata.jsonl');
  fs.appendFileSync(metadataPath, JSON.stringify(logEntry) + '\n');
}

// Batch log HTTP requests (for domain tracking)
export function logHTTPRequest(url, method = 'GET', status = null, duration = null) {
  const logEntry = {
    timestamp: new Date().toISOString(),
    type: 'HTTP_REQUEST',
    url,
    method,
    status,
    duration_ms: duration
  };
  
  const metadataPath = path.join(LOG_DIR, 'http-requests.jsonl');
  fs.appendFileSync(metadataPath, JSON.stringify(logEntry) + '\n');
}

export default createLogger;
