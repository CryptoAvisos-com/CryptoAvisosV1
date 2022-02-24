//SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract CryptoAvisosV1 is Ownable {

    mapping(uint => Product) public productMapping; //productId in CA platform => Product
    mapping(uint => Ticket) public productTicketsMapping; //uint(keccak256(productId, buyer, blockNumber, product.stock)) => Ticket
    mapping(address => uint) public claimableFee;
    uint[] private productsIds;
    uint[] private ticketsIds;
    uint public fee;
    uint public lastUnlockTimeFee;
    uint public lastFeeToSet;

    event ProductSubmitted(uint productId);
    event ProductPaid(uint productId, uint ticketId);
    event PayReleased(uint productId, uint tickerId);
    event ProductUpdated(uint productId);
    event ProductRefunded(uint productId, uint ticketId);
    event SwitchChanged(uint productId, bool isEnabled);
    event FeeSetted(uint previousFee, uint newFee);
    event FeesClaimed(address receiver, address token, uint quantity);
    event PreparedFee(uint fee, uint unlockTime);
    event StockAdded(uint productId, uint stockAdded);
    event StockRemoved(uint productId, uint stockRemoved);

    constructor(uint newFee){
        _setFee(newFee);
    }

    struct Product {
        uint price; //In WEI
        address payable seller;
        address token; //Contract address or 0x00 if it"s native coin
        uint stock;
        bool enabled;
    }

    struct Ticket {
        uint productId;
        Status status;
        address payable buyer;
        address tokenPaid; //Holds contract address or 0x00 if it"s native coin used in payment
        uint feeCharged; //Holds charged fee, in case admin need to refund and fee has change between pay and refund time
        uint pricePaid; //Holds price paid at momento of payment (without fee)
    }

    enum Status {
        WAITING,
        SOLD
    }

    function getProductsIds() external view returns (uint[] memory) {
        return productsIds;
    }

    function getTicketsIds() external view returns (uint[] memory) {
        return ticketsIds;
    }

    function _setFee(uint newFee) internal {
        //Set fee. Example: 10e18 = 10%
        require(newFee <= 100e18, "!fee");
        uint previousFee = fee;
        fee = newFee;
        emit FeeSetted(previousFee, newFee);
    }

    function prepareFee(uint newFee) external onlyOwner {
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

    function claimFees(address token, uint quantity) external payable onlyOwner {
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

    function submitProduct(uint productId, address payable seller, uint price, address token, uint stock) external onlyOwner {
        //Submit a product
        require(productId != 0, "!productId");
        require(price != 0, "!price");
        require(seller != address(0), "!seller");
        require(stock != 0, "!stock");
        require(productMapping[productId].seller == address(0), "alreadyExist");
        Product memory product = Product(price, seller, token, stock, true);
        productMapping[productId] = product;
        productsIds.push(productId);
        emit ProductSubmitted(productId);
    }

    function switchEnable(uint productId, bool isEnabled) external onlyOwner {
        //This function enable or disable a product
        Product memory product = productMapping[productId];
        require(product.seller != address(0), "!exist");
        product.enabled = isEnabled;
        productMapping[productId] = product;
        emit SwitchChanged(productId, isEnabled);
    }

    function payProduct(uint productId) external payable {
        //Pay a specific product
        Product memory product = productMapping[productId];
        require(product.seller != address(0), "!exist");
        require(product.enabled, "!enabled");
        require(product.stock != 0, "!stock");

        if (product.token == address(0)) {
            //Pay with ether (or native coin)
            require(msg.value == product.price, "!msg.value");
        }else{
            //Pay with token
            IERC20(product.token).transferFrom(msg.sender, address(this), product.price);
        }

        uint toFee = product.price * fee / 100e18;
        claimableFee[product.token] += toFee;

        //Create ticket
        uint ticketId = uint(keccak256(abi.encode(productId, msg.sender, block.number, product.stock)));
        productTicketsMapping[ticketId] = Ticket(productId, Status.WAITING, payable(msg.sender), product.token, toFee, product.price);
        ticketsIds.push(ticketId);

        product.stock -= 1;
        productMapping[productId] = product;
        emit ProductPaid(productId, ticketId);
    }

    function releasePay(uint ticketId) external onlyOwner {
        //Release pay to seller
        Ticket memory ticket = productTicketsMapping[ticketId];
        require(ticket.buyer != address(0), "!exist");

        Product memory product = productMapping[ticket.productId];
        require(Status.WAITING == ticket.status, "!waiting");
        uint finalPrice = ticket.pricePaid;

        if (ticket.tokenPaid == address(0)) {
            //Pay with ether (or native coin)
            product.seller.transfer(finalPrice);
        }else{
            //Pay with token
            IERC20(ticket.tokenPaid).transfer(product.seller, finalPrice);
        }

        ticket.status = Status.SOLD;
        productTicketsMapping[ticketId] = ticket;
        emit PayReleased(ticket.productId, ticketId);
    }

    function updateProduct(uint productId, address payable seller, uint price, address token, uint stock) external onlyOwner {
        //Update a product
        require(productId != 0, "!productId");
        require(price != 0, "!price");
        require(seller != address(0), "!seller");
        Product memory product = productMapping[productId];
        require(product.seller != address(0), "!exist");
        product = Product(price, seller, token, stock, true);
        productMapping[productId] = product;
        emit ProductUpdated(productId);
    }

    function refundProduct(uint ticketId) external onlyOwner {
        //Return funds to buyer
        Ticket memory ticket = productTicketsMapping[ticketId];

        require(ticket.productId != 0, "!ticketId");
        require(Status.WAITING == ticket.status, "!waiting");

        if(ticket.tokenPaid == address(0)){
            //ETH
            ticket.buyer.transfer(ticket.pricePaid);
        }else{
            //ERC20
            IERC20(ticket.tokenPaid).transfer(ticket.buyer, ticket.pricePaid);
        }
        claimableFee[ticket.tokenPaid] -= ticket.feeCharged;
        ticket.status = Status.SOLD;
        
        productTicketsMapping[ticketId] = ticket;
        emit ProductRefunded(ticket.productId, ticketId);
    }

    function addStock(uint productId, uint stockToAdd) external onlyOwner {
        //Add stock to a product
        Product memory product = productMapping[productId];
        require(productId != 0, "!productId");
        require(stockToAdd != 0, "!stockToAdd");
        require(product.seller != address(0), "!exist");
        product.stock += stockToAdd;
        productMapping[productId] = product;
        emit StockAdded(productId, stockToAdd);
    }

    function removeStock(uint productId, uint stockToRemove) external onlyOwner {
        //Add stock to a product
        Product memory product = productMapping[productId];
        require(productId != 0, "!productId");
        require(product.stock >= stockToRemove, "!stockToRemove");
        require(product.seller != address(0), "!exist");
        product.stock -= stockToRemove;
        productMapping[productId] = product;
        emit StockRemoved(productId, stockToRemove);
    }

    function getTicketsIdsByProduct(uint productId) external view returns (uint[] memory) {
        // Count how many of them are
        uint count = 0;
        for (uint256 i = 0; i < ticketsIds.length; i++) {
            if (productTicketsMapping[ticketsIds[i]].productId == productId) {
                count++;
            }
        }

        // Add to array
        uint index = 0;
        uint[] memory _ticketsIds = new uint[](count);
        for (uint256 i = 0; i < ticketsIds.length; i++) {
            if (productTicketsMapping[ticketsIds[i]].productId == productId) {
                _ticketsIds[index] = ticketsIds[i];
                index++;
            }
        }

        return _ticketsIds;
    }
    
}