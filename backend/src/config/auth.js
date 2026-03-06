const fs = require('fs');
const path = require('path');

const DEFAULT_MAX_LOGIN_ATTEMPTS = 5;
const DEFAULT_LOCKOUT_MS = 5 * 60 * 1000;

function parseEnvLine(line) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) {
    return null;
  }

  const index = trimmed.indexOf('=');
  if (index <= 0) {
    return null;
  }

  const key = trimmed.slice(0, index).trim();
  let value = trimmed.slice(index + 1).trim();

  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
    value = value.slice(1, -1);
  }

  return { key, value };
}

function loadEnvFromFile() {
  const envPath = process.env.AUTH_ENV_FILE || path.resolve(process.cwd(), '.env');
  if (!fs.existsSync(envPath)) {
    return;
  }

  const content = fs.readFileSync(envPath, 'utf8');
  for (const line of content.split('\n')) {
    const parsed = parseEnvLine(line);
    if (!parsed) {
      continue;
    }

    if (process.env[parsed.key] == null || process.env[parsed.key] === '') {
      process.env[parsed.key] = parsed.value;
    }
  }
}

function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Missing required environment variable: ${name}. Please set it in shell env or backend/.env.`
    );
  }
  return value;
}

function parsePositiveInt(value, defaultValue) {
  if (value == null || value === '') {
    return defaultValue;
  }

  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`Invalid positive integer value: ${value}`);
  }

  return parsed;
}

function loadAuthConfig() {
  loadEnvFromFile();

  return {
    adminUsername: requireEnv('ADMIN_USERNAME'),
    adminPasswordHash: requireEnv('ADMIN_PASSWORD_HASH'),
    sessionSecret: requireEnv('SESSION_SECRET'),
    maxLoginAttempts: parsePositiveInt(process.env.MAX_LOGIN_ATTEMPTS, DEFAULT_MAX_LOGIN_ATTEMPTS),
    lockoutMs: parsePositiveInt(process.env.LOGIN_LOCKOUT_MS, DEFAULT_LOCKOUT_MS),
    isProduction: process.env.NODE_ENV === 'production'
  };
}

module.exports = {
  loadAuthConfig
};