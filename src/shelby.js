// Shelby Network Config
export const SHELBY_CONFIG = {
  network: 'shelbynet',
  rpcEndpoint: 'https://api.shelbynet.shelby.xyz/shelby',
  aptosFullnode: 'https://api.shelbynet.shelby.xyz/v1',
  explorerUrl: 'https://explorer.shelby.xyz/shelbynet',
  blobBaseUrl: 'https://api.shelbynet.shelby.xyz/shelby/v1/blobs',
};

// Upload file ke Shelby Network
export async function uploadToShelby(file, blobName, expiry, walletAccount) {
  try {
    const { ShelbyClient } = await import('@shelby-protocol/sdk/browser');
    const client = new ShelbyClient({ network: 'shelbynet', apiKey: '' });

    const result = await client.upload({
      source: file,
      destination: blobName,
      expiration: expiry,
    });

    return {
      success: true,
      txn: result.txnHash || result.txn_hash,
      blobName,
    };
  } catch (err) {
    const addr = walletAccount?.address?.toString?.() ?? '';

    return {
      success: false,
      error: err.message,
      redirectUrl: `${SHELBY_CONFIG.explorerUrl}/upload?dest=${encodeURIComponent(blobName)}&addr=${encodeURIComponent(addr)}`,
    };
  }
}

// Download file dari Shelby Network
export async function downloadFromShelby(blobName, ownerAddress) {
  try {
    const url = `${SHELBY_CONFIG.blobBaseUrl}/${ownerAddress}/${blobName}`;
    const res = await fetch(url);

    if (res.ok) {
      return { success: true, data: await res.arrayBuffer() };
    }

    return { success: false, error: 'HTTP ' + res.status };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

// =========================
// 🔥 FIX BALANCE SECTION
// =========================

// Ambil balance Shelby (Fungible Asset)
export async function getBalance(address) {
  const NODE = SHELBY_CONFIG.aptosFullnode;

  // ✅ FA Address (WAJIB BENAR)
  const FA_APT = '0xa';
  const FA_SHELBY = '0x1b18363a9f1fe5e6ebf247daba5cc1c18052bb232efdc4c50f556053922d98e1';

  async function getFABalance(faAddr) {
    try {
      const res = await fetch(`${NODE}/view`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          // ✅ FIX DI SINI (INI YANG BENER)
          function: '0x1::fungible_asset::balance',
          type_arguments: [faAddr],
          arguments: [address],
        }),
      });

      if (!res.ok) {
        console.log('❌ RPC Error:', res.status);
        return 0;
      }

      const data = await res.json();

      console.log('✅ Balance Result:', faAddr, data);

      return Number(data?.[0] ?? 0);
    } catch (err) {
      console.error('❌ Fetch Error:', err);
      return 0;
    }
  }

  try {
    console.log('🔍 Checking balance for:', address);

    const aptRaw = await getFABalance(FA_APT);
    const shelbyRaw = await getFABalance(FA_SHELBY);

    return {
      apt: (aptRaw / 1e8).toFixed(4),
      shelby: (shelbyRaw / 1e6).toFixed(2),
    };
  } catch (err) {
    console.error('❌ Balance error:', err);

    return {
      apt: '0.0000',
      shelby: '0.00',
    };
  }
}