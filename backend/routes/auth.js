const express = require('express');

const router = express.Router();

function getAuthConfig() {
  return {
    adminUsername: process.env.ADMIN_USERNAME || 'admin',
    adminPassword: process.env.ADMIN_PASSWORD || 'yqyh8888'
  };
}

router.post('/login', (req, res) => {
  const { username, password } = req.body || {};
  const { adminUsername, adminPassword } = getAuthConfig();

  if (username !== adminUsername || password !== adminPassword) {
    return res.status(401).json({
      code: 'INVALID_CREDENTIALS',
      message: '账号或密码错误'
    });
  }

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

    res.clearCookie('student_management.sid');
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

module.exports = router;
