import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

const LOG_DIR = './logs';

// Ensure logs directory exists
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

/**
 * Create a logger instance for a specific module
 */
export function createLogger(moduleName) {
  const logger = {
    // Log informational messages
    info: async (title, details = {}) => {
      const timestamp = new Date().toISOString();
      const prefix = `[${moduleName.toUpperCase()}] ${timestamp}`;
      console.log(`${prefix} ℹ️ ${title}`, details);
      
      // Also save to Supabase if available
      try {
        const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
        await supabase.from('logs').insert([{
          sender: moduleName,
          level: 'INFO',
          title: title,
          message: JSON.stringify(details),
          details: details
        }]);
      } catch (err) {
        // Silent fail for Supabase logging
      }
    },
    
    // Log warning messages
    warn: async (title, details = {}) => {
      const timestamp = new Date().toISOString();
      const prefix = `[${moduleName.toUpperCase()}] ${timestamp}`;
      console.warn(`${prefix} ⚠️ ${title}`, details);
      
      try {
        const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
        await supabase.from('logs').insert([{
          sender: moduleName,
          level: 'WARNING',
          title: title,
          message: JSON.stringify(details),
          details: details
        }]);
      } catch (err) {
        // Silent fail for Supabase logging
      }
    },
    
    // Log error messages
    error: async (title, details = {}) => {
      const timestamp = new Date().toISOString();
      const prefix = `[${moduleName.toUpperCase()}] ${timestamp}`;
      console.error(`${prefix} ❌ ${title}`, details);
      
      try {
        const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
        await supabase.from('logs').insert([{
          sender: moduleName,
          level: 'ERROR',
          title: title,
          message: JSON.stringify(details),
          details: details
        }]);
      } catch (err) {
        // Silent fail for Supabase logging
      }
    },
    
    // Log debug messages
    debug: (message, details = {}) => {
      if (process.env.DEBUG) {
        const timestamp = new Date().toISOString();
        const prefix = `[${moduleName.toUpperCase()}] ${timestamp}`;
        console.log(`${prefix} 🔍 ${message}`, details);
      }
    }
  };
  
  return logger;
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

