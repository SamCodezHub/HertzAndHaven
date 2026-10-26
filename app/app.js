const $ = (id) => document.getElementById(id);
const ACCOUNT_KEY = 'sentinel.account.v2';
let account = null, devices = [], activeDevice = null, refreshTimer = null, pendingSession = null;

function saveAccount(value) { account = value; localStorage.setItem(ACCOUNT_KEY, JSON.stringify(value)); }
function setEndpoint(value) { return value.trim().replace(/\/+$/, ''); }
function showAuth(message = '') {
  $('auth-panel').classList.remove('hidden'); $('dashboard').classList.add('hidden'); $('logout-button').classList.add('hidden');
  $('welcome-title').textContent = 'Your sensors, together.';
  $('welcome-subtitle').textContent = 'Create an account to sync your devices from anywhere.';
  $('login-endpoint').value = account?.endpoint || '';
  $('register-endpoint').value = account?.endpoint || '';
  $('login-id').value = account?.accountId || '';
  $('footer-state').textContent = message || 'Sign in to get started';
  if (refreshTimer) clearInterval(refreshTimer); refreshTimer = null;
}
function sessionExpired() {
  const previous = account;
  localStorage.removeItem(ACCOUNT_KEY);
  account = null;
  showAuth('Your session expired. Sign in again.');
  $('login-endpoint').value = previous?.endpoint || '';
  $('register-endpoint').value = previous?.endpoint || '';
  $('login-id').value = previous?.accountId || '';
}
function showDashboard() {
  $('auth-panel').classList.add('hidden'); $('dashboard').classList.remove('hidden'); $('logout-button').classList.remove('hidden');
  $('welcome-title').textContent = 'Welcome, ' + account.name + '.';
  $('welcome-subtitle').textContent = 'Your connected sensors, wherever you are.';
  $('account-id-label').textContent = account.accountId; $('footer-state').textContent = 'Loading your sensors';
  fetchDevices(); if (refreshTimer) clearInterval(refreshTimer); refreshTimer = setInterval(refreshReading, 3000);
}
async function api(path, options = {}) {
  const method = options.method || 'GET', body = options.body, authenticated = options.authenticated !== false;
  const headers = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (authenticated && account && account.sessionToken) headers.Authorization = 'Bearer ' + account.sessionToken;
  const response = await fetch((account ? account.endpoint : options.endpoint) + path, {
    method, headers, body: body === undefined ? undefined : JSON.stringify(body),
    cache: 'no-store', signal: AbortSignal.timeout(9000)
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error || 'Service returned ' + response.status);
  return result;
}
function selectTab(mode) {
  const login = mode === 'login';
  $('login-form').classList.toggle('hidden', !login); $('register-form').classList.toggle('hidden', login);
  $('created-account').classList.add('hidden'); $('show-login').classList.toggle('active', login); $('show-register').classList.toggle('active', !login);
}
$('show-login').addEventListener('click', () => selectTab('login'));
$('show-register').addEventListener('click', () => selectTab('register'));

$('register-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  const endpoint = setEndpoint($('register-endpoint').value); $('register-error').textContent = '';
  if (!/^https:\/\//i.test(endpoint)) { $('register-error').textContent = 'Use a secure https:// service address.'; return; }
  try {
    const result = await api('/api/auth/register', { method: 'POST', authenticated: false, endpoint,
      body: { name: $('register-name').value.trim(), password: $('register-password').value } });
    pendingSession = { endpoint, accountId: result.account_id, sessionToken: result.session_token, name: result.name };
    $('new-account-id').textContent = result.account_id; $('created-account').classList.remove('hidden');
    $('register-form').classList.add('hidden'); $('show-login').classList.remove('active'); $('show-register').classList.add('active');
  } catch (error) { $('register-error').textContent = error.message; }
});
$('login-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  const endpoint = setEndpoint($('login-endpoint').value); $('login-error').textContent = '';
  if (!/^https:\/\//i.test(endpoint)) { $('login-error').textContent = 'Use a secure https:// service address.'; return; }
  try {
    const result = await api('/api/auth/login', { method: 'POST', authenticated: false, endpoint,
      body: { account_id: $('login-id').value.trim(), password: $('login-password').value } });
    saveAccount({ endpoint, accountId: result.account_id, sessionToken: result.session_token, name: result.name }); showDashboard();
  } catch (error) { $('login-error').textContent = error.message; }
});
$('continue-account').addEventListener('click', () => { if (pendingSession) { saveAccount(pendingSession); pendingSession = null; showDashboard(); } });

async function copyText(value, button, original) {
  try { await navigator.clipboard.writeText(value); }
  catch { const area = document.createElement('textarea'); area.value = value; document.body.appendChild(area); area.select(); document.execCommand('copy'); area.remove(); }
  button.textContent = 'Copied'; setTimeout(() => { button.textContent = original; }, 1500);
}
$('copy-account-id').addEventListener('click', () => copyText($('new-account-id').textContent, $('copy-account-id'), 'Copy'));

function setStatus(state, label) {
  $('status-pill').classList.toggle('online', state === 'online'); $('status-pill').classList.toggle('offline', state === 'offline');
  $('status-text').textContent = label; $('sensor-state').textContent = state === 'online' ? 'Online' : state === 'offline' ? 'Offline' : '—';
  $('device-state').textContent = activeDevice ? (state === 'online' ? 'Live' : state === 'offline' ? 'No signal' : '—') : '—';
  $('footer-state').textContent = state === 'online' ? 'Secure account connection active' : state === 'offline' ? 'Waiting for sensor data' : 'Select a sensor to begin';
  document.querySelector('.live-indicator').classList.toggle('online', state === 'online');
}
async function fetchDevices() {
  try {
    const result = await api('/api/devices'); devices = result.devices || [];
    const select = $('device-select'); select.replaceChildren();
    for (const device of devices) { const option = document.createElement('option'); option.value = device.device_id; option.textContent = device.name; select.appendChild(option); }
    if (!devices.length) {
      activeDevice = null; $('device-name').textContent = 'Add your first sensor'; $('device-short').textContent = '—';
      $('velocity-value').textContent = '--'; $('direction').textContent = 'Use “Add sensor” to pair an ESP32.';
      $('updated-at').textContent = 'No data received'; setStatus('offline', 'No sensors'); return;
    }
    activeDevice = devices.find((d) => d.device_id === select.value) || devices[0]; select.value = activeDevice.device_id;
    select.onchange = () => {
      activeDevice = devices.find((d) => d.device_id === select.value) || null;
      if (activeDevice) { $('device-name').textContent = activeDevice.name; $('device-short').textContent = activeDevice.device_id; refreshReading(); }
    };
    $('device-name').textContent = activeDevice.name; $('device-short').textContent = activeDevice.device_id; refreshReading();
  } catch (error) {
    if (error.message === 'Unauthorized') { sessionExpired(); return; }
    $('footer-state').textContent = error.message;
  }
}
async function refreshReading() {
  if (!account || !activeDevice) return;
  try {
    const data = await api('/api/device/' + encodeURIComponent(activeDevice.device_id) + '/latest');
    const velocity = Number(data.velocity_mps); if (!Number.isFinite(velocity)) throw new Error('No valid velocity reading');
    $('velocity-value').textContent = (velocity > 0 ? '+' : '') + velocity.toFixed(2);
    $('velocity-unit').textContent = data.velocity_unit || 'm/s';
    const target = data.target_present !== false;
    $('direction').textContent = !target ? 'No target detected' : (data.direction || (velocity > 0 ? 'Moving toward sensor' : velocity < 0 ? 'Moving away from sensor' : 'No radial movement'));
    $('updated-at').textContent = formatTime(data.timestamp);
    const age = data.timestamp ? Date.now() - new Date(data.timestamp).getTime() : 0;
    setStatus(age > 15000 ? 'offline' : 'online', age > 15000 ? 'Stale data' : 'Connected');
  } catch (error) {
    if (error.message === 'Unauthorized') { sessionExpired(); return; }
    setStatus('offline', 'No signal'); $('direction').textContent = error.message;
  }
}
function formatTime(value) {
  const date = new Date(value); if (Number.isNaN(date.getTime())) return 'No data received';
  return new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit', second: '2-digit' }).format(date);
}
$('add-device').addEventListener('click', () => {
  $('device-error').textContent = ''; $('device-name-input').value = ''; $('pairing-result').classList.add('hidden');
  $('create-device').classList.remove('hidden'); $('device-dialog').showModal();
});
$('device-form').addEventListener('submit', async (event) => {
  if (event.submitter && event.submitter.value === 'cancel') { event.preventDefault(); $('device-dialog').close(); return; }
  event.preventDefault(); $('device-error').textContent = '';
  try {
    const result = await api('/api/devices', { method: 'POST', body: { name: $('device-name-input').value.trim() } });
    activeDevice = { device_id: result.device_id, name: result.name };
    const snippet = '#define SENSOR_ENDPOINT "' + account.endpoint + '"\n#define SENSOR_DEVICE_ID "' + result.device_id + '"\n#define SENSOR_WRITE_TOKEN "' + result.write_token + '"';
    $('pairing-code').textContent = snippet; $('pairing-result').classList.remove('hidden'); $('create-device').classList.add('hidden');
    await fetchDevices(); $('device-select').value = result.device_id;
    activeDevice = devices.find((d) => d.device_id === result.device_id) || activeDevice;
    $('device-name').textContent = result.name; $('device-short').textContent = result.device_id;
  } catch (error) { $('device-error').textContent = error.message; }
});
$('copy-pairing').addEventListener('click', () => copyText($('pairing-code').textContent, $('copy-pairing'), 'Copy pairing details'));
$('device-dialog').querySelector('.close-button').addEventListener('click', (event) => { event.preventDefault(); $('device-dialog').close(); });
$('logout-button').addEventListener('click', async () => {
  const previous = account;
  try { await api('/api/auth/logout', { method: 'POST' }); } catch {}
  localStorage.removeItem(ACCOUNT_KEY); account = null; devices = []; activeDevice = null; showAuth();
  $('login-endpoint').value = previous?.endpoint || '';
  $('register-endpoint').value = previous?.endpoint || '';
  $('login-id').value = previous?.accountId || '';
});
try {
  const saved = JSON.parse(localStorage.getItem(ACCOUNT_KEY) || 'null');
  if (saved && saved.endpoint && saved.accountId && saved.sessionToken) { account = saved; showDashboard(); } else showAuth();
} catch { showAuth(); }
if ('serviceWorker' in navigator && location.protocol.startsWith('http') && location.hostname !== 'appassets.androidplatform.net') navigator.serviceWorker.register('./sw.js').catch(() => {});
if (location.hostname === 'appassets.androidplatform.net') $('apk-download').classList.add('hidden');
