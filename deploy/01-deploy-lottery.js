const {network, ethers} = require('hardhat')
const {networkConfig, developmentChains} = require('../helper-hardhat-config')
const { verify } = require('../utils/verify')
require('dotenv').config()

const VRF_SUB_FUND_AMOUNT = ethers.parseEther("2")
module.exports = async ({getNamedAccounts, deployments }) => {
    const {deploy,log} = deployments
    const {deployer} = await getNamedAccounts()
    const chainId = network.config.chainId
    const entranceFee = networkConfig[chainId].entranceFee
    const gasLane = networkConfig[chainId].gasLane
    const callbackGasLimit = networkConfig[chainId].callbackGasLimit
    const interval = networkConfig[chainId].interval
    let vrfCoordinatorAddress, subscriptionId,vrfCoordinator;

    if(developmentChains.includes(network.name)){
        vrfCoordinator = await ethers.getContract('VRFCoordinatorV2Mock') 
        vrfCoordinatorAddress = (await deployments.get('VRFCoordinatorV2Mock')).address
        const transactionResponse = await vrfCoordinator.createSubscription()
        const transactionReceipt = await transactionResponse.wait(1)
        subscriptionId = Number(transactionReceipt.logs[0].args[0])
        await vrfCoordinator.fundSubscription(subscriptionId, VRF_SUB_FUND_AMOUNT)
    }
    else {
        vrfCoordinatorAddress = networkConfig[chainId].vrfCoordinatorV2
        subscriptionId = networkConfig[chainId].subscriptionId
    }
    const args=[vrfCoordinatorAddress, entranceFee, gasLane,subscriptionId, callbackGasLimit, interval]

    log('-------------------');
    log('Deploying Lottery contract and waiting for block confirmations')
    // const Lottery = await deploy('Lottery',{
    //     from: deployer,
    //     args,
    //     logs:true,
    //     waitConfirmations: network.config.blockConfirmations || 1,
    // })
//     if(developmentChains.includes(network.name)){
//         await vrfCoordinator.addConsumer(subscriptionId,Lottery.address)    
// }
    // log('Lottery contract deployed at ', Lottery.address)
    if(!developmentChains.includes(network.name) && process.env.ETHERSCAN_API_KEY){
        log('verifying lottery contract')
        // await verify(Lottery.address,args)
        await verify("0x94d8f57a75005670f0c2dd0c90caefc1becf14e1",args)
    }
}
module.exports.tags = ["all","lottery"]