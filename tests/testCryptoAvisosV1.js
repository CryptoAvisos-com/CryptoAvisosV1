const { expect } = require("chai");

describe("CryptoAvisosV1", function () {

    let productArray = [256, 266, 276, 286, 296];
    let fee = 0;

    before(async function () {
        [deployer, seller, buyer] = await ethers.getSigners();

        //Deploy CAV1
        this.CryptoAvisosV1 = await ethers.getContractFactory("CryptoAvisosV1");
        this.cryptoAvisosV1 = await this.CryptoAvisosV1.deploy(ethers.utils.parseUnits(String(1)));
        await this.cryptoAvisosV1.deployed();

        //Deploy Example DAI
        this.DAI = await ethers.getContractFactory("DAI");
        this.dai = await this.DAI.deploy(ethers.utils.parseUnits("10000000", "ether"));
        await this.dai.deployed();

        //Transfer DAI to buyer
        await this.dai.transfer(buyer.address, ethers.utils.parseUnits("10000", "ether"));
    });

    it("Fee should be equal to...", async function () {
        await expect(this.cryptoAvisosV1.implementFee()).to.be.revertedWith("!prepared");

        //Prepare
        await this.cryptoAvisosV1.prepareFee(ethers.utils.parseUnits(String(fee)));
        await expect(this.cryptoAvisosV1.implementFee()).to.be.revertedWith("!unlocked");

        //Time travel
        await network.provider.send("evm_increaseTime", [604800]); //1 week

        //Implement
        await this.cryptoAvisosV1.implementFee();

        expect(Number(ethers.utils.formatUnits(await this.cryptoAvisosV1.fee()))).to.equal(fee);
    });

    it("Should submit a product payable with DAI, succesfully...", async function () {
        //Submit product
        let productId = productArray[0];
        let productPrice = "180";
        let productSeller = seller.address;
        let productToken = this.dai.address;
        let daiDecimals = await this.dai.decimals();
        let stock = 5;

        await expect(this.cryptoAvisosV1.submitProduct(0, productSeller, ethers.utils.parseUnits(productPrice, daiDecimals), productToken, stock)).to.be.revertedWith("!productId");
        await expect(this.cryptoAvisosV1.submitProduct(productId, productSeller, ethers.utils.parseUnits("0", daiDecimals), productToken, stock)).to.be.revertedWith("!price");
        await expect(this.cryptoAvisosV1.submitProduct(productId, ethers.constants.AddressZero, ethers.utils.parseUnits(productPrice, daiDecimals), productToken, stock)).to.be.revertedWith("!seller");
        await this.cryptoAvisosV1.submitProduct(productId, productSeller, ethers.utils.parseUnits(productPrice, daiDecimals), productToken, stock);

        //View product
        let productMapping = await this.cryptoAvisosV1.productMapping(productId);
        expect(Number(ethers.utils.formatUnits(productMapping.price))).equal(Number(productPrice));
        expect(productMapping.seller).equal(productSeller);
        expect(productMapping.token).equal(productToken);
        expect(productMapping.stock).equal(stock);

        await expect(this.cryptoAvisosV1.submitProduct(productId, productSeller, ethers.utils.parseUnits(productPrice, daiDecimals), productToken, stock)).to.be.revertedWith("alreadyExist");

        //Submitting other products
        let product3 = productArray[2];
        await this.cryptoAvisosV1.submitProduct(product3, productSeller, ethers.utils.parseUnits(productPrice, daiDecimals), productToken, stock);
    });

    it("Should submit a product payable with ETH, succesfully...", async function () {
        //Submit product
        let productId = productArray[1];
        let productPrice = "1.5";
        let productSeller = seller.address;
        let productToken = ethers.constants.AddressZero;
        let stock = 5;
        await this.cryptoAvisosV1.submitProduct(productId, productSeller, ethers.utils.parseUnits(productPrice), productToken, stock);

        //View product
        let productMapping = await this.cryptoAvisosV1.productMapping(productId);
        expect(Number(ethers.utils.formatUnits(productMapping.price))).equal(Number(productPrice));
        expect(productMapping.seller).equal(productSeller);
        expect(productMapping.token).equal(productToken);
        expect(productMapping.stock).equal(stock);

        await expect(this.cryptoAvisosV1.submitProduct(productId, productSeller, ethers.utils.parseUnits(productPrice), productToken, stock)).to.be.revertedWith("alreadyExist");

        //Submitting other products
        let product4 = productArray[3];
        await this.cryptoAvisosV1.submitProduct(product4, productSeller, ethers.utils.parseUnits(productPrice), productToken, stock);

        let product5 = productArray[4];
        await this.cryptoAvisosV1.submitProduct(product5, productSeller, ethers.utils.parseUnits(productPrice), productToken, stock);
    });

    it("Should update a product, successfully...", async function () {
        //Update product
        let productId = productArray[0];
        let productPrice = "200";
        let productSeller = seller.address;
        let productToken = this.dai.address;
        let daiDecimals = await this.dai.decimals();
        let stock = 5;

        await expect(this.cryptoAvisosV1.updateProduct(0, productSeller, ethers.utils.parseUnits(productPrice, daiDecimals), productToken, stock)).to.be.revertedWith("!productId");
        await expect(this.cryptoAvisosV1.updateProduct(productId, productSeller, ethers.utils.parseUnits("0", daiDecimals), productToken, stock)).to.be.revertedWith("!price");
        await expect(this.cryptoAvisosV1.updateProduct(productId, ethers.constants.AddressZero, ethers.utils.parseUnits(productPrice, daiDecimals), productToken, stock)).to.be.revertedWith("!seller");
        await expect(this.cryptoAvisosV1.updateProduct(8000, productSeller, ethers.utils.parseUnits(productPrice, daiDecimals), productToken, stock)).to.be.revertedWith("!exist");
        await this.cryptoAvisosV1.updateProduct(productId, productSeller, ethers.utils.parseUnits(productPrice, daiDecimals), productToken, stock);

        //View product
        let productMapping = await this.cryptoAvisosV1.productMapping(productId);
        expect(Number(ethers.utils.formatUnits(productMapping.price))).equal(Number(productPrice));
        expect(productMapping.seller).equal(productSeller);
        expect(productMapping.token).equal(productToken);
        expect(productMapping.stock).equal(stock);
    });

    it("Should use switch to enable & disable, successfully...", async function () {
        //Disable product
        await this.cryptoAvisosV1.switchEnable(productArray[0], false);
        await expect(this.cryptoAvisosV1.connect(buyer).payProduct(productArray[0])).to.be.revertedWith("!enabled");

        //Enable product
        await this.cryptoAvisosV1.switchEnable(productArray[0], true);
        let product = await this.cryptoAvisosV1.productMapping(productArray[0]);
        expect(product.enabled).equal(true);
    });

    it("Should pay a product with DAI, succesfully...", async function () {
        await expect(this.cryptoAvisosV1.connect(buyer).payProduct(5656)).to.be.revertedWith("!exist");

        //Approve DAI
        let daiDecimals = await this.dai.decimals();
        await this.dai.connect(buyer).approve(this.cryptoAvisosV1.address, ethers.utils.parseUnits("10000", daiDecimals));

        //DAI amount before
        let daiBalanceBuyerBefore = ethers.utils.formatUnits(await this.dai.balanceOf(buyer.address));
        let daiBalanceContractBefore = ethers.utils.formatUnits(await this.dai.balanceOf(this.cryptoAvisosV1.address));

        //Stock amount before
        let productBefore = await this.cryptoAvisosV1.productMapping(productArray[0]);
        let stockBefore = productBefore.stock;

        //Pay product
        await this.cryptoAvisosV1.connect(buyer).payProduct(productArray[0]);

        //DAI amount after
        let daiBalanceBuyerAfter = ethers.utils.formatUnits(await this.dai.balanceOf(buyer.address));
        let daiBalanceContractAfter = ethers.utils.formatUnits(await this.dai.balanceOf(this.cryptoAvisosV1.address));

        let product = await this.cryptoAvisosV1.productMapping(productArray[0]);
        expect(Number(daiBalanceBuyerAfter)).equal(Number(daiBalanceBuyerBefore) - Number(ethers.utils.formatUnits(product.price)));
        expect(Number(daiBalanceContractAfter)).equal(Number(daiBalanceContractBefore) + Number(ethers.utils.formatUnits(product.price)));
        expect(Number(product.stock)).equal(Number(stockBefore) - 1);
    });

    it("Should pay a product with ETH, succesfully...", async function () {
        //ETH amount before
        let ethBalanceBuyerBefore = ethers.utils.formatUnits(await ethers.provider.getBalance(buyer.address));
        let ethBalanceContractBefore = ethers.utils.formatUnits(await ethers.provider.getBalance(this.cryptoAvisosV1.address));

        //Stock before
        let productBefore = await this.cryptoAvisosV1.productMapping(productArray[1]);
        let stockBefore = productBefore.stock;

        //Pay product
        await expect(this.cryptoAvisosV1.connect(buyer).payProduct(productArray[1], { value: "0" })).to.be.revertedWith("!msg.value");
        await this.cryptoAvisosV1.connect(buyer).payProduct(productArray[1], { value: String(productBefore.price) });

        //ETH amount after
        let ethBalanceBuyerAfter = ethers.utils.formatUnits(await ethers.provider.getBalance(buyer.address));
        let ethBalanceContractAfter = ethers.utils.formatUnits(await ethers.provider.getBalance(this.cryptoAvisosV1.address));

        let productAfter = await this.cryptoAvisosV1.productMapping(productArray[1]);

        expect(Number(ethBalanceBuyerAfter)).closeTo(Number(ethBalanceBuyerBefore) - Number(ethers.utils.formatUnits(productAfter.price)), 0.01);
        expect(Number(ethBalanceContractAfter)).equal(Number(ethBalanceContractBefore) + Number(ethers.utils.formatUnits(productAfter.price)));
        expect(Number(productAfter.stock)).equal(Number(stockBefore) - 1);
    });

    it("Should release DAI from product pay...", async function () {
        let ticketToRelease = await this.cryptoAvisosV1.getTicketsIdsByProduct(productArray[0]);

        await expect(this.cryptoAvisosV1.releasePay(8989)).to.be.revertedWith("!exist");

        let daiBalanceSellerBefore = ethers.utils.formatUnits(await this.dai.balanceOf(seller.address));
        let daiBalanceContractBefore = ethers.utils.formatUnits(await this.dai.balanceOf(this.cryptoAvisosV1.address));

        await this.cryptoAvisosV1.releasePay(ticketToRelease[0]);
        await expect(this.cryptoAvisosV1.releasePay(ticketToRelease[0])).to.be.revertedWith("!waiting");

        let daiBalanceSellerAfter = ethers.utils.formatUnits(await this.dai.balanceOf(seller.address));
        let daiBalanceContractAfter = ethers.utils.formatUnits(await this.dai.balanceOf(this.cryptoAvisosV1.address));

        let product = await this.cryptoAvisosV1.productMapping(productArray[0]);
        expect(Number(daiBalanceSellerAfter)).equal(Number(daiBalanceSellerBefore) + Number(ethers.utils.formatUnits(product.price)) - (fee * Number(ethers.utils.formatUnits(product.price)) / 100));
        expect(Number(daiBalanceContractAfter)).equal(Number(daiBalanceContractBefore) - Number(ethers.utils.formatUnits(product.price)) + (fee * Number(ethers.utils.formatUnits(product.price)) / 100));
    });

    it("Should release ETH from product pay...", async function () {
        let ticketToRelease = await this.cryptoAvisosV1.getTicketsIdsByProduct(productArray[1]);

        let ethBalanceSellerBefore = ethers.utils.formatUnits(await ethers.provider.getBalance(seller.address));
        let ethBalanceContractBefore = ethers.utils.formatUnits(await ethers.provider.getBalance(this.cryptoAvisosV1.address));

        await this.cryptoAvisosV1.releasePay(ticketToRelease[0]);
        await expect(this.cryptoAvisosV1.releasePay(ticketToRelease[0])).to.be.revertedWith("!waiting");

        let ethBalanceSellerAfter = ethers.utils.formatUnits(await ethers.provider.getBalance(seller.address));
        let ethBalanceContractAfter = ethers.utils.formatUnits(await ethers.provider.getBalance(this.cryptoAvisosV1.address));

        let product = await this.cryptoAvisosV1.productMapping(productArray[1]);
        expect(Number(ethBalanceSellerAfter)).equal(Number(ethBalanceSellerBefore) + Number(ethers.utils.formatUnits(product.price)) - (fee * Number(ethers.utils.formatUnits(product.price)) / 100));
        expect(Number(ethBalanceContractAfter)).equal(Number(ethBalanceContractBefore) - Number(ethers.utils.formatUnits(product.price)) + (fee * Number(ethers.utils.formatUnits(product.price)) / 100));
    });

    it("Should refund a product in DAI...", async function () {
        let productId = productArray[2];
        let productToken = this.dai.address;

        let balanceDaiBefore = ethers.utils.formatUnits(await this.dai.balanceOf(buyer.address));
        await this.cryptoAvisosV1.connect(buyer).payProduct(productId);
        let balanceDaiFeesBefore = ethers.utils.formatUnits(await this.cryptoAvisosV1.claimableFee(productToken));

        await expect(this.cryptoAvisosV1.refundProduct(0)).to.be.revertedWith("!ticketId");
        await expect(this.cryptoAvisosV1.refundProduct(2562)).to.be.revertedWith("!ticketId");

        let ticketProduct1 = await this.cryptoAvisosV1.getTicketsIdsByProduct(productArray[1]);
        await expect(this.cryptoAvisosV1.refundProduct(ticketProduct1[0])).to.be.revertedWith("!waiting");

        let ticketProduct2 = await this.cryptoAvisosV1.getTicketsIdsByProduct(productArray[2]);
        await this.cryptoAvisosV1.refundProduct(ticketProduct2[0]);

        let balanceDaiAfter = ethers.utils.formatUnits(await this.dai.balanceOf(buyer.address));
        let balanceDaiFeesAfter = ethers.utils.formatUnits(await this.cryptoAvisosV1.claimableFee(productToken));

        expect(Number(balanceDaiAfter)).equal(Number(balanceDaiBefore));
        expect(Number(balanceDaiFeesBefore)).greaterThanOrEqual(Number(balanceDaiFeesAfter));
    });

    it("Should refund a product in ETH...", async function () {
        let productId = productArray[3];
        let productPrice = "1.5";

        let balanceEthBefore = ethers.utils.formatUnits(await ethers.provider.getBalance(buyer.address));
        await this.cryptoAvisosV1.connect(buyer).payProduct(productId, { value: ethers.utils.parseUnits(productPrice) });
        let balanceEthFeesBefore = ethers.utils.formatUnits(await this.cryptoAvisosV1.claimableFee(ethers.constants.AddressZero));

        let ticketProduct3 = await this.cryptoAvisosV1.getTicketsIdsByProduct(productArray[3]);
        await this.cryptoAvisosV1.refundProduct(ticketProduct3[0]);

        let balanceEthAfter = ethers.utils.formatUnits(await ethers.provider.getBalance(buyer.address));
        let balanceEthFeesAfter = ethers.utils.formatUnits(await this.cryptoAvisosV1.claimableFee(ethers.constants.AddressZero));

        expect(Number(balanceEthAfter)).to.be.closeTo(Number(balanceEthBefore), 0.01);
        expect(Number(balanceEthFeesBefore)).greaterThanOrEqual(Number(balanceEthFeesAfter));
    });

    it("Should claim fees in DAI, succesfully...", async function () {
        let balanceToClaim = ethers.utils.formatUnits(await this.cryptoAvisosV1.claimableFee(this.dai.address));
        
        //Claim
        await expect(this.cryptoAvisosV1.connect(deployer).claimFees(this.dai.address, ethers.utils.parseUnits(balanceToClaim + 1))).to.be.revertedWith("!funds");

        let daiBalanceOwnerBefore = ethers.utils.formatUnits(await this.dai.balanceOf(deployer.address));
        await this.cryptoAvisosV1.connect(deployer).claimFees(this.dai.address, ethers.utils.parseUnits(balanceToClaim));
        let daiBalanceOwnerAfter = ethers.utils.formatUnits(await this.dai.balanceOf(deployer.address));
        expect(Number(daiBalanceOwnerAfter)).closeTo(Number(daiBalanceOwnerBefore) + Number(balanceToClaim), 0.01);
    });

    it("Should claim fees in ETH, succesfully...", async function () {
        let balanceToClaim = ethers.utils.formatUnits(await this.cryptoAvisosV1.claimableFee(ethers.constants.AddressZero));

        //Claim
        await expect(this.cryptoAvisosV1.connect(deployer).claimFees(ethers.constants.AddressZero, ethers.utils.parseUnits(balanceToClaim + 1))).to.be.revertedWith("!funds");

        let ethBalanceOwnerBefore = ethers.utils.formatUnits(await ethers.provider.getBalance(deployer.address));
        await this.cryptoAvisosV1.connect(deployer).claimFees(ethers.constants.AddressZero, ethers.utils.parseUnits(balanceToClaim));
        let ethBalanceOwnerAfter = ethers.utils.formatUnits(await ethers.provider.getBalance(deployer.address));
        expect(Number(ethBalanceOwnerAfter)).closeTo(Number(ethBalanceOwnerBefore) + Number(balanceToClaim), 0.01);
    });

    it("Should add stock, successfully...", async function () {
        let productToAdd = productArray[0];
        let stockToAdd = 6;
        let productBefore = await this.cryptoAvisosV1.productMapping(productToAdd);

        await this.cryptoAvisosV1.addStock(productToAdd, stockToAdd);
        await expect(this.cryptoAvisosV1.addStock(0, stockToAdd)).to.be.revertedWith("!productId");
        await expect(this.cryptoAvisosV1.addStock(productToAdd, 0)).to.be.revertedWith("!stockToAdd");
        await expect(this.cryptoAvisosV1.addStock(420, stockToAdd)).to.be.revertedWith("!exist");

        let productAfter = await this.cryptoAvisosV1.productMapping(productToAdd);
        expect(Number(productAfter.stock)).equal(Number(productBefore.stock) + Number(stockToAdd));
    });

    it("Should remove stock, successfully...", async function () {
        let productToRemove = productArray[0];
        let stockToRemove = 6;
        let productBefore = await this.cryptoAvisosV1.productMapping(productToRemove);

        await this.cryptoAvisosV1.removeStock(productToRemove, stockToRemove);
        await expect(this.cryptoAvisosV1.removeStock(0, stockToRemove)).to.be.revertedWith("!productId");
        await expect(this.cryptoAvisosV1.removeStock(productToRemove, 40)).to.be.revertedWith("!stockToRemove");

        let productAfter = await this.cryptoAvisosV1.productMapping(productToRemove);
        expect(Number(productAfter.stock)).equal(Number(productBefore.stock) - Number(stockToRemove));
    });

    it("Should getProductsIds, successfully...", async function () {
        let productsIds = await this.cryptoAvisosV1.getProductsIds();
        expect(productsIds.length).greaterThan(0);
    });

    it("Should getTicketsIds, successfully...", async function () {
        let ticketsIds = await this.cryptoAvisosV1.getTicketsIds();
        expect(ticketsIds.length).greaterThan(0);
    });

});