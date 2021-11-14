require("@nomiclabs/hardhat-waffle");
require("@nomiclabs/hardhat-etherscan");
require("hardhat-gas-reporter");

const { mnemonic, rinkeby, ethereum, bsc, polygon, privateKey } = require('./secrets.json');

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
      accounts: [privateKey]
    },
    ethereum: {
      url: ethereum.rpc,
      accounts: [privateKey]
    },
    bsc: {
      url: bsc.rpc,
      accounts: [privateKey]
    },
    polygon: {
      url: polygon.rpc,
      accounts: [privateKey]
    },
  },
  etherscan: {
    apiKey: polygon.scanApiKey
  },
  gasReporter: {
    excludeContracts: ["DAI.sol", "ERC20.sol"]
  }
};