// test/Marketplace.test.ts
import "@nomicfoundation/hardhat-chai-matchers"; // registers properAddress and other eth matchers
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { expect } from "chai";
import { ethers, network } from "hardhat";

describe("DAOMarketplace", function () {
    async function deployFixture() {
        const [owner, renter, otherAccount] = await ethers.getSigners();

        const NFT = await ethers.getContractFactory("DAOMarketplaceNFT");
        const nft = await NFT.deploy();

        const Market = await ethers.getContractFactory("DAOMarketplaceMarket");
        const market = await Market.deploy(owner.address); // Treasury is owner for test

        return { nft, market, owner, renter, otherAccount };
    }

    // Reusable helper: produce a dummy bytes32 hash for test minting
    function randomMetadataHash() {
        return ethers.hexlify(ethers.randomBytes(32)) as `0x${string}`;
    }

    describe("Deployment", function () {
        it("Should deploy successfully", async function () {
            const { nft, market } = await loadFixture(deployFixture);

            // getAddress() returns the contract address in ethers v6
            expect(await nft.getAddress()).to.be.properAddress;
            expect(await market.getAddress()).to.be.properAddress;
        });
    });

    describe("Minting", function () {
        it("Should mint an NFT", async function () {
            const { nft, owner } = await loadFixture(deployFixture);
            // mint() requires 3 args (to, uri, metadataHash)
            await nft.mint(owner.address, "ipfs://test", randomMetadataHash());
            expect(await nft.ownerOf(1)).to.equal(owner.address);
        });
    });

    describe("Rentals (ERC-4907)", function () {
        it("Should allow owner to set user manually", async function () {
            const { nft, owner, renter } = await loadFixture(deployFixture);
            await nft.mint(owner.address, "ipfs://test", randomMetadataHash());

            // expiry in seconds (unix)
            const expires = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now
            await nft.setUser(1, renter.address, expires);

            expect(await nft.userOf(1)).to.equal(renter.address);

            // userExpires may return a BigInt (ethers v6). Compare as BigInt.
            const onChainExpiry = await nft.userExpires(1);
            // Ensure type-safe comparison
            expect(BigInt(onChainExpiry)).to.equal(BigInt(expires));
        });

        it("Should expire user automatically", async function () {
            const { nft, owner, renter } = await loadFixture(deployFixture);
            await nft.mint(owner.address, "ipfs://test", randomMetadataHash());

            const expires = Math.floor(Date.now() / 1000) + 3600; // 1 hour
            await nft.setUser(1, renter.address, expires);

            // Robust warp: compute how many seconds to advance from current chain time to expiry + 1
            const latestBlock = await ethers.provider.getBlock("latest");
            const nowTs = BigInt(latestBlock.timestamp);
            const onChainExpiry = BigInt(await nft.userExpires(1));
            const secondsToAdvance = Number(onChainExpiry - nowTs + 1n);

            if (secondsToAdvance <= 0) {
                // If expiry already passed for any reason, we still mine a block to settle state
                await network.provider.send("evm_mine", []);
            } else {
                await network.provider.send("evm_increaseTime", [secondsToAdvance]);
                await network.provider.send("evm_mine", []);
            }

            // After advancing time, userOf should be zero address
            const userAfter = await nft.userOf(1);
            const ZERO = "0x0000000000000000000000000000000000000000";
            expect(userAfter).to.equal(ZERO);
        });
    });

    describe("Marketplace Integration", function () {
        it("Should list and rent an NFT", async function () {
            const { nft, market, owner, renter } = await loadFixture(deployFixture);
            // mint() requires 3 args
            await nft.mint(owner.address, "ipfs://test", randomMetadataHash());

            // Approve marketplace (set ApprovalForAll or approve single - using setApprovalForAll here)
            await nft.setApprovalForAll(await market.getAddress(), true);

            // List — listNFT(tokenAddress, tokenId, pricePerDay, minDuration, maxDuration, metadataHash)
            const pricePerDay = ethers.parseEther("0.1");
            await market.listNFT(await nft.getAddress(), 1, pricePerDay, 1, 30, randomMetadataHash());

            // Rent
            const days = 5;
            const cost = pricePerDay * BigInt(days);
            await market.connect(renter).rent(1, days, { value: cost });

            // Check renter is set as user on the NFT (ERC-4907)
            expect(await nft.userOf(1)).to.equal(renter.address);
        });
    });
});