type LogLevel = 'debug' | 'info' | 'warn' | 'error';

type LogEntry = {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: string;
  [key: string]: unknown;
};

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const minLevel = LOG_LEVELS[(process.env.LOG_LEVEL as LogLevel) || 'info'] ?? LOG_LEVELS.info;

function formatEntry(entry: LogEntry): string {
  if (process.env.NODE_ENV === 'production') {
    return JSON.stringify(entry);
  }
  // Dev: human-readable
  const ctx = entry.context ? `[${entry.context}]` : '';
  const extra = Object.entries(entry)
    .filter(([k]) => !['timestamp', 'level', 'message', 'context'].includes(k))
    .map(([k, v]) => `${k}=${typeof v === 'object' ? JSON.stringify(v) : v}`)
    .join(' ');
  return `${entry.timestamp} ${entry.level.toUpperCase().padEnd(5)} ${ctx} ${entry.message} ${extra}`.trim();
}

function log(level: LogLevel, message: string, context?: string, extra?: Record<string, unknown>) {
  if (LOG_LEVELS[level] < minLevel) return;

  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...(context && { context }),
    ...extra,
  };

  const formatted = formatEntry(entry);
  if (level === 'error') {
    console.error(formatted);
  } else if (level === 'warn') {
    console.warn(formatted);
  } else {
    console.log(formatted);
  }
}

export const logger = {
  debug: (message: string, context?: string, extra?: Record<string, unknown>) => log('debug', message, context, extra),
  info: (message: string, context?: string, extra?: Record<string, unknown>) => log('info', message, context, extra),
  warn: (message: string, context?: string, extra?: Record<string, unknown>) => log('warn', message, context, extra),
  error: (message: string, context?: string, extra?: Record<string, unknown>) => log('error', message, context, extra),
};
