import dotenv from "dotenv";
import type { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-ethers";

// Load deployment secrets from .env.hardhat (gitignored, never contains backend runtime vars)
// Falls back to backend/.env for legacy compatibility if .env.hardhat is not present
import { existsSync } from "fs";
if (existsSync(".env.hardhat")) {
    dotenv.config({ path: ".env.hardhat" });
} else {
    dotenv.config({ path: "./backend/.env" });
}

const SEPOLIA_RPC = process.env.SEPOLIA_RPC || "https://rpc.sepolia.org";
const DEPLOYER_KEY = process.env.DEPLOYER_PRIVATE_KEY || "";

if (!DEPLOYER_KEY) {
    console.warn("[hardhat.config] ⚠️ DEPLOYER_PRIVATE_KEY not set. Deployment will not work. Set it in .env.hardhat.");
}

const config: HardhatUserConfig = {
    solidity: "0.8.20",
    networks: {
        sepolia: {
            url: SEPOLIA_RPC,
            accounts: DEPLOYER_KEY ? [DEPLOYER_KEY] : [],
        },
    },
    paths: {
        sources: "./contracts",
        artifacts: "./artifacts",
    },
};

export default config;
