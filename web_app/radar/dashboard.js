'use strict';
const byId = id => document.getElementById(id);
const text = (id, value) => {
  const element = byId(id);
  if (element.textContent !== String(value)) element.textContent = value;
};
const number = (value, digits = 0) => value == null ? '-' : value.toFixed(digits);
const age = value => value == null ? '-' : value.toFixed(1) + ' s ago';
const windowSeconds = 30;
let gapSeconds = 0.65;
const hosted = location.pathname.startsWith('/radar/') && !['localhost', '127.0.0.1'].includes(location.hostname);
const view = new URLSearchParams(location.search).get('view');
const rehearsal = view === 'rehearsal' || (hosted && view !== 'live');
const checkinSeconds = 10;
const sosAfterSeconds = 2.8 + checkinSeconds;
let apiBase = '', hostedAccess = false;
let clockOffset = (Date.now() - performance.now()) / 1000;
let session = -1, after = 0, logAfter = 0, readings = [], logs = [];
let graphTime = Date.now() / 1000, active = false, busy = false, connectionError = '';
let fallState = null, fallHistoryKey = '', lockboxState = null;
let rehearsalStart, rehearsalTick, rehearsalFallAt = null;
let rehearsalAlert = null, rehearsalHistory = [], rehearsalLockbox;
let rehearsalExpiry = 0;
let rehearsalResponse = null;
let rehearsalRecovery = null, rehearsalFallRange = null;
let rehearsalWalking = [];
const fallLabels = {
  disarmed:'Disarmed', no_telemetry:'Radar frames unavailable', waiting:'Waiting for an in-range target',
  tracking:'Tracking motion', burst:'Checking motion burst', quiet:'Checking for sustained quiet',
  alert:'Possible fall-like motion', cooldown:'Cooldown',
};
const fallNotes = {
  no_telemetry:'Alert detection is paused until valid radar frames resume.',
  waiting:'Walk slowly in the marked zone before starting a trial.',
  tracking:'Watching for a rapid change in radial speed.',
  burst:'Checking whether motion settles after the burst.',
  quiet:'Waiting for the quiet interval to finish.',
  cooldown:'Give the mat area a moment to clear before the next trial.',
};
const radarNotes = {
  offline: "Select the ESP32's COM port to begin.",
  waiting: 'Waiting for the diagnostic sketch to report radar frames.',
  usb_silent: 'COM port is open but USB is quiet. Check the selected port, board reset and USB CDC setting.',
  presence: 'The radar is reporting presence mode. Watch the console for the speed-mode setup commands.',
  invalid: 'Speed frames arrived but failed validation. Inspect the serial console for the raw frames.',
  silent: 'USB is active, but speed frames have stopped or have yet to arrive. Check radar power, ground and crossed TX/RX.',
  out_stale: 'No recent OUT readings. Check the ESP32 USB connection.',
};
async function request(path, options = {}) {
  const response = await fetch(apiBase + path, {cache:'no-store', signal:AbortSignal.timeout(4000), ...options});
  const data = await response.json();
  if (!response.ok) throw Error(data.error || 'Request failed');
  return data;
}
function showMessage(message) {
  text('message', message);
  byId('message').hidden = !message;
}
function buttons() {
  byId('hosted-access').disabled = busy || !fallState;
  byId('connect').disabled = busy || active || !byId('ports').value;
  byId('disconnect').disabled = busy || !active;
  byId('fall-arm').disabled = busy || !(fallState?.armed || fallState?.ready);
  byId('simulate-fall').disabled = busy || active || !!fallState?.active;
  byId('fall-ack').disabled = busy || !fallState?.active;
  const enteredCode = byId('lockbox-code')?.value ?? '';
  byId('lockbox-unlock').disabled = busy || !lockboxState?.locked || !/^(?:\d{4}|\d{6})$/.test(enteredCode);
  byId('lockbox-lock').disabled = busy;
}
async function linkComputer() {
  const button = byId('link-computer');
  button.disabled = true;
  try {
    for (const port of [8765, 8766]) {
      const base = 'http://127.0.0.1:' + port;
      try {
        const result = await fetch(base + '/api/ports', {cache:'no-store', signal:AbortSignal.timeout(4000)});
        if (!result.ok || !Array.isArray((await result.json()).ports)) continue;
      } catch { continue; }
      apiBase = base;
      for (const link of document.querySelectorAll('a[href^="/api/"]')) {
        link.href = base + link.getAttribute('href');
        link.hidden = false;
      }
      button.hidden = true;
      byId('refresh').disabled = false;
      await refresh();
      poll();
      return;
    }
    showMessage('Start the Windows monitor and enable Hosted dashboard access on its local page. Allow local network access if your browser asks.');
  } finally {
    button.disabled = false;
  }
}
async function refresh() {
  try {
    const {ports} = await request('/api/ports');
    const usbPorts = ports.filter(port => !/bluetooth|BTHENUM/i.test(port.description + ' ' + port.hwid));
    const select = byId('ports');
    const previous = select.value;
    select.replaceChildren(new Option(usbPorts.length ? 'Select a USB COM port' : 'No USB serial ports found', ''));
    for (const port of usbPorts) select.add(new Option(port.device + ' � ' + port.description, port.device));
    select.value = usbPorts.some(port => port.device === previous) ? previous : usbPorts.length === 1 ? usbPorts[0].device : '';
    text('port-hint', usbPorts.length
      ? 'Only physical serial ports are shown. Select the ESP32 USB port, then Connect.'
      : 'No USB serial ports detected. Plug the ESP32 in with a USB data cable, then select Refresh.');
    byId('port-hint').hidden = false;
    buttons();
  } catch (error) {
    showMessage(error.message);
  }
}
async function command(action, body = {}) {
  if (rehearsal) return rehearsalCommand(action, body);
  busy = true;
  buttons();
  connectionError = '';
  showMessage('');
  try {
    await request('/api/' + action, {
      method:'POST', headers:{'Content-Type':'application/json', 'X-Hertz-Monitor':'1'},
      body:JSON.stringify(body),
    });
    return true;
  } catch (error) {
    connectionError = error.message;
    showMessage(connectionError);
    return false;
  } finally {
    busy = false;
    buttons();
  }
}
function updateConsole(entries) {
  if (!entries.length) return;
  const consoleView = byId('logs');
  const follow = consoleView.scrollHeight - consoleView.scrollTop - consoleView.clientHeight < 35;
  logs = logs.concat(entries).slice(-400);
  consoleView.textContent = logs.map(log => new Date(log.time * 1000).toLocaleTimeString() + '  ' + log.text).join('\n');
  if (follow) consoleView.scrollTop = consoleView.scrollHeight;
}
function updateCodeProgress() {
  const input = byId('lockbox-code');
  if (!input) return;
  input.value = input.value.replace(/\D/g, '').slice(0, 6);
  const length = input.value.length;
  text('code-progress', length === 4 ? '4 digits' : length + ' / 6');
  buttons();
}
function chartPoints(rows, key) {
  const points = [];
  let recent = [];
  let gap = true;
  for (const row of rows) {
    if (row.source === 'out') continue;
    if (row.track_id == null || row[key] == null) {
      gap = true;
      if (row.target_count === 1 && Number.isFinite(row[key])) {
        points.push({time:row.time, value:row[key], start:true, raw:true});
      }
      continue;
    }
    const previous = points.at(-1);
    const start = gap || previous.track_id !== row.track_id ||
      row.time - previous.time > gapSeconds || row.time < previous.time;
    gap = false;
    if (start) recent = [];
    recent.push(row[key]);
    if (recent.length > 3) recent.shift();
    const value = key === 'distance_m' && recent.length === 3
      ? [...recent].sort((a, b) => a - b)[1] : row[key];
    points.push({time:row.time, track_id:row.track_id, value, start});
  }
  return points;
}
function chartSurface(id) {
  const canvas = byId(id);
  const width = canvas.clientWidth, height = canvas.clientHeight;
  if (!width || !height) return;
  const ratio = window.devicePixelRatio || 1;
  const pixelWidth = Math.round(width * ratio), pixelHeight = Math.round(height * ratio);
  if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
    canvas.width = pixelWidth;
    canvas.height = pixelHeight;
  }
  const ctx = canvas.getContext('2d');
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  ctx.clearRect(0, 0, width, height);
  ctx.font = '11px Segoe UI, sans-serif';
  ctx.textAlign = 'start';
  ctx.lineWidth = 1;
  return {ctx, width, height};
}
function graph(id, key, color, signed) {
  const surface = chartSurface(id);
  if (!surface) return;
  const {ctx, width, height} = surface;
  const points = chartPoints(readings, key);
  const step = signed ? (rehearsal ? 0.5 : 2) : 5;
  const extent = points.reduce((max, row) => Math.max(max, Math.abs(row.value)), step);
  const limit = rehearsal ? (signed ? 2.5 : 3) : Math.ceil(extent / step) * step;
  const floor = signed ? -limit : rehearsal ? 2 : 0;
  const left = 43, right = width - 12, top = 11, bottom = height - 23;
  const x = value => left + (value - graphTime + windowSeconds) / windowSeconds * (right - left);
  const y = value => bottom - (value - floor) / (limit - floor) * (bottom - top);
  ctx.font = '11px Segoe UI, sans-serif';
  ctx.fillStyle = '#526077';
  ctx.strokeStyle = '#dce1e8';
  for (let i = 0; i <= 4; i++) {
    const value = floor + (limit - floor) * i / 4;
    const level = y(value);
    ctx.beginPath(); ctx.moveTo(left, level); ctx.lineTo(right, level); ctx.stroke();
    ctx.fillText(value.toFixed(signed ? 2 : 1), 0, level + 4);
  }
  ctx.fillText('-30 s', left, height - 4);
  ctx.fillText('Now', right - 24, height - 4);
  if (!points.length) {
    ctx.textAlign = 'center';
    ctx.fillText('No measured ' + (signed ? 'speed' : 'distance') + ' in this window', (left + right) / 2, (top + bottom) / 2 - 8);
    ctx.textAlign = 'start';
    return;
  }
  ctx.save();
  ctx.beginPath(); ctx.rect(left, top - 3, right - left, bottom - top + 6); ctx.clip();
  ctx.beginPath();
  for (const point of points) {
    if (point.raw) continue;
    if (point.start) ctx.moveTo(x(point.time), y(point.value));
    else ctx.lineTo(x(point.time), y(point.value));
  }
  ctx.strokeStyle = color; ctx.lineWidth = 1.8; ctx.stroke();
  const latest = points.at(-1);
  ctx.beginPath();
  for (const point of points) {
    if (point.raw) continue;
    if (!point.start && point !== latest) continue;
    const radius = point === latest ? 2.7 : 1.6;
    ctx.moveTo(x(point.time) + radius, y(point.value));
    ctx.arc(x(point.time), y(point.value), radius, 0, 2 * Math.PI);
  }
  ctx.fillStyle = color; ctx.fill();
  ctx.beginPath();
  for (const point of points) {
    if (!point.raw) continue;
    ctx.moveTo(x(point.time) + 2, y(point.value));
    ctx.arc(x(point.time), y(point.value), 2, 0, 2 * Math.PI);
  }
  ctx.lineWidth = 1; ctx.stroke(); ctx.restore();
}
function signalGraph() {
  const surface = chartSurface('signal-chart');
  if (!surface) return;
  const {ctx, width, height} = surface;
  const lanes = ['Target', 'No target', 'OUT only', 'No frames'];
  const colors = ['#146953', '#285c90', '#88601a', '#647181'];
  const left = 65, right = width - 12, start = graphTime - windowSeconds;
  const x = t => left + (right - left) * (t - start) / windowSeconds;
  const y = lane => 12 + lane * (height - 40) / 3;
  lanes.forEach((label, lane) => {
    ctx.fillStyle = colors[lane]; ctx.fillText(label, 0, y(lane) + 4);
    ctx.fillStyle = '#e1e5eb'; ctx.fillRect(left, y(lane), right - left, 1);
  });
  function segment(lane, from, to) {
    if (to <= from) return;
    ctx.fillStyle = colors[lane];
    ctx.fillRect(x(from), y(lane) - 2, Math.max(1, x(to) - x(from)), 4);
  }
  let cursor = start;
  for (let i = 0; i < readings.length; i++) {
    const row = readings[i];
    const from = Math.max(cursor, row.time);
    if (from > graphTime) break;
    const to = Math.min(graphTime, row.time + gapSeconds, readings[i+1]?.time ?? graphTime);
    if (to <= from) continue;
    segment(3, cursor, from);
    segment(row.source === 'out' ? 2 : row.target_count === 1 ? 0 : 1, from, to);
    cursor = to;
  }
  segment(3, cursor, graphTime);
  ctx.fillStyle = '#526077';
  ctx.fillText('-30 s', left, height - 4); ctx.fillText('Now', right - 24, height - 4);
}
function redraw() {
  graphTime = clockOffset + performance.now() / 1000;
  readings = readings.filter(row => row.time >= graphTime - windowSeconds - gapSeconds);
  signalGraph();
  graph('distance-chart', 'distance_m', '#23356b', false);
  graph('speed-chart', 'speed_mps', '#2c7899', true);
}
function renderFall(state) {
  fallState = state;
  if (!state) {
    buttons();
    return;
  }
  const alert = state.active;
  text('fall-config', 'Supervised mat demo � ' + state.min_range_m.toFixed(1) +
    '-' + state.max_range_m.toFixed(1) + ' m radar range');
  text('fall-arm', state.armed ? 'Disarm' : 'Arm demo');
  byId('fall-ack').hidden = !alert;
  byId('fall-panel').dataset.tone = alert ? 'alert' : 'idle';
  text('fall-status', state.statusLabel ?? fallLabels[state.phase]);
  text('fall-detail', alert
    ? (alert.simulated ? 'Simulated fall complete. Emergency OTP generated. Try unlocking the box, then acknowledge the alert.'
      : 'Peak ' + alert.peak_mps.toFixed(2) + ' m/s at ' + alert.range_m.toFixed(2) + ' m. Check the participant and acknowledge when ready.')
    : state.phase === 'disarmed'
      ? (state.ready ? 'Arm for a supervised mat trial.' : 'Connect the radar in UART measurement mode to arm.')
      : fallNotes[state.phase]);
  text('fall-history-count', 'Alert history (' + state.history.length + ')');
  const key = JSON.stringify(state.history);
  if (key !== fallHistoryKey) {
    fallHistoryKey = key;
    byId('fall-events').replaceChildren(...state.history.map(event => {
      const item = document.createElement('li');
      item.textContent = new Date(event.time * 1000).toLocaleTimeString() +
        ' � ' + event.range_m.toFixed(2) + ' m � ' + event.peak_mps.toFixed(2) + ' m/s peak';
      return item;
    }));
  }
  buttons();
}
function renderLockbox(state) {
  const previous = lockboxState;
  lockboxState = state;
  if (!state) {
    buttons();
    return;
  }
  const panel = byId('lockbox-panel');
  panel.dataset.state = state.locked ? 'locked' : 'unlocked';
  panel.dataset.notification = state.code ? 'active' : 'idle';
  const machine = byId('lockbox-machine');
  const machineStatus = state.locked ? (state.code ? 'Emergency code ready' : 'Secured') : 'Door open';
  text('lockbox-visual-status', machineStatus);
  machine.setAttribute('aria-label', 'Simulated lockbox is ' + (state.locked ? 'locked' : 'unlocked'));
  if (previous && previous.locked !== state.locked) {
    panel.classList.remove('state-changed');
    void panel.offsetWidth;
    panel.classList.add('state-changed');
  }
  const badge = byId('lockbox-state');
  text('lockbox-state', state.locked ? 'Locked' : 'Unlocked');
  badge.dataset.tone = state.locked ? 'muted' : 'live';
  text('caregiver-message', state.notification?.message ??
    'A fall alert will send a simulated emergency OTP here.');
  text('caregiver-otp', state.code ? state.code.split('').join(' ') : '- - - - - -');
  text('normal-password', state.normal_password);
  text('otp-expiry', state.code
    ? 'Code expires in ' + Math.max(1, Math.ceil(state.expires_in / 60)) + ' min'
    : state.locked ? 'No active code' : 'Code used successfully');
  text('lockbox-detail', state.locked
    ? (state.code ? 'Use the normal door password or emergency OTP to unlock.' : 'Use the normal door password to unlock.')
    : 'Unlocked with ' + (state.last_unlock_method === 'emergency_otp' ? 'the emergency OTP.' : 'the normal door password.'));
  byId('lockbox-form').hidden = !state.locked;
  byId('lockbox-lock').hidden = state.locked;
  byId('lockbox-lock').parentElement.hidden = state.locked;
  updateCodeProgress();
  buttons();
}
function render(data) {
  if (session !== data.session) {
    session = data.session;
    after = logAfter = 0;
    readings = [];
    logs = [];
    text('logs', '');
  }
  if (data.samples.length) after = data.samples.at(-1).id;
  if (data.logs.length) logAfter = data.logs.at(-1).id;
  clockOffset = data.time - performance.now() / 1000;
  gapSeconds = data.fall?.max_gap_s ?? 0.65;
  readings = readings.concat(data.samples);
  updateConsole(data.logs);
  redraw();
  const sample = data.current;
  hostedAccess = data.hosted_access === true;
  text('hosted-access', hostedAccess ? 'Disable hosted dashboard' : 'Enable hosted dashboard');
  const signal = data.simulation ? 'Simulated movement, fall and quiet sequence'
    : data.fall?.ready && sample ? (sample.target_count ? 'Target reported' : 'Radar reporting no target')
    : data.connection === 'open' && data.out_age != null && data.out_age <= gapSeconds ? 'Receiving digital OUT only'
    : data.connection === 'open' ? 'No recent measurement frames' : 'Radar disconnected';
  text('signal-state', signal);
  const raw = !data.track && data.fall?.ready && sample?.target_count === 1;
  const displayed = raw ? sample : data.track;
  text('distance-label', raw ? 'Raw distance' : 'Tracked distance');
  text('speed-label', raw ? 'Raw radial speed' : 'Tracked radial speed');
  text('distance', number(displayed?.distance_m, 2));
  text('speed', number(displayed?.speed_mps, 2));
  text('targets', number(sample?.target_count));
  byId('out-panel').hidden = data.out_age == null;
  text('out-level', data.out_level == null ? '-' : data.out_level === 1 ? 'HIGH' : 'LOW');
  text('out-age', age(data.out_age));
  text('age', age(data.age));
  text('usb-age', age(data.usb_age));
  text('frames', data.sample_count.toLocaleString());
  text('invalid', data.invalid.toLocaleString());
  text('bytes', data.heartbeat?.uart_bytes.toLocaleString() ?? '-');
  text('presence', data.heartbeat?.presence_frames.toLocaleString() ?? '-');
  text('overflows', data.heartbeat?.overflows.toLocaleString() ?? '-');
  byId('export').title = data.retained.toLocaleString() + ' retained readings';
  const link = byId('link');
  active = data.connection === 'open' || data.connection === 'opening';
  renderFall(data.fall);
  renderLockbox(data.lockbox);
  if (data.fall?.armed && data.radar === 'live' && data.fall.phase === 'tracking') {
    const recent = readings.filter(row => row.track_id != null && row.time >= graphTime - 5);
    if (recent.length) {
      const peak = Math.max(...recent.map(row => Math.abs(row.speed_mps)));
      text('fall-detail', 'Peak tracked speed in the last 5 s: ' + peak.toFixed(2) +
        ' m/s. Burst threshold: ' + data.fall.burst_mps.toFixed(2) + ' m/s.');
    }
  }
  showMessage(data.error || connectionError);
  if (data.simulation) {
    text('link', 'Fall simulation');
    link.dataset.tone = 'warning';
    text('radar-note', 'Synthetic distance and speed samples are shown in the graphs. No sensor is connected.');
  } else if (data.radar === 'live') {
    text('link', 'Radar live � ' + data.port);
    link.dataset.tone = 'live';
    let note = data.track
      ? (sample.track_id != null ? 'Following a consistent range in the mat zone.' : 'Brief gap. Showing the last accepted measurement.')
      : 'Searching for consistent movement in the 1.2-5 m mat zone.';
    if (!data.track && sample.distance_m != null && data.fall) {
      const range = sample.distance_m;
      if (range < data.fall.min_range_m || range > data.fall.max_range_m) {
        const direction = range < data.fall.min_range_m ? 'Step back' : 'Move closer';
        note = 'Radar sees a target at ' + range.toFixed(2) + ' m. ' + direction +
          ' into the ' + data.fall.min_range_m.toFixed(1) + '-' +
          data.fall.max_range_m.toFixed(1) + ' m tracking zone.';
      }
    }
    text('radar-note', data.track === undefined ? 'Restart the Windows launcher to enable range tracking.' : note);
    if (data.fall?.armed && data.fall.phase === 'waiting') text('fall-detail', note);
  } else if (data.radar === 'out_live') {
    text('link', 'Radar OUT live � ' + data.port);
    link.dataset.tone = 'live';
    text('radar-note', "Receiving the sensor's digital OUT signal. Distance and speed require radar UART frames.");
  } else {
    const label = {opening:'Opening',disconnected:'Disconnected',error:'COM port error',open:'Waiting for radar'};
    const status = data.radar === 'out_stale' ? 'Waiting for OUT' : label[data.connection];
    text('link', status + (active ? ' � ' + data.port : ''));
    link.dataset.tone = data.connection === 'error' ? 'error' : active ? 'warning' : 'muted';
    text('radar-note', radarNotes[data.radar]);
  }
}
async function poll() {
  try {
    render(await request('/api/status?' + new URLSearchParams({session, after, log_after:logAfter})));
  } catch {
    text('signal-state', 'Local monitor unavailable');
    text('link', 'Local app unavailable');
    byId('link').dataset.tone = 'error';
    for (const id of ['distance', 'speed', 'targets', 'out-level']) text(id, '-');
    text('radar-note', 'Start the Windows launcher to restore the dashboard connection.');
    fallState = null;
    lockboxState = null;
    buttons();
    if (!byId('fall-ack').hidden) {
      text('fall-detail', 'Dashboard connection lost. Check the participant and reconnect to acknowledge.');
    } else {
      text('fall-status', 'Alert status unavailable');
    }
  } finally {
    setTimeout(poll, 350);
  }
}
byId('ports').addEventListener('change', buttons);
byId('refresh').addEventListener('click', refresh);
byId('connect').addEventListener('click', () => command('connect', {port:byId('ports').value}));
byId('disconnect').addEventListener('click', () => command('disconnect'));
byId('fall-arm').addEventListener('click', () => {
  if (fallState) command('fall/arm', {enabled:!fallState.armed});
});
byId('fall-ack').addEventListener('click', () => command('fall/acknowledge'));
byId('confirm-okay').addEventListener('click', () => respondToCheckin('okay'));
byId('request-sos').addEventListener('click', () => respondToCheckin('help'));
byId('simulate-fall').addEventListener('click', () => command('simulation/fall'));
byId('lockbox-form').addEventListener('submit', async event => {
  event.preventDefault();
  const input = byId('lockbox-code');
  if (await command('lockbox/unlock', {code:input.value.trim()})) {
    input.value = '';
    updateCodeProgress();
  }
});
byId('lockbox-code').addEventListener('input', updateCodeProgress);
for (const key of document.querySelectorAll('.lockbox-keypad [data-key]')) {
  key.addEventListener('click', () => {
    const input = byId('lockbox-code');
    if (input.value.length < 6) input.value += key.dataset.key;
    updateCodeProgress();
    input.focus();
  });
}
for (const action of document.querySelectorAll('.lockbox-keypad [data-action]')) {
  action.addEventListener('click', () => {
    const input = byId('lockbox-code');
    if (action.dataset.action === 'clear') input.value = '';
    if (action.dataset.action === 'backspace') input.value = input.value.slice(0, -1);
    updateCodeProgress();
    input.focus();
  });
}
byId('lockbox-lock').addEventListener('click', () => command('lockbox/lock'));
byId('clear').addEventListener('click', () => { logs = []; text('logs', ''); });
window.addEventListener('resize', redraw);
byId('hosted-access').addEventListener('click', () => command('hosted-access', {enabled:!hostedAccess}));
redraw();
setInterval(redraw, 500);
if (hosted) {
  const modeLink = document.querySelector('a[href="?view=rehearsal"]');
  if (modeLink) {
    modeLink.href = rehearsal ? '?view=live' : '?view=rehearsal';
    modeLink.textContent = rehearsal ? 'Connect live radar' : 'View moving demo';
  }
}
if (rehearsal) {
  startRehearsal();
} else if (hosted) {
  byId('hosted-settings').hidden = true;
  byId('link-computer').hidden = false;
  byId('link-computer').addEventListener('click', linkComputer);
  byId('refresh').disabled = true;
  for (const link of document.querySelectorAll('a[href^="/api/"]')) link.hidden = true;
  text('link', 'Computer not linked');
  text('signal-state', 'Link this PC to view the radar signal');
  text('fall-status', 'Waiting for radar computer');
} else {
  refresh();
  poll();
}

// Recording mode owns its browser-local state. Every sample is marked simulation.
// It uses the same charts and lockbox renderers as the connected monitor.
function resetRehearsal() {
  rehearsalStart = performance.now() / 1000;
  rehearsalTick = -150;
  rehearsalFallAt = null;
  rehearsalAlert = null;
  rehearsalHistory = [];
  rehearsalExpiry = 0;
  rehearsalResponse = null;
  rehearsalRecovery = null;
  rehearsalFallRange = null;
  rehearsalWalking = startWalking(-30, 2.5);
  rehearsalLockbox = {
    locked: true, code: null, notification: null, expires_in: null,
    normal_password: '2468', last_unlock_method: null,
  };
  readings = [];
  byId('lockbox-code').value = '';
  text('take-error', '');
  updateRehearsal();
}

function rehearsalCommand(action, body) {
  text('take-error', '');
  if (action === 'fall/acknowledge') {
    rehearsalAlert = null;
    rehearsalFallAt = null;
  } else if (action === 'lockbox/lock') {
    rehearsalLockbox.locked = true;
    rehearsalLockbox.last_unlock_method = null;
  } else if (action === 'lockbox/unlock') {
    const now = performance.now() / 1000;
    const isPassword = body.code === rehearsalLockbox.normal_password;
    const isOtp = rehearsalLockbox.code && now < rehearsalExpiry &&
      body.code === rehearsalLockbox.code;
    if (!isPassword && !isOtp) {
      text('take-error', 'Enter the door password or current six-digit emergency code.');
      return false;
    }
    rehearsalLockbox.locked = false;
    rehearsalLockbox.code = null;
    rehearsalLockbox.last_unlock_method = isPassword ? 'password' : 'emergency_otp';
  }
  updateRehearsal();
  return true;
}

function respondToCheckin(response) {
  if (!rehearsal || rehearsalFallAt == null || rehearsalAlert || rehearsalResponse) return;
  const sinceFall = performance.now() / 1000 - rehearsalStart - rehearsalFallAt;
  if (sinceFall >= 2.8 && sinceFall < sosAfterSeconds) {
    if (response === 'okay') {
      const at = performance.now() / 1000 - rehearsalStart;
      const range = rehearsalMotion(at).distance;
      rehearsalRecovery = {at, walking: startWalking(at, range)};
    }
    rehearsalResponse = response;
  }
  updateRehearsal();
}

function startWalking(at, range) {
  return [{start: at, end: at + 3 + Math.random() * 5, from: range, to: range}];
}

function walkingMotion(time, timeline) {
  // Store each choice so repeated reads of a timestamp always give the same sample.
  while (time > timeline.at(-1).end) {
    const last = timeline.at(-1);
    const from = last.to;
    let to = from;
    let duration = 3 + Math.random() * 7;
    if (last.from === last.to) {
      to = 2.05 + Math.random() * 0.9;
      if (Math.abs(to - from) < 0.12) to = from < 2.5 ? from + 0.2 : from - 0.2;
      const peakSpeed = 0.15 + Math.random() * 0.13;
      duration = Math.max(1.5, 1.875 * Math.abs(to - from) / peakSpeed);
    }
    timeline.push({start: last.end, end: last.end + duration, from, to});
  }
  const segment = timeline.find(part => time <= part.end);
  const duration = segment.end - segment.start;
  const progress = Math.max(0, Math.min(1, (time - segment.start) / duration));
  // Quintic easing gives each short walk a smooth start and stop.
  const eased = progress ** 3 * (10 - 15 * progress + 6 * progress ** 2);
  const rate = 30 * progress ** 2 * (1 - progress) ** 2 / duration;
  return {
    distance: segment.from + (segment.to - segment.from) * eased,
    speed: (segment.to - segment.from) * rate,
  };
}

function rehearsalMotion(time) {
  if (rehearsalRecovery && time >= rehearsalRecovery.at) {
    return walkingMotion(time, rehearsalRecovery.walking);
  }
  if (rehearsalFallAt == null || time < rehearsalFallAt) {
    return walkingMotion(time, rehearsalWalking);
  }
  const initialRange = rehearsalFallRange ?? walkingMotion(rehearsalFallAt, rehearsalWalking).distance;
  const direction = initialRange >= 2.5 ? -1 : 1;
  const fallTime = Math.min(time - rehearsalFallAt, 0.6);
  const restingFor = Math.max(0, time - rehearsalFallAt - 0.6);
  // Small residual movement fades in after the burst, with matching signed speed.
  const envelope = 1 - Math.exp(-restingFor / 1.2);
  const envelopeRate = Math.exp(-restingFor / 1.2) / 1.2;
  const drift = 0.012 * Math.sin(3.1 * restingFor) + 0.006 * Math.sin(5.3 * restingFor);
  const driftRate = 0.0372 * Math.cos(3.1 * restingFor) + 0.0318 * Math.cos(5.3 * restingFor);
  return {
    distance: initialRange + direction * 1.25 * 0.6 / Math.PI *
      (1 - Math.cos(Math.PI * fallTime / 0.6)) + envelope * drift,
    speed: fallTime < 0.6 ? direction * 1.25 * Math.sin(Math.PI * fallTime / 0.6)
      : envelopeRate * drift + envelope * driftRate,
  };
}

function updateRehearsal() {
  const now = performance.now() / 1000;
  const elapsed = now - rehearsalStart;
  const nextTick = Math.floor(elapsed * 5);
  for (; rehearsalTick <= nextTick; rehearsalTick++) {
    const time = rehearsalTick / 5;
    const {distance, speed} = rehearsalMotion(time);
    readings.push({
      time: time + rehearsalStart, track_id: 'rehearsal', source: 'simulation',
      target_count: 1, distance_m: distance, speed_mps: speed,
    });
  }
  const sinceFall = rehearsalFallAt == null ? -1 : elapsed - rehearsalFallAt;
  const checkingIn = sinceFall >= 2.8 && sinceFall < sosAfterSeconds &&
    !rehearsalResponse && !rehearsalAlert;
  if (sinceFall >= 2.8 && rehearsalResponse !== 'okay' && !rehearsalAlert &&
      (sinceFall >= sosAfterSeconds || rehearsalResponse === 'help')) {
    rehearsalAlert = {
      time: Date.now() / 1000, range_m: rehearsalMotion(rehearsalFallAt + 0.3).distance,
      peak_mps: 1.25, quiet_s: 2.2, simulated: true,
    };
    rehearsalHistory.unshift(rehearsalAlert);
    rehearsalHistory.length = Math.min(50, rehearsalHistory.length);
    const random = crypto.getRandomValues(new Uint32Array(1))[0];
    const code = String(random % 1000000).padStart(6, '0');
    rehearsalExpiry = now + 600;
    rehearsalLockbox.locked = true;
    rehearsalLockbox.last_unlock_method = null;
    rehearsalLockbox.code = code;
    rehearsalLockbox.notification = {
      message: rehearsalResponse === 'help'
        ? 'SOS requested. Emergency access code delivered to the caregiver in this simulation.'
        : 'SOS issued after no response. Emergency access code delivered to the caregiver in this simulation.',
    };
  }
  if (rehearsalLockbox.code && now >= rehearsalExpiry) rehearsalLockbox.code = null;
  rehearsalLockbox.expires_in = rehearsalLockbox.code ? rehearsalExpiry - now : null;
  clockOffset = 0;
  redraw();
  const phase = rehearsalAlert ? 'alert' : rehearsalResponse === 'okay' || sinceFall < 0 ? 'tracking'
    : sinceFall < 0.6 ? 'burst' : 'quiet';
  renderFall({
    armed: true, ready: true, phase, active: rehearsalAlert, history: rehearsalHistory,
    min_range_m: 1.2, max_range_m: 5,
    statusLabel: rehearsalAlert ? 'SOS sent � caregiver alerted'
      : checkingIn ? 'Checking on you'
      : rehearsalResponse === 'okay' ? "You're okay � SOS cancelled" : fallLabels[phase],
  });
  text('fall-config', 'Simulated radar � continuous monitoring');
  text('fall-detail', rehearsalAlert
    ? (rehearsalResponse === 'help' ? 'Help requested. Caregiver notified and emergency access code issued.'
      : 'No response received. Caregiver notified and emergency access code issued.')
    : rehearsalResponse === 'okay' ? 'Safety confirmed. Monitoring continues.'
    : checkingIn ? 'Possible fall detected. Please confirm you are okay within ten seconds.'
    : phase === 'tracking' ? 'Monitoring gentle movement in the room.'
      : phase === 'burst' ? 'Rapid movement detected.'
        : 'Checking for sustained stillness after the movement.');
  byId('fall-checkin').hidden = !checkingIn;
  const tone = rehearsalAlert ? 'alert' : checkingIn ? 'checkin'
    : rehearsalResponse === 'okay' ? 'safe' : 'idle';
  byId('fall-panel').dataset.tone = tone;
  if (checkingIn) {
    text('checkin-countdown', Math.max(1, Math.ceil(sosAfterSeconds - sinceFall)) + ' s');
    byId('checkin-progress').style.transform = 'scaleX(' + ((sosAfterSeconds - sinceFall) / checkinSeconds) + ')';
  }
  renderLockbox(rehearsalLockbox);
  const latest = readings.at(-1);
  text('distance', number(latest.distance_m, 2));
  text('speed', number(latest.speed_mps, 2));
  text('targets', '1');
}

function startRehearsal() {
    document.body.classList.add('studio');
    resetRehearsal();
    if (hosted) text('link', 'Simulated readings');
    setInterval(updateRehearsal, 200);
    document.addEventListener('keydown', event => {
      if (event.repeat || event.ctrlKey || event.altKey || event.metaKey ||
          event.target.closest('input, textarea, select, [contenteditable="true"]')) return;
      if (event.key.toLowerCase() === 'm' && (rehearsalFallAt == null || rehearsalResponse === 'okay')) {
        event.preventDefault();
        const at = performance.now() / 1000 - rehearsalStart;
        rehearsalFallRange = rehearsalMotion(at).distance;
        rehearsalFallAt = at;
        rehearsalResponse = null;
        rehearsalRecovery = null;
        updateRehearsal();
      }
      if (event.key.toLowerCase() === 'r') {
        event.preventDefault();
        resetRehearsal();
      }
    });
}
