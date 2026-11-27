'use strict';
const $ = id => document.getElementById(id);
const canvas = $('chart'), ctx = canvas.getContext('2d');
let history = Array(100).fill(0), target = 0, speed = 0, mode = 'Gentle movement';
let locked = true, otp = null, expires = 0, fallTimer = null;
function setLock(value) {
  locked = value;
  document.querySelector('.lock').classList.toggle('unlocked', !locked);
  $('lock-state').textContent = locked ? 'Locked' : 'Unlocked';
  $('lock-symbol').textContent = locked ? '●' : '✓';
}
function reset() {
  clearTimeout(fallTimer);
  history = Array(100).fill(0); speed = target = 0; mode = 'Gentle movement';
  otp = null; expires = 0; setLock(true);
  $('otp').textContent = '— — — — — —';
  $('event-title').textContent = 'Ready for a test';
  $('event-detail').textContent = 'A simulated fall generates a temporary six-digit access code below. The regular demo PIN is 2468.';
  $('feedback').textContent = '';
  $('code').value = '';
  $('motion').textContent = mode;
}
function draw() {
  const rect = canvas.getBoundingClientRect(), dpr = devicePixelRatio || 1;
  const w = rect.width, h = rect.height;
  if (canvas.width !== Math.round(w*dpr) || canvas.height !== Math.round(h*dpr)) {
    canvas.width = Math.round(w*dpr); canvas.height = Math.round(h*dpr);
  }
  ctx.setTransform(dpr,0,0,dpr,0,0);
  ctx.clearRect(0,0,w,h);
  ctx.strokeStyle = '#dce9f2'; ctx.lineWidth = 1;
  for (const v of [-1,0,1]) { const y = h/2-v*h*.34; ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(w,y);ctx.stroke(); }
  ctx.beginPath();
  history.forEach((v,i) => { const x = i*w/(history.length-1), y = h/2-v*h*.34; i ? ctx.lineTo(x,y) : ctx.moveTo(x,y); });
  ctx.strokeStyle = '#3985b5'; ctx.lineWidth = 3; ctx.lineJoin = 'round'; ctx.stroke();
  ctx.lineTo(w,h/2); ctx.lineTo(0,h/2); ctx.closePath();
  ctx.fillStyle = 'rgba(73,155,207,.12)'; ctx.fill();
}
function tick() {
  const drift = Math.sin(performance.now()/850)*.08;
  speed += ((target+drift)-speed)*.22;
  target *= .96;
  if (Math.abs(target)<.06) target = 0;
  if (Math.abs(speed)<.14 && target===0 && mode!=='Fall simulated') mode='Gentle movement';
  history.push(Math.max(-1.4,Math.min(1.4,speed))); history.shift();
  $('speed').textContent = (Math.abs(speed)<.005 ? 0 : speed).toFixed(2);
  $('motion').textContent = mode;
  draw();
}
$('approach').onclick = () => {target=1.1;mode='Approaching';};
$('depart').onclick = () => {target=-1.1;mode='Moving away';};
$('fall').onclick = () => {
  clearTimeout(fallTimer); target=-1.35;mode='Fall simulated';setLock(true);
  $('event-title').textContent='Rapid movement detected';
  $('event-detail').textContent='Checking whether movement settles…';
  fallTimer=setTimeout(() => {
    const number=crypto.getRandomValues(new Uint32Array(1))[0]%1000000;
    otp=String(number).padStart(6,'0'); expires=Date.now()+600000;target=0;
    $('otp').textContent=otp;
    $('event-title').textContent='Emergency access ready';
    $('event-detail').textContent='Simulated fall alert: enter this single-use code to unlock the demo box.';
  },1700);
};
$('reset').onclick=reset;
$('relock').onclick=()=>{setLock(true);$('feedback').textContent='Box locked.';};
$('unlock-form').onsubmit=e=>{
  e.preventDefault();
  const entered=$('code').value.trim();
  if(!locked){$('feedback').textContent='The box is already open.';return;}
  if(entered==='2468' || (otp && Date.now()<expires && entered===otp)){
    setLock(false);otp=null;expires=0;$('otp').textContent='— — — — — —';
    $('feedback').textContent='Demo box unlocked.';$('code').value='';
  } else {$('feedback').textContent='Code not valid. Try 2468 or the current emergency code.';}
};
reset();setInterval(tick,200);window.addEventListener('resize',draw);