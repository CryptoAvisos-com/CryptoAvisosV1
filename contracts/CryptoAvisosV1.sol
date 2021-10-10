//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract CryptoAvisosV1 is Ownable {

    mapping(uint256 => Product) public productMapping;
    uint256[] private productsIds;
    uint256 public fee;
    uint256 public lastUnlockTimeFee;
    uint256 public lastFeeToSet;

    event ProductSubmitted(uint256 productId);
    event ProductPaid(uint256 productId);
    event ProductReleased(uint256 productId);
    event ProductUpdated(uint256 productId);
    event ProductMarkAsPaid(uint256 productId);
    event FeeSetted(uint256 previousFee, uint256 newFee);
    event FeeClaimed(address receiver, address token, uint256 quantity);
    event PreparedFee();

    constructor(uint256 newFee){
        _setFee(newFee);
    }

    struct Product {
        uint256 price; //In WEI
        Status status; 
        address payable seller;
        address payable buyer;
        address token; //Contract address or 0x00 if it's native coin
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
        require(newFee <= 100e18, 'Fee bigger than 100%');
        uint256 previousFee = fee;
        fee = newFee;
        emit FeeSetted(previousFee, newFee);
    }

    function prepareFee(uint256 newFee) external onlyOwner {
        //Prepare to set fee (wait 7 days to set. Timelock kind of)
        lastUnlockTimeFee = block.timestamp + 7 days;
        lastFeeToSet = newFee;
    }

    function implementFee() external onlyOwner {
        //Set fee after 7 days
        require(lastUnlockTimeFee > 0, "not prepared");
        require(lastUnlockTimeFee <= block.timestamp, "not unlocked yet");
        _setFee(lastFeeToSet);
        lastUnlockTimeFee = 0;
    }

    function claimFee(address token, uint256 quantity) external payable onlyOwner {
        //Claim fees originated of paying a product
        if(token == address(0)){
            //ETH
            payable(msg.sender).transfer(quantity);
        }else{
            //ERC20
            IERC20(token).transfer(msg.sender, quantity);
        }
        emit FeeClaimed(msg.sender, token, quantity);
    }

    function submitProduct(uint256 productId, address payable seller, uint256 price, address token) external onlyOwner {
        //Submit a product
        require(productId != 0, "productId cannot be zero");
        require(price != 0, "price cannot be zero");
        require(seller != address(0), "seller cannot be zero address");
        require(productMapping[productId].seller == address(0), "productId already exist");
        Product memory product = Product(price, Status.FORSELL, seller, payable(address(0)), token);
        productMapping[productId] = product;
        productsIds.push(productId);
        emit ProductSubmitted(productId);
    }

    function markAsPaid(uint256 productId) external onlyOwner {
        //This function mark as paid a product when is paid in other chain
        Product memory product = productMapping[productId];
        require(Status.SOLD != product.status, 'Product already sold');
        product.status = Status.SOLD;
        productMapping[productId] = product;
        emit ProductMarkAsPaid(productId);
    }

    function payProduct(uint256 productId) external payable {
        //Pay a specific product
        Product memory product = productMapping[productId];
        require(Status.FORSELL == product.status, 'Product already sold');

        if (product.token == address(0)) {
            //Pay with ether (or native coin)
            require(msg.value >= product.price, 'Not enough ETH sended');
        }else{
            //Pay with token
            IERC20(product.token).transferFrom(msg.sender, address(this), product.price);
        }
        
        product.status = Status.WAITING;
        product.buyer = payable(msg.sender);
        productMapping[productId] = product;
        emit ProductPaid(productId);
    }

    function releasePay(uint256 productId) external onlyOwner {
        //Release pay to seller
        Product memory product = productMapping[productId];
        require(Status.WAITING == product.status, 'Not allowed to release pay');
        uint256 finalPrice = product.price - (product.price * fee / 100e18);

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

    function updateProduct(uint256 productId, address payable seller, uint256 price, address token) external onlyOwner {
        //Update a product
        require(productId != 0, "productId cannot be zero");
        require(price != 0, "price cannot be zero");
        require(seller != address(0), "seller cannot be zero address");
        Product memory product = productMapping[productId];
        require(product.status == Status.FORSELL || product.status == Status.WAITING, "cannot update a sold product");
        require(product.seller != address(0), "cannot update a non existing product");
        product = Product(price, Status.FORSELL, seller, payable(address(0)), token);
        productMapping[productId] = product;
        emit ProductUpdated(productId);
    }
    
}
