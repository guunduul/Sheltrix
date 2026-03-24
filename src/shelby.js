// ============================================================
//  SHELTRIX — shelby.js  (FIXED v7)
//  register_blob args (dari contoh tx nyata di shelbynet):
//  1. blob_name        : String
//  2. expiry_micros    : u64
//  3. commitment       : vector<u8>  ← SHA-256 sebagai array bytes
//  4. num_chunksets    : u32
//  5. size_bytes       : u64
//  6. encoding         : u8
//  7. extra            : u8
// ============================================================

export const SHELBY_CONFIG = {
  network: 'shelbynet',
  rpcEndpoint: 'https://api.shelbynet.shelby.xyz/shelby',
  aptosFullnode: 'https://api.shelbynet.shelby.xyz/v1',
  explorerUrl: 'https://explorer.shelby.xyz/shelbynet',
  blobBaseUrl: 'https://api.shelbynet.shelby.xyz/shelby/v1/blobs',
  CONTRACT: '0x85fdb9a176ab8ef1d9d9c1b60d60b3924f0800ac1de1cc2085fb0b8bb4988e6a',
};

function errMsg(e) {
  if (!e) return 'Unknown error';
  if (typeof e === 'string') return e;
  if (e?.message) return e.message;
  try { return JSON.stringify(e); } catch { return String(e); }
}

// SHA-256 → array of numbers [59, 61, 191, ...] (vector<u8>)
async function sha256Bytes(buffer) {
  const hashBuf = await crypto.subtle.digest('SHA-256', buffer);
  return Array.from(new Uint8Array(hashBuf));
}

// ── UPLOAD ENTRY POINT ───────────────────────────────────────
export async function uploadToShelby(file, blobName, expiry, walletAccount, walletAddress) {
  try {
    console.log('📤 uploadToShelby:', blobName, walletAddress);
    if (!walletAddress) return { success: false, error: 'Wallet tidak terkoneksi' };

    const regResult = await registerBlobOnChain(blobName, file, expiry, walletAddress);
    if (!regResult.success) return { success: false, error: regResult.error };
    console.log('✅ register_blob tx:', regResult.txn);

    const uploadResult = await uploadDataToRPC(file, blobName, walletAddress);
    if (!uploadResult.success) {
      console.warn('⚠️ RPC upload gagal:', uploadResult.error);
    }

    return { success: true, txn: regResult.txn, blobName };
  } catch (err) {
    return { success: false, error: errMsg(err) };
  }
}

// ── STEP 1: REGISTER BLOB ON-CHAIN ──────────────────────────
async function registerBlobOnChain(blobName, fileData, expiry, walletAddress) {
  try {
    const wc = window.__walletCore;
    if (!wc) return { success: false, error: 'WalletCore tidak tersedia' };

    let expiryMicros;
    if (expiry && /^\d{4}-\d{2}-\d{2}$/.test(expiry)) {
      expiryMicros = String(new Date(expiry).getTime() * 1000);
    } else {
      expiryMicros = String((Date.now() + 365 * 24 * 60 * 60 * 1000) * 1000);
    }

    const fileSize = String(fileData.byteLength || fileData.length || 0);
    const commitment = await sha256Bytes(fileData);
    console.log('🔐 commitment length:', commitment.length, 'bytes');

    const transactionInput = {
      data: {
        function: `${SHELBY_CONFIG.CONTRACT}::blob_metadata::register_blob`,
        typeArguments: [],
        functionArguments: [
          blobName,
          expiryMicros,
          commitment,
          1,
          fileSize,
          0,
          0,
        ],
      },
    };

    console.log('📋 register_blob args:', transactionInput.data.functionArguments);
    console.log('✍️ Requesting wallet signature...');

    let result;
    try {
      result = await wc.signAndSubmitTransaction(transactionInput);
    } catch (e) {
      throw new Error(errMsg(e));
    }

    console.log('✅ result:', result);

    const txHash =
      result?.args?.hash ||
      result?.hash ||
      result?.transaction_hash ||
      (typeof result === 'string' ? result : null);

    return { success: true, txn: txHash || 'submitted' };
  } catch (err) {
    console.error('❌ registerBlobOnChain:', errMsg(err));
    return { success: false, error: errMsg(err) };
  }
}

// ── STEP 2: UPLOAD DATA KE SHELBY RPC ───────────────────────
async function uploadDataToRPC(fileData, blobName, walletAddress) {
  try {
    const url = `${SHELBY_CONFIG.blobBaseUrl}/${walletAddress}/${blobName}`;
    console.log('📡 PUT', url);

    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        'Content-Length': String(fileData.byteLength || fileData.length || 0),
      },
      body: fileData,
    });

    if (response.ok || response.status === 204) {
      console.log('✅ RPC upload success');
      return { success: true };
    }

    const errText = await response.text().catch(() => String(response.status));
    return { success: false, error: `HTTP ${response.status}: ${errText}` };
  } catch (err) {
    return { success: false, error: errMsg(err) };
  }
}

// ── LEGACY EXPORT ────────────────────────────────────────────
export async function uploadToShelbyRPC(file, blobName, expiry, walletAccount, walletAddress) {
  return uploadToShelby(file, blobName, expiry, walletAccount, walletAddress);
}

// ── DOWNLOAD ─────────────────────────────────────────────────
export async function downloadFromShelby(blobName, ownerAddress) {
  try {
    const url = `${SHELBY_CONFIG.blobBaseUrl}/${ownerAddress}/${blobName}`;
    console.log('📥 Downloading:', url);
    const res = await fetch(url);
    if (res.ok) return { success: true, data: await res.arrayBuffer() };
    return { success: false, error: 'HTTP ' + res.status };
  } catch (err) {
    return { success: false, error: errMsg(err) };
  }
}

// ── GET BALANCE ───────────────────────────────────────────────
export async function getBalance(address) {
  const NODE = SHELBY_CONFIG.aptosFullnode;
  const FA_APT = '0xa';
  const FA_SHELBY = '0x1b18363a9f1fe5e6ebf247daba5cc1c18052bb232efdc4c50f556053922d98e1';

  async function getFABalance(faAddr) {
    try {
      const res = await fetch(`${NODE}/view`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          function: '0x1::primary_fungible_store::balance',
          type_arguments: ['0x1::fungible_asset::Metadata'],
          arguments: [address, faAddr],
        }),
      });
      if (!res.ok) return 0;
      const data = await res.json();
      return Number(data?.[0] ?? 0);
    } catch { return 0; }
  }

  try {
    const [aptRaw, shelbyRaw] = await Promise.all([
      getFABalance(FA_APT),
      getFABalance(FA_SHELBY),
    ]);
    return { apt: aptRaw, shelby: shelbyRaw };
  } catch {
    return { apt: 0, shelby: 0 };
  }
}
