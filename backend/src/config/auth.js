const DEFAULT_MAX_LOGIN_ATTEMPTS = 5;
const DEFAULT_LOCKOUT_MS = 5 * 60 * 1000;

function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
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
