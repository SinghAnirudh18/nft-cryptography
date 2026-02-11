import { createWeb3Modal, defaultConfig } from "@web3modal/ethers/react";

const projectId = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || "YOUR_WALLETCONNECT_PROJECT_ID";
// You must create this at: cloud.walletconnect.com

const metadata = {
    name: import.meta.env.VITE_APP_NAME || "NFT Rental Platform",
    description: "Rent and lend NFTs securely",
    url: import.meta.env.VITE_APP_URL || "http://localhost:5173",      // change for production
    icons: ["https://your-logo.png"]
};

const mainnet = {
    chainId: 1,
    name: "Ethereum",
    currency: "ETH",
    explorerUrl: "https://etherscan.io",
    rpcUrl: "https://eth.llamarpc.com"
};

const sepolia = {
    chainId: 11155111,
    name: "Sepolia",
    currency: "ETH",
    explorerUrl: "https://sepolia.etherscan.io",
    rpcUrl: "https://rpc.sepolia.org"
};

export const web3Modal = createWeb3Modal({
    ethersConfig: defaultConfig({ metadata }),
    chains: [mainnet, sepolia],
    projectId,
    enableAnalytics: false
});
