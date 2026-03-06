const test = require('node:test');
const assert = require('node:assert/strict');

const { createApp } = require('../src/server');

function parseSessionCookie(setCookieHeader) {
  if (!setCookieHeader) return '';
  const header = Array.isArray(setCookieHeader) ? setCookieHeader[0] : setCookieHeader;
  return String(header).split(';')[0];
}

async function startTestServer() {
  process.env.ADMIN_USERNAME = 'admin';
  process.env.ADMIN_PASSWORD = 'yqyh8888';
  process.env.SESSION_SECRET = 'test-secret';

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
    const cookie = parseSessionCookie(response.headers.get('set-cookie'));
    assert.match(cookie, /^student_management\.sid=/);
  } finally {
    await srv.close();
  }
});

test('登录失败返回 401', async () => {
  const srv = await startTestServer();

  try {
    const response = await fetch(`${srv.baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin', password: 'wrong-password' })
    });

    assert.equal(response.status, 401);
  } finally {
    await srv.close();
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
