const { network, deployments, ethers, getNamedAccounts } = require("hardhat");
const { developmentChains, networkConfig } = require("../../helper-hardhat-config");
const { assert, expect } = require("chai");

developmentChains.includes(network.name)? describe.skip: describe('Lottery', () => {
    let lottery,entranceFee,deployer
    beforeEach(async () => {
        deployer = (await getNamedAccounts()).deployer
        lottery = await ethers.getContract("Lottery",deployer)
        entranceFee = await lottery.i_entranceFee()
    })
    describe('fulfillRandomWords',()=>{
        it('works with live chainlink keepers and chainlink VRF Coordinator, we get a random winner', async ()=>{
            const lastTimeStamp = await lottery.getLatestTimeStamp()
            
            await new Promise(async (resolve, reject) => {
                lottery.once("WinnerPicked",async () => {
                    console.log("WinnerPicked event emitted")
                    try{    
                        const winnerEndingBalance = await ethers.provider.getBalance(deployer)
                        const lotteryState = await lottery.getLotteryState()
                        const updatedTimeStamp = await lottery.getLatestTimeStamp()
                        assert.equal(lotteryState.toString(),"0")
                        await expect(lottery.getPlayer(0)).to.be.reverted
                        assert(updatedTimeStamp > lastTimeStamp )
                        console.log('winnerEndingBalance :>> ', await ethers.formatEther(winnerEndingBalance));
                        console.log('totalBalance :>> ', await ethers.formatEther(winnerStartingBalance+ entranceFee));
                        assert.equal(winnerEndingBalance.toString(),(winnerStartingBalance+(entranceFee)).toString())
                        resolve()   
                    }
                    catch(err){
                        reject(err)
                    }
                })   
                console.log('before balance', await ethers.formatEther(await ethers.provider.getBalance(deployer)))
                const tx = await lottery.enterLottery({value: entranceFee})
                await tx.wait(1)
                const winnerStartingBalance = await ethers.provider.getBalance(deployer)
                console.log('winnerStartingBalance :>> ', await ethers.formatEther(winnerStartingBalance));
            })
            // Setup listener before we enter the lottery
            // Just in case the blockchain moves really FAST
        })
    })
 })