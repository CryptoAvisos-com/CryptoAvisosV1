//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract CryptoAvisosV1 is Ownable{

    mapping(uint256 => Product) public productMapping;
    uint8 public fee;

    event ProductSubmitted(uint256 productId);
    event ProductPayed(uint256 productId);
    event ProductReleased(uint256 productId);
    event FeeSetted(uint8 previousFee, uint8 newFee);
    event FeeClaimed(address receiver);

    constructor(uint8 newFee){
        setFee(newFee);
    }

    struct Product {
        uint256 price; //In WEI
        Status status; 
        address payable seller;
        address token; //Contract address or 0x00 if it's native coin
    }

    enum Status {
        FORSELL,
        WAITING,
        SELLED
    }

    function setFee(uint8 newFee) public onlyOwner {
        //Set fee. Example: 10 = 10%
        uint8 previousFee = fee;
        require(newFee < 100, 'Fee bigger than 100%');
        fee = newFee;
        emit FeeSetted(previousFee, newFee);
    }

    function claimFee(address token) public payable onlyOwner {
        //Claim fees originated of paying a product
        if(token == address(0)){
            //ETH
            payable(msg.sender).transfer(address(this).balance);
        }else{
            //ERC20
            IERC20(token).transfer(msg.sender, IERC20(token).balanceOf(address(this)));
        }
        emit FeeClaimed(msg.sender);
    }

    function submitProduct(uint256 productId, address payable seller, uint256 price, address token) public onlyOwner {
        //Submit or update a product
        require(productId != 0, "productId cannot be zero");
        require(price != 0, "price cannot be zero");
        require(seller != address(0), "seller cannot be zero address");
        Product memory product = Product(price, Status.FORSELL, seller, token);
        productMapping[productId] = product;
        emit ProductSubmitted(productId);
    }

    function payProduct(uint256 productId) external payable {
        //Pay a specific product
        Product memory product = productMapping[productId];
        require(Status.FORSELL == product.status, 'Product already selled');

        if (product.token == address(0)) {
            //Pay with ether (or native coin)
            require(msg.value >= product.price, 'Not enough ETH sended');
        }else{
            //Pay with token
            IERC20(product.token).transferFrom(msg.sender, address(this), product.price);
        }
        
        product.status = Status.WAITING;
        productMapping[productId] = product;
        emit ProductPayed(productId);
    }

    function releasePay(uint256 productId) external onlyOwner {
        //Release pay to seller
        Product memory product = productMapping[productId];
        require(Status.WAITING == product.status, 'Not allowed to release pay');
        uint256 finalPrice = product.price - (product.price * fee / 100);

        if (product.token == address(0)) {
            //Pay with ether (or native coin)
            product.seller.transfer(finalPrice);
        }else{
            //Pay with token
            IERC20(product.token).transfer(product.seller, finalPrice);
        }

        product.status = Status.SELLED;
        productMapping[productId] = product;
        emit ProductReleased(productId);
    }
}
