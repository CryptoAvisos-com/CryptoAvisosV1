//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

// import "hardhat/console.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract CryptoAvisosV1 is Ownable{

    mapping(uint256 => Product) public productMapping;
    uint8 public fee;

    event ProductSubmitted(uint256 productId);
    event ProductPayed(uint256 productId);
    event FeeSetted(uint8 previousFee, uint8 newFee);
    event FeeClaimed(address receiver);

    constructor(uint8 newFee){
        setFee(newFee);
    }

    struct Product {
        uint256 price; //In WEI
        bool forSell; 
        address payable seller;
        address token; //Contract address or 0x00 if it's native coin
    }

    function viewProduct(uint256 productId) public view returns (Product memory) {
        //Return a product
        return productMapping[productId];
    }

    function viewFee() public view returns (uint8) {
        //Return fee
        return fee;
    }

    function viewETHBalance() public view returns (uint256) {
        return address(this).balance;
    }

    function submitProduct(uint256 productId, address payable seller, uint256 price, address token) public onlyOwner returns (bool) {
        //Submit or update a product
        Product memory product = Product(price, true, seller, token);
        productMapping[productId] = product;
        emit ProductSubmitted(productId);
        return true;
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

    function payProduct(uint256 productId) external payable returns (bool) {
        //Pay a specific product
        Product memory product = productMapping[productId];
        require(product.forSell == true, 'Product already selled');
        uint256 finalPrice = product.price - (product.price * fee / 100);

        if (product.token == address(0)) {
            //Pay with ether (or native coin)
            require(msg.value >= product.price, 'Not enough ETH sended');
            product.seller.transfer(finalPrice);
        }else{
            //Pay with token
            if (fee == 0){
                //If fee is 0, transfer directly
                IERC20(product.token).transferFrom(msg.sender, product.seller, product.price);
            }else{
                IERC20(product.token).transferFrom(msg.sender, address(this), product.price);
                IERC20(product.token).transfer(product.seller, finalPrice);
            }
        }
        
        productMapping[productId].forSell = true;
        emit ProductPayed(productId);
        return true;
    }
}