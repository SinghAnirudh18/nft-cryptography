import { ethers } from 'ethers';
import dotenv from 'dotenv';
import path from 'path';

// Load backend .env explicitly
dotenv.config({ path: path.resolve(__dirname, '../backend/.env') });

const SEPOLIA_RPC = process.env.SEPOLIA_RPC;
const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS;

async function check() {
    console.log(`Checking contract at ${CONTRACT_ADDRESS} on ${SEPOLIA_RPC}...`);

    if (!SEPOLIA_RPC || !CONTRACT_ADDRESS) {
        console.error("Missing config!");
        process.exit(1);
    }

    try {
        const provider = new ethers.JsonRpcProvider(SEPOLIA_RPC);
        const code = await provider.getCode(CONTRACT_ADDRESS);

        if (code === "0x") {
            console.error(`❌ Contract NOT FOUND at ${CONTRACT_ADDRESS} (code is empty)!`);
            console.error("You may need to redeploy: 'npm run deploy:sepolia' in backend/");
        } else {
            console.log(`✅ Contract FOUND at ${CONTRACT_ADDRESS}`);
            console.log(`   Code Length: ${code.length / 2 - 1} bytes`);
        }
    } catch (e) {
        console.error("Error checking contract:", e);
    }
}

check().catch(err => {
    console.error(err);
    process.exit(1);
});
