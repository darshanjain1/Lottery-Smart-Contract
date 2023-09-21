const {ethers, network} = require("hardhat");
const fs = require("fs");
require("dotenv").config();

const FRONT_END_ABI = '../nextjs-smartcontract-lottery/constants/abi.json'
const FRONTEND_CONTRACT_ADDRESS = '../nextjs-smartcontract-lottery/constants/contractAddresses.json'

module.exports = async () =>{
    if(process.env.UPDATE_FRONTEND){
        console.log('updating frontend...');
        updateContractAddress()
        updateAbi()
    }
}

async function updateAbi(){
    const lottery = await ethers.getContract("Lottery");
    fs.writeFileSync(FRONT_END_ABI, JSON.stringify(lottery.interface.fragments))
}
async function updateContractAddress(){
    const lottery = await ethers.getContract("Lottery");
    const chainId = network.config.chainId.toString()
    const currentAddresses = JSON.parse(fs.readFileSync(FRONTEND_CONTRACT_ADDRESS, 'utf-8'))
    if(chainId in currentAddresses){
        if(!currentAddresses[chainId].includes(lottery.target)){
            currentAddresses[chainId].push(lottery.target) 
        }
    }
    else{
        currentAddresses[chainId] = [lottery.target]
    }
    fs.writeFileSync(FRONTEND_CONTRACT_ADDRESS, JSON.stringify(currentAddresses))
}
 
module.exports.tags=["all","frontend"]