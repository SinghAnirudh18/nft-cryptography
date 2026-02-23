// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "./IERC4907.sol";

/**
 * @title DAOMarketplaceMarket
 * @notice Handles non-custodial listing and renting of ERC-4907 NFTs.
 * @dev The contract never takes custody of the NFT. It verifies approval and calls setUser().
 */
contract DAOMarketplaceMarket is ReentrancyGuard, Ownable, Pausable {
    struct Listing {
        address seller;
        address tokenAddress;
        uint256 tokenId;
        uint256 pricePerDay;
        uint64 minDuration;
        uint64 maxDuration;
        bytes32 metadataHash;
        bool isActive;
    }

    uint256 private _nextListingId;
    mapping(uint256 => Listing) public listings;
    
    uint256 public platformFeeBasisPoints = 250; // 2.5%
    address public treasury;

    event ListingCreated(
        uint256 indexed onChainListingId, 
        address indexed seller, 
        address indexed tokenAddress, 
        uint256 tokenId, 
        uint256 pricePerDay, 
        uint64 minDuration, 
        uint64 maxDuration, 
        bytes32 metadataHash
    );
    event ListingCancelled(uint256 indexed onChainListingId, address indexed tokenAddress, uint256 tokenId);
    event Rented(
        uint256 indexed onChainListingId, 
        address indexed renter, 
        address indexed tokenAddress, 
        uint256 tokenId, 
        uint64 expires, 
        uint256 totalPrice
    );
    event TreasuryUpdated(address newTreasury);
    event FeeUpdated(uint256 newFeeBasisPoints);

    constructor(address _treasury) Ownable(msg.sender) {
        require(_treasury != address(0), "Invalid treasury");
        treasury = _treasury;
        _nextListingId = 1;
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    function setTreasury(address newTreasury) external onlyOwner {
        require(newTreasury != address(0), "Invalid treasury");
        treasury = newTreasury;
        emit TreasuryUpdated(newTreasury);
    }

    function setPlatformFee(uint256 newFeeBasisPoints) external onlyOwner {
        require(newFeeBasisPoints <= 10000, "Fee cannot exceed 100%");
        platformFeeBasisPoints = newFeeBasisPoints;
        emit FeeUpdated(newFeeBasisPoints);
    }

    /**
     * @notice List an NFT for rent (Non-Custodial)
     * @dev Caller must be owner and have approved this contract.
     */
    function listNFT(
        address tokenAddress,
        uint256 tokenId,
        uint256 pricePerDay,
        uint64 minDuration,
        uint64 maxDuration,
        bytes32 metadataHash
    ) external nonReentrant whenNotPaused {
        require(pricePerDay > 0, "Price must be > 0");
        require(maxDuration >= minDuration, "Invalid duration");

        IERC721 token = IERC721(tokenAddress);
        require(token.ownerOf(tokenId) == msg.sender, "Not owner");
        require(
            token.isApprovedForAll(msg.sender, address(this)) || token.getApproved(tokenId) == address(this),
            "Marketplace not approved"
        );

        uint256 listingId = _nextListingId++;
        listings[listingId] = Listing({
            seller: msg.sender,
            tokenAddress: tokenAddress,
            tokenId: tokenId,
            pricePerDay: pricePerDay,
            minDuration: minDuration,
            maxDuration: maxDuration,
            metadataHash: metadataHash,
            isActive: true
        });

        emit ListingCreated(listingId, msg.sender, tokenAddress, tokenId, pricePerDay, minDuration, maxDuration, metadataHash);
    }

    /**
     * @notice Cancel a listing.
     * @dev As the contract doesn't hold custody, we just mark it inactive.
     */
    function cancelListing(uint256 listingId) external nonReentrant {
        Listing storage listing = listings[listingId];
        require(listing.isActive, "Listing not active");
        require(listing.seller == msg.sender || owner() == msg.sender, "Not authorized");

        listing.isActive = false;
        emit ListingCancelled(listingId, listing.tokenAddress, listing.tokenId);
    }

    /**
     * @notice Rent an NFT.
     * @dev Accept payment and call setUser() on the NFT contract.
     */
    function rent(uint256 listingId, uint64 daysToRent) external payable nonReentrant whenNotPaused {
        Listing storage listing = listings[listingId];
        require(listing.isActive, "Listing not active");
        require(daysToRent >= listing.minDuration && daysToRent <= listing.maxDuration, "Invalid duration");

        // Verify seller is still owner
        IERC721 token = IERC721(listing.tokenAddress);
        require(token.ownerOf(listing.tokenId) == listing.seller, "Seller no longer owns NFT");

        // Verify we still have approval
        require(
            token.isApprovedForAll(listing.seller, address(this)) || token.getApproved(listing.tokenId) == address(this),
            "Marketplace no longer approved"
        );

        // Verify current usage is expired
        require(IERC4907(listing.tokenAddress).userExpires(listing.tokenId) < block.timestamp, "Currently rented");

        uint256 totalPrice = listing.pricePerDay * daysToRent;
        require(msg.value >= totalPrice, "Insufficient payment");

        uint64 expires = uint64(block.timestamp + (daysToRent * 1 days));

        // Coordination: set user rights without moving the NFT
        IERC4907(listing.tokenAddress).setUser(listing.tokenId, msg.sender, expires);

        // Payout
        uint256 platformFee = (totalPrice * platformFeeBasisPoints) / 10000;
        uint256 sellerAmount = totalPrice - platformFee;

        (bool sentSeller, ) = payable(listing.seller).call{value: sellerAmount}("");
        require(sentSeller, "Seller payout failed");

        if (platformFee > 0) {
            (bool sentTreasury, ) = payable(treasury).call{value: platformFee}("");
            require(sentTreasury, "Fee payout failed");
        }

        if (msg.value > totalPrice) {
            (bool sentRefund, ) = payable(msg.sender).call{value: msg.value - totalPrice}("");
            require(sentRefund, "Refund failed");
        }

        emit Rented(listingId, msg.sender, listing.tokenAddress, listing.tokenId, expires, totalPrice);
    }
}
