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

- prepareFee & implementFee: used by admins to set the fee of the purchases with a 7 days wait time.
- claimFees: used by admins to claim collected fees.
- submitProduct: creates a new product in the contract. Product id should be unique.
- markAsPaid: mark a product as paid. Used to mark as paid a product paid in other chain.
- releasePay: release the pay to the seller, if all conditions are OK.
- updateProduct: updates a product. Product id to update should exist, and not be in "SOLD" or "WAITING" status.
- refundProduct: send to the buyer the cost of the product (included fees).

Public functions:

- payProduct: pay a product. 

Product struct:

- price: Price in WEI. (Default for Solidity).
- status: Product status. (See Status Enum).
- seller: Product seller, should be able to receive ETH and ERC20.
- buyer: Product buyer, 0x00 address if not bought yet.
- token: Contract address of ERC20 to pay the product.(0x00 if it's native coin, example: ETH, BNB, MATIC).
- feeCharged: Fee charged for buying a product. Used for refund.