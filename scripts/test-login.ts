import { ethers } from "ethers";

const API_URL = "http://localhost:5000/api";

async function main() {
    console.log("🧪 Starting Login Flow Test...");

    // 1. Create a random wallet
    const wallet = ethers.Wallet.createRandom();
    const address = wallet.address;
    console.log(`\n👤 Testing with User: ${address}`);

    // 2. Get Nonce
    console.log("1️⃣ Requesting Nonce...");
    let nonce: string;
    let nonceData: any;
    try {
        const res = await fetch(`${API_URL}/auth/nonce/${address}`);
        if (!res.ok) throw new Error(await res.text());
        nonceData = await res.json();
        nonce = nonceData.nonce;
        console.log("✅ Nonce received:", nonce);
    } catch (e: any) {
        console.error("❌ Get Nonce failed:", e.message);
        process.exit(1);
    }

    // 3. Create SIWE Message
    const domain = "localhost:5173";
    const uri = "http://localhost:5173";
    const issuedAt = new Date().toISOString();
    const message = [
        `${domain} wants you to sign in with your Ethereum account:`,
        address,
        '',
        'Sign in to DAO Marketplace',
        '',
        `URI: ${uri}`,
        'Version: 1',
        'Chain ID: 1',
        `Nonce: ${nonce}`,
        `Issued At: ${issuedAt}`,
    ].join('\n');

    console.log("\n📜 SIWE Message:\n" + message);

    // 4. Sign Message
    console.log("\n✍️ Signing Message...");
    const signature = await wallet.signMessage(message);
    const signatureFixed = signature; // High-S issue is fixed in backend now

    // 5. Verify (Login)
    console.log("\n🔐 Verifying...");
    let token: string;
    try {
        const res = await fetch(`${API_URL}/auth/verify`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                walletAddress: address,
                signature: signatureFixed,
                message
            })
        });
        if (!res.ok) throw new Error(await res.text());
        const data = await res.json();
        token = data.token;
        console.log("✅ Login Successful! Token:", token.slice(0, 20) + "...");
        console.log("👤 User:", data.user);
    } catch (e: any) {
        console.error("❌ Verify failed:", e.message);
        process.exit(1);
    }

    // 6. Verify Token (Session Check)
    console.log("\n🎟️ Checking Session (verify-token)...");
    try {
        const res = await fetch(`${API_URL}/auth/verify-token`, {
            headers: { Authorization: `Bearer ${token!}` }
        });
        if (!res.ok) throw new Error(await res.text());
        const data = await res.json();
        console.log("✅ Session Valid:", data.valid);
        console.log("👤 Session User:", data.user);
    } catch (e: any) {
        console.error("❌ Session check failed:", e.message);
        process.exit(1);
    }

    console.log("\n🎉 Test Passed for User 1!");

    // --- REPEAT FOR USER 2 ---
    console.log("\n\n🔄 REPEATING FOR USER 2...");
    const wallet2 = ethers.Wallet.createRandom();
    const address2 = wallet2.address;
    console.log(`👤 Testing with User 2: ${address2}`);

    // Get Nonce 2
    const nonceRes2 = await fetch(`${API_URL}/auth/nonce/${address2}`);
    const nonceData2 = await nonceRes2.json();
    const nonce2 = nonceData2.nonce;

    // Sign 2
    const message2 = [
        `${domain} wants you to sign in with your Ethereum account:`,
        address2,
        '',
        'Sign in to DAO Marketplace',
        '',
        `URI: ${uri}`,
        'Version: 1',
        'Chain ID: 1',
        `Nonce: ${nonce2}`,
        `Issued At: ${issuedAt}`,
    ].join('\n');
    const signature2 = await wallet2.signMessage(message2);

    // Verify 2
    try {
        const res2 = await fetch(`${API_URL}/auth/verify`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                walletAddress: address2,
                signature: signature2,
                message: message2
            })
        });
        if (!res2.ok) throw new Error(await res2.text());
        const data2 = await res2.json();
        console.log("✅ Login Successful for User 2!");
        console.log("👤 User 2:", data2.user);
    } catch (e: any) {
        console.error("❌ Verify User 2 failed:", e.message);
        process.exit(1);
    }

    console.log("\n✨ ALL TESTS PASSED ✨");
}

main().catch(console.error);
