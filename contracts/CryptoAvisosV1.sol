//SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract CryptoAvisosV1 is Ownable {

    mapping(uint256 => Product) public productMapping;
    mapping(address => uint256) public claimableFee;
    uint256[] private productsIds;
    uint256 public fee;
    uint256 public lastUnlockTimeFee;
    uint256 public lastFeeToSet;

    event ProductSubmitted(uint256 productId);
    event ProductPaid(uint256 productId);
    event ProductReleased(uint256 productId);
    event ProductUpdated(uint256 productId);
    event ProductRefunded(uint256 productId);
    event ProductMarkAsPaid(uint256 productId);
    event FeeSetted(uint256 previousFee, uint256 newFee);
    event FeesClaimed(address receiver, address token, uint256 quantity);
    event PreparedFee(uint fee, uint unlockTime);
    event StockAdded(uint productId, uint stockAdded);
    event StockRemoved(uint productId, uint stockRemoved);

    constructor(uint256 newFee){
        _setFee(newFee);
    }

    struct Product {
        uint256 price; //In WEI
        Status status; 
        address payable seller;
        address payable buyer;
        address token; //Contract address or 0x00 if it's native coin
        uint256 feeCharged; //Holds charged fee, in case admin need to refund and fee has change between pay and refund time
        uint256 stock;
    }

    enum Status {
        FORSELL,
        WAITING,
        SOLD
    }

    function getProductsIds() external view returns (uint256[] memory) {
        return productsIds;
    }

    function _setFee(uint256 newFee) internal {
        //Set fee. Example: 10e18 = 10%
        require(newFee <= 100e18, '!fee');
        uint256 previousFee = fee;
        fee = newFee;
        emit FeeSetted(previousFee, newFee);
    }

    function prepareFee(uint256 newFee) external onlyOwner {
        //Prepare to set fee (wait 7 days to set. Timelock kind of)
        lastUnlockTimeFee = block.timestamp + 7 days;
        lastFeeToSet = newFee;
        emit PreparedFee(newFee, lastUnlockTimeFee);
    }

    function implementFee() external onlyOwner {
        //Set fee after 7 days
        require(lastUnlockTimeFee > 0, "!prepared");
        require(lastUnlockTimeFee <= block.timestamp, "!unlocked");
        _setFee(lastFeeToSet);
        lastUnlockTimeFee = 0;
    }

    function claimFees(address token, uint256 quantity) external payable onlyOwner {
        //Claim fees originated of paying a product
        require(claimableFee[token] >= quantity, "!funds");
        claimableFee[token] -= quantity;
        if(token == address(0)){
            //ETH
            payable(msg.sender).transfer(quantity);
        }else{
            //ERC20
            IERC20(token).transfer(msg.sender, quantity);
        }
        emit FeesClaimed(msg.sender, token, quantity);
    }

    function submitProduct(uint256 productId, address payable seller, uint256 price, address token, uint256 stock) external onlyOwner {
        //Submit a product
        require(productId != 0, "!productId");
        require(price != 0, "!price");
        require(seller != address(0), "!seller");
        require(productMapping[productId].seller == address(0), "alreadyExist");
        Product memory product = Product(price, Status.FORSELL, seller, payable(address(0)), token, 0, stock);
        productMapping[productId] = product;
        productsIds.push(productId);
        emit ProductSubmitted(productId);
    }

    function markAsPaid(uint256 productId) external onlyOwner {
        //This function mark as paid a product when is paid in other chain
        Product memory product = productMapping[productId];
        require(product.seller != address(0), "!exist");
        require(Status.SOLD != product.status, 'sold');
        product.status = Status.SOLD;
        productMapping[productId] = product;
        emit ProductMarkAsPaid(productId);
    }

    function payProduct(uint256 productId) external payable {
        //Pay a specific product
        Product memory product = productMapping[productId];
        require(product.seller != address(0), "!exist");
        require(Status.FORSELL == product.status, 'sold');
        require(product.stock != 0, "!stock");

        if (product.token == address(0)) {
            //Pay with ether (or native coin)
            require(msg.value == product.price, '!msg.value');
        }else{
            //Pay with token
            IERC20(product.token).transferFrom(msg.sender, address(this), product.price);
        }

        uint256 toFee = product.price * fee / 100e18;
        claimableFee[product.token] += toFee;

        product.feeCharged = toFee;
        product.status = Status.WAITING;
        product.buyer = payable(msg.sender);
        product.stock -= 1;
        productMapping[productId] = product;
        emit ProductPaid(productId);
    }

    function releasePay(uint256 productId) external onlyOwner {
        //Release pay to seller
        Product memory product = productMapping[productId];
        require(product.seller != address(0), "!exist");
        require(Status.WAITING == product.status, '!waiting');
        uint256 finalPrice = product.price - product.feeCharged;

        if (product.token == address(0)) {
            //Pay with ether (or native coin)
            product.seller.transfer(finalPrice);
        }else{
            //Pay with token
            IERC20(product.token).transfer(product.seller, finalPrice);
        }

        product.status = Status.SOLD;
        productMapping[productId] = product;
        emit ProductReleased(productId);
    }

    function updateProduct(uint256 productId, address payable seller, uint256 price, address token, uint256 stock) external onlyOwner {
        //Update a product
        require(productId != 0, "!productId");
        require(price != 0, "!price");
        require(seller != address(0), "!seller");
        Product memory product = productMapping[productId];
        require(product.status == Status.FORSELL || product.status == Status.WAITING, "!forSell");
        require(product.seller != address(0), "!exist");
        product = Product(price, Status.FORSELL, seller, payable(address(0)), token, 0, stock);
        productMapping[productId] = product;
        emit ProductUpdated(productId);
    }

    function refundProduct(uint256 productId) external onlyOwner {
        //Return funds to buyer
        require(productId != 0, "!productId");
        Product memory product = productMapping[productId];
        require(product.seller != address(0), "!exist");
        require(product.status == Status.WAITING, "!waiting");
        if(product.token == address(0)){
            //ETH
            payable(product.buyer).transfer(product.price);
        }else{
            //ERC20
            IERC20(product.token).transfer(product.buyer, product.price);
        }
        claimableFee[product.token] -= product.feeCharged;
        product.status = Status.SOLD;
        productMapping[productId] = product;
        emit ProductRefunded(productId);
    }

    function addStock(uint256 productId, uint256 stockToAdd) external onlyOwner {
        //Add stock to a product
        Product memory product = productMapping[productId];
        require(productId != 0, "!productId");
        require(stockToAdd != 0, "!stockToAdd");
        require(product.seller != address(0), "!exist");
        product.stock += stockToAdd;
        productMapping[productId] = product;
        emit StockAdded(productId, stockToAdd);
    }

    function removeStock(uint256 productId, uint256 stockToRemove) external onlyOwner {
        //Add stock to a product
        Product memory product = productMapping[productId];
        require(productId != 0, "!productId");
        require(product.stock >= stockToRemove, "!stockToRemove");
        require(product.seller != address(0), "!exist");
        product.stock -= stockToRemove;
        productMapping[productId] = product;
        emit StockRemoved(productId, stockToRemove);
    }
    
}