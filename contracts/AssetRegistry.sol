// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

import "./BlindAuction.sol";

contract AssetRegistry is ERC721URIStorage, Ownable, ReentrancyGuard {
    using Counters for Counters.Counter;
    Counters.Counter private _tokenIds;

    struct Asset {
        string name;
        string description;
        string mediaUrl;
        uint256 creationTime;
    }

    mapping(uint256 => Asset) public assets;

    event AssetCreated(uint256 indexed assetId, address indexed creator, string name);
    event AssetMetadataUpdated(uint256 indexed assetId, string mediaUrl);
    event AuctionCreated(address indexed auctionContract, uint256 indexed assetId, uint256 startTime, uint256 biddingEndTime, uint256 revealEndTime);

    constructor() ERC721("AuctionableAsset", "AAT") {}

    function createAsset(string memory name, string memory description, string memory mediaUrl) external returns (uint256) {
        _tokenIds.increment();
        uint256 newAssetId = _tokenIds.current();

        _safeMint(msg.sender, newAssetId);
        _setTokenURI(newAssetId, mediaUrl);

        assets[newAssetId] = Asset(name, description, mediaUrl, block.timestamp);

        emit AssetCreated(newAssetId, msg.sender, name);  // ✅ Emisión del evento confirmada
        return newAssetId;
    }

    function getAsset(uint256 assetId) external view returns (Asset memory) {
        require(_exists(assetId), "Activo inexistente");
        return assets[assetId];
    }

    function updateAssetMetadata(uint256 assetId, string memory mediaUrl) external {
        require(ownerOf(assetId) == msg.sender, "No eres el propietario");

        assets[assetId].mediaUrl = mediaUrl;
        _setTokenURI(assetId, mediaUrl);

        emit AssetMetadataUpdated(assetId, mediaUrl);
    }

    function approveForAuction(uint256 assetId, address auctionAddress) external {
        require(ownerOf(assetId) == msg.sender, "No eres el propietario");
        approve(auctionAddress, assetId);
    }

    function createAuction(
        uint256 assetId,
        uint256 startTime,
        uint256 biddingTime,
        uint256 revealTime,
        bytes32 reservePriceHash
    ) external returns (address) {
        require(ownerOf(assetId) == msg.sender, "No eres el propietario");

        BlindAuction auction = new BlindAuction(
            assetId,
            msg.sender,
            address(this),
            startTime,
            biddingTime,
            revealTime,
            reservePriceHash
        );

        approve(address(auction), assetId);

        emit AuctionCreated(address(auction), assetId, startTime, startTime + biddingTime, startTime + biddingTime + revealTime);
        return address(auction);
    }
}
