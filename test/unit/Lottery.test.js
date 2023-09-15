const { network, deployments, ethers, getNamedAccounts } = require("hardhat");
const { developmentChains, networkConfig } = require("../../helper-hardhat-config");
const { assert, expect } = require("chai");

!developmentChains.includes(network.name)? describe.skip: describe('Lottery', () => {
    let lottery, vrfCoordinatorV2Mock,entranceFee,deployer,interval
    const chainId = network.config.chainId
    beforeEach(async () => {
        deployer = (await getNamedAccounts()).deployer
        await deployments.fixture(["all"])
        lottery = await ethers.getContract("Lottery",deployer)
        vrfCoordinatorV2Mock = await ethers.getContract("VRFCoordinatorV2Mock",deployer)
        entranceFee = await lottery.i_entranceFee()
        interval = Number(await lottery.getInterval())
    })

    describe('constructor',()=>{
        it("updates lottery state correctly",async ()=>{
            const lotteryState = (await lottery.getLotteryState())
            assert.equal(lotteryState,"0")
        })
        it("initializes the interval time correctly", async ()=>{
            const interval = (await lottery.getInterval())
            assert.equal(interval, networkConfig[chainId].interval)
        })
    })
    describe("enterLottery", ()=>{
        it("reverts when you don't pay enough",async()=>{
            await expect(lottery.enterLottery()).to.be.revertedWith('Lottery__NotEnoughEtherSent');
        })
        it("does not allow entrance when lottery is calculating",async ()=>{
            await lottery.enterLottery({value: entranceFee})
            await network.provider.send("evm_increaseTime", [interval])
            await network.provider.send("evm_mine",[])
            // we pretend to be chainlink keeper
            await lottery.performUpkeep("0x")
            await expect(lottery.enterLottery({value: entranceFee})).to.be.revertedWith("Lottery__NotOpen")
        })
        it("records players when they enter", async()=>{
            await lottery.enterLottery({value: entranceFee})
            const playerFromContract = await lottery.getPlayer(0)
            assert.equal(playerFromContract,deployer)
        })
        it("emits event on lottery enter", async ()=>{
            // await expect(lottery.enterLottery({ value: entranceFee })).to.emit(lottery, "LotteryEnter")
        })
    })
    describe("checkUpkeep",() => {
        it("reverts when lottery is not open", async ()=>{
            await lottery.enterLottery({value: entranceFee})
            await network.provider.send("evm_increaseTime",[interval])
            await network.provider.send("evm_mine",[])
            await lottery.performUpkeep("0x")   
            const {upkeepNeeded} = await lottery.checkUpkeep("0x")
            const lotteryState = await lottery.getLotteryState()
            assert.equal(lotteryState.toString(),"1")
            assert(!upkeepNeeded)
        })
        it("returns false if people haven't sent any ETH",async ()=>{
            await network.provider.send("evm_mine",[])
            await network.provider.send("evm_increaseTime",[interval])
            const {upkeepNeeded} = await lottery.checkUpkeep.staticCall("0x")
            assert(!upkeepNeeded)
        })
        it("returns false if enough time hasn't passed", async()=>{
            await lottery.enterLottery({value: entranceFee})
            await network.provider.send("evm_increaseTime",[interval-2])
            await network.provider.send("evm_mine",[])
            const {upkeepNeeded} = await lottery.checkUpkeep.staticCall("0x")  
            assert(!upkeepNeeded)
        })
        it("returns true if enough time has passed, has players, ETH and is open", async()=>{
            await lottery.enterLottery({value:entranceFee})
            await network.provider.send("evm_increaseTime",[interval])
            await network.provider.send("evm_mine",[])
            const {upkeepNeeded} = await lottery.checkUpkeep.staticCall("0x")
            assert(upkeepNeeded)
        })
    })
    describe('performUpkeep', () => { 
        it("should revert if checkUpkeep returns false",async ()=>{
            await expect(lottery.performUpkeep("0x")).to.be.revertedWith('Lottery__UpkeepNotNeeded')
        })
        it("should update lottery state to calculating", async()=>{
            await lottery.enterLottery({value: entranceFee})
            await network.provider.send("evm_increaseTime",[interval])
            await network.provider.send("evm_mine",[])
            await lottery.performUpkeep("0x")
            const lotteryState = await lottery.getLotteryState()
            assert.equal(lotteryState.toString(),"1")
        })
        it("should call vrf coordinator", async()=>{
            await lottery.enterLottery({value: entranceFee})
            await network.provider.send("evm_increaseTime",[interval])
            await network.provider.send("evm_mine",[])
            const transactionResponse = await lottery.performUpkeep("0x")
            const transactionReceipt = await transactionResponse.wait()
            const requestId = transactionReceipt.logs[1].args[0]
            assert.equal(requestId.toString(),"1")
        })
        it("should emit request lottery winner event", async()=>{
            await lottery.enterLottery({value: entranceFee})
            await network.provider.send("evm_increaseTime",[interval])
            await network.provider.send("evm_mine",[])
            // await expect(lottery.performUpkeep("0x")).to.emit(lottery, "RequestLotteryWinner")
        })
     })

     describe("fulfillRandomWords",() => {
        beforeEach(async() =>{
            await lottery.enterLottery({value: entranceFee})
            await network.provider.send("evm_increaseTime",[interval])
            await network.provider.send("evm_mine",[])
        })
        it("can be called only after performUpkeep", async()=>{
            // await lottery.performUpkeep("0x")
            await expect(vrfCoordinatorV2Mock.fulfillRandomWords(0,lottery.target)).to.be.revertedWith("nonexistent request")
            await expect(vrfCoordinatorV2Mock.fulfillRandomWords(1,lottery.target)).to.be.revertedWith("nonexistent request")
        })
        it("should select winner among the lottery players only", async ()=>{
           const additionalEntrants = 3
           const startingAccountIndex = 1
           const accounts = await ethers.getSigners()
           for(let i = startingAccountIndex; i< startingAccountIndex+ additionalEntrants; i++){
            const accountConnectedLottery = await lottery.connect(accounts[i])
            await accountConnectedLottery.enterLottery({value: entranceFee})
           }
           await new Promise(async (resolve, reject) => {
                    lottery.once("WinnerPicked",async () => {
                        console.log("WinnerPicked event emitted")
                        try{    
                            const winnerEndingBalance = await ethers.provider.getBalance(accounts[1].address)
                            const lotteryState = await lottery.getLotteryState()
                            const numberOfPlayers = await lottery.getNumberOfPlayers()
                            const updatedTimeStamp = await lottery.getLatestTimeStamp()
                            assert.equal(lotteryState.toString(),"0")
                            assert.equal(numberOfPlayers.toString(),"0")
                            assert(updatedTimeStamp > lastTimeStamp )
                            assert.equal(winnerEndingBalance,winnerStartingBalance+(entranceFee*(BigInt(additionalEntrants))+(entranceFee)))
                            resolve()    
                        }
                        catch(err){
                            reject(err)
                        }
                    })
                const winnerStartingBalance = await ethers.provider.getBalance(accounts[1].address)
                const lastTimeStamp = await lottery.getLatestTimeStamp()
                const tx = await lottery.performUpkeep("0x")
                const txReceipt = await tx.wait()
                const requestId = txReceipt.logs[1].args[0]
                await vrfCoordinatorV2Mock.fulfillRandomWords(requestId,lottery.target)
           })
        })
     })
 })