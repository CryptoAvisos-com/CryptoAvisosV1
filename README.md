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

**OnlyOwner** functions:

- prepareFee & implementFee: used by admins to set the fee of the purchases with a 7 days wait time.
- claimFees: used by admins to claim collected fees.
- submitProduct: creates a new product in the contract. Product id should be unique.
- switchEnable: change enabled status of a product
- releasePay: release the pay to the seller, if all conditions are OK.
- updateProduct: updates a product. Product id to update should exist, and not be in "SOLD" or "WAITING" status.
- refundProduct: send to the buyer the cost of the product (included fees).
- addStock: add units to stock
- removeStock: remove units from stock

**Public** functions:

- payProduct: pay a product. 

**Product** struct:

- price: Price in WEI. (Default for Solidity).
- seller: Product seller, should be able to receive ETH and ERC20.
- token: Contract address of ERC20 to pay the product.(0x00 if it's native coin, example: ETH, BNB, MATIC).
- stock: How many units of the product for sell
- enabled: Boolean to check if the product is available

**Ticket** struct:
- productId: 
- status: Product status. (See Status Enum).
- buyer: Product buyer, 0x00 address if not bought yet.
- tokenPaid: Contract Address of token paid
- feeCharged: Fee charged for buying a product. Used for refund.
- pricePaid: Price in WEI paid

## **Registry**

## Multisigs

|       **Title**        |                         **Address**                          |
| :--------------------: | :----------------------------------------------------------: |
|      BSC Multisig      | [0xf0Bfc9f97BAe489411b22Aa69dBCA1170d51182A](https://bscscan.com/address/0xf0Bfc9f97BAe489411b22Aa69dBCA1170d51182A) |
|    Polygon Multisig    | [0x62D20398Be41397c9Af7eB745471003031c26DF6](https://polygonscan.com/address/0x62D20398Be41397c9Af7eB745471003031c26DF6) |

## Contracts

|       **Title**        |                         **Address**                          |
| :--------------------: | :----------------------------------------------------------: |
|   CryptoAvisosV1 BSC   | [0xd77DBc54a318a86Aa93954B23Ca2F57BA1E3c0a9](https://bscscan.com/address/0xd77dbc54a318a86aa93954b23ca2f57ba1e3c0a9) |
| CryptoAvisosV1 Polygon | [0xd77DBc54a318a86Aa93954B23Ca2F57BA1E3c0a9](https://polygonscan.com/address/0xd77dbc54a318a86aa93954b23ca2f57ba1e3c0a9) |
|   CryptoAvisosV1.1 BSC   | [0x3deFBEc15F95e0Aaa31205059B64522BB3cF1828](https://bscscan.com/address/0x3deFBEc15F95e0Aaa31205059B64522BB3cF1828) |
| CryptoAvisosV1.1 Polygon | [0x3deFBEc15F95e0Aaa31205059B64522BB3cF1828](https://polygonscan.com/address/0x3deFBEc15F95e0Aaa31205059B64522BB3cF1828) |