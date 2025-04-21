export const contractAddress = '0x953A06E3128Cf547Acc0F216Da71b1fD9AF8485d'; // Reemplaza esto si tienes contrato real
export const contractABI = [
  "function register() external",
  "function bid(bytes32 _blindedBid) external payable",
  "function reveal(uint[] calldata _values, bool[] calldata _fakes) external",
  "function auctionEnd() external",
  "function withdraw() external",
  "function pendingReturns(address) public view returns (uint)",
  "function highestBid() public view returns (uint)",
  "function highestBidder() public view returns (address)",
  "function auctionEnded() public view returns (bool)"
];