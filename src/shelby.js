// Shelby Network Config
export const SHELBY_CONFIG = {
  network: 'shelbynet',
  rpcEndpoint: 'https://api.shelbynet.shelby.xyz/shelby',
  aptosFullnode: 'https://api.shelbynet.shelby.xyz/v1',
  explorerUrl: 'https://explorer.shelby.xyz/shelbynet',
  blobBaseUrl: 'https://api.shelbynet.shelby.xyz/shelby/v1/blobs',
};

// Upload file
export async function uploadToShelby(file, blobName, expiry, walletAccount) {
  try {
    const { ShelbyClient } = await import('@shelby-protocol/sdk/browser');

    const client = new ShelbyClient({
      network: 'shelbynet'
    });

    const result = await client.upload({
      source: new Uint8Array(file), // 🔥 FIX DI SINI
      destination: blobName,
      expiration: expiry,
      account: {
    accountAddress: walletAccount?.accountAddress || walletAccount,
  },
});

    return {
      success: true,
      txn: result.txnHash || result.txn_hash,
      blobName,
    };

  }catch (err) {
  console.error('UPLOAD ERROR:', err);

  return {
    success: false,
    error: err.message
  };
}
}

// Download file
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

// ✅ REAL BALANCE (Fungible Asset)
export async function getBalance(address) {
  const NODE = SHELBY_CONFIG.aptosFullnode;

  // FA addresses
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
    } catch {
      return 0;
    }
  }

  try {
    const aptRaw = await getFABalance(FA_APT);
    const shelbyRaw = await getFABalance(FA_SHELBY);

    return {
      apt: aptRaw,
      shelby: shelbyRaw,
    };
  } catch {
     return { apt: 0, shelby: 0 };
  }
}