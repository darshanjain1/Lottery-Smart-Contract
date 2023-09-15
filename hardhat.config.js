require("@nomiclabs/hardhat-waffle")
require("hardhat-gas-reporter")
require("@nomiclabs/hardhat-etherscan")
require("solidity-coverage")
require("hardhat-deploy")
require("dotenv").config()

/** @type import('hardhat/config').HardhatUserConfig */

module.exports = {
    defaultNetwork: "hardhat",
    networks: {
        hardhat: {
            chainId: 31337,
            blockConfirmations: 1
        },
        sepolia: {
            chainId: 11155111,
            url: process.env.SEPOLIA_RPC_URL,
            accounts: [process.env.PRIVATE_KEY_1, process.env.PRIVATE_KEY_2],
            blockConfirmations: 6,
        }
    },
    solidity: { compilers: [{ version: "0.8.19"}, {version: "0.6.10" }] },
    namedAccounts: {
        deployer:{
            default: 0, // here this will by default take the first account as deployer
            1: 0, // similarly on mainnet it will take the first account as deployer.
        },
        player:{
            default: 1, // here this will by default take the second account as player
            1: 1, // similarly on mainnet it will take the second account as player.
        }
    },
    etherscan:{
        apiKey: {
            sepolia: process.env.ETHERSCAN_API_KEY}
    },
    gasReporter:{
        enabled: false,
        currency: "USD",
        outputFile:"gas-report.txt",
        noColors: true,
        coinmarketcap: process.env.COIN_MARKETCAP_API
    },
    mocha: {
        timeout:500000 //300 seconds
    }

}
