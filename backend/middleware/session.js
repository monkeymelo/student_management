const crypto = require('crypto');

const sessionStore = new Map();
const SESSION_COOKIE_NAME = 'student_management.sid';
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

function parseCookies(cookieHeader = '') {
  return cookieHeader
    .split(';')
    .map((item) => item.trim())
    .filter(Boolean)
    .reduce((acc, pair) => {
      const [key, ...rest] = pair.split('=');
      acc[key] = decodeURIComponent(rest.join('='));
      return acc;
    }, {});
}

function serializeCookie(name, value, {
  maxAge = ONE_DAY_MS,
  httpOnly = true,
  path = '/',
  sameSite = 'Lax',
  secure = false
} = {}) {
  const parts = [
    `${name}=${encodeURIComponent(value)}`,
    `Path=${path}`,
    `Max-Age=${Math.floor(maxAge / 1000)}`,
    `SameSite=${sameSite}`
  ];
  if (httpOnly) parts.push('HttpOnly');
  if (secure) parts.push('Secure');
  return parts.join('; ');
}

function signSessionId(sessionId, secret) {
  return crypto
    .createHmac('sha256', secret)
    .update(sessionId)
    .digest('hex');
}

function toCookieSessionValue(sessionId, secret) {
  return `${sessionId}.${signSessionId(sessionId, secret)}`;
}

function fromCookieSessionValue(value, secret) {
  if (typeof value !== 'string' || !value.includes('.')) {
    return null;
  }

  const [sessionId, signature] = value.split('.');
  if (!sessionId || !signature) {
    return null;
  }

  const expected = signSessionId(sessionId, secret);
  if (signature !== expected) {
    return null;
  }

  return sessionId;
}

function createSessionMiddleware({ sessionSecret, isProduction }) {
  const cookieOptions = {
    httpOnly: true,
    sameSite: 'Lax',
    secure: Boolean(isProduction),
    path: '/'
  };

  return (req, res, next) => {
    const cookies = parseCookies(req.headers.cookie);
    const rawSession = cookies[SESSION_COOKIE_NAME];
    const sessionIdFromCookie = fromCookieSessionValue(rawSession, sessionSecret);
    const current = sessionIdFromCookie && sessionStore.get(sessionIdFromCookie);

    req.sessionID = current ? sessionIdFromCookie : null;
    req.session = current ? { ...current } : {};

    req.session.destroy = (callback) => {
      if (req.sessionID) {
        sessionStore.delete(req.sessionID);
      }
      req.sessionID = null;
      req.session = {};
      res.setHeader('Set-Cookie', serializeCookie(SESSION_COOKIE_NAME, '', { ...cookieOptions, maxAge: 0 }));
      if (callback) callback(null);
    };

    const originalJson = res.json.bind(res);
    res.json = (body) => {
      const hasData = Object.keys(req.session || {}).some((key) => key !== 'destroy');
      if (hasData) {
        const nextSid = req.sessionID || crypto.randomBytes(24).toString('hex');
        const sessionData = { ...req.session };
        delete sessionData.destroy;
        sessionStore.set(nextSid, sessionData);
        req.sessionID = nextSid;
        res.setHeader('Set-Cookie', serializeCookie(SESSION_COOKIE_NAME, toCookieSessionValue(nextSid, sessionSecret), cookieOptions));
      }
      return originalJson(body);
    };

    next();
  };
}

module.exports = {
  createSessionMiddleware,
  SESSION_COOKIE_NAME
};
