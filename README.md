## **CryptoAvisosV1 is a multichain product of  [CryptoAvisos.com](https://cryptoavisos.com/)**

**To install:**

`npm install`

**To test:**

`npx hardhat test tests/testCryptoAvisosV1.js`

**To deploy:**

`npx hardhat run scripts/deploy.js --network NETWORK_NAME`

**To verify:**

`npx hardhat verify --network NETWORK_NAME DEPLOYED_CONTRACT_ADDRESS "Constructor argument 1"`

## Detailed information about contract operation:

OnlyOwner functions:

- setFee: used by admins to set the fee of the purchases.
- claimFee: used by admins to claim collected fees, or to rescue funds by wrong purchase.
- submitProduct: creates a new product in the contract. Product id should be unique.
- markAsPayed: mark a product as payed. Used to mark as payed a product payed in other chain.
- releasePay: release the pay to the seller, if all conditions are OK.
- updateProduct: updates a product. Product id to update should exist, and not be in "SOLD" status.

Public functions:

- payProduct: pay a product. 

Product struct:

- price: Price in WEI. (Default for Solidity).
- status: Product status. (See Status Enum).
- seller: Product seller, should be able to receive ETH and ERC20.
- token: Contract address of ERC20 to pay the product.(0x00 if it's native coin, example: ETH, BNB, MATIC).