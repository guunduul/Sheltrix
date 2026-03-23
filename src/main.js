async function onWalletConnected(address) {
  log('CONNECTED · ' + address.slice(0, 14) + '...', 'ok');
  hd('s2'); sh('s4');

  let aptBal = '0.0000', usdBal = '0.00';

  const NODE = SHELBY_CONFIG.aptosFullnode;

  // ✅ FA Address
  const FA_APT = '0xa';
  const FA_SHELBY = '0x1b18363a9f1fe5e6ebf247daba5cc1c18052bb232efdc4c50f556053922d98e1';

  // ✅ FIX FUNCTION (INI YANG BENER)
  async function getFABalance(faAddr) {
    try {
      const res = await fetch(`${NODE}/view`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          function: '0x1::fungible_asset::balance',
          type_arguments: [faAddr],
          arguments: [address],
        }),
      });

      if (!res.ok) {
        console.log('❌ RPC ERROR:', res.status);
        return 0;
      }

      const data = await res.json();
      console.log('✅ BALANCE:', faAddr, data);

      return Number(data?.[0] ?? 0);
    } catch (err) {
      console.error('❌ ERROR:', err);
      return 0;
    }
  }

  log('BALANCE · Fetching (Shelby FA)...', 'in');

  try {
    const aptRaw = await getFABalance(FA_APT);
    aptBal = (aptRaw / 1e8).toFixed(4);
    log('APT · ' + aptBal, 'ok');
  } catch (e) {
    log('APT err: ' + e.message, 'er');
  }

  try {
    const shelbyRaw = await getFABalance(FA_SHELBY);
    usdBal = (shelbyRaw / 1e6).toFixed(2);
    log('ShelbyUSD · ' + usdBal, 'ok');
  } catch (e) {
    log('ShelbyUSD err: ' + e.message, 'er');
  }

  // ✅ UPDATE UI
  document.getElementById('sadr').textContent =
    address.slice(0, 10) + '...' + address.slice(-8);

  document.getElementById('aptBalDisp').textContent =
    aptBal + ' APT';

  document.getElementById('usdBalDisp').textContent =
    usdBal + ' ShelbyUSD';

  setTimeout(() => {
    closeModal();
    conn = true;

    const b = document.getElementById('walletBtn');
    b.innerHTML =
      '<span style="width:7px;height:7px;border-radius:50%;background:var(--gr);display:inline-block;animation:p 2s infinite;margin-right:6px;"></span>' +
      address.slice(0, 6) + '...' + address.slice(-4);

    b.classList.add('conn');

    document.getElementById('wpanel').classList.add('on');
    document.getElementById('ws').textContent =
      address.slice(0, 10) + '...' + address.slice(-6);

    document.getElementById('apt').textContent = aptBal;
    document.getElementById('usd').textContent = usdBal;

    log('WALLET_CONNECTED · ' + address.slice(0, 14) + '...', 'ok');
    toast('✅ Wallet connected!', 'ok');

    fetchOnChainVault();
  }, 800);
}