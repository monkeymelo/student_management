const test = require('node:test');
const assert = require('node:assert/strict');
const { execFileSync } = require('child_process');

const { createApp } = require('../src/server');

function makeBcryptHash(password) {
  return execFileSync('python3', [
    '-c',
    'import crypt,sys;print(crypt.crypt(sys.argv[1], crypt.mksalt(crypt.METHOD_BLOWFISH)))',
    password
  ], { encoding: 'utf8' }).trim();
}

function parseSessionCookie(setCookieHeader) {
  if (!setCookieHeader) return '';
  const header = Array.isArray(setCookieHeader) ? setCookieHeader[0] : setCookieHeader;
  return String(header).split(';')[0];
}

async function startTestServer(options = {}) {
  process.env.ADMIN_USERNAME = 'admin';
  process.env.ADMIN_PASSWORD_HASH = makeBcryptHash('yqyh8888');
  process.env.SESSION_SECRET = 'test-secret';
  process.env.NODE_ENV = options.nodeEnv || 'test';

  const app = createApp();
  const server = await new Promise((resolve) => {
    const next = app.listen(0, () => resolve(next));
  });

  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}`;

  return {
    baseUrl,
    close: () => new Promise((resolve) => server.close(resolve))
  };
}

test('登录成功后返回会话 Cookie', async () => {
  const srv = await startTestServer();

  try {
    const response = await fetch(`${srv.baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin', password: 'yqyh8888' })
    });

    assert.equal(response.status, 200);
    const setCookie = response.headers.get('set-cookie');
    const cookie = parseSessionCookie(setCookie);
    assert.match(cookie, /^student_management\.sid=/);
    assert.match(setCookie, /HttpOnly/);
    assert.match(setCookie, /SameSite=Lax/);
  } finally {
    await srv.close();
  }
});

test('生产环境登录 Cookie 启用 Secure', async () => {
  const srv = await startTestServer({ nodeEnv: 'production' });

  try {
    const response = await fetch(`${srv.baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin', password: 'yqyh8888' })
    });

    assert.equal(response.status, 200);
    assert.match(response.headers.get('set-cookie'), /Secure/);
  } finally {
    await srv.close();
  }
});

test('登录失败返回 401 且错误信息通用', async () => {
  const srv = await startTestServer();

  try {
    const response = await fetch(`${srv.baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin', password: 'wrong-password' })
    });

    assert.equal(response.status, 401);
    const body = await response.json();
    assert.equal(body.message, '账号或密码错误');
  } finally {
    await srv.close();
  }
});

test('达到失败阈值后短时锁定', async () => {
  const app = createApp({
    adminUsername: 'admin',
    adminPasswordHash: makeBcryptHash('correct-password'),
    sessionSecret: 'test-secret',
    maxLoginAttempts: 2,
    lockoutMs: 300,
    isProduction: false
  });

  const server = await new Promise((resolve) => {
    const next = app.listen(0, () => resolve(next));
  });

  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}`;

  try {
    for (let i = 0; i < 2; i += 1) {
      const response = await fetch(`${baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'admin', password: 'wrong-password' })
      });
      assert.equal(response.status, 401);
    }

    const lockedResponse = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin', password: 'correct-password' })
    });
    assert.equal(lockedResponse.status, 401);

    await new Promise((resolve) => setTimeout(resolve, 320));

    const successResponse = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin', password: 'correct-password' })
    });
    assert.equal(successResponse.status, 200);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test('未登录访问受保护接口返回 401', async () => {
  const srv = await startTestServer();

  try {
    const response = await fetch(`${srv.baseUrl}/api/students`);
    assert.equal(response.status, 401);
  } finally {
    await srv.close();
  }
});

test('登录后可访问受保护接口', async () => {
  const srv = await startTestServer();

  try {
    const loginResponse = await fetch(`${srv.baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin', password: 'yqyh8888' })
    });
    const cookie = parseSessionCookie(loginResponse.headers.get('set-cookie'));

    const response = await fetch(`${srv.baseUrl}/api/students`, {
      headers: { Cookie: cookie }
    });

    assert.equal(response.status, 200);
  } finally {
    await srv.close();
  }
});

test('登出后会话失效', async () => {
  const srv = await startTestServer();

  try {
    const loginResponse = await fetch(`${srv.baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin', password: 'yqyh8888' })
    });
    const cookie = parseSessionCookie(loginResponse.headers.get('set-cookie'));

    const logoutResponse = await fetch(`${srv.baseUrl}/api/auth/logout`, {
      method: 'POST',
      headers: { Cookie: cookie }
    });
    assert.equal(logoutResponse.status, 200);

    const protectedResponse = await fetch(`${srv.baseUrl}/api/students`, {
      headers: { Cookie: cookie }
    });
    assert.equal(protectedResponse.status, 401);
  } finally {
    await srv.close();
  }
});


test('支持从 .env 文件加载鉴权配置', async () => {
  const fs = require('fs');
  const os = require('os');
  const path = require('path');

  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'auth-env-'));
  const envPath = path.join(tempDir, '.env');
  const password = 'from-env-file';
  const hash = makeBcryptHash(password);

  fs.writeFileSync(envPath, [
    'ADMIN_USERNAME=admin',
    `ADMIN_PASSWORD_HASH=${hash}`,
    'SESSION_SECRET=env-secret'
  ].join('\n'));

  delete process.env.ADMIN_USERNAME;
  delete process.env.ADMIN_PASSWORD_HASH;
  delete process.env.SESSION_SECRET;
  process.env.AUTH_ENV_FILE = envPath;

  const app = createApp();
  const server = await new Promise((resolve) => {
    const next = app.listen(0, () => resolve(next));
  });

  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}`;

  try {
    const response = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin', password })
    });

    assert.equal(response.status, 200);
  } finally {
    delete process.env.AUTH_ENV_FILE;
    await new Promise((resolve) => server.close(resolve));
  }
});

test('缺失关键配置时启动报错', () => {
  delete process.env.ADMIN_USERNAME;
  delete process.env.ADMIN_PASSWORD_HASH;
  delete process.env.SESSION_SECRET;

  assert.throws(
    () => createApp(),
    /Missing required environment variable: ADMIN_USERNAME\. Please set it in shell env or backend\/\.env\./
  );
});
