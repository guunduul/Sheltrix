/**
 * SHELTRIX — src/main.js  (FIXED — production-ready)
 * Wallet: Petra (window.aptos / window.petra) + AIP-62 WalletCore fallback
 * Storage: @shelby-protocol/sdk via shelby.js
 */

// 🔥 IMPORT BUFFER DULU - PALING ATAS
import { Buffer } from 'buffer';
window.Buffer = Buffer;
globalThis.Buffer = Buffer; // 🔥 JUGA SET KE GLOBALTHIS

import { WalletCore } from '@aptos-labs/wallet-adapter-core';
import { uploadToShelby, downloadFromShelby, SHELBY_CONFIG, getBalance } from './shelby.js';

// window._sx is fully initialised inside initUI() after all functions are defined.

// ── STATE ────────────────────────────────────────────
let conn = false, files = [], flt = 'all', sel = [];
let walletAddress = null, walletAccount = null, walletCore = null;

// 🔥 EXPORT walletCore ke global supaya bisa diakses dari shelby.js
window.__walletCore = null;

// ── BOOT ─────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  initUI();
  await initWalletCore();
  log('SHELTRIX · Ready · SDK v0.2.4 loaded', 'ok');
});

// ── WALLET CORE INIT ─────────────────────────────────
async function initWalletCore() {
  try {
    console.log('🔧 Starting WalletCore initialization...');

    walletCore = new WalletCore([], [], {
      onError: (err) => {
        console.error('WalletCore error callback:', err);
        log('WALLET_ERR · ' + (err?.message || err), 'er');
      }
    });

    console.log('✅ WalletCore created');
    window.__walletCore = walletCore; // 🔥 expose segera setelah dibuat
    console.log('🔍 WalletCore methods:', Object.getOwnPropertyNames(Object.getPrototypeOf(walletCore)).join(', '));
    log('WALLET_CORE · Initialized', 'ok');
    
    // ✅ CONNECT EVENT
    console.log('📌 Setting up connect listener...');
    walletCore.on('connect', async (account) => {
      try {
        console.log('✅ Connect event fired, account:', account);
        walletAccount = account;

        let addr = '';
        if (typeof account?.address === 'string') {
          addr = account.address;
        } else if (account?.address?.toString) {
          addr = account.address.toString();
        } else if (account?.accounts?.[0]?.address) {
          addr = account.accounts[0].address.toString();
        }

        console.log('📍 Address extracted:', addr);

        if (!addr || !addr.startsWith('0x')) {
          console.warn('❌ ADDRESS INVALID:', account);
          return;
        }

        walletAddress = addr;
        console.log('🎉 Calling onWalletConnected with:', addr);
        await onWalletConnected(addr);
      } catch (connectErr) {
        console.error('❌ Connect handler error:', connectErr);
      }
    });

    // ✅ DISCONNECT EVENT
    console.log('📌 Setting up disconnect listener...');
    walletCore.on('disconnect', () => {
      try {
        console.log('🔌 Disconnect event fired');
        onWalletDisconnected();
      } catch (disconnectErr) {
        console.error('❌ Disconnect handler error:', disconnectErr);
      }
    });

    // ✅ ACCOUNT CHANGE EVENT
    console.log('📌 Setting up accountChange listener...');
    walletCore.on('accountChange', async (account) => {
      try {
        console.log('🔄 AccountChange event fired, account:', account);
        walletAccount = account;

        let addr = '';
        if (typeof account?.address === 'string') {
          addr = account.address;
        } else if (account?.address?.toString) {
          addr = account.address.toString();
        } else if (account?.accounts?.[0]?.address) {
          addr = account.accounts[0].address.toString();
        }

        if (addr) {
          walletAddress = addr;
          console.log('✅ Account changed to:', addr);
          log('ACCOUNT_CHANGE · ' + addr.slice(0, 12) + '...', 'in');
        }
      } catch (accountChangeErr) {
        console.error('❌ AccountChange handler error:', accountChangeErr);
      }
    });

    console.log('⏳ Waiting 800ms for wallet detection...');
    await new Promise(r => setTimeout(r, 800));

    console.log('✅ Timeout complete');
    
    const detected = walletCore.wallets || [];
    console.log('📱 Detected wallets:', detected.map(w => w.name));
    log('WALLETS · [' + detected.map(w => w.name).join(', ') + ']', 'ok');
    log('WALLET_CORE · Ready', 'ok');

    console.log('✅ WalletCore initialization complete');

  } catch (err) {
    console.error('❌ WalletCore initialization error:', err);
    console.error('   Message:', err?.message);
    console.error('   Stack:', err?.stack);
    
    log('WALLET_CORE · ' + err.message + ' — using fallback', 'in');
    walletCore = null;
  }
}
// helper: extract address from various response formats
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
    if (walletCore) {
      const wallets = walletCore.wallets || [];
      const petra = wallets.find(w =>
        w.name === 'Petra' || w.name?.toLowerCase().includes('petra')
      );

      if (petra) {
        log('CONNECT · Petra → WalletCore', 'in');
        await walletCore.connect(petra.name);
        return;
      }
    }

    toast('❌ Wallet tidak ditemukan', 'er');

  } catch (err) {
    hd('s2'); sh('s1');
    const msg = err?.message || '';

    if (err?.code === 4001 || /cancel|reject|denied|user/i.test(msg)) {
      toast('❌ Dibatalkan', 'er');
      log('CONNECT · Cancelled', 'er');
    } else {
      toast('❌ ' + msg, 'er');
      log('ERROR · ' + msg, 'er');
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

 walletAccount = window.aptos; // ✅ ambil wallet asli Petra

let addr = '';

try {
  const acc = await window.aptos.account();
  addr = acc.address;
} catch (e) {
  log('ERROR · Cannot get address: ' + e.message, 'er');
  return;
}

if (!addr) {
  hd('s2'); sh('s1');
  log('ERROR · Address kosong', 'er');
  toast('❌ Gagal ambil address wallet', 'er');
  return;
}

walletAddress = addr;
onWalletConnected(addr);
}

// ── ON CONNECTED ─────────────────────────────────────
// FIX: The original code had a stray `}` after `let aptBal = '0.0000', usdBal = '0.00';`
// which closed the function early. Everything below that line was running at
// module scope and crashing. This is now one clean, complete function.
// 🔥 When wallet connected
async function onWalletConnected(address) {
  try {
    console.log('🎯 onWalletConnected called with:', address);
    
    conn = true;
    walletAddress = address;

    log('CONNECTED · ' + address.slice(0, 14) + '...', 'ok');
    hd('s2'); 
    sh('s4');

    // 🔥 CREATE proper Account object untuk Shelby SDK
    console.log('📦 Creating Account object for Shelby SDK...');
    
    const accountForShelby = {
      accountAddress: address,
      publicKey: walletAccount?.publicKey || null,
      signingScheme: 'single_signature_scheme',
      
      sign: async (message) => {
        try {
          console.log('🔐 Signing message...');
          if (walletCore && typeof walletCore.signMessage === 'function') {
            const signature = await walletCore.signMessage({
              message: message,
              nonce: Math.random().toString(36).substring(7),
            });
            console.log('✅ Signed');
            return signature;
          }
          throw new Error('Wallet signing not available');
        } catch (err) {
          console.error('Sign error:', err);
          throw err;
        }
      },

      signTransaction: async (transaction) => {
        try {
          console.log('🔐 Signing transaction...');
          if (walletCore && typeof walletCore.signTransaction === 'function') {
            const signed = await walletCore.signTransaction(transaction);
            console.log('✅ Transaction signed');
            return signed;
          }
          throw new Error('Transaction signing not available');
        } catch (err) {
          console.error('Sign transaction error:', err);
          throw err;
        }
      }
    };
  
 console.log('✅ Account object created:', accountForShelby.accountAddress);
    
    window.__accountForShelby = accountForShelby;
    window.__walletCore = walletCore;

    // Get balance
    let aptBal = '0.0000', usdBal = '0.00';
    try {
      const bal = await getBalance(address);
      aptBal = formatToken(bal.apt, 8);
      usdBal = formatToken(bal.shelby, 4);
      log('BALANCE · APT=' + aptBal + ' Shelby=' + usdBal, 'ok');
    } catch (e) {
      console.warn('Balance fetch error:', e?.message);
      log('BALANCE_ERROR · ' + e.message, 'er');
    }

    // Update UI
    const addrEl = document.getElementById('ad');
    if (addrEl) {
      addrEl.textContent = address.slice(0, 6) + '...' + address.slice(-4);
      addrEl.title = address;
    }

    const balEl = document.getElementById('bl');
    if (balEl) {
      balEl.textContent = aptBal + ' APT · ' + usdBal + ' USD';
    }

    toast('✅ Wallet connected!', 'ok');

    // Update additional UI elements
    const sadr = document.getElementById('sadr');
    if (sadr) sadr.textContent = address.slice(0, 10) + '...' + address.slice(-8);
    const aptBalDisp = document.getElementById('aptBalDisp');
    if (aptBalDisp) aptBalDisp.textContent = aptBal + ' APT';
    const usdBalDisp = document.getElementById('usdBalDisp');
    if (usdBalDisp) usdBalDisp.textContent = usdBal + ' ShelbyUSD';

    setTimeout(() => {
      closeModal();

      const b = document.getElementById('walletBtn');
      if (b) {
        b.innerHTML =
          '<span style="width:7px;height:7px;border-radius:50%;background:var(--gr);display:inline-block;animation:p 2s infinite;margin-right:6px;"></span>' +
          address.slice(0, 6) + '...' + address.slice(-4);
        b.classList.add('conn');
      }

      const wpanel = document.getElementById('wpanel');
      if (wpanel) wpanel.classList.add('on');

      const ws = document.getElementById('ws');
      if (ws) ws.textContent = address.slice(0, 10) + '...' + address.slice(-6);

      const apt = document.getElementById('apt');
      if (apt) apt.textContent = aptBal;

      const usd = document.getElementById('usd');
      if (usd) usd.textContent = usdBal;

      log('WALLET_CONNECTED · ' + address.slice(0, 14) + '...', 'ok');
      fetchOnChainVault();
    }, 1000);

    console.log('✅ onWalletConnected complete');

  } catch (err) {
    console.error('❌ onWalletConnected error:', err);
    log('CONNECT_ERROR · ' + err.message, 'er');
  }
}

// 🔥 When wallet disconnected
async function onWalletDisconnected() {
  try {
    console.log('🔌 onWalletDisconnected called');
    
    conn = false;
    walletAddress = null;
    walletAccount = null;
    files = [];
    window.__accountForShelby = null;
    window.__walletCore = null;

    log('DISCONNECTED', 'in');
    hd('s4');
    sh('s2');

    const addrEl = document.getElementById('ad');
    if (addrEl) addrEl.textContent = 'Connect';

    const balEl = document.getElementById('bl');
    if (balEl) balEl.textContent = '- APT · - USD';

    const wb = document.getElementById('walletBtn');
    if (wb) { wb.innerHTML = '🔗 Connect Wallet'; wb.classList.remove('conn'); }

    const wpanel = document.getElementById('wpanel');
    if (wpanel) wpanel.classList.remove('on');

    render(); stats();
    toast('👋 Disconnected', 'ok');
    
    console.log('✅ onWalletDisconnected complete');
  } catch (err) {
    console.error('❌ onWalletDisconnected error:', err);
  }
}

// ── FORMAT TOKEN ─────────────────────────────────────
function formatToken(amount, decimals = 6) {
  if (!amount) return '0.00';
  return (Number(amount) / Math.pow(10, decimals)).toFixed(4);
}

// ── DISCONNECT ───────────────────────────────────────
export function openDiscModal() {
  const addr = walletAddress || '—';
  const discAddr = document.getElementById('discAddr');
  if (discAddr) discAddr.textContent = addr.length > 20 ? addr.slice(0, 16) + '...' + addr.slice(-6) : addr;
  const discModal = document.getElementById('discModal');
  if (discModal) discModal.classList.add('on');
}

export function closeDiscModal() {
  const discModal = document.getElementById('discModal');
  if (discModal) discModal.classList.remove('on');
}

export async function confirmDisconnect() {
  closeDiscModal();
  try { if (walletCore) await walletCore.disconnect().catch(() => { }); } catch (e) { }
  try { if (window.aptos?.disconnect) await window.aptos.disconnect(); } catch (e) { }
  onWalletDisconnected();
}

// (onWalletDisconnected defined above as async export)

// ── UPLOAD via direct RPC ──────────────────────────
export async function doUp() {
  if (!conn) { toast('❌ Connect wallet first!', 'er'); openModal(); return; }
  if (!sel.length) { toast('❌ Pilih file dulu!', 'er'); return; }

  const fn = sel[0].name;
  const fd = document.getElementById('bd').value.trim() || 'files/' + fn;
  const expiry = document.getElementById('ex').value;

  const btn = document.getElementById('upBtn');
  if (btn) { btn.disabled = true; btn.innerHTML = '<span class="sp-ic">⟳</span> Uploading...'; }

  const pw = document.getElementById('pw');
  const pf = document.getElementById('pf');
  const pl = document.getElementById('pl');
  const pp = document.getElementById('pp');

  if (pw) pw.classList.add('on');
  if (pf) pf.style.width = '0%';

  log('UPLOAD · ' + fn + ' → ' + fd, 'in');

  try {
    if (!walletAddress) {
      throw new Error('Wallet not connected');
    }

    const fileBuffer = await sel[0].arrayBuffer();

    log('UPLOAD · Starting...', 'in');
    toast('📤 Uploading...', 'ok');

    // 🔥 SIMPLE DIRECT CALL
    const result = await uploadToShelby(
      fileBuffer,
      fd,
      expiry,
      walletAccount,
      walletAddress
    );

    if (result.success) {
      if (pf) pf.style.width = '100%';
      if (pl) pl.textContent = 'Upload complete ✔';
      if (pp) pp.textContent = '100%';

      files.push({
        name: fn,
        blob: fd,
        size: sel[0].size,
        exp: expiry,
        txn: result.txn,
        st: 'active'
      });

      render();
      stats();

      log('UPLOAD · Done! TXN: ' + result.txn?.slice(0, 20) + '...', 'ok');
      toast('✅ Uploaded!', 'ok');

      sel = [];

    } else {
      throw new Error(result.error);
    }

  } catch (err) {
    console.error('Error:', err?.message);
    log('UPLOAD · FAILED: ' + err.message, 'er');
    toast('❌ ' + err.message, 'er');
  }

  if (btn) { btn.disabled = false; btn.innerHTML = '🚀 Upload to Sheltrix'; }
  setTimeout(() => { if (pw) pw.classList.remove('on'); }, 1500);
}

// ── DOWNLOAD via shelby.js SDK ────────────────────────
export async function dl(i) {
  const f = files[i];
  log('DOWNLOAD · ' + f.blob, 'in');
  try {
    const result = await downloadFromShelby(f.blob, walletAddress);
    if (result.success) {
      const url = URL.createObjectURL(new Blob([result.data]));
      const a = document.createElement('a'); a.href = url; a.download = f.name;
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      URL.revokeObjectURL(url);
      log('DOWNLOAD · ' + f.name + ' saved', 'ok'); toast('✅ ' + f.name + ' downloaded!', 'ok');
    } else {
      throw new Error(result.error);
    }
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
    const txns = await res.json();
    let found = 0;
    txns.forEach(txn => {
      const fn = txn.payload?.function || '';
      if (/shelby|blob|vault/i.test(fn)) {
        found++;
        const args = txn.payload?.arguments || [];
        const bp = args[0] || 'blob-' + txn.hash?.slice(0, 8);
        if (!files.find(f => f.txn === txn.hash))
          files.push({
            name: bp.split('/').pop() || bp,
            blob: bp,
            size: parseInt(args[1]) || 0,
            exp: 'on-chain',
            txn: txn.hash,
            st: txn.success ? 'active' : 'expired'
          });
      }
    });
    if (found > 0) { render(); stats(); log('VAULT · ' + found + ' blob(s)', 'ok'); }
    else { loadEx(); }
  } catch (e) {
    loadEx();
  }
}

// ── FAUCET ───────────────────────────────────────────
export function claimFaucet(type) {
  const isAPT = type === 'apt';
  const url = isAPT
    ? 'https://docs.shelby.xyz/apis/faucet/aptos'
    : 'https://docs.shelby.xyz/apis/faucet/shelbyusd';
  const btn = document.getElementById(type + 'Btn');
  const cd = document.getElementById(type + 'CD');
  if (btn) btn.innerHTML = '<span class="sp-ic">⟳</span> Opening...';
  setTimeout(() => {
    window.open(url, '_blank');
    if (btn) btn.innerHTML = isAPT ? '⚡ Go to APT Faucet →' : '💎 Go to ShelbyUSD Faucet →';
    if (cd) { cd.classList.add('on'); cd.textContent = '✅ Faucet dibuka!'; cd.style.color = 'var(--gr)'; }
    toast('💧 Faucet opened!', 'ok');
  }, 800);
}

// ── FILE + VAULT UI ──────────────────────────────────
export function onSel(inp) {
  sel = Array.from(inp.files); if (!sel.length) return;
  const n = sel.map(f => f.name).join(', ');
  const sp = document.getElementById('sp');
  if (sp) sp.classList.add('on');
  const sn = document.getElementById('sn');
  if (sn) sn.textContent = n;
  if (sel.length === 1) {
    const bd = document.getElementById('bd');
    if (bd) bd.value = 'files/' + sel[0].name;
  }
  log('FILE · ' + n, 'in');
}

export function filt(f, btn) {
  flt = f;
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('on'));
  btn.classList.add('on');
  render();
}

function ico(n) {
  const e = n.split('.').pop().toLowerCase();
  return { txt: '📄', pdf: '📕', png: '🖼️', jpg: '🖼️', jpeg: '🖼️', gif: '🎞️', mp4: '🎬', mp3: '🎵', zip: '🗜️', json: '🔧', js: '📜', html: '🌐', css: '🎨', py: '🐍' }[e] || '📦';
}

function fsz(b) {
  if (b < 1024) return b + ' B';
  if (b < 1048576) return (b / 1024).toFixed(1) + ' KB';
  return (b / 1048576).toFixed(2) + ' MB';
}

function render() {
  const list = document.getElementById('fl');
  if (!list) return;
  const shown = flt === 'all' ? files : files.filter(f => f.st === flt);
  if (!shown.length) {
    list.innerHTML = `<div class="em"><div class="ei">📭</div><p style="font-size:12px;font-family:var(--fm)">${flt === 'all' ? 'No files yet.' : 'No ' + flt + ' files.'}</p></div>`;
    return;
  }
  list.innerHTML = '';
  [...shown].reverse().forEach((f, i) => {
    const ri = files.indexOf(f);
    const el = document.createElement('div');
    el.className = 'fi2';
    el.style.animationDelay = (i * .05) + 's';
    el.innerHTML = `<div class="fic">${ico(f.name)}</div><div class="fin"><div class="fn">${f.blob}</div><div class="fm2">${fsz(f.size)} · ${f.exp} · <a href="${SHELBY_CONFIG.explorerUrl}/txn/${f.txn}" target="_blank">txn ↗</a></div></div><span class="stp st${f.st === 'active' ? 'a' : 'x'}">${f.st}</span><div class="fa"><button class="ib" onclick="window._sx.dl(${ri})">⬇️</button><button class="ib dl" onclick="window._sx.del(${ri})">🗑️</button></div>`;
    list.appendChild(el);
  });
}

function stats() {
  const sf = document.getElementById('sf');
  const ss = document.getElementById('ss');
  if (sf) sf.textContent = files.length;
  if (ss) ss.textContent = fsz(files.reduce((a, f) => a + (f.size || 0), 0));
}

function loadEx() {
  if (files.length > 0) return;
  files = [
    { name: 'test.txt', blob: 'files/test.txt', size: 42, exp: '2026-12-31', txn: '0x739b618849fc8ee1c18c6e39bbcb2c934e1e7e348979431a96c23417aff11ac2', st: 'active' },
    { name: 'test2.txt', blob: 'files/test2.txt', size: 49, exp: '2026-12-31', txn: '0x3047fcf253033666aa6cbf91d01f2d72306fdef543132c5de27086145ca999c5', st: 'active' },
  ];
  render(); stats(); log('VAULT · Example data', 'in');
}

export function del(i) {
  const f = files[i];
  files.splice(i, 1);
  render(); stats();
  log('DELETE · ' + f.blob, 'er');
  toast('🗑️ Deleted', 'ok');
}

export function pwipe() {
  if (!confirm('Wipe all?')) return;
  files = [];
  render(); stats();
  log('VAULT_WIPED', 'er');
  toast('🗑️ Wiped', 'ok');
}

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

export function openModal() {
  if (conn) { openDiscModal(); return; }
  const modal = document.getElementById('walletModal');
  if (modal) modal.classList.add('on');
  sh('s1'); hd('s2'); hd('s3'); hd('s4');
}

export function closeModal() {
  const modal = document.getElementById('walletModal');
  if (modal) modal.classList.remove('on');
}

export function rejectSign() { hd('s2'); sh('s1'); toast('❌ Cancelled', 'er'); }
export function clrLog() { const ll = document.getElementById('ll'); if (ll) ll.innerHTML = ''; log('LOG_CLEARED', 'in'); }

// ── INIT UI ──────────────────────────────────────────
function initUI() {
  // ── Stars ──
  try {
    const starsEl = document.getElementById('stars');
    if (starsEl) {
      for (let i = 0; i < 180; i++) {
        const s = document.createElement('div'); s.className = 'star';
        const size = Math.random() * 2 + .5;
        s.style.cssText = `width:${size}px;height:${size}px;left:${Math.random() * 100}%;top:${Math.random() * 100}%;--d:${Math.random() * 4 + 2}s;--op:${Math.random() * .7 + .2};animation-delay:${Math.random() * 4}s;`;
        starsEl.appendChild(s);
      }
    }
  } catch (e) { /* non-fatal */ }

  // ── Custom cursor ──
  // FIX: wrapped in try/catch so a missing element never kills the whole init.
  // Also: the cursor elements have pointer-events:none in CSS so they never
  // block click events.
  try {
    const C = document.getElementById('cur');
    const R = document.getElementById('ring');
    if (C && R) {
      let mx = 0, my = 0, rx = 0, ry = 0;
      document.addEventListener('mousemove', e => {
        mx = e.clientX; my = e.clientY;
        C.style.left = mx + 'px'; C.style.top = my + 'px';
      });
      (function a() {
        rx += (mx - rx) * .1; ry += (my - ry) * .1;
        R.style.left = rx + 'px'; R.style.top = ry + 'px';
        requestAnimationFrame(a);
      })();
      document.querySelectorAll('button,a,input,select,.dz,.stat-card,.fi2,.wopt,.faucet-card').forEach(el => {
        el.addEventListener('mouseenter', () => { C.classList.add('h'); R.classList.add('h'); });
        el.addEventListener('mouseleave', () => { C.classList.remove('h'); R.classList.remove('h'); });
      });
      document.addEventListener('mousedown', () => C.classList.add('c'));
      document.addEventListener('mouseup', () => C.classList.remove('c'));
    }
  } catch (e) { /* non-fatal — cursor degrades gracefully */ }

  // ── Header scroll ──
  window.addEventListener('scroll', () => {
    document.getElementById('hdr')?.classList.toggle('scrolled', window.scrollY > 50);
  });

  // ── Timestamp ──
  const itEl = document.getElementById('it');
  if (itEl) { itEl.textContent = ts(); setInterval(() => itEl.textContent = ts(), 1000); }

  // ── Modal backdrop click ──
  document.getElementById('walletModal')?.addEventListener('click', e => {
    if (e.target.id === 'walletModal') closeModal();
  });
  document.getElementById('discModal')?.addEventListener('click', e => {
    if (e.target.id === 'discModal') closeDiscModal();
  });

  // ── Drag & drop ──
  const dz = document.getElementById('dz');
  if (dz) {
    dz.addEventListener('dragover', e => { e.preventDefault(); dz.classList.add('drag'); });
    dz.addEventListener('dragleave', () => dz.classList.remove('drag'));
    dz.addEventListener('drop', e => {
      e.preventDefault(); dz.classList.remove('drag');
      sel = Array.from(e.dataTransfer.files);
      onSel({ files: e.dataTransfer.files });
    });
  }

  // ── Nav smooth scroll ──
  document.querySelectorAll('.ni').forEach(a => {
    a.addEventListener('click', e => {
      const href = a.getAttribute('href');
      if (href?.startsWith('#')) {
        e.preventDefault();
        document.querySelector(href)?.scrollIntoView({ behavior: 'smooth' });
        document.querySelectorAll('.ni').forEach(n => n.classList.remove('on'));
        a.classList.add('on');
      }
    });
  });

  // ── window._sx — expose ALL handlers for HTML onclick attributes ──
  // FIX: the original _sx only exposed openModal/closeModal/closeDiscModal/
  // confirmDisconnect, so every other onclick (connectWallet, onSel, doUp,
  // filt, dl, del, pwipe, claimFaucet, clrLog) threw "window._sx.X is not
  // a function", making the entire UI unresponsive.
  window._sx = {
    openModal,
    closeModal,
    openDiscModal,
    closeDiscModal,
    confirmDisconnect,
    connectWallet,
    onSel,
    doUp,
    filt,
    dl,
    del,
    pwipe,
    claimFaucet,
    clrLog,
    rejectSign,
    sh,
    hd,
  };

  // ── Faucet card glow (called from onmousemove in HTML) ──
  window.fcg = function (el, e) {
    const r = el.getBoundingClientRect();
    el.style.setProperty('--mx', (e.clientX - r.left) + 'px');
    el.style.setProperty('--my', (e.clientY - r.top) + 'px');
  };
}
