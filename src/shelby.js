// Shelby Network Config
export const SHELBY_CONFIG = {
  network: 'shelbynet',
  rpcEndpoint: 'https://api.shelbynet.shelby.xyz/shelby',
  aptosFullnode: 'https://api.shelbynet.shelby.xyz/v1',
  explorerUrl: 'https://explorer.shelby.xyz/shelbynet',
  blobBaseUrl: 'https://api.shelbynet.shelby.xyz/shelby/v1/blobs',
}

// Upload file ke Shelby Network via sdk/browser
export async function uploadToShelby(file, blobName, expiry, walletAccount) {
  try {
    const { ShelbyClient } = await import('@shelby-protocol/sdk/browser');
    const client = new ShelbyClient({ network: 'shelbynet', apiKey: '' });
    const result = await client.upload({
      source: file,
      destination: blobName,
      expiration: expiry,
    });
    return { success: true, txn: result.txnHash || result.txn_hash, blobName };
  } catch (err) {
    const addr = walletAccount?.address?.toString?.() ?? '';
    return {
      success: false,
      error: err.message,
      redirectUrl: `${SHELBY_CONFIG.explorerUrl}/upload?dest=${encodeURIComponent(blobName)}&addr=${encodeURIComponent(addr)}`
    };
  }
}

// Download file dari Shelby Network
export async function downloadFromShelby(blobName, ownerAddress) {
  try {
    const url = `${SHELBY_CONFIG.blobBaseUrl}/${ownerAddress}/${blobName}`;
    const res = await fetch(url);
    if (res.ok) return { success: true, data: await res.arrayBuffer() };
    return { success: false, error: 'HTTP ' + res.status };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

// Get balance via @aptos-labs/ts-sdk dengan Network.TESTNET
export async function getBalance(address) {
  try {
    const { Aptos, AptosConfig, Network } = await import('@aptos-labs/ts-sdk');
    const aptos = new Aptos(new AptosConfig({ network: Network.TESTNET }));
    const aptAmount = await aptos.getAccountAPTAmount({ accountAddress: address });
    return { apt: (Number(aptAmount) / 1e8).toFixed(4) };
  } catch (err) {
    return { apt: '0' };
  }
}
