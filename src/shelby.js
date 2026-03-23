// Shelby Network Config
export const SHELBY_CONFIG = {
  network: 'shelbynet',
  rpcEndpoint: 'https://api.shelbynet.shelby.xyz/shelby',
  aptosFullnode: 'https://api.shelbynet.shelby.xyz/v1',
  explorerUrl: 'https://explorer.shelby.xyz/shelbynet',
  aptosExplorer: 'https://explorer.aptoslabs.com'
}

// Upload file to Shelby Network
export async function uploadToShelby(file, blobName, expiry, walletAccount) {
  try {
    const { ShelbyClient } = await import('@shelby-protocol/sdk')
    
    const client = new ShelbyClient({
      network: SHELBY_CONFIG.network,
      rpcEndpoint: SHELBY_CONFIG.rpcEndpoint,
      account: walletAccount
    })

    const result = await client.upload({
      source: file,
      destination: blobName,
      expiration: expiry
    })

    return { success: true, txn: result.txnHash, blobName }
  } catch (err) {
    console.error('Upload error:', err)
    return { success: false, error: err.message }
  }
}

// Download file from Shelby Network
export async function downloadFromShelby(blobName) {
  try {
    const { ShelbyClient } = await import('@shelby-protocol/sdk')
    
    const client = new ShelbyClient({
      network: SHELBY_CONFIG.network,
      rpcEndpoint: SHELBY_CONFIG.rpcEndpoint
    })

    const result = await client.download(blobName)
    return { success: true, data: result }
  } catch (err) {
    return { success: false, error: err.message }
  }
}

// Get wallet balance
export async function getBalance(address) {
  try {
    const res = await fetch(
      `${SHELBY_CONFIG.aptosFullnode}/accounts/${address}/resources`
    )
    const resources = await res.json()
    
    const aptResource = resources.find(r => 
      r.type === '0x1::coin::CoinStore<0x1::aptos_coin::AptosCoin>'
    )
    const aptBalance = aptResource 
      ? parseInt(aptResource.data.coin.value) / 1e8 
      : 0

    return { apt: aptBalance.toFixed(2) }
  } catch (err) {
    return { apt: '0' }
  }
}