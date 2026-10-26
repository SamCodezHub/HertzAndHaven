const ACCOUNT_ID = /^SNT-[A-F0-9]{16}$/;
const DEVICE_ID = /^DEV-[A-F0-9]{16}$/;
const SESSION_TTL = 60 * 60 * 24 * 30;
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Authorization, Content-Type',
  'Access-Control-Max-Age': '86400',
};

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}

function randomHex(bytes) {
  const value = crypto.getRandomValues(new Uint8Array(bytes));
  return Array.from(value, (n) => n.toString(16).padStart(2, '0')).join('').toUpperCase();
}

function randomToken(bytes = 32) {
  const value = crypto.getRandomValues(new Uint8Array(bytes));
  let binary = '';
  for (const n of value) binary += String.fromCharCode(n);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

async function sha256(value) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (n) => n.toString(16).padStart(2, '0')).join('');
}

async function hashPassword(password, salt) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt: Uint8Array.from(salt.match(/.{2}/g), (v) => parseInt(v, 16)), iterations: 100000, hash: 'SHA-256' }, key, 256);
  return Array.from(new Uint8Array(bits), (n) => n.toString(16).padStart(2, '0')).join('');
}

async function createSession(env, accountId) {
  const token = randomToken();
  await env.TELEMETRY.put(`session:${await sha256(token)}`, accountId, { expirationTtl: SESSION_TTL });
  return token;
}

async function getAccountId(request, env) {
  const token = (request.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '');
  if (!token || token.length > 256) return null;
  return env.TELEMETRY.get(`session:${await sha256(token)}`);
}

async function createAccount(request, env) {
  let body;
  try { body = await request.json(); } catch { return json({ error: 'Invalid JSON' }, 400); }
  const name = typeof body?.name === 'string' ? body.name.trim().slice(0, 48) : '';
  const password = typeof body?.password === 'string' ? body.password : '';
  if (!name || password.length < 8 || password.length > 128) return json({ error: 'Enter a name and a password of at least 8 characters.' }, 400);
  const accountId = `SNT-${randomHex(8)}`;
  const salt = randomHex(16).toLowerCase();
  const passwordHash = await hashPassword(password, salt);
  await env.TELEMETRY.put(`account:${accountId}`, JSON.stringify({ name, salt, password_hash: passwordHash, created_at: new Date().toISOString() }));
  const sessionToken = await createSession(env, accountId);
  return json({ account_id: accountId, name, session_token: sessionToken }, 201);
}

async function login(request, env) {
  let body;
  try { body = await request.json(); } catch { return json({ error: 'Invalid JSON' }, 400); }
  const accountId = typeof body?.account_id === 'string' ? body.account_id.toUpperCase() : '';
  const password = typeof body?.password === 'string' ? body.password : '';
  if (!ACCOUNT_ID.test(accountId) || !password || password.length > 128) return json({ error: 'Account ID or password is incorrect.' }, 401);
  const account = await env.TELEMETRY.get(`account:${accountId}`, 'json');
  if (!account) return json({ error: 'Account ID or password is incorrect.' }, 401);
  const candidate = await hashPassword(password, account.salt);
  if (candidate !== account.password_hash) return json({ error: 'Account ID or password is incorrect.' }, 401);
  const sessionToken = await createSession(env, accountId);
  return json({ account_id: accountId, name: account.name, session_token: sessionToken });
}

async function addDevice(request, env, accountId) {
  let body;
  try { body = await request.json(); } catch { return json({ error: 'Invalid JSON' }, 400); }
  const name = typeof body?.name === 'string' ? body.name.trim().slice(0, 48) : '';
  if (!name) return json({ error: 'Enter a name for this sensor.' }, 400);
  const listKey = `account_devices:${accountId}`;
  const deviceIds = (await env.TELEMETRY.get(listKey, 'json')) || [];
  if (deviceIds.length >= 32) return json({ error: 'This account already has the maximum of 32 devices.' }, 400);
  const deviceId = `DEV-${randomHex(8)}`;
  const writeToken = randomToken(32);
  const device = { device_id: deviceId, account_id: accountId, name, write_token_hash: await sha256(writeToken), created_at: new Date().toISOString() };
  await env.TELEMETRY.put(`device:${deviceId}`, JSON.stringify(device));
  await env.TELEMETRY.put(listKey, JSON.stringify([...deviceIds, deviceId]));
  return json({ device_id: deviceId, name, write_token: writeToken }, 201);
}

async function listDevices(env, accountId) {
  const ids = (await env.TELEMETRY.get(`account_devices:${accountId}`, 'json')) || [];
  const devices = await Promise.all(ids.map(async (id) => {
    const device = await env.TELEMETRY.get(`device:${id}`, 'json');
    return device ? { device_id: device.device_id, name: device.name, created_at: device.created_at } : null;
  }));
  return json({ devices: devices.filter(Boolean) });
}

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders });
    const url = new URL(request.url);
    if (url.pathname === '/api/auth/register' && request.method === 'POST') return createAccount(request, env);
    if (url.pathname === '/api/auth/login' && request.method === 'POST') return login(request, env);
    if (url.pathname === '/api/devices' && request.method === 'GET') {
      const accountId = await getAccountId(request, env);
      return accountId ? listDevices(env, accountId) : json({ error: 'Unauthorized' }, 401);
    }
    if (url.pathname === '/api/devices' && request.method === 'POST') {
      const accountId = await getAccountId(request, env);
      return accountId ? addDevice(request, env, accountId) : json({ error: 'Unauthorized' }, 401);
    }
    if (url.pathname === '/api/auth/logout' && request.method === 'POST') {
      const token = (request.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '');
      if (token) await env.TELEMETRY.delete(`session:${await sha256(token)}`);
      return json({ ok: true });
    }
    const match = url.pathname.match(/^\/api\/device\/([A-Za-z0-9_-]{1,48})\/(telemetry|latest)$/);
    if (!match) return json({ error: 'Not found' }, 404);
    const [, deviceId, action] = match;
    if (action === 'telemetry' && request.method === 'POST' && DEVICE_ID.test(deviceId)) {
      const device = await env.TELEMETRY.get(`device:${deviceId}`, 'json');
      const bearer = (request.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '');
      if (!device || !bearer || bearer.length > 256 || (await sha256(bearer)) !== device.write_token_hash) return json({ error: 'Unauthorized' }, 401);
      let data;
      try { data = await request.json(); } catch { return json({ error: 'Invalid JSON' }, 400); }
      const velocity = Number(data?.velocity_mps);
      if (!Number.isFinite(velocity) || Math.abs(velocity) > 100) return json({ error: 'velocity_mps must be a number from -100 to 100' }, 400);
      const reading = {
        velocity_mps: velocity,
        velocity_unit: 'm/s',
        target_present: data.target_present !== false,
        timestamp: data.timestamp && !Number.isNaN(Date.parse(data.timestamp)) ? new Date(data.timestamp).toISOString() : new Date().toISOString(),
      };
      if (typeof data.direction === 'string' && data.direction.length <= 64) reading.direction = data.direction;
      await env.TELEMETRY.put(`device:${deviceId}:latest`, JSON.stringify(reading), { expirationTtl: 60 * 60 * 24 * 30 });
      return json({ ok: true, device_id: deviceId, timestamp: reading.timestamp }, 201);
    }
    if (action === 'latest' && request.method === 'GET' && DEVICE_ID.test(deviceId)) {
      const accountId = await getAccountId(request, env);
      if (!accountId) return json({ error: 'Unauthorized' }, 401);
      const device = await env.TELEMETRY.get(`device:${deviceId}`, 'json');
      if (!device || device.account_id !== accountId) return json({ error: 'Device not found for this account' }, 404);
      const reading = await env.TELEMETRY.get(`device:${deviceId}:latest`);
      if (!reading) return json({ error: 'No reading received for this device yet' }, 404);
      return new Response(reading, { headers: { ...corsHeaders, 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' } });
    }
    return json({ error: 'Not found' }, 404);
  },
};
