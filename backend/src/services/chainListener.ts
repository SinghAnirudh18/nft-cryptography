import { ethers } from 'ethers';
import { NFTModel } from '../models/NFT.js';
import axios from 'axios';
import { sha256 } from '../crypto/sha256.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class ChainListener {
    private provider: ethers.JsonRpcProvider | null = null;
    private contract: ethers.Contract | null = null;
    private isListening = false;
    private contractAddress: string = '';

    constructor() {
        // Initialization moved to start() to allow dotenv to load first
    }

    public start() {
        if (this.isListening) return;

        // Load Env Vars (now available)
        const SEPOLIA_RPC = process.env.SEPOLIA_RPC || "https://rpc.sepolia.org";
        this.contractAddress = process.env.CONTRACT_ADDRESS || '';

        // Load ABI
        const ABI_PATH = path.join(__dirname, '../../../shared/DAOMarketplaceNFT.json');
        let CONTRACT_ABI: any[] = [];

        if (fs.existsSync(ABI_PATH)) {
            const data = JSON.parse(fs.readFileSync(ABI_PATH, 'utf8'));
            CONTRACT_ABI = data.abi;
            if (!this.contractAddress) this.contractAddress = data.address;
        }

        console.log(`🎧 Initializing Chain Listener...`);
        console.log(`   RPC: ${SEPOLIA_RPC}`); // Log to confirm correct URL is used

        this.provider = new ethers.JsonRpcProvider(SEPOLIA_RPC);

        if (this.contractAddress && CONTRACT_ABI.length > 0) {
            this.contract = new ethers.Contract(this.contractAddress, CONTRACT_ABI, this.provider);
            console.log(`   Contract: ${this.contractAddress}`);
        } else {
            console.warn("ChainListener: Contract address or ABI missing. Listener disabled.");
            return;
        }

        this.isListening = true;

        // Listen for NFTMinted events
        this.contract.on("NFTMinted", async (tokenId, creator, tokenURI, event) => {
            console.log(`🔔 NFTMinted Event Detected: TokenID=${tokenId}, Creator=${creator}`);

            try {
                // 1. Wait for Confirmations (Prevent reorgs)
                console.log(`⏳ Waiting for 2 confirmations...`);
                // Check if event.getTransaction is available
                if (event && event.getTransaction) {
                    const tx = await event.getTransaction();
                    await tx.wait(2);
                    console.log(`✅ Transaction confirmed: ${tx.hash}`);

                    // 2. Find Pending/Draft NFT in DB
                    let nft = await NFTModel.findOne({ mintTxHash: tx.hash });

                    if (!nft) {
                        console.log(`⚠️ NFT not found by txHash, trying legacy/URI match...`);
                        nft = await NFTModel.findOne({
                            tokenURI: tokenURI,
                            mintStatus: { $in: ['draft', 'pending'] }
                        });
                    }

                    if (!nft) {
                        console.error(`❌ DB Record not found for TokenID ${tokenId}`);
                        return;
                    }

                    // 3. Verify Metadata & Image Integrity (The "Oracle" Step)
                    await this.verifyNFT(nft, tokenId.toString(), tokenURI, creator);
                }

            } catch (error) {
                console.error(`❌ Error processing Mint event:`, error);
            }
        });
    }

    private async verifyNFT(nft: any, tokenId: string, onChainURI: string, onChainCreator: string) {
        try {
            console.log(`🔍 Verifying NFT ${nft.id}...`);

            // A. Verify Creator Attribution
            if (nft.creator.toLowerCase() !== onChainCreator.toLowerCase()) {
                console.error(`🚨 FRAUD DETECTED: Creator mismatch! DB=${nft.creator}, Chain=${onChainCreator}`);
                nft.mintStatus = 'failed';
                await nft.save();
                return;
            }

            // B. Verify TokenURI consistency
            if (nft.tokenURI !== onChainURI) {
                console.error(`🚨 DATA TAMPERING: URI mismatch! DB=${nft.tokenURI}, Chain=${onChainURI}`);
                nft.mintStatus = 'failed';
                await nft.save();
                return;
            }

            // C. Cryptographic Image Verification
            console.log(`⬇️ Fetching metadata from ${onChainURI}...`);
            const metaRes = await axios.get(convertIpfsUrl(onChainURI));
            const metadata = metaRes.data;

            console.log(`⬇️ Fetching image from ${metadata.image}...`);
            const imageRes = await axios.get(convertIpfsUrl(metadata.image), { responseType: 'arraybuffer' });
            const imageBuffer = Buffer.from(imageRes.data);

            const computedHash = sha256(imageBuffer);
            console.log(`🧮 Computed Hash: ${computedHash}`);
            console.log(`💾 Stored Hash:   ${nft.fileHash}`);

            if (computedHash === nft.fileHash) {
                console.log(`✅ VERIFIED: Image content is authentic.`);
                nft.mintStatus = 'confirmed';
                if (this.provider) {
                    nft.blockNumber = await this.provider.getBlockNumber();
                }
                nft.tokenId = tokenId;
                await nft.save();
            } else {
                console.error(`🚨 INTEGRITY FAIL: Hash mismatch!`);
                nft.mintStatus = 'failed';
                await nft.save();
            }

        } catch (error) {
            console.error(`❌ Verification failed:`, error);
        }
    }
}

function convertIpfsUrl(url: string): string {
    if (url.startsWith('ipfs://')) {
        return url.replace('ipfs://', 'https://gateway.pinata.cloud/ipfs/');
    }
    return url;
}

export const chainListener = new ChainListener();
