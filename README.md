# 🗄️ Sheltrix — Decentralized File Vault

<div align="center">

![Sheltrix Banner](https://sheltrix-vault.vercel.app)

**Secure Files. Absolute Control.**

[![Live Demo](https://img.shields.io/badge/🌐_Live_Demo-sheltrix--vault.vercel.app-e8307a?style=for-the-badge)](https://sheltrix-vault.vercel.app)
[![Built on Shelby](https://img.shields.io/badge/Built_on-Shelby_Network-7c3aed?style=for-the-badge)](https://shelby.xyz)
[![Aptos](https://img.shields.io/badge/Powered_by-Aptos-00d4aa?style=for-the-badge)](https://aptoslabs.com)
[![Network](https://img.shields.io/badge/Network-Shelbynet-ff2d8a?style=for-the-badge)](https://explorer.shelby.xyz/shelbynet)

</div>

---

## 📖 Overview

**Sheltrix** is a modern decentralized file vault designed for secure, efficient, and seamless data storage on the **Shelby Network**. Built with a focus on privacy and performance, Sheltrix enables users to upload, manage, and access files with full control over their data.

With an intuitive interface and blockchain-integrated architecture, Sheltrix transforms traditional file storage into a trustless and transparent experience. Every file interaction is optimized for speed, security, and long-term reliability.

> 🔗 **Live at:** [https://sheltrix-vault.vercel.app](https://sheltrix-vault.vercel.app)

---

## ✨ Features

| Feature | Description |
|--------|-------------|
| 🔗 **Petra Wallet Connect** | Real Aptos wallet integration with signature verification |
| 📤 **Decentralized Upload** | Upload files directly to Shelby Network testnet |
| 🗄️ **Vault Management** | View, download, and delete your stored blobs |
| 💧 **Faucet Integration** | Claim APT & ShelbyUSD testnet tokens |
| 🔍 **Explorer Links** | Every transaction linked to Aptos & Shelby Explorer |
| ⚡ **Protocol Log** | Real-time on-chain activity tracking |
| 🌌 **Space UI** | Immersive dark space theme with custom cursor |

---

## 🛠️ Tech Stack

- **Frontend:** Vanilla HTML, CSS, JavaScript
- **Build Tool:** Vite
- **Blockchain:** Aptos (Shelbynet testnet)
- **Storage Protocol:** Shelby Network
- **Wallet:** Petra Wallet (Aptos)
- **SDK:** `@shelby-protocol/sdk` v0.2.4
- **Wallet Adapter:** `@aptos-labs/wallet-adapter-core`
- **Deployment:** Vercel

---

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) v18+
- [Petra Wallet](https://chromewebstore.google.com/detail/petra-aptos-wallet/ejjladinnckdgjemekebdpeokbikhfci) browser extension
- Shelbynet configured in Petra

### Installation

```bash
# Clone the repository
git clone https://github.com/guunduul/Sheltrix.git
cd Sheltrix

# Install dependencies
npm install

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Build for Production

```bash
npm run build
```

---

## 🔧 Setup Shelbynet in Petra Wallet

1. Open Petra Wallet extension
2. Go to **Settings → Network**
3. Add custom network:
   - **Name:** `Shelbynet`
   - **Node URL:** `https://api.shelbynet.shelby.xyz/v1`
   - **Faucet:** `https://faucet.shelbynet.shelby.xyz`
4. Switch to **Shelbynet**

---

## 💧 Get Testnet Tokens

| Token | Faucet |
|-------|--------|
| **APT** (gas fees) | [docs.shelby.xyz/apis/faucet/aptos](https://docs.shelby.xyz/apis/faucet/aptos) |
| **ShelbyUSD** (upload fees) | [docs.shelby.xyz/apis/faucet/shelbyusd](https://docs.shelby.xyz/apis/faucet/shelbyusd) |

---

## 📁 Project Structure

```
Sheltrix/
├── index.html          # Main application
├── src/
│   ├── main.js         # Entry point
│   └── shelby.js       # Shelby Network config & helpers
├── vite.config.js      # Vite configuration
├── package.json        # Dependencies
└── .gitignore
```

---

## 🌐 Network Configuration

```javascript
// Shelby Network (Shelbynet Testnet)
RPC Endpoint:  https://api.shelbynet.shelby.xyz/shelby
Aptos Fullnode: https://api.shelbynet.shelby.xyz/v1
Explorer:       https://explorer.shelby.xyz/shelbynet
```

---

## 📸 Screenshots

| Home | Connect Wallet | Vault |
|------|---------------|-------|
| Space UI with 3D vault | Petra real signature | File management |

---

## 🔗 Links

- 🌐 **Live App:** [sheltrix-vault.vercel.app](https://sheltrix-vault.vercel.app)
- 📚 **Shelby Docs:** [docs.shelby.xyz](https://docs.shelby.xyz)
- 🔍 **Shelby Explorer:** [explorer.shelby.xyz/shelbynet](https://explorer.shelby.xyz/shelbynet)
- 💬 **Shelby Discord:** [discord.gg/shelby](https://discord.gg/shelby)

---

## 👨‍💻 Developer

Built by **[@guunduul](https://github.com/guunduul)** on the Shelby Network testnet.

---

<div align="center">

**Built with ❤️ on Shelby Network & Aptos Blockchain**

[![Star this repo](https://img.shields.io/github/stars/guunduul/Sheltrix?style=social)](https://github.com/guunduul/Sheltrix)

</div>
