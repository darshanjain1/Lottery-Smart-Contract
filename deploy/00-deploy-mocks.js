const { network, ethers } = require("hardhat")
const {developmentChains} = require('../helper-hardhat-config')

const BASE_FEE = ethers.parseEther('0.025') //0.25 is the premium. It costs 0.25 LINK per request.
const GAS_PRICE_LINK = 1e9 // 1000000000 
module.exports = async ({getNamedAccounts, deployments}) => {
    const {deploy,log} = deployments
    const {deployer} = await getNamedAccounts()
    const args = [BASE_FEE,GAS_PRICE_LINK]
    if(developmentChains.includes(network.name) ){
        log('Local network detected! Deploying mocks ....')
        // deploy a mock VRF coordinator

        await deploy('VRFCoordinatorV2Mock',{
            from: deployer,
            args,
            log:true
        })
        log('Mocks Deployed')
        log('-----------')
    }
}
module.exports.tags=["all","mocks"]