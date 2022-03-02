require("@nomiclabs/hardhat-waffle");
require("@nomiclabs/hardhat-etherscan");
require("hardhat-gas-reporter");

const { rinkeby, ethereum, bsc, polygon, privateKeyDeployer, privateKeyTesting } = require('./secrets.json');

module.exports = {
  solidity: {
    version: "0.8.0",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      }
    }
  },
  networks: {
    rinkeby: {
      url: rinkeby.rpc,
      accounts: [privateKeyTesting]
    },
    ethereum: {
      url: ethereum.rpc,
      accounts: [privateKeyDeployer]
    },
    bsc: {
      url: bsc.rpc,
      accounts: [privateKeyDeployer]
    },
    polygon: {
      url: polygon.rpc,
      accounts: [privateKeyDeployer]
    }
  },
  etherscan: {
    apiKey: {
      mainnet: ethereum.scanApiKey,
      rinkeby: rinkeby.scanApiKey,
      bsc: bsc.scanApiKey,
      polygon: polygon.scanApiKey
    }
  },
  gasReporter: {
    excludeContracts: ["DAI.sol", "ERC20.sol"]
  }
};