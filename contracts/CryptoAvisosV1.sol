//SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

/// @title A smart contract to buy and sell products on CryptoAvisos.com
/// @author TheAustrian
contract CryptoAvisosV1 is Ownable {
    using ECDSA for bytes32;

    mapping(uint => Product) public productMapping; //productId in CA platform => Product
    mapping(uint => Ticket) public productTicketsMapping; //uint(keccak256(productId, buyer, blockNumber, product.stock)) => Ticket
    mapping(address => uint) public claimableFee;
    mapping(bytes => bool) public executed;
    mapping(address => bool) public sellerWhitlist;
    uint[] private productsIds;
    uint[] private ticketsIds;

    uint public fee;
    uint public lastUnlockTimeFee;
    uint public lastFeeToSet;
    uint public nonce;

    address public immutable allowedSigner;

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
    event SellerWhitlistAdded(address seller);
    event SellerWhitlistRemoved(address seller);

    constructor(uint newFee, address _allowedSigner){
        _setFee(newFee);
        require(_allowedSigner != address(0), "!allowedSigner");
        allowedSigner = _allowedSigner;
    }

    modifier onlyWhitlisted() {
         require(owner() == _msgSender() || sellerWhitlist[msg.sender], '!whitlisted');
         _;
    }

    struct Product {
        uint price; //In WEI
        address payable seller;
        address token; //Contract address or 0x00 if it"s native coin
        bool enabled;
        uint stock;
    }

    struct Ticket {
        uint productId;
        Status status;
        address payable buyer;
        address tokenPaid; //Holds contract address or 0x00 if it"s native coin used in payment
        uint feeCharged; //Holds charged fee, in case admin need to refund and fee has changed between pay and refund time
        uint pricePaid; //Holds price paid at moment of payment (without fee)
    }

    enum Status {
        WAITING,
        SOLD
    }

    /// @notice Get all productIds loaded in the contract
    /// @return an array of productIds
    function getProductsIds() external view returns (uint[] memory) {
        return productsIds;
    }

    /// @notice Get all ticketsIds loaded in the contract
    /// @return an array of ticketsIds
    function getTicketsIds() external view returns (uint[] memory) {
        return ticketsIds;
    }

    /// @notice Get all ticketsIds filtered by `productId`
    /// @param productId ID of the product in CA DB
    /// @return an array of ticketsIds
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

    /// @notice Get all ticketsIds filtered by `buyer`
    /// @param user address of user to filter
    /// @return an array of ticketsIds
    function getTicketsIdsByAddress(address user) external view returns (uint[] memory) {
        // Count how many of them are
        uint count = 0;
        for (uint256 i = 0; i < ticketsIds.length; i++) {
            if (productTicketsMapping[ticketsIds[i]].buyer == user) {
                count++;
            }
        }

        // Add to array
        uint index = 0;
        uint[] memory _ticketsIds = new uint[](count);
        for (uint256 i = 0; i < ticketsIds.length; i++) {
            if (productTicketsMapping[ticketsIds[i]].buyer == user) {
                _ticketsIds[index] = ticketsIds[i];
                index++;
            }
        }

        return _ticketsIds;
    }

    function _setFee(uint newFee) internal {
        //Set fee. Example: 10e18 = 10%
        require(newFee <= 100e18, "!fee");
        uint previousFee = fee;
        fee = newFee;
        emit FeeSetted(previousFee, newFee);
    }

    function getHash(
        uint _productId,
        address _buyer,
        uint _cost,
        uint _chainId,
        uint _nonce
    ) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked(_productId, _buyer, _cost, _chainId, _nonce));
    }

    /// @notice Used for admin as first step to set fee (1/2)
    /// @dev Prepare to set fee (wait 7 days to set. Timelock kind of)
    /// @param newFee new fee to prepare
    function prepareFee(uint newFee) external onlyOwner {
        lastUnlockTimeFee = block.timestamp + 7 days;
        lastFeeToSet = newFee;
        emit PreparedFee(newFee, lastUnlockTimeFee);
    }

    /// @notice Used for admin as second step to set fee (2/2)
    /// @dev Set fee after 7 days
    function implementFee() external onlyOwner {
        require(lastUnlockTimeFee > 0, "!prepared");
        require(lastUnlockTimeFee <= block.timestamp, "!unlocked");
        _setFee(lastFeeToSet);
        lastUnlockTimeFee = 0;
    }

    /// @notice Used for admin to claim fees originated from sales
    /// @param token address of token to claim
    /// @param quantity quantity to claim
    function claimFees(address token, uint quantity) external payable onlyOwner {
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

    /// @notice Submit a product
    /// @dev Create a new product, revert if already exists
    /// @param productId ID of the product in CA DB
    /// @param seller seller address of the product
    /// @param price price (with corresponding ERC20 decimals)
    /// @param token address of the token
    /// @param stock how much units of the product
    function submitProduct(uint productId, address payable seller, uint price, address token, uint stock) external onlyWhitlisted {
        require(productId != 0, "!productId");
        require(price != 0, "!price");
        require(seller != address(0), "!seller");
        require(stock != 0, "!stock");
        require(productMapping[productId].seller == address(0), "alreadyExist");
        require(owner() == msg.sender || seller == msg.sender, "!sender");
        Product memory product = Product(price, seller, token, true, stock);
        productMapping[productId] = product;
        productsIds.push(productId);
        emit ProductSubmitted(productId);
    }

    /// @notice This function enable or disable a product
    /// @dev Modifies value of `enabled` in Product Struct
    /// @param productId ID of the product in CA DB
    /// @param isEnabled value to set
    function switchEnable(uint productId, bool isEnabled) external onlyWhitlisted {
        Product memory product = productMapping[productId];
        require(product.seller != address(0), "!exist");
        require(owner() == msg.sender || product.seller == msg.sender, "!sender");
        product.enabled = isEnabled;
        productMapping[productId] = product;
        emit SwitchChanged(productId, isEnabled);
    }

    /// @notice Public function to pay a product
    /// @dev It generates a ticket, can be pay with ETH or ERC20. Verifies the shipping cost
    /// @param productId ID of the product in CA DB
    /// @param shippingCost Shipping cost in WEI
    /// @param signedMessage Signed message (hash)
    function payProduct(uint productId, uint shippingCost, bytes memory signedMessage) external payable {
        require(executed[signedMessage] == false, "!signedMessage");
        Product memory product = productMapping[productId];
        require(product.seller != address(0), "!exist");
        require(product.enabled, "!enabled");
        require(product.stock != 0, "!stock");

        // verifing signature
        bytes32 _hash = getHash(productId, msg.sender, shippingCost, block.chainid, nonce);
        bytes32 ethSignedHash = _hash.toEthSignedMessageHash();
        address signer = ethSignedHash.recover(signedMessage);
        require(allowedSigner == signer, "!allowedSigner");

        uint price = product.price + shippingCost;

        if (product.token == address(0)) {
            //Pay with ether (or native coin)
            require(msg.value == price, "!msg.value");
        }else{
            //Pay with token
            IERC20(product.token).transferFrom(msg.sender, address(this), price);
        }

        uint toFee = product.price * fee / 100e18;

        //Create ticket
        uint ticketId = uint(keccak256(abi.encode(productId, msg.sender, block.number, product.stock)));
        productTicketsMapping[ticketId] = Ticket(productId, Status.WAITING, payable(msg.sender), product.token, toFee, product.price);
        ticketsIds.push(ticketId);

        product.stock -= 1;
        executed[signedMessage] = true;
        nonce++;
        productMapping[productId] = product;
        emit ProductPaid(productId, ticketId);
    }

    /// @notice Release pay (sends money, without fee, to the seller)
    /// @param ticketId TicketId (returned on `payProduct`)
    function releasePay(uint ticketId) external onlyOwner {
        Ticket memory ticket = productTicketsMapping[ticketId];
        require(ticket.buyer != address(0), "!exist");

        Product memory product = productMapping[ticket.productId];
        require(Status.WAITING == ticket.status, "!waiting");
        uint finalPrice = ticket.pricePaid - ticket.feeCharged;

        if (ticket.tokenPaid == address(0)) {
            //Pay with ether (or native coin)
            product.seller.transfer(finalPrice);
        }else{
            //Pay with token
            IERC20(ticket.tokenPaid).transfer(product.seller, finalPrice);
        }

        claimableFee[product.token] += ticket.feeCharged;

        ticket.status = Status.SOLD;
        productTicketsMapping[ticketId] = ticket;
        emit PayReleased(ticket.productId, ticketId);
    }

    /// @notice Used by admin to update values of a product
    /// @dev `productId` needs to be loaded in contract
    /// @param productId ID of the product in CA DB
    /// @param seller seller address of the product
    /// @param price price (with corresponding ERC20 decimals)
    /// @param token address of the token
    /// @param stock how much units of the product
    function updateProduct(uint productId, address payable seller, uint price, address token, uint stock) external onlyWhitlisted {
        //Update a product
        require(productId != 0, "!productId");
        require(price != 0, "!price");
        require(seller != address(0), "!seller");
        Product memory product = productMapping[productId];
        require(product.seller != address(0), "!exist");
        require(owner() == msg.sender || product.seller == msg.sender, "!sender");
        product = Product(price, seller, token,  true, stock);
        productMapping[productId] = product;
        emit ProductUpdated(productId);
    }

    /// @notice Refunds pay (sends money, without fee, to the buyer)
    /// @param ticketId TicketId (returned on `payProduct`)
    function refundProduct(uint ticketId) external onlyOwner {
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
        ticket.status = Status.SOLD;
        
        productTicketsMapping[ticketId] = ticket;
        emit ProductRefunded(ticket.productId, ticketId);
    }

    /// @notice Add units to stock in a specific product
    /// @param productId ID of the product in CA DB
    /// @param stockToAdd How many units add to stock
    function addStock(uint productId, uint stockToAdd) external onlyWhitlisted {
        //Add stock to a product
        Product memory product = productMapping[productId];
        require(productId != 0, "!productId");
        require(stockToAdd != 0, "!stockToAdd");
        require(product.seller != address(0), "!exist");
        require(owner() == msg.sender || product.seller == msg.sender, "!sender");
        product.stock += stockToAdd;
        productMapping[productId] = product;
        emit StockAdded(productId, stockToAdd);
    }

    /// @notice Remove units to stock in a specific product
    /// @param productId ID of the product in CA DB
    /// @param stockToRemove How many units remove from stock
    function removeStock(uint productId, uint stockToRemove) external onlyWhitlisted {
        //Add stock to a product
        Product memory product = productMapping[productId];
        require(productId != 0, "!productId");
        require(product.seller != address(0), "!exist");
        require(product.stock >= stockToRemove, "!stockToRemove");
        require(owner() == msg.sender || product.seller == msg.sender, "!sender");
        product.stock -= stockToRemove;
        productMapping[productId] = product;
        emit StockRemoved(productId, stockToRemove);
    }
    
    /// @notice Add a seller address to the whitlisted in order to manage their own products
    /// @param seller Address of the seller
    function addWhitlistedSeller(address seller) external onlyOwner {
        sellerWhitlist[seller] = true;
        emit SellerWhitlistAdded(seller);
    }

    /// @notice Remove a seller address to the whitlisted in order to manage their own products
    /// @param seller Address of the seller
    function removeWhitlistedSeller(address seller) external onlyOwner {
        sellerWhitlist[seller] = false;
        emit SellerWhitlistRemoved(seller);
    }
}
