// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC1155} from "@openzeppelin/contracts/token/ERC1155/IERC1155.sol";
import {ERC1155Holder} from "@openzeppelin/contracts/token/ERC1155/utils/ERC1155Holder.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @title TicketMarketplace
/// @notice On-chain resale with price cap enforcement and fee distribution.
contract TicketMarketplace is Ownable, ReentrancyGuard, ERC1155Holder {
    struct Listing {
        address seller;
        address ticketContract;
        uint256 tokenId;
        uint256 tierId;
        uint256 askPriceWei;
        uint256 maxPriceWei;
        bool active;
    }

    uint16 public platformFeeBps;
    address public platformFeeRecipient;
    address public royaltyReceiver;
    uint16 public royaltyBps;

    uint256 public nextListingId = 1;
    mapping(uint256 => Listing) public listings;

    event TicketListed(
        uint256 indexed listingId,
        address indexed seller,
        address ticketContract,
        uint256 tokenId,
        uint256 askPriceWei
    );
    event TicketSold(uint256 indexed listingId, address indexed buyer, uint256 salePrice);
    event ListingCancelled(uint256 indexed listingId);

    error ListingNotActive();
    error InvalidPrice();
    error NotSeller();
    error TransferFailed();

    constructor(
        address _platformFeeRecipient,
        address _royaltyReceiver,
        uint16 _platformFeeBps,
        uint16 _royaltyBps
    ) Ownable(msg.sender) {
        require(_platformFeeRecipient != address(0), "Invalid fee recipient");
        require(_royaltyReceiver != address(0), "Invalid royalty receiver");
        require(_platformFeeBps <= 1000, "Fee too high");
        require(_royaltyBps <= 10000, "Royalty too high");
        platformFeeRecipient = _platformFeeRecipient;
        royaltyReceiver = _royaltyReceiver;
        platformFeeBps = _platformFeeBps;
        royaltyBps = _royaltyBps;
    }

    function listTicket(
        address ticketContract,
        uint256 tokenId,
        uint256 tierId,
        uint256 askPriceWei,
        uint256 maxPriceWei
    ) external nonReentrant returns (uint256 listingId) {
        if (askPriceWei == 0 || askPriceWei > maxPriceWei) revert InvalidPrice();

        IERC1155 nft = IERC1155(ticketContract);
        nft.safeTransferFrom(msg.sender, address(this), tokenId, 1, "");

        listingId = nextListingId++;
        listings[listingId] = Listing({
            seller: msg.sender,
            ticketContract: ticketContract,
            tokenId: tokenId,
            tierId: tierId,
            askPriceWei: askPriceWei,
            maxPriceWei: maxPriceWei,
            active: true
        });

        emit TicketListed(listingId, msg.sender, ticketContract, tokenId, askPriceWei);
    }

    function buyTicket(uint256 listingId) external payable nonReentrant {
        Listing storage listing = listings[listingId];
        if (!listing.active) revert ListingNotActive();
        if (msg.value != listing.askPriceWei) revert InvalidPrice();
        if (msg.value > listing.maxPriceWei) revert InvalidPrice();

        listing.active = false;

        uint256 royaltyAmount = (msg.value * royaltyBps) / 10000;
        uint256 platformFee = (msg.value * platformFeeBps) / 10000;
        uint256 sellerProceeds = msg.value - royaltyAmount - platformFee;

        if (royaltyAmount > 0) {
            (bool royaltySent, ) = royaltyReceiver.call{value: royaltyAmount}("");
            if (!royaltySent) revert TransferFailed();
        }
        if (platformFee > 0) {
            (bool feeSent, ) = platformFeeRecipient.call{value: platformFee}("");
            if (!feeSent) revert TransferFailed();
        }
        if (sellerProceeds > 0) {
            (bool sellerSent, ) = listing.seller.call{value: sellerProceeds}("");
            if (!sellerSent) revert TransferFailed();
        }

        IERC1155(listing.ticketContract).safeTransferFrom(
            address(this),
            msg.sender,
            listing.tokenId,
            1,
            ""
        );

        emit TicketSold(listingId, msg.sender, msg.value);
    }

    function cancelListing(uint256 listingId) external nonReentrant {
        Listing storage listing = listings[listingId];
        if (!listing.active) revert ListingNotActive();
        if (listing.seller != msg.sender && msg.sender != owner()) revert NotSeller();

        listing.active = false;

        IERC1155(listing.ticketContract).safeTransferFrom(
            address(this),
            listing.seller,
            listing.tokenId,
            1,
            ""
        );

        emit ListingCancelled(listingId);
    }

    function setFeeConfig(
        address _platformFeeRecipient,
        address _royaltyReceiver,
        uint16 _platformFeeBps,
        uint16 _royaltyBps
    ) external onlyOwner {
        require(_platformFeeRecipient != address(0), "Invalid fee recipient");
        require(_royaltyReceiver != address(0), "Invalid royalty receiver");
        platformFeeRecipient = _platformFeeRecipient;
        royaltyReceiver = _royaltyReceiver;
        platformFeeBps = _platformFeeBps;
        royaltyBps = _royaltyBps;
    }
}
