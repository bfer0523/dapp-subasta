// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";

contract BlindAuction is ReentrancyGuard {
    enum AuctionState { Created, Active, Revealing, Ended, Resolved }
    AuctionState public state;

    address public auctioneer;
    address public assetRegistry;
    uint256 public assetId;
    uint public startTime;
    uint public biddingEnd;
    uint public revealEnd;
    bytes32 public reservePriceHash;
    uint public revealedReservePrice;
    bool public reserveRevealed;

    struct Bid {
        bytes32 blindedBid;
        uint deposit;
    }

    mapping(address => Bid[]) public bids;
    mapping(address => uint) public pendingReturns;

    address public highestBidder;
    uint public highestBid;
    bool public auctionEnded;

    event AuctionCreated(uint256 indexed assetId, address indexed seller, uint256 startTime);
    event BidPlaced(address bidder, bytes32 blindedBid, uint256 deposit);
    event BidRevealed(address bidder, uint256 value, bool isHighestBid);
    event AuctionEnded(address winner, uint256 amount);

    modifier inState(AuctionState expected) {
        require(state == expected, "Estado inválido para esta acción");
        _;
    }

    modifier onlyNotSeller() {
        require(msg.sender != auctioneer, "El vendedor no puede pujar");
        _;
    }

    constructor(
        uint256 _assetId,
        address _auctioneer,
        address _assetRegistry,
        uint _startTime,
        uint _biddingTime,
        uint _revealTime,
        bytes32 _reservePriceHash
    ) {
        auctioneer = _auctioneer;
        assetRegistry = _assetRegistry;
        assetId = _assetId;
        startTime = _startTime;
        biddingEnd = _startTime + _biddingTime;
        revealEnd = biddingEnd + _revealTime;
        reservePriceHash = _reservePriceHash;
        state = AuctionState.Created;

        emit AuctionCreated(_assetId, _auctioneer, _startTime);
    }

    function activateAuction() external {
        require(block.timestamp >= startTime, "Aún no comienza");
        require(state == AuctionState.Created, "Ya activada");
        state = AuctionState.Active;
    }

    function bid(bytes32 _blindedBid) external payable inState(AuctionState.Active) onlyNotSeller {
        require(block.timestamp < biddingEnd, "Periodo de pujas finalizado");
        bids[msg.sender].push(Bid({
            blindedBid: _blindedBid,
            deposit: msg.value
        }));
        emit BidPlaced(msg.sender, _blindedBid, msg.value);
    }

    function startRevealPhase() external {
        require(block.timestamp >= biddingEnd, "Aún no termina la fase de pujas");
        require(state == AuctionState.Active, "Estado inválido");
        state = AuctionState.Revealing;
    }

    function reveal(uint[] calldata _values, bytes32[] calldata _nonces) external inState(AuctionState.Revealing) {
        require(block.timestamp < revealEnd, "Fase de revelación terminada");

        Bid[] storage userBids = bids[msg.sender];
        uint refund;

        require(_values.length == userBids.length, "Datos no coinciden");
        require(_nonces.length == userBids.length, "Datos no coinciden");

        for (uint i = 0; i < userBids.length; i++) {
            Bid storage bidToCheck = userBids[i];
            bytes32 hash = keccak256(abi.encodePacked(_values[i], _nonces[i]));

            if (hash != bidToCheck.blindedBid) {
                continue;
            }

            refund += bidToCheck.deposit;

            if (bidToCheck.deposit >= _values[i]) {
                if (_placeBid(msg.sender, _values[i])) {
                    refund -= _values[i];
                }
            }

            bidToCheck.blindedBid = bytes32(0);
        }

        payable(msg.sender).transfer(refund);
    }

    function _placeBid(address bidder, uint value) internal returns (bool) {
        if (value <= highestBid) return false;

        if (highestBidder != address(0)) {
            pendingReturns[highestBidder] += highestBid;
        }

        highestBid = value;
        highestBidder = bidder;
        emit BidRevealed(bidder, value, true);
        return true;
    }

    function revealReservePrice(uint256 _price, bytes32 _nonce) external {
        require(msg.sender == auctioneer, "Solo el subastador");
        require(!reserveRevealed, "Ya revelado");

        bytes32 computed = keccak256(abi.encodePacked(_price, _nonce));
        require(computed == reservePriceHash, "Hash incorrecto");

        revealedReservePrice = _price;
        reserveRevealed = true;
    }

    function endAuction() external {
        require(block.timestamp >= revealEnd, "Aún no termina la fase de revelación");
        require(!auctionEnded, "Ya finalizada");

        auctionEnded = true;
        state = AuctionState.Ended;

        emit AuctionEnded(highestBidder, highestBid);
    }

    function resolveAuction() external nonReentrant {
        require(state == AuctionState.Ended, "Estado incorrecto");
        require(reserveRevealed, "Precio de reserva no revelado");
        require(highestBid >= revealedReservePrice, "No se alcanzó el precio mínimo");

        state = AuctionState.Resolved;

        IERC721(assetRegistry).safeTransferFrom(auctioneer, highestBidder, assetId);
        payable(auctioneer).transfer(highestBid);
    }

    function withdraw() external {
        uint amount = pendingReturns[msg.sender];
        require(amount > 0, "Nada que retirar");
        pendingReturns[msg.sender] = 0;
        payable(msg.sender).transfer(amount);
    }
}
