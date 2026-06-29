const fs = require('fs');
const path = require('path');
const util = require('util');

const LOG_DIR = process.env.LOG_DIR || path.join(__dirname, '../../logs');
const MAX_LOG_SIZE = 5 * 1024 * 1024;
const COLOR_ENABLED = process.stdout.isTTY && process.env.NO_COLOR !== '1';

const colors = {
  reset: '\x1b[0m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  grey: '\x1b[90m',
  boldRed: '\x1b[1;31m',
};

const levels = { ERROR: 0, WARN: 1, INFO: 2, DEBUG: 3 };
const currentLevel = levels[process.env.LOG_LEVEL] !== undefined
  ? levels[process.env.LOG_LEVEL]
  : levels.DEBUG;

const levelColors = {
  ERROR: colors.boldRed,
  WARN: colors.yellow,
  INFO: colors.cyan,
  DEBUG: colors.grey,
};

let logStream = null;

function ensureLogDir() {
  if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
  }
}

function rotateLog(filePath) {
  try {
    const stat = fs.statSync(filePath);
    if (stat.size > MAX_LOG_SIZE) {
      const { name, ext } = path.parse(filePath);
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      fs.renameSync(filePath, path.join(path.dirname(filePath), `${name}.${timestamp}${ext}`));
    }
  } catch {
    // first write
  }
}

function getStream() {
  if (logStream) return logStream;
  ensureLogDir();
  const filePath = path.join(LOG_DIR, 'app.log');
  rotateLog(filePath);
  logStream = fs.createWriteStream(filePath, { flags: 'a' });
  process.on('exit', () => { if (logStream) logStream.end(); });
  return logStream;
}

function sanitizeHeaders(headers) {
  const sanitized = { ...headers };
  const secrets = ['authorization', 'cookie', 'set-cookie', 'x-api-key', 'token', 'secret'];
  for (const key of secrets) {
    if (sanitized[key]) sanitized[key] = '[REDACTED]';
  }
  return sanitized;
}

function getCaller() {
  const stack = new Error().stack.split('\n');
  for (let i = 3; i < stack.length; i++) {
    const line = stack[i].trim();
    if (!line.includes('node:') && !line.includes('node_modules')) {
      const match = line.match(/\((.+?):(\d+):\d+\)/) || line.match(/at\s+(.+?):(\d+):\d+/);
      if (match) {
        const rel = path.relative(path.join(__dirname, '../..'), match[1]);
        return `${rel}:${match[2]}`;
      }
    }
  }
  return 'unknown';
}

function timestamp() {
  return new Date().toISOString();
}

function formatValue(v) {
  if (v === null || v === undefined) return String(v);
  if (typeof v === 'string' && v.length > 2000) return `"${v.slice(0, 2000)}... (${v.length} chars)"`;
  if (typeof v === 'object') {
    const str = util.inspect(v, { depth: 3, colors: false, maxStringLength: 500 });
    return str.length > 2000 ? str.slice(0, 2000) + '...' : str;
  }
  return String(v);
}

function log(level, message, meta) {
  if (levels[level] === undefined || levels[level] > currentLevel) return;
  const caller = getCaller();
  const ts = timestamp();
  const metaStr = meta ? ' ' + formatValue(meta) : '';
  const text = `[${ts}] [${level.padEnd(5)}] [${caller}] ${message}${metaStr}`;
  const plain = text + '\n';

  if (COLOR_ENABLED) {
    const color = levelColors[level] || colors.reset;
    const colored = `${colors.dim}${ts}${colors.reset} ${color}[${level.padEnd(5)}]${colors.reset} ${colors.grey}[${caller}]${colors.reset} ${message}${colors.dim}${metaStr}${colors.reset}\n`;
    process.stdout.write(colored);
  } else {
    process.stdout.write(plain);
  }

  getStream().write(plain);
}

function requestLogger(req, res, next) {
  const start = Date.now();
  const reqId = Math.random().toString(36).slice(2, 10);

  req._reqId = reqId;
  req._startTime = start;

  const body = req.body && Object.keys(req.body).length ? req.body : undefined;
  const sanitizedBody = body ? sanitizeHeaders(body) : undefined;

  log('INFO', `--> ${req.method} ${req.originalUrl}`, {
    reqId,
    query: Object.keys(req.query).length ? req.query : undefined,
    body: sanitizedBody,
  });

  const originalJson = res.json.bind(res);
  res.json = function (body) {
    const duration = Date.now() - start;
    const size = parseInt(res.get('content-length') || Buffer.byteLength(JSON.stringify(body), 'utf8'), 10);
    log('INFO', `<-- ${req.method} ${req.originalUrl} ${res.statusCode} ${duration}ms ${size}b`, {
      reqId,
      body: res.statusCode >= 400 ? body : undefined,
    });
    return originalJson(body);
  };

  res.on('close', () => {
    if (!res.headersSent) {
      const duration = Date.now() - start;
      log('WARN', `<-- ${req.method} ${req.originalUrl} ${res.statusCode} ${duration}ms (closed before response)`, { reqId });
    }
  });

  next();
}

function errorLogger(err, req, _res, next) {
  const caller = getCaller();
  log('ERROR', `${err.name}: ${err.message}`, {
    reqId: req._reqId,
    url: req.originalUrl,
    method: req.method,
    body: sanitizeHeaders(req.body),
    statusCode: err.statusCode || 500,
    stack: err.stack ? err.stack.split('\n').slice(0, 6).join(' ') : undefined,
  });
  next(err);
}

module.exports = {
  log,
  info: (msg, meta) => log('INFO', msg, meta),
  warn: (msg, meta) => log('WARN', msg, meta),
  error: (msg, meta) => log('ERROR', msg, meta),
  debug: (msg, meta) => log('DEBUG', msg, meta),
  requestLogger,
  errorLogger,
  levels,
};
