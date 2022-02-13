require("@nomiclabs/hardhat-waffle");
require("@nomiclabs/hardhat-etherscan");
require("hardhat-gas-reporter");
require("./tasks/submitProducts.js");

const { rinkeby, ethereum, bsc, polygon, privateKeyDeployer, privateKeyGnosis } = require('./secrets.json');

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
      accounts: [privateKeyDeployer, privateKeyGnosis]
    },
    ethereum: {
      url: ethereum.rpc,
      accounts: [privateKeyDeployer, privateKeyGnosis]
    },
    bsc: {
      url: bsc.rpc,
      accounts: [privateKeyDeployer, privateKeyGnosis]
    },
    polygon: {
      url: polygon.rpc,
      accounts: [privateKeyDeployer, privateKeyGnosis]
    },
  },
  etherscan: {
    apiKey: rinkeby.scanApiKey
  },
  gasReporter: {
    excludeContracts: ["DAI.sol", "ERC20.sol"]
  }
};