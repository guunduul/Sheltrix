// Shelby Network Config
export const SHELBY_CONFIG = {
  network: 'shelbynet',
  rpcEndpoint: 'https://api.shelbynet.shelby.xyz/shelby',
  aptosFullnode: 'https://api.shelbynet.shelby.xyz/v1',
  explorerUrl: 'https://explorer.shelby.xyz/shelbynet',
  aptosExplorer: 'https://explorer.aptoslabs.com'
}

/**
 * Upload file ke Shelby Network
 *
 * CATATAN: @shelby-protocol/sdk hanya support Node.js environment.
 * Di browser, upload dilakukan via Shelby Explorer (redirect).
 * Kalau nanti ada Shelby browser SDK atau REST API, update di sini.
 *
 * @param {File} file - File object dari input
 * @param {string} blobName - Destination path di Shelby
 * @param {string} expiry - Expiry period ('1d', '7d', '30d', '1y')
 * @param {object} walletAccount - Account object dari Petra wallet
 * @returns {{ success: boolean, txn?: string, blobName?: string, error?: string, redirectUrl?: string }}
 */
export async function uploadToShelby(file, blobName, expiry, walletAccount) {
  // Coba upload via Shelby REST API
  try {
    const walletAddr = walletAccount?.address?.toString?.()
      ?? walletAccount?.address
      ?? walletAccount?.publicKey?.toString?.()
      ?? null;

    if (!walletAddr) {
      throw new Error('No wallet address available');
    }

    // Build FormData untuk API upload
    const formData = new FormData();
    formData.append('file', file);
    formData.append('destination', blobName);
    formData.append('expiry', expiry);
    formData.append('address', walletAddr);

    // Coba Shelby upload endpoint
    const res = await fetch(`${SHELBY_CONFIG.rpcEndpoint}/upload`, {
      method: 'POST',
      body: formData,
      headers: {
        'X-Wallet-Address': walletAddr,
      }
    });

    if (res.ok) {
      const data = await res.json();
      return {
        success: true,
        txn: data.txn_hash || data.txnHash || data.hash,
        blobName: blobName
      };
    } else {
      // API tidak tersedia atau error — fallback ke explorer redirect
      const redirectUrl = `${SHELBY_CONFIG.explorerUrl}/upload`
        + `?dest=${encodeURIComponent(blobName)}`
        + `&addr=${encodeURIComponent(walletAddr)}`;
      return {
        success: false,
        error: 'API not available (HTTP ' + res.status + ')',
        redirectUrl
      };
    }
  } catch (err) {
    // Network error atau SDK tidak tersedia — redirect ke explorer
    const walletAddr = walletAccount?.address?.toString?.()
      ?? walletAccount?.address ?? '';
    const redirectUrl = `${SHELBY_CONFIG.explorerUrl}/upload`
      + `?dest=${encodeURIComponent(blobName)}`
      + `&addr=${encodeURIComponent(walletAddr)}`;
    return {
      success: false,
      error: err.message,
      redirectUrl
    };
  }
}

/**
 * Download file dari Shelby Network
 * @param {string} blobName - Path blob di Shelby
 * @returns {{ success: boolean, data?: ArrayBuffer, error?: string }}
 */
export async function downloadFromShelby(blobName) {
  try {
    const res = await fetch(
      `${SHELBY_CONFIG.rpcEndpoint}/blob/${encodeURIComponent(blobName)}`
    );
    if (res.ok) {
      const data = await res.arrayBuffer();
      return { success: true, data };
    }
    return { success: false, error: 'HTTP ' + res.status };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

/**
 * Ambil balance APT dan ShelbyUSD dari Shelbynet
 * @param {string} address - Wallet address
 * @returns {{ apt: string, usd: string }}
 */
export async function getBalance(address) {
  try {
    const res = await fetch(
      `${SHELBY_CONFIG.aptosFullnode}/accounts/${address}/resources`
    );
    if (!res.ok) return { apt: '0', usd: '0' };
    const resources = await res.json();

    // APT — Fungible Asset (cara baru)
    const faAPT = resources.find(r =>
      r.type?.includes('0x1::fungible_asset::FungibleStore') ||
      (r.type?.includes('AptosCoin') && r.type?.includes('fungible'))
    );
    // APT — CoinStore (cara lama, fallback)
    const coinAPT = resources.find(r =>
      r.type === '0x1::coin::CoinStore<0x1::aptos_coin::AptosCoin>'
    );

    let apt = '0';
    if (faAPT?.data?.balance != null) {
      apt = (parseInt(faAPT.data.balance) / 1e8).toFixed(4);
    } else if (coinAPT?.data?.coin?.value != null) {
      apt = (parseInt(coinAPT.data.coin.value) / 1e8).toFixed(4);
    }

    // ShelbyUSD
    const usdStore = resources.find(r =>
      r.type?.includes('1b18363a9f1fe5e6ebf247daba5cc1c18052bb232efdc4c50f556053922d98e1') ||
      r.type?.toLowerCase().includes('shelbyusd')
    );
    const usd = usdStore?.data?.balance != null
      ? (parseInt(usdStore.data.balance) / 1e6).toFixed(2)
      : '0';

    return { apt, usd };
  } catch (err) {
    return { apt: '0', usd: '0' };
  }
}
