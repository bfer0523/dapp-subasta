// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract BlindAuction {
    address public auctioneer;
    uint public biddingEnd;
    uint public revealEnd;
    bool public auctionEnded;

    struct Bid {
        bytes32 blindedBid;
        uint deposit;
    }

    mapping(address => Bid[]) public bids;
    mapping(address => bool) public registered;

    address public highestBidder;
    uint public highestBid;

    mapping(address => uint) public pendingReturns;

    constructor(uint _biddingTime, uint _revealTime) {
        auctioneer = msg.sender;
        biddingEnd = block.timestamp + _biddingTime;
        revealEnd = biddingEnd + _revealTime;
    }

    modifier onlyBefore(uint _time) {
        require(block.timestamp < _time, "Tiempo excedido");
        _;
    }

    modifier onlyAfter(uint _time) {
        require(block.timestamp > _time, "Aun no es tiempo");
        _;
    }

    /// Registro de participantes
    function register() external {
        require(!registered[msg.sender], "Ya registrado");
        registered[msg.sender] = true;
    }

    /// Fase 1: Recepción de pujas selladas
    /// El hash se calcula como keccak256(abi.encodePacked(valor, verdadero/falso))
    function bid(bytes32 _blindedBid) external payable onlyBefore(biddingEnd) {
        require(registered[msg.sender], "No registrado");
        bids[msg.sender].push(Bid({
            blindedBid: _blindedBid,
            deposit: msg.value
        }));
    }

    /// Fase 2: Revelación de pujas
    function reveal(uint[] calldata _values, bool[] calldata _fakes) external onlyAfter(biddingEnd) onlyBefore(revealEnd) {
        uint refund;
        Bid[] storage userBids = bids[msg.sender];

        require(_values.length == userBids.length, "Longitudes no coinciden");
        require(_fakes.length == userBids.length, "Longitudes no coinciden");

        for (uint i = 0; i < userBids.length; i++) {
            Bid storage bidToCheck = userBids[i];
            (uint value, bool fake) = (_values[i], _fakes[i]);

            if (bidToCheck.blindedBid != keccak256(abi.encodePacked(value, fake))) {
                // Hash no coincide
                continue;
            }

            refund += bidToCheck.deposit;

            if (!fake && bidToCheck.deposit >= value) {
                if (placeBid(msg.sender, value)) {
                    refund -= value;
                }
            }

            // Evita reuso
            bidToCheck.blindedBid = bytes32(0);
        }

        payable(msg.sender).transfer(refund);
    }

    function placeBid(address bidder, uint value) internal returns (bool success) {
        if (value <= highestBid) {
            return false;
        }

        if (highestBidder != address(0)) {
            // Reembolso al anterior máximo postor
            pendingReturns[highestBidder] += highestBid;
        }

        highestBid = value;
        highestBidder = bidder;
        return true;
    }

    /// Finalización de la subasta
    function auctionEnd() external onlyAfter(revealEnd) {
        require(!auctionEnded, "Ya finalizada");
        auctionEnded = true;

        // Transferir el valor al subastador
        payable(auctioneer).transfer(highestBid);
    }

    /// Retiro de depósitos
    function withdraw() external {
        uint amount = pendingReturns[msg.sender];
        require(amount > 0, "Nada que retirar");

        pendingReturns[msg.sender] = 0;
        payable(msg.sender).transfer(amount);
    }
}
