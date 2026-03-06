const express = require('express');
const { verifyBcryptPassword } = require('../src/security/password');

function createAuthRouter({ adminUsername, adminPasswordHash, maxLoginAttempts, lockoutMs }) {
  const router = express.Router();
  const failedAttempts = new Map();

  function trackerKey(req, username) {
    return `${req.ip || 'unknown'}:${username || 'unknown'}`;
  }

  function getTracker(req, username) {
    const key = trackerKey(req, username);
    const now = Date.now();
    const current = failedAttempts.get(key);

    if (!current) {
      const created = { count: 0, lockUntil: 0 };
      failedAttempts.set(key, created);
      return { key, value: created };
    }

    if (current.lockUntil && now >= current.lockUntil) {
      current.count = 0;
      current.lockUntil = 0;
    }

    return { key, value: current };
  }

  function isLocked(tracker) {
    return tracker.value.lockUntil > Date.now();
  }

  function failUnauthorized(res) {
    return res.status(401).json({
      code: 'INVALID_CREDENTIALS',
      message: '账号或密码错误'
    });
  }

  router.post('/login', (req, res) => {
    const { username, password } = req.body || {};
    const tracker = getTracker(req, username);

    if (isLocked(tracker)) {
      return failUnauthorized(res);
    }

    const normalizedPassword = typeof password === 'string' ? password : '';
    const isUsernameValid = username === adminUsername;
    const isPasswordValid = verifyBcryptPassword(normalizedPassword, adminPasswordHash);

    if (!isUsernameValid || !isPasswordValid) {
      tracker.value.count += 1;
      if (tracker.value.count >= maxLoginAttempts) {
        tracker.value.lockUntil = Date.now() + lockoutMs;
      }
      return failUnauthorized(res);
    }

    failedAttempts.delete(tracker.key);

    req.session.isAuthenticated = true;
    req.session.username = adminUsername;

    return res.json({
      code: 'OK',
      data: { username: adminUsername }
    });
  });

  router.post('/logout', (req, res) => {
    req.session.destroy((error) => {
      if (error) {
        return res.status(500).json({
          code: 'INTERNAL_ERROR',
          message: '退出登录失败'
        });
      }

      return res.json({
        code: 'OK',
        message: '已退出登录'
      });
    });
  });

  router.get('/me', (req, res) => {
    if (!req.session?.isAuthenticated) {
      return res.json({
        code: 'OK',
        data: {
          authenticated: false
        }
      });
    }

    return res.json({
      code: 'OK',
      data: {
        authenticated: true,
        username: req.session.username
      }
    });
  });

  return router;
}

module.exports = {
  createAuthRouter
};
