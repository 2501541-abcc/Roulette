// ヨーロピアンルーレット(0〜36)の並び順
const ORDER = [0,32,15,19,4,21,2,25,17,34,6,27,13,36,11,30,8,23,10,5,24,16,33,1,20,14,31,9,22,18,29,7,28,12,35,3,26];
const REDS = new Set([1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36]);
const colorOf = n => n === 0 ? 'green' : REDS.has(n) ? 'red' : 'black';
const COLORS = { red: '#b81d24', black: '#151515', green: '#0a7a35' };

let bank = 100, selChip = 1, bets = {}, angle = 0, spinning = false, ballAngle = 0, ballRadiusF = 0.9;
const $ = id => document.getElementById(id);
const cv = $('wheel'), ctx = cv.getContext('2d');
const N = ORDER.length, SEG = Math.PI * 2 / N;

/* ---------- ホイール描画 ---------- */
function draw() {
  const W = cv.width, c = W / 2;
  ctx.clearRect(0, 0, W, W);
  // 外枠(木目風)
  let g = ctx.createRadialGradient(c, c, c * .8, c, c, c);
  g.addColorStop(0, '#7a4a1c'); g.addColorStop(.5, '#4a2a0e'); g.addColorStop(1, '#2a1506');
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(c, c, c - 4, 0, 7); ctx.fill();
  ctx.strokeStyle = '#ffd95a'; ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(c, c, c - 8, 0, 7); ctx.stroke();

  ctx.save(); ctx.translate(c, c); ctx.rotate(angle);
  const R1 = c * .86, R2 = c * .62, R3 = c * .42;
  for (let i = 0; i < N; i++) {
    const a0 = i * SEG - SEG / 2 - Math.PI / 2, a1 = a0 + SEG;
    ctx.beginPath(); ctx.arc(0, 0, R1, a0, a1); ctx.arc(0, 0, R2, a1, a0, true); ctx.closePath();
    ctx.fillStyle = COLORS[colorOf(ORDER[i])]; ctx.fill();
    ctx.strokeStyle = '#d9b84a'; ctx.lineWidth = 2; ctx.stroke();
    // 数字
    ctx.save(); ctx.rotate(i * SEG);
    ctx.fillStyle = '#fff'; ctx.font = 'bold 30px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.translate(0, -(R1 + R2) / 2); ctx.fillText(ORDER[i], 0, 0); ctx.restore();
  }
  // 内側
  g = ctx.createRadialGradient(0, 0, 0, 0, 0, R2);
  g.addColorStop(0, '#444'); g.addColorStop(1, '#1b1b1b');
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, R2, 0, 7); ctx.fill();
  ctx.strokeStyle = '#d9b84a'; ctx.lineWidth = 4; ctx.stroke();
  ctx.fillStyle = '#b8892a'; ctx.beginPath(); ctx.arc(0, 0, R3, 0, 7); ctx.fill();
  ctx.fillStyle = '#ffd95a'; ctx.beginPath(); ctx.arc(0, 0, 26, 0, 7); ctx.fill();
  // 十字の飾り
  ctx.strokeStyle = '#ffd95a'; ctx.lineWidth = 8;
  for (let k = 0; k < 4; k++) { ctx.rotate(Math.PI / 2); ctx.beginPath(); ctx.moveTo(0, 20); ctx.lineTo(0, R3 - 6); ctx.stroke(); }
  ctx.restore();

  // ボール(ホイールとは独立した角度)
  const br = R1 * ballRadiusF + (1 - ballRadiusF) * 0, bx = c + Math.sin(ballAngle) * (c * .86 * ballRadiusF + 0 ),
        by = c - Math.cos(ballAngle) * (c * .86 * ballRadiusF);
  ctx.fillStyle = '#fff'; ctx.shadowColor = '#000'; ctx.shadowBlur = 8;
  ctx.beginPath(); ctx.arc(bx, by, 13, 0, 7); ctx.fill(); ctx.shadowBlur = 0;
}

/* ---------- スピン ---------- */
function spin() {
  const total = Object.values(bets).reduce((a, b) => a + b, 0);
  if (spinning) return;
  if (total === 0) { $('result').textContent = '先にベットしてください'; return; }
  spinning = true; setButtons();
  $('result').textContent = 'No more bets...';

  let winIdx = Math.floor(Math.random() * N);
  // 確変中は、一定確率で当たりの出目に差し替える
  if (kakuhen > 0 && Math.random() < kakuRate) {
    const cands = ORDER.map((n, i) => i).filter(i => netFor(ORDER[i]) > 0);
    if (cands.length) winIdx = cands[Math.floor(Math.random() * cands.length)];
  }
  const winNum = ORDER[winIdx];
  const dur = 6000, t0 = performance.now();
  // ホイールは時計回り、ボールは反時計回りに回り、最後に当選ポケットへ落ちる
  const wheelStart = angle, wheelSpin = Math.PI * 2 * 5;
  const wheelEnd = wheelStart + wheelSpin;
  const ballTurns = Math.PI * 2 * 8;

  function frame(now) {
    let t = Math.min((now - t0) / dur, 1);
    const e = 1 - Math.pow(1 - t, 3);            // easeOutCubic
    angle = wheelStart + wheelSpin * e;
    // ボールの目標: 当選ポケットの現在位置(ホイール座標→画面角)
    const pocketScreen = angle + winIdx * SEG;
    const ballFree = -ballTurns * e + (1 - e) * 0; // 反時計
    // 後半はポケットへ収束
    const lock = Math.min(Math.max((t - .65) / .35, 0), 1);
    const ls = lock * lock * (3 - 2 * lock);
    const freeAngle = ballFree;
    const diff = ((pocketScreen - freeAngle) % (Math.PI * 2) + Math.PI * 3) % (Math.PI * 2) - Math.PI;
    ballAngle = freeAngle + diff * ls;
    ballRadiusF = 1.0 - 0.1 * ls - 0.02 * Math.sin(t * 40) * (1 - ls);
    draw();
    if (t < 1) requestAnimationFrame(frame);
    else { angle = wheelEnd; finish(winNum); }
  }
  requestAnimationFrame(frame);
}

/* ---------- 判定 ---------- */
function payout(key, n) {
  // 戻り値: 払い戻し倍率(元本を含めない)。外れは -1
  const [type, val] = key.split(':');
  const win = (() => {
    if (type === 'n') return +val === n;
    if (n === 0) return false;
    switch (type) {
      case 'color': return colorOf(n) === val;
      case 'parity': return (n % 2 === 0) === (val === 'even');
      case 'half': return val === 'low' ? n <= 18 : n >= 19;
      case 'dozen': return Math.ceil(n / 12) === +val;
      case 'col': return (n - 1) % 3 === +val - 1;
    }
  })();
  if (!win) return -1;
  return type === 'n' ? 35 : (type === 'dozen' || type === 'col') ? 2 : 1;
}

function finish(n) {
  let net = 0;
  for (const [k, amt] of Object.entries(bets)) {
    const m = payout(k, n);
    net += m < 0 ? -amt : amt * m;     // 賭け金は先払い済みなので、勝ち分+元本を戻す
    if (m >= 0) bank += amt * (m + 1);
  }
  const col = colorOf(n);
  $('num').textContent = n;
  $('result').innerHTML = `<b>${n}</b>(${{red:'赤',black:'黒',green:'緑'}[col]}) — ` +
    (net > 0 ? `<span class="win">+${net} 獲得!</span>` : net < 0 ? `<span class="lose">${net}</span>` : '±0');
  const h = document.createElement('span');
  h.style.background = COLORS[col]; h.textContent = n;
  $('history').prepend(h);
  while ($('history').children.length > 14) $('history').lastChild.remove();
  bets = {}; spinning = false;
  if (kakuhen > 0) {
    kakuhen--;
    if (net >= 35) { kakuhen += 5; toast('連チャン!! RUSH +5G'); }
    updateKaku();
  } else if (net >= 35) freezeEffect();   // ストレート的中(35倍)でフリーズ → 確変突入
  if (bank <= 0) $('result').innerHTML += '<br>チップが無くなりました。リセットしてください。';
  render();
}

/* ---------- ベットUI ---------- */
function place(key) {
  if (spinning) return;
  if (bank < selChip) { $('result').textContent = 'チップが足りません'; return; }
  bank -= selChip; bets[key] = (bets[key] || 0) + selChip; render();
}
function clearBets() {
  if (spinning) return;
  for (const a of Object.values(bets)) bank += a;
  bets = {}; render();
}
function setButtons() { ['spin', 'clear', 'reset'].forEach(i => $(i).disabled = spinning); }
function render() {
  $('bank').textContent = bank;
  $('total').textContent = Object.values(bets).reduce((a, b) => a + b, 0);
  document.querySelectorAll('[data-key]').forEach(el => {
    const old = el.querySelector('.stake'); if (old) old.remove();
    const v = bets[el.dataset.key];
    if (v) { const s = document.createElement('div'); s.className = 'stake'; s.textContent = v; el.appendChild(s); }
  });
  setButtons();
}

function cell(label, key, cls, extra = '') {
  const d = document.createElement('div');
  d.className = `cell ${cls} ${extra}`; d.textContent = label; d.dataset.key = key;
  d.onclick = () => place(key); return d;
}
function buildTable() {
  const t = $('table');
  t.appendChild(cell('0', 'n:0', 'green', 'zero'));
  // 3行(上段 3,6,9... / 中段 2,5,8... / 下段 1,4,7...)
  for (let row = 0; row < 3; row++)
    for (let c = 0; c < 12; c++) {
      const n = c * 3 + (3 - row);
      t.appendChild(cell(n, 'n:' + n, colorOf(n)));
    }
  const blank = () => { const d = document.createElement('div'); return d; };
  t.appendChild(blank());
  ['1st 12', '2nd 12', '3rd 12'].forEach((l, i) => t.appendChild(cell(l, 'dozen:' + (i + 1), 'felt', 'wide4')));
  // 2to1 は列ベット: 下の行の左に置く代わりにまとめて表示
  const t2 = document.createElement('div');
  t2.style.cssText = 'display:grid;grid-template-columns:repeat(3,1fr);gap:2px;grid-column:1/-1';
  [3, 2, 1].forEach(i => { const c = cell(`列${i} (2:1)`, 'col:' + i, 'felt'); t2.appendChild(c); });
  t.appendChild(t2);
  const sub = [['1-18', 'half:low', 'felt', 'wide2'], ['EVEN', 'parity:even', 'felt', 'wide2'],
    ['RED', 'color:red', 'red', 'wide2'], ['BLACK', 'color:black', 'black', 'wide2'],
    ['ODD', 'parity:odd', 'felt', 'wide2'], ['19-36', 'half:high', 'felt', 'wide2']];
  t.appendChild(blank());
  sub.forEach(s => t.appendChild(cell(...s)));
}
function buildChips() {
  [1, 5, 10, 50].forEach(v => {
    const b = document.createElement('button');
    b.className = `chip c${v}` + (v === selChip ? ' sel' : ''); b.textContent = v;
    b.onclick = () => { selChip = v; document.querySelectorAll('.chip').forEach(x => x.classList.remove('sel')); b.classList.add('sel'); };
    $('chips').appendChild(b);
  });
}

$('spin').onclick = spin;
$('clear').onclick = clearBets;
$('reset').onclick = () => { if (spinning) return; bank = 100; bets = {}; kakuhen = 0; updateKaku(); $('num').textContent = '-'; $('result').textContent = 'リセットしました'; render(); };
buildChips(); buildTable(); render(); draw();

/* ---------- フリーズ演出 ---------- */
// パチスロ最高峰の定番「フリーズ → ブラックアウト → 逆回転 → 7揃い → 祝福」を再現
// 資料: ミリオンゴッド系のフリーズ/ブラックアウト、ハナハナ系の逆回転フリーズ・全ランプ点灯
const sleep = ms => new Promise(r => setTimeout(r, ms));
let fxCtx;
function tone(freq, dur, type = 'triangle', vol = .07, to = null) {
  try {
    fxCtx = fxCtx || new (window.AudioContext || window.webkitAudioContext)();
    const o = fxCtx.createOscillator(), g = fxCtx.createGain(), t = fxCtx.currentTime;
    o.type = type; o.frequency.setValueAtTime(freq, t);
    if (to) o.frequency.exponentialRampToValueAtTime(to, t + dur);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(.0001, t + dur + .05);
    o.connect(g); g.connect(fxCtx.destination); o.start(); o.stop(t + dur + .06);
  } catch (e) {}
}

let freezing = false;
// 実機(スマスロ北斗)の動画を参考にしたフリーズ: 暗転 → RUSH突入
async function freezeEffect() {
  if (freezing) return;
  freezing = true;
  const ov = document.createElement('div');
  ov.id = 'freeze';
  ov.innerHTML = '<div class="crt-top"></div><div class="crt-bot"></div><div class="crt-line"></div><div class="crt-dot"></div>' +
    '<div class="fz-flash"></div>' +
    '<div class="fz-banner">' + 'RUSH突入!!' + '</div><div class="fz-sub"></div>';
  document.body.appendChild(ov);
  const q = sel => ov.querySelector(sel);
  const flash = q('.fz-flash'), banner = q('.fz-banner'), sub = q('.fz-sub');
  const shake = (px = 10, d = 220) => document.body.animate([{ transform: 'translate(0,0)' }, { transform: `translate(${-px}px,${px * .6}px)` }, { transform: `translate(${px}px,${-px * .6}px)` }, { transform: 'translate(0,0)' }], { duration: d });
  const flashOn = (ms = 160) => { flash.classList.add('on'); setTimeout(() => flash.classList.remove('on'), ms); };

  // ① フリーズ: 操作を受け付けなくなり、一瞬の間のあと電源が落ちるように暗転する
  ov.classList.add('stall');                     // 透明のまま入力だけ止める(カーソルも消える)
  await sleep(450);
  // ブラウン管の電源OFFのように、画面が横一本の光の線に潰れ → 点になって消える
  ov.classList.add('crt'); tone(900, .55, 'sine', .05, 2600);
  await sleep(1050);
  ov.classList.remove('crt'); ov.classList.add('black', 'crt-done');   // crt を外さないと背景が透明のままで暗くならない。線と点もここで完全に消す
  noise2(.03, .5); tone(70, .06, 'square', .2, 30);   // 消える瞬間の「プチュン」
  await sleep(1300);                             // 完全な無音と暗闇

  // ③ 暗闇のままRUSH突入
  shake(24, 400); noise2(.6, .4); tone(90, .6, 'sawtooth', .15, 40);   // 白い閃光は出さず、黒い画面のまま
  await sleep(300);

  // ④ RUSH突入
  banner.classList.add('show');
  const spins = KAKUHEN_SPINS;
  sub.textContent = `RUSH ${spins}ゲーム突入!`; sub.classList.add('show');
  [523, 659, 784, 1047, 1319, 1568, 2093].forEach((f, i) => setTimeout(() => tone(f, .35, 'triangle', .08), i * 120));
  for (let i = 0; i < 70; i++) {
    const c = document.createElement('div');
    c.className = 'fz-coin'; c.textContent = '🪙';
    c.style.left = Math.random() * 100 + 'vw'; c.style.animationDelay = Math.random() * 2.5 + 's';
    c.style.animationDuration = 1.6 + Math.random() * 1.6 + 's';
    ov.appendChild(c);
  }
  await sleep(1500);
  ov.classList.add('canclose');
  await Promise.race([sleep(5000), new Promise(r => ov.addEventListener('click', r, { once: true }))]);
  ov.classList.add('out'); await sleep(600);
  ov.remove(); freezing = false;
  kakuhen = spins; kakuRate = KAKUHEN_RATE; updateKaku(); toast('RUSH突入!!');
}

function noise2(dur, vol = .2) {
  try {
    fxCtx = fxCtx || new (window.AudioContext || window.webkitAudioContext)();
    const len = fxCtx.sampleRate * dur, buf = fxCtx.createBuffer(1, len, fxCtx.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2);
    const src = fxCtx.createBufferSource(), g = fxCtx.createGain();
    src.buffer = buf; g.gain.value = vol; src.connect(g); g.connect(fxCtx.destination); src.start();
  } catch (e) {}
}
document.getElementById('freezeTest').onclick = () => { if (!spinning) freezeEffect(); };

/* ---------- 確変 ---------- */
// フリーズ後に突入。KAKUHEN_SPINS回のあいだ、KAKUHEN_RATEの確率で当たりの出目になる。
// 確変中にストレート的中すると+5回の連チャン。
const KAKUHEN_SPINS = 5, KAKUHEN_RATE = 0.5;
let kakuhen = 0, kakuRate = KAKUHEN_RATE;   // 超フリーズ後は kakuRate が上がる

function netFor(n) {
  let net = 0;
  for (const [k, amt] of Object.entries(bets)) {
    const m = payout(k, n);
    net += m < 0 ? -amt : amt * m;
  }
  return net;
}

function updateKaku() {
  document.body.classList.toggle('kaku', kakuhen > 0);
  $('kaku').innerHTML = kakuhen > 0 ? `🔥 RUSH中 <b>残り${kakuhen}G</b> 🔥<small>当たりやすさ ${Math.round(kakuRate * 100)}%UP</small>` : '';
}

function toast(text) {
  const t = document.createElement('div');
  t.className = 'toast'; t.textContent = text;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 2600);
}
