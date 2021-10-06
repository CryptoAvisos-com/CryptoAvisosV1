//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "hardhat/console.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract DAI is ERC20 {
    constructor(uint256 initSupply) ERC20("Dai Stablecoin", "DAI"){
        _mint(msg.sender, initSupply);
    }
}