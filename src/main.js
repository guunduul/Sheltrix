/**
 * SHELTRIX — src/main.js
 * Wallet: @aptos-labs/wallet-adapter-core v8.5.0
 * Storage: @shelby-protocol/sdk via shelby.js
 */

import { WalletCore } from '@aptos-labs/wallet-adapter-core';
import { uploadToShelby, downloadFromShelby, SHELBY_CONFIG } from './shelby.js';

// ── STATE ────────────────────────────────────────────
let conn = false, files = [], flt = 'all', sel = [];
let walletAddress = null, walletAccount = null, walletCore = null;

// ── BOOT ─────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  initUI();
  await initWalletCore();
  log('SHELTRIX · Ready · SDK v0.2.4 loaded', 'ok');
});

// ── WALLET CORE INIT ─────────────────────────────────
async function initWalletCore() {
  try {
    walletCore = new WalletCore([], [], {
      onError: (err) => log('WALLET_ERR · ' + (err?.message || err), 'er')
    });

    walletCore.on('connect', (account) => {
      walletAccount = account;
      const addr = extractAddr(account);
      if (addr) { walletAddress = addr; onWalletConnected(addr); }
    });

    walletCore.on('disconnect', onWalletDisconnected);
    walletCore.on('accountChange', (account) => {
      walletAccount = account;
      const addr = extractAddr(account);
      if (addr) { walletAddress = addr; log('ACCOUNT_CHANGE · ' + addr.slice(0, 12) + '...', 'in'); }
    });

    await new Promise(r => setTimeout(r, 800));
    const detected = walletCore.wallets || [];
    log('WALLETS · [' + detected.map(w => w.name).join(', ') + ']', 'ok');
  } catch (err) {
    log('WALLET_CORE · ' + err.message + ' — using fallback', 'in');
    walletCore = null;
  }
}

// helper: ekstrak address dari berbagai format
function extractAddr(obj) {
  if (!obj) return null;
  const candidates = [
    obj?.address, obj?.publicKey,
    obj?.accounts?.[0]?.address, obj?.accounts?.[0],
    obj?.account?.address, obj?.account, obj
  ];
  for (const c of candidates) {
    if (!c) continue;
    if (typeof c === 'string' && c.startsWith('0x') && c.length > 10) return c;
    if (typeof c === 'object') {
      const s = c.toString?.();
      if (s && s.startsWith('0x') && s.length > 10) return s;
    }
  }
  return null;
}

// ── CONNECT ──────────────────────────────────────────
export async function connectWallet() {
  hd('s1'); sh('s2');
  log('CONNECT · Starting...', 'in');
  try {
    // Coba WalletCore (AIP-62 — Petra terbaru)
    if (walletCore) {
      const wallets = walletCore.wallets || [];
      const petra = wallets.find(w => w.name === 'Petra' || w.name?.toLowerCase().includes('petra'));
      if (petra) {
        log('CONNECT · Petra in registry → connecting via WalletCore...', 'in');
        await walletCore.connect(petra.name);
        return; // event 'connect' handle sisanya
      }
    }
    // Fallback manual (Petra versi lama / window.aptos)
    await connectManual();
  } catch (err) {
    hd('s2'); sh('s1');
    const msg = err?.message || '';
    if (err?.code === 4001 || /cancel|reject|denied|user/i.test(msg)) {
      toast('❌ Dibatalkan', 'er'); log('CONNECT · Cancelled', 'er');
    } else {
      toast('❌ ' + (msg || 'Connect failed'), 'er'); log('ERROR · ' + msg, 'er');
    }
  }
}

async function connectManual() {
  await new Promise(r => setTimeout(r, 300));
  log('DEBUG · aptos=' + (!!window.aptos) + ' petra=' + (!!window.petra), 'in');

  let resp = null;

  if (window.aptos?.connect) {
    try {
      log('CONNECT · window.aptos.connect()...', 'in');
      resp = await window.aptos.connect();
      log('DEBUG · resp: ' + JSON.stringify(resp), 'in');
    } catch (e) {
      if (e?.code === 4001 || /cancel|reject|denied/i.test(e?.message || '')) {
        hd('s2'); sh('s1'); toast('❌ Dibatalkan', 'er'); return;
      }
      log('DEBUG · aptos err: ' + e.message, 'in');
    }
  }

  if (!resp && window.petra?.connect) {
    try {
      log('CONNECT · window.petra.connect()...', 'in');
      resp = await window.petra.connect();
      log('DEBUG · resp: ' + JSON.stringify(resp), 'in');
    } catch (e) {
      if (e?.code === 4001 || /cancel|reject|denied/i.test(e?.message || '')) {
        hd('s2'); sh('s1'); toast('❌ Dibatalkan', 'er'); return;
      }
      log('DEBUG · petra err: ' + e.message, 'in');
    }
  }

  if (!resp) {
    hd('s2'); sh('s1');
    if (!window.aptos && !window.petra) {
      toast('❌ Petra tidak terdeteksi! Install Petra dulu.', 'er');
      log('ERROR · Install Petra from petra.app', 'er');
    } else {
      toast('❌ Petra tidak merespons. Coba Ctrl+Shift+R', 'er');
      log('ERROR · No response — hard refresh & retry', 'er');
    }
    return;
  }

  walletAccount = resp;
  const addr = extractAddr(resp);
  if (!addr) {
    hd('s2'); sh('s1');
    log('ERROR · Bad address: ' + JSON.stringify(resp), 'er');
    toast('❌ Format address tidak valid. Lihat log.', 'er');
    return;
  }
  walletAddress = addr;
  onWalletConnected(addr);
}

// ── ON CONNECTED ─────────────────────────────────────
async function onWalletConnected(address) {
  log('CONNECTED · ' + address.slice(0, 14) + '...', 'ok');
  hd('s2'); sh('s4');

  let aptBal = '0.0000', usdBal = '0.00';
  try {
    // Shelbynet kadang return empty resources array via /resources
    // Gunakan endpoint spesifik langsung per resource type

    // ── APT via CoinStore (encode URL manual) ──
    const aptUrl = `${SHELBY_CONFIG.aptosFullnode}/accounts/${address}/resource/0x1%3A%3Acoin%3A%3ACoinStore%3C0x1%3A%3Aaptos_coin%3A%3AAptosCoin%3E`;
    log('BALANCE · Fetching APT...', 'in');
    const aptRes = await fetch(aptUrl);
    log('BALANCE · APT status: ' + aptRes.status, 'in');
    if (aptRes.ok) {
      const aptData = await aptRes.json();
      log('BALANCE · APT raw: ' + JSON.stringify(aptData?.data), 'in');
      const val = aptData?.data?.coin?.value;
      if (val != null) {
        aptBal = (parseInt(val) / 1e8).toFixed(4);
        log('APT · ' + aptBal, 'ok');
      }
    } else {
      // Coba format alternatif dengan tanda kurung unencoded
      const aptUrl2 = `${SHELBY_CONFIG.aptosFullnode}/accounts/${address}/resource/0x1::coin::CoinStore<0x1::aptos_coin::AptosCoin>`;
      const aptRes2 = await fetch(aptUrl2);
      if (aptRes2.ok) {
        const d = await aptRes2.json();
        const val = d?.data?.coin?.value;
        if (val != null) { aptBal = (parseInt(val) / 1e8).toFixed(4); log('APT · ' + aptBal + ' (v2)', 'ok'); }
      }
    }

    // ── ShelbyUSD via CoinStore ──
    const SHELBYUSD_ADDR = '0x1b18363a9f1fe5e6ebf247daba5cc1c18052bb232efdc4c50f556053922d98e1';
    // Coba beberapa format type ShelbyUSD
    const usdTypes = [
      `0x1::coin::CoinStore<${SHELBYUSD_ADDR}::shelby_usd::ShelbyUSD>`,
      `0x1::coin::CoinStore<${SHELBYUSD_ADDR}::shelbyusd::ShelbyUSD>`,
      `0x1::coin::CoinStore<${SHELBYUSD_ADDR}::shelby::ShelbyUSD>`,
      `0x1::coin::CoinStore<${SHELBYUSD_ADDR}::coin::ShelbyUSD>`,
    ];
    log('BALANCE · Fetching ShelbyUSD...', 'in');
    for (const usdType of usdTypes) {
      try {
        const usdRes = await fetch(`${SHELBY_CONFIG.aptosFullnode}/accounts/${address}/resource/${encodeURIComponent(usdType)}`);
        log('BALANCE · USD try: ' + usdType.slice(0,60) + '... → ' + usdRes.status, 'in');
        if (usdRes.ok) {
          const d = await usdRes.json();
          const val = d?.data?.coin?.value ?? d?.data?.balance;
          if (val != null) {
            usdBal = (parseInt(val) / 1e6).toFixed(2);
            log('ShelbyUSD · ' + usdBal + ' ✓ type: ' + usdType, 'ok');
            break;
          }
        }
      } catch (_) {}
    }

    // ── Fallback: scan semua resources lagi, log semua ──
    if (aptBal === '0.0000' || usdBal === '0.00') {
      const allRes = await fetch(`${SHELBY_CONFIG.aptosFullnode}/accounts/${address}/resources?limit=9999`);
      if (allRes.ok) {
        const all = await allRes.json();
        log('DEBUG · resources with limit=9999: ' + all.length, 'in');
        all.forEach(r => log('RES · ' + r.type + ' | ' + JSON.stringify(r.data).slice(0,60), 'in'));
        // Coba baca APT dari sini
        if (aptBal === '0.0000') {
          const c = all.find(r => r.type?.includes('CoinStore') && r.type?.includes('AptosCoin'));
          if (c?.data?.coin?.value) { aptBal = (parseInt(c.data.coin.value) / 1e8).toFixed(4); log('APT · ' + aptBal + ' (fallback)', 'ok'); }
        }
        if (usdBal === '0.00') {
          const u = all.find(r => r.type?.includes('1b18363a') || r.type?.toLowerCase().includes('shelby'));
          if (u) {
            const v = u.data?.coin?.value ?? u.data?.balance;
            if (v) { usdBal = (parseInt(v) / 1e6).toFixed(2); log('ShelbyUSD · ' + usdBal + ' (fallback)', 'ok'); }
          }
        }
      }
    }
  } catch (e) { log('BALANCE · Error: ' + e.message, 'in'); }

  document.getElementById('sadr').textContent = address.slice(0, 10) + '...' + address.slice(-8);
  document.getElementById('aptBalDisp').textContent = aptBal + ' APT';
  document.getElementById('usdBalDisp').textContent = usdBal + ' ShelbyUSD';

  setTimeout(() => {
    closeModal(); conn = true;
    const b = document.getElementById('walletBtn');
    b.innerHTML = '<span style="width:7px;height:7px;border-radius:50%;background:var(--gr);display:inline-block;animation:p 2s infinite;margin-right:6px;"></span>' + address.slice(0, 6) + '...' + address.slice(-4);
    b.classList.add('conn');
    document.getElementById('wpanel').classList.add('on');
    document.getElementById('ws').textContent = address.slice(0, 10) + '...' + address.slice(-6);
    document.getElementById('apt').textContent = aptBal;
    document.getElementById('usd').textContent = usdBal;
    log('WALLET_CONNECTED · ' + address.slice(0, 14) + '...', 'ok');
    toast('✅ Petra connected!', 'ok');
    fetchOnChainVault();
  }, 1000);
}

// ── DISCONNECT ───────────────────────────────────────
export function openDiscModal() {
  const addr = walletAddress || '—';
  document.getElementById('discAddr').textContent = addr.length > 20 ? addr.slice(0, 16) + '...' + addr.slice(-6) : addr;
  document.getElementById('discModal').classList.add('on');
}
export function closeDiscModal() { document.getElementById('discModal').classList.remove('on'); }
export async function confirmDisconnect() {
  closeDiscModal();
  try { if (walletCore) await walletCore.disconnect().catch(() => {}); } catch (e) {}
  try { if (window.aptos?.disconnect) await window.aptos.disconnect(); } catch (e) {}
  onWalletDisconnected();
}
function onWalletDisconnected() {
  conn = false; files = []; walletAddress = null; walletAccount = null;
  document.getElementById('walletBtn').innerHTML = '🔗 Connect Wallet';
  document.getElementById('walletBtn').classList.remove('conn');
  document.getElementById('wpanel').classList.remove('on');
  render(); stats(); log('DISCONNECTED', 'in'); toast('👋 Disconnected', 'ok');
}

// ── UPLOAD via shelby.js SDK ──────────────────────────
export async function doUp() {
  if (!conn) { toast('❌ Connect wallet first!', 'er'); openModal(); return; }
  if (!sel.length) { toast('❌ Pilih file dulu!', 'er'); return; }

  const fn = sel[0].name;
  const fd = document.getElementById('bd').value.trim() || 'files/' + fn;
  const expiry = document.getElementById('ex').value;
  const usdVal = parseFloat(document.getElementById('usd')?.textContent) || 0;

  // Tampilkan warning tapi jangan block — balance mungkin tidak terbaca karena API
  if (usdVal <= 0) {
    const proceed = confirm(
      '⚠️ ShelbyUSD terbaca 0.\n\n' +
      'Kemungkinan balance belum sync. Mau lanjut upload?\n' +
      '(Kalau gagal, kamu akan diarahkan ke faucet)'
    );
    if (!proceed) return;
  }

  const btn = document.getElementById('upBtn');
  btn.disabled = true; btn.innerHTML = '<span class="sp-ic">⟳</span> Uploading...';
  const pw = document.getElementById('pw'), pf = document.getElementById('pf'), pl = document.getElementById('pl'), pp = document.getElementById('pp');
  pw.classList.add('on'); pf.style.width = '0%';
  log('UPLOAD · ' + fn + ' → ' + fd, 'in');

  const steps = [{ p: 20, l: 'Preparing...' }, { p: 45, l: 'Connecting Shelby...' }, { p: 65, l: 'Signing txn...' }, { p: 85, l: 'Uploading...' }];
  let si = 0;
  const iv = setInterval(() => { if (si >= steps.length) { clearInterval(iv); return; } pf.style.width = steps[si].p + '%'; pl.textContent = steps[si].l; pp.textContent = steps[si].p + '%'; si++; }, 600);

  try {
    const result = await uploadToShelby(sel[0], fd, expiry, walletAccount);
    clearInterval(iv);
    if (result.success) {
      pf.style.width = '100%'; pl.textContent = 'Upload complete ✔'; pp.textContent = '100%';
      files.push({ name: fn, blob: fd, size: sel[0].size, exp: expiry, txn: result.txn, st: 'active' });
      render(); stats();
      log('UPLOAD · Done! TXN: ' + result.txn?.slice(0, 20) + '...', 'ok');
      toast('✅ ' + fn + ' uploaded!', 'ok');
      sel = []; document.getElementById('sp').classList.remove('on');
      document.getElementById('fin').value = ''; document.getElementById('bd').value = '';
    } else {
      throw new Error(result.error || 'Upload failed');
    }
  } catch (err) {
    clearInterval(iv);
    log('UPLOAD · SDK failed: ' + err.message + ' — redirect to Explorer', 'er');
    toast('⚠️ Buka Shelby Explorer...', 'er');
    window.open(SHELBY_CONFIG.explorerUrl + '/upload?dest=' + encodeURIComponent(fd) + '&addr=' + encodeURIComponent(walletAddress), '_blank');
  } finally {
    btn.disabled = false; btn.innerHTML = '🚀 Upload to Sheltrix';
    setTimeout(() => pw.classList.remove('on'), 2000);
  }
}

// ── DOWNLOAD via shelby.js SDK ────────────────────────
export async function dl(i) {
  const f = files[i];
  log('DOWNLOAD · ' + f.blob, 'in');
  try {
    const result = await downloadFromShelby(f.blob);
    if (result.success) {
      const url = URL.createObjectURL(new Blob([result.data]));
      const a = document.createElement('a'); a.href = url; a.download = f.name;
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      URL.revokeObjectURL(url);
      log('DOWNLOAD · ' + f.name + ' saved', 'ok'); toast('✅ ' + f.name + ' downloaded!', 'ok');
    } else throw new Error(result.error);
  } catch (err) {
    log('DOWNLOAD · Error: ' + err.message + ' → explorer', 'in');
    window.open(SHELBY_CONFIG.explorerUrl + '/txn/' + f.txn, '_blank');
  }
}

// ── VAULT FETCH ──────────────────────────────────────
async function fetchOnChainVault() {
  if (!conn || !walletAddress) return;
  try {
    const res = await fetch(`${SHELBY_CONFIG.aptosFullnode}/accounts/${walletAddress}/transactions?limit=25`);
    if (!res.ok) { loadEx(); return; }
    const txns = await res.json(); let found = 0;
    txns.forEach(txn => {
      const fn = txn.payload?.function || '';
      if (/shelby|blob|vault/i.test(fn)) {
        found++;
        const args = txn.payload?.arguments || [];
        const bp = args[0] || 'blob-' + txn.hash?.slice(0, 8);
        if (!files.find(f => f.txn === txn.hash))
          files.push({ name: bp.split('/').pop() || bp, blob: bp, size: parseInt(args[1]) || 0, exp: 'on-chain', txn: txn.hash, st: txn.success ? 'active' : 'expired' });
      }
    });
    if (found > 0) { render(); stats(); log('VAULT · ' + found + ' blob(s)', 'ok'); }
    else { loadEx(); }
  } catch (e) { loadEx(); }
}

// ── FAUCET ───────────────────────────────────────────
export function claimFaucet(type) {
  const isAPT = type === 'apt';
  const url = isAPT ? 'https://docs.shelby.xyz/apis/faucet/aptos' : 'https://docs.shelby.xyz/apis/faucet/shelbyusd';
  const btn = document.getElementById(type + 'Btn'), cd = document.getElementById(type + 'CD');
  btn.innerHTML = '<span class="sp-ic">⟳</span> Opening...';
  setTimeout(() => {
    window.open(url, '_blank');
    btn.innerHTML = isAPT ? '⚡ Go to APT Faucet →' : '💎 Go to ShelbyUSD Faucet →';
    cd.classList.add('on'); cd.textContent = '✅ Faucet dibuka!'; cd.style.color = 'var(--gr)';
    toast('💧 Faucet opened!', 'ok');
  }, 800);
}

// ── FILE + VAULT UI ──────────────────────────────────
export function onSel(inp) {
  sel = Array.from(inp.files); if (!sel.length) return;
  const n = sel.map(f => f.name).join(', ');
  document.getElementById('sp').classList.add('on');
  document.getElementById('sn').textContent = n;
  if (sel.length === 1) document.getElementById('bd').value = 'files/' + sel[0].name;
  log('FILE · ' + n, 'in');
}
export function filt(f, btn) { flt = f; document.querySelectorAll('.tab').forEach(t => t.classList.remove('on')); btn.classList.add('on'); render(); }
function ico(n) { const e = n.split('.').pop().toLowerCase(); return { txt: '📄', pdf: '📕', png: '🖼️', jpg: '🖼️', jpeg: '🖼️', gif: '🎞️', mp4: '🎬', mp3: '🎵', zip: '🗜️', json: '🔧', js: '📜', html: '🌐', css: '🎨', py: '🐍' }[e] || '📦'; }
function fsz(b) { if (b < 1024) return b + ' B'; if (b < 1048576) return (b / 1024).toFixed(1) + ' KB'; return (b / 1048576).toFixed(2) + ' MB'; }
function render() {
  const list = document.getElementById('fl');
  const shown = flt === 'all' ? files : files.filter(f => f.st === flt);
  if (!shown.length) { list.innerHTML = `<div class="em"><div class="ei">📭</div><p style="font-size:12px;font-family:var(--fm)">${flt === 'all' ? 'No files yet.' : 'No ' + flt + ' files.'}</p></div>`; return; }
  list.innerHTML = '';
  [...shown].reverse().forEach((f, i) => {
    const ri = files.indexOf(f); const el = document.createElement('div'); el.className = 'fi2'; el.style.animationDelay = (i * .05) + 's';
    el.innerHTML = `<div class="fic">${ico(f.name)}</div><div class="fin"><div class="fn">${f.blob}</div><div class="fm2">${fsz(f.size)} · ${f.exp} · <a href="${SHELBY_CONFIG.explorerUrl}/txn/${f.txn}" target="_blank">txn ↗</a></div></div><span class="stp st${f.st === 'active' ? 'a' : 'x'}">${f.st}</span><div class="fa"><button class="ib" onclick="window._sx.dl(${ri})">⬇️</button><button class="ib dl" onclick="window._sx.del(${ri})">🗑️</button></div>`;
    list.appendChild(el);
  });
}
function stats() { document.getElementById('sf').textContent = files.length; document.getElementById('ss').textContent = fsz(files.reduce((a, f) => a + (f.size || 0), 0)); }
function loadEx() {
  if (files.length > 0) return;
  files = [
    { name: 'test.txt', blob: 'files/test.txt', size: 42, exp: '2026-12-31', txn: '0x739b618849fc8ee1c18c6e39bbcb2c934e1e7e348979431a96c23417aff11ac2', st: 'active' },
    { name: 'test2.txt', blob: 'files/test2.txt', size: 49, exp: '2026-12-31', txn: '0x3047fcf253033666aa6cbf91d01f2d72306fdef543132c5de27086145ca999c5', st: 'active' },
  ];
  render(); stats(); log('VAULT · Example data', 'in');
}
export function del(i) { const f = files[i]; files.splice(i, 1); render(); stats(); log('DELETE · ' + f.blob, 'er'); toast('🗑️ Deleted', 'ok'); }
export function pwipe() { if (!confirm('Wipe all?')) return; files = []; render(); stats(); log('VAULT_WIPED', 'er'); toast('🗑️ Wiped', 'ok'); }

// ── LOG & TOAST ──────────────────────────────────────
export function log(msg, type = 'ok') {
  const l = document.getElementById('ll'); if (!l) return;
  const el = document.createElement('div'); el.className = 'li l' + type;
  el.innerHTML = `<span class="lt">${ts()}</span><span>${msg}</span>`;
  l.prepend(el); while (l.children.length > 60) l.removeChild(l.lastChild);
}
function ts() { return new Date().toLocaleTimeString('en-US', { hour12: false }); }
const _toast = document.createElement('div');
_toast.style.cssText = 'position:fixed;bottom:28px;right:28px;background:#1e000f;border:1px solid rgba(232,48,122,.3);border-radius:12px;padding:13px 20px;font-size:12px;font-family:var(--fm);z-index:9999;transform:translateY(60px);opacity:0;transition:all .4s cubic-bezier(.34,1.56,.64,1);max-width:320px;display:flex;align-items:center;gap:8px;';
document.addEventListener('DOMContentLoaded', () => document.body.appendChild(_toast));
export function toast(msg, type = 'ok') {
  _toast.textContent = msg;
  _toast.style.borderColor = type === 'ok' ? 'rgba(0,229,160,.3)' : 'rgba(255,92,92,.3)';
  _toast.style.transform = 'translateY(0)'; _toast.style.opacity = '1';
  setTimeout(() => { _toast.style.transform = 'translateY(60px)'; _toast.style.opacity = '0'; }, 3200);
}

// ── MODAL UTILS ──────────────────────────────────────
export function sh(id) { const el = document.getElementById(id); if (el) el.style.display = 'block'; }
export function hd(id) { const el = document.getElementById(id); if (el) el.style.display = 'none'; }
export function openModal() { if (conn) { openDiscModal(); return; } document.getElementById('walletModal').classList.add('on'); sh('s1'); hd('s2'); hd('s3'); hd('s4'); }
export function closeModal() { document.getElementById('walletModal').classList.remove('on'); }
export function rejectSign() { hd('s2'); sh('s1'); toast('❌ Cancelled', 'er'); }
export function clrLog() { document.getElementById('ll').innerHTML = ''; log('LOG_CLEARED', 'in'); }

// ── INIT UI ──────────────────────────────────────────
function initUI() {
  // Stars
  const starsEl = document.getElementById('stars');
  for (let i = 0; i < 180; i++) {
    const s = document.createElement('div'); s.className = 'star';
    const size = Math.random() * 2 + .5;
    s.style.cssText = `width:${size}px;height:${size}px;left:${Math.random() * 100}%;top:${Math.random() * 100}%;--d:${Math.random() * 4 + 2}s;--op:${Math.random() * .7 + .2};animation-delay:${Math.random() * 4}s;`;
    starsEl?.appendChild(s);
  }
  // Cursor
  const C = document.getElementById('cur'), R = document.getElementById('ring');
  let mx = 0, my = 0, rx = 0, ry = 0;
  document.addEventListener('mousemove', e => { mx = e.clientX; my = e.clientY; C.style.left = mx + 'px'; C.style.top = my + 'px'; });
  (function a() { rx += (mx - rx) * .1; ry += (my - ry) * .1; R.style.left = rx + 'px'; R.style.top = ry + 'px'; requestAnimationFrame(a); })();
  document.querySelectorAll('button,a,input,select,.dz,.stat-card,.fi2,.wopt,.faucet-card').forEach(el => {
    el.addEventListener('mouseenter', () => { C.classList.add('h'); R.classList.add('h'); });
    el.addEventListener('mouseleave', () => { C.classList.remove('h'); R.classList.remove('h'); });
  });
  document.addEventListener('mousedown', () => C.classList.add('c'));
  document.addEventListener('mouseup', () => C.classList.remove('c'));
  // Header
  window.addEventListener('scroll', () => { document.getElementById('hdr')?.classList.toggle('scrolled', window.scrollY > 50); });
  // Timestamp
  const itEl = document.getElementById('it');
  if (itEl) { itEl.textContent = ts(); setInterval(() => itEl.textContent = ts(), 1000); }
  // Modal backdrop
  document.getElementById('walletModal')?.addEventListener('click', e => { if (e.target.id === 'walletModal') closeModal(); });
  document.getElementById('discModal')?.addEventListener('click', e => { if (e.target.id === 'discModal') closeDiscModal(); });
  // Drag & drop
  const dz = document.getElementById('dz');
  if (dz) {
    dz.addEventListener('dragover', e => { e.preventDefault(); dz.classList.add('drag'); });
    dz.addEventListener('dragleave', () => dz.classList.remove('drag'));
    dz.addEventListener('drop', e => { e.preventDefault(); dz.classList.remove('drag'); sel = Array.from(e.dataTransfer.files); onSel({ files: e.dataTransfer.files }); });
  }
  // Nav
  document.querySelectorAll('.ni').forEach(a => {
    a.addEventListener('click', e => {
      const href = a.getAttribute('href');
      if (href?.startsWith('#')) { e.preventDefault(); document.querySelector(href)?.scrollIntoView({ behavior: 'smooth' }); document.querySelectorAll('.ni').forEach(n => n.classList.remove('on')); a.classList.add('on'); }
    });
  });
  // Expose ke global untuk onclick di HTML
  window._sx = { connectWallet, openModal, closeModal, openDiscModal, closeDiscModal, confirmDisconnect, doUp, onSel, filt, dl, del, pwipe, clrLog, claimFaucet, rejectSign, toast, log };

  // fcg = faucet card glow (dipanggil dari onmousemove di HTML)
  window.fcg = function(el, e) {
    const r = el.getBoundingClientRect();
    el.style.setProperty('--mx', (e.clientX - r.left) + 'px');
    el.style.setProperty('--my', (e.clientY - r.top) + 'px');
  };
}
