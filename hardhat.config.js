require("@nomiclabs/hardhat-waffle");
require("@nomiclabs/hardhat-etherscan");
require("hardhat-gas-reporter");

const { mnemonic, rinkeby, ethereum, bsc, polygon } = require('./secrets.json');

module.exports = {
  solidity: "0.8.0",
  networks: {
    rinkeby: {
      url: rinkeby.rpc,
      accounts: { mnemonic }
    },
    ethereum: {
      url: ethereum.rpc,
      accounts: { mnemonic }
    },
    bsc: {
      url: bsc.rpc,
      accounts: { mnemonic }
    },
    polygon: {
      url: polygon.rpc,
      accounts: { mnemonic }
    },
  },
  etherscan: {
    apiKey:rinkeby.scanApiKey
  },
  gasReporter: {
    excludeContracts: ["DAI.sol", "ERC20.sol"]
  }
};