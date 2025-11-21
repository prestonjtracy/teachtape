/**
 * Secure error handling to prevent information disclosure
 */

interface ErrorLogDetails {
  context: string;
  error: {
    name: string;
    message: string;
    stack?: string;
  } | unknown;
  timestamp: string;
}

/**
 * Sanitize error messages for client responses
 * Logs detailed errors internally but returns generic messages to users
 */
export function sanitizeErrorForClient(error: unknown, context: string): {
  message: string;
  logDetails: ErrorLogDetails;
} {
  const logDetails: ErrorLogDetails = {
    context,
    error: error instanceof Error ? {
      name: error.name,
      message: error.message,
      stack: error.stack
    } : error,
    timestamp: new Date().toISOString()
  };

  // Generic message for users (no internal details)
  const clientMessage = 'An error occurred processing your request';

  return {
    message: clientMessage,
    logDetails
  };
}

interface DBErrorLogDetails {
  context: string;
  code?: string;
  message?: string;
  details?: unknown;
  hint?: string;
  timestamp: string;
}

/**
 * Sanitize database errors to prevent schema disclosure
 */
export function sanitizeDBError(error: unknown, context: string): {
  message: string;
  logDetails: DBErrorLogDetails;
} {
  const dbError = error as { code?: string; message?: string; details?: unknown; hint?: string };

  const logDetails: DBErrorLogDetails = {
    context,
    code: dbError?.code,
    message: dbError?.message,
    details: dbError?.details,
    hint: dbError?.hint,
    timestamp: new Date().toISOString()
  };

  // Map specific database errors to user-friendly messages
  let clientMessage = 'A database error occurred';

  if (dbError?.code === 'PGRST116') {
    clientMessage = 'Resource not found';
  } else if (dbError?.code === '23505') {
    clientMessage = 'This record already exists';
  } else if (dbError?.code === '23503') {
    clientMessage = 'Cannot complete this action due to related data';
  } else if (dbError?.code === '23502') {
    clientMessage = 'Required information is missing';
  }

  return {
    message: clientMessage,
    logDetails
  };
}

/**
 * Log error internally without exposing to client
 */
export function logError(context: string, error: unknown): void {
  console.error(`[${context}]`, {
    error: error instanceof Error ? {
      name: error.name,
      message: error.message,
      stack: error.stack
    } : error,
    timestamp: new Date().toISOString()
  });
}
