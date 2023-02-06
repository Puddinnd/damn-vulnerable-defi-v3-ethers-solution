// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;


import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

contract WalletAuthorizerDestroyer is UUPSUpgradeable {
    function boom() external {
        selfdestruct(payable(tx.origin));
    }

    function getDestroyingData() external pure returns(bytes memory){
        return abi.encodeWithSelector(WalletAuthorizerDestroyer.boom.selector);
    }

     function _authorizeUpgrade(address newImplementation) internal override{}
}