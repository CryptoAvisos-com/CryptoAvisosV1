/**
 * @type import('hardhat/config').HardhatUserConfig
 */

require("@nomiclabs/hardhat-waffle");
const { mnemonic, url } = require('./secrets.json');

module.exports = {
  solidity: "0.8.0",
  networks: {
    rinkeby: {
      url: url,
      accounts: { mnemonic }
    }
  }
};