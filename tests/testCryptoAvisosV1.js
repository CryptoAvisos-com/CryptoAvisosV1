const { expect } = require("chai");

describe("CryptoAvisosV1", function () {
    let productArray = [256, 266, 276, 286, 296];
    let fee = 15;

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

    it(`Fee should be equal to...`, async function () {
        await expect(this.cryptoAvisosV1.implementFee()).to.be.revertedWith("not prepared");
        await this.cryptoAvisosV1.prepareFee(ethers.utils.parseUnits(String(fee)));
        await expect(this.cryptoAvisosV1.implementFee()).to.be.revertedWith("not unlocked yet");
        await network.provider.send("evm_increaseTime", [604800]); //1 week
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
        await expect(this.cryptoAvisosV1.submitProduct(0, productSeller, ethers.utils.parseUnits(productPrice, daiDecimals), productToken)).to.be.revertedWith("productId cannot be zero");
        await expect(this.cryptoAvisosV1.submitProduct(productId, productSeller, ethers.utils.parseUnits("0", daiDecimals), productToken)).to.be.revertedWith("price cannot be zero");
        await expect(this.cryptoAvisosV1.submitProduct(productId, ethers.constants.AddressZero, ethers.utils.parseUnits(productPrice, daiDecimals), productToken)).to.be.revertedWith("seller cannot be zero address");
        await this.cryptoAvisosV1.submitProduct(productId, productSeller, ethers.utils.parseUnits(productPrice, daiDecimals), productToken);

        //View product
        let productMapping = await this.cryptoAvisosV1.productMapping(productId);
        expect(Number(ethers.utils.formatUnits(productMapping.price))).equal(Number(productPrice));
        expect(productMapping.seller).equal(productSeller);
        expect(productMapping.token).equal(productToken);

        await expect(this.cryptoAvisosV1.submitProduct(productId, productSeller, ethers.utils.parseUnits(productPrice, daiDecimals), productToken)).to.be.revertedWith("productId already exist");
    });

    it("Should submit a product payable with ETH, succesfully...", async function () {
        //Submit product
        let productId = productArray[1];
        let productPrice = "1.5";
        let productSeller = seller.address;
        let productToken = ethers.constants.AddressZero;
        await this.cryptoAvisosV1.submitProduct(productId, productSeller, ethers.utils.parseUnits(productPrice), productToken);

        //View product
        let productMapping = await this.cryptoAvisosV1.productMapping(productId);
        expect(Number(ethers.utils.formatUnits(productMapping.price))).equal(Number(productPrice));
        expect(productMapping.seller).equal(productSeller);
        expect(productMapping.token).equal(productToken);

        await expect(this.cryptoAvisosV1.submitProduct(productId, productSeller, ethers.utils.parseUnits(productPrice), productToken)).to.be.revertedWith("productId already exist");
    });

    it("Should update a product, successfully...", async function () {
        //Update product
        let productId = productArray[0];
        let productPrice = "200";
        let productSeller = seller.address;
        let productToken = this.dai.address;
        let daiDecimals = await this.dai.decimals();
        await expect(this.cryptoAvisosV1.updateProduct(0, productSeller, ethers.utils.parseUnits(productPrice, daiDecimals), productToken)).to.be.revertedWith("productId cannot be zero");
        await expect(this.cryptoAvisosV1.updateProduct(productId, productSeller, ethers.utils.parseUnits("0", daiDecimals), productToken)).to.be.revertedWith("price cannot be zero");
        await expect(this.cryptoAvisosV1.updateProduct(productId, ethers.constants.AddressZero, ethers.utils.parseUnits(productPrice, daiDecimals), productToken)).to.be.revertedWith("seller cannot be zero address");
        await expect(this.cryptoAvisosV1.updateProduct(8000, productSeller, ethers.utils.parseUnits(productPrice, daiDecimals), productToken)).to.be.revertedWith("cannot update a non existing product");
        await this.cryptoAvisosV1.updateProduct(productId, productSeller, ethers.utils.parseUnits(productPrice, daiDecimals), productToken);

        //View product
        let productMapping = await this.cryptoAvisosV1.productMapping(productId);
        expect(Number(ethers.utils.formatUnits(productMapping.price))).equal(Number(productPrice));
        expect(productMapping.seller).equal(productSeller);
        expect(productMapping.token).equal(productToken);
    });

    it("Should pay a product with DAI, succesfully...", async function () {
        await expect(this.cryptoAvisosV1.connect(buyer).payProduct(5656)).to.be.revertedWith("cannot pay a non existing product");

        //Approve DAI
        let daiDecimals = await this.dai.decimals();
        await this.dai.connect(buyer).approve(this.cryptoAvisosV1.address, ethers.utils.parseUnits("10000", daiDecimals));

        //DAI amount before
        let daiBalanceBuyerBefore = ethers.utils.formatUnits(await this.dai.balanceOf(buyer.address));
        let daiBalanceContractBefore = ethers.utils.formatUnits(await this.dai.balanceOf(this.cryptoAvisosV1.address));

        //Pay product
        await this.cryptoAvisosV1.connect(buyer).payProduct(productArray[0]);
        await expect(this.cryptoAvisosV1.connect(buyer).payProduct(productArray[0])).to.be.revertedWith("Product already sold");

        //DAI amount after
        let daiBalanceBuyerAfter = ethers.utils.formatUnits(await this.dai.balanceOf(buyer.address));
        let daiBalanceContractAfter = ethers.utils.formatUnits(await this.dai.balanceOf(this.cryptoAvisosV1.address));

        let product = await this.cryptoAvisosV1.productMapping(productArray[0]);
        expect(Number(daiBalanceBuyerAfter)).equal(Number(daiBalanceBuyerBefore) - Number(ethers.utils.formatUnits(product.price)));
        expect(Number(daiBalanceContractAfter)).equal(Number(daiBalanceContractBefore) + Number(ethers.utils.formatUnits(product.price)));
    });

    it("Should pay a product with ETH, succesfully...", async function () {
        //ETH amount before
        let ethBalanceBuyerBefore = ethers.utils.formatUnits(await ethers.provider.getBalance(buyer.address));
        let ethBalanceContractBefore = ethers.utils.formatUnits(await ethers.provider.getBalance(this.cryptoAvisosV1.address));

        let product = await this.cryptoAvisosV1.productMapping(productArray[1]);

        //Pay product
        await expect(this.cryptoAvisosV1.connect(buyer).payProduct(productArray[1], { value: "0" })).to.be.revertedWith("Not enough ETH sended");
        await this.cryptoAvisosV1.connect(buyer).payProduct(productArray[1], { value: String(product.price) });

        //ETH amount after
        let ethBalanceBuyerAfter = ethers.utils.formatUnits(await ethers.provider.getBalance(buyer.address));
        let ethBalanceContractAfter = ethers.utils.formatUnits(await ethers.provider.getBalance(this.cryptoAvisosV1.address));

        expect(Number(ethBalanceBuyerAfter)).closeTo(Number(ethBalanceBuyerBefore) - Number(ethers.utils.formatUnits(product.price)), 0.01);
        expect(Number(ethBalanceContractAfter)).equal(Number(ethBalanceContractBefore) + Number(ethers.utils.formatUnits(product.price)));
    });

    it("Should release DAI from product pay...", async function () {
        await expect(this.cryptoAvisosV1.releasePay(8989)).to.be.revertedWith("cannot release pay for a non existing product");

        let daiBalanceSellerBefore = ethers.utils.formatUnits(await this.dai.balanceOf(seller.address));
        let daiBalanceContractBefore = ethers.utils.formatUnits(await this.dai.balanceOf(this.cryptoAvisosV1.address));

        
        let product = await this.cryptoAvisosV1.productMapping(productArray[0]);
        await this.cryptoAvisosV1.releasePay(productArray[0]);
        await expect(this.cryptoAvisosV1.releasePay(productArray[0])).to.be.revertedWith("Not allowed to release pay");

        let daiBalanceSellerAfter = ethers.utils.formatUnits(await this.dai.balanceOf(seller.address));
        let daiBalanceContractAfter = ethers.utils.formatUnits(await this.dai.balanceOf(this.cryptoAvisosV1.address));

        expect(Number(daiBalanceSellerAfter)).equal(Number(daiBalanceSellerBefore) + Number(ethers.utils.formatUnits(product.price)) - (fee * Number(ethers.utils.formatUnits(product.price)) / 100));
        expect(Number(daiBalanceContractAfter)).equal(Number(daiBalanceContractBefore) - Number(ethers.utils.formatUnits(product.price)) + (fee * Number(ethers.utils.formatUnits(product.price)) / 100));
    });

    it("Should release ETH from product pay...", async function () {
        let ethBalanceSellerBefore = ethers.utils.formatUnits(await ethers.provider.getBalance(seller.address));
        let ethBalanceContractBefore = ethers.utils.formatUnits(await ethers.provider.getBalance(this.cryptoAvisosV1.address));

        let product = await this.cryptoAvisosV1.productMapping(productArray[1]);
        await this.cryptoAvisosV1.releasePay(productArray[1]);

        let ethBalanceSellerAfter = ethers.utils.formatUnits(await ethers.provider.getBalance(seller.address));
        let ethBalanceContractAfter = ethers.utils.formatUnits(await ethers.provider.getBalance(this.cryptoAvisosV1.address));

        expect(Number(ethBalanceSellerAfter)).equal(Number(ethBalanceSellerBefore) + Number(ethers.utils.formatUnits(product.price)) - (fee * Number(ethers.utils.formatUnits(product.price)) / 100));
        expect(Number(ethBalanceContractAfter)).equal(Number(ethBalanceContractBefore) - Number(ethers.utils.formatUnits(product.price)) + (fee * Number(ethers.utils.formatUnits(product.price)) / 100));
    });

    it("Should refund a product in DAI...", async function () {
        let productId = productArray[2];
        let productPrice = "180";
        let productSeller = seller.address;
        let productToken = this.dai.address;
        let daiDecimals = await this.dai.decimals();
        await this.cryptoAvisosV1.submitProduct(productId, productSeller, ethers.utils.parseUnits(productPrice, daiDecimals), productToken);

        let balanceDaiBefore = ethers.utils.formatUnits(await this.dai.balanceOf(buyer.address));
        await this.cryptoAvisosV1.connect(buyer).payProduct(productId);
        let balanceDaiFeesBefore = ethers.utils.formatUnits(await this.cryptoAvisosV1.claimableFee(this.dai.address));

        await expect(this.cryptoAvisosV1.refundProduct(0)).to.be.revertedWith("productId cannot be zero");
        await expect(this.cryptoAvisosV1.refundProduct(2562)).to.be.revertedWith("cannot refund a non existing product");
        await expect(this.cryptoAvisosV1.refundProduct(productArray[1])).to.be.revertedWith("cannot refund a non waiting product");
        await this.cryptoAvisosV1.refundProduct(productId);
        let balanceDaiAfter = ethers.utils.formatUnits(await this.dai.balanceOf(buyer.address));
        let balanceDaiFeesAfter = ethers.utils.formatUnits(await this.cryptoAvisosV1.claimableFee(this.dai.address));

        expect(Number(balanceDaiAfter)).equal(Number(balanceDaiBefore));
        expect(Number(balanceDaiFeesBefore)).greaterThan(Number(balanceDaiFeesAfter));
    });

    it("Should refund a product in ETH...", async function () {
        //Submit product
        let productId = productArray[3];
        let productPrice = "1.5";
        let productSeller = seller.address;
        let productToken = ethers.constants.AddressZero;
        await this.cryptoAvisosV1.submitProduct(productId, productSeller, ethers.utils.parseUnits(productPrice), productToken);

        let balanceEthBefore = ethers.utils.formatUnits(await ethers.provider.getBalance(buyer.address));
        await this.cryptoAvisosV1.connect(buyer).payProduct(productId, { value: ethers.utils.parseUnits(productPrice) });
        let balanceEthFeesBefore = ethers.utils.formatUnits(await this.cryptoAvisosV1.claimableFee(ethers.constants.AddressZero));
        await this.cryptoAvisosV1.refundProduct(productId);
        let balanceEthAfter = ethers.utils.formatUnits(await ethers.provider.getBalance(buyer.address));
        let balanceEthFeesAfter = ethers.utils.formatUnits(await this.cryptoAvisosV1.claimableFee(ethers.constants.AddressZero));

        expect(Number(balanceEthAfter)).closeTo(Number(balanceEthBefore), 0.001);
        expect(Number(balanceEthFeesBefore)).greaterThan(Number(balanceEthFeesAfter));
    });

    it("Should claim fees in DAI, succesfully...", async function () {
        let balanceToClaim = ethers.utils.formatUnits(await this.cryptoAvisosV1.claimableFee(this.dai.address));

        await expect(this.cryptoAvisosV1.connect(deployer).claimFees(this.dai.address, ethers.utils.parseUnits(balanceToClaim + 1))).to.be.revertedWith("not enough funds");

        let daiBalanceOwnerBefore = ethers.utils.formatUnits(await this.dai.balanceOf(deployer.address));
        await this.cryptoAvisosV1.connect(deployer).claimFees(this.dai.address, ethers.utils.parseUnits(balanceToClaim));
        let daiBalanceOwnerAfter = ethers.utils.formatUnits(await this.dai.balanceOf(deployer.address));
        expect(Number(daiBalanceOwnerAfter)).closeTo(Number(daiBalanceOwnerBefore) + Number(balanceToClaim), 0.01);
    });

    it("Should claim fees in ETH, succesfully...", async function () {
        let balanceToClaim = ethers.utils.formatUnits(await this.cryptoAvisosV1.claimableFee(ethers.constants.AddressZero));

        await expect(this.cryptoAvisosV1.connect(deployer).claimFees(ethers.constants.AddressZero, ethers.utils.parseUnits(balanceToClaim + 1))).to.be.revertedWith("not enough funds");

        let ethBalanceOwnerBefore = ethers.utils.formatUnits(await ethers.provider.getBalance(deployer.address));
        await this.cryptoAvisosV1.connect(deployer).claimFees(ethers.constants.AddressZero, ethers.utils.parseUnits(balanceToClaim));
        let ethBalanceOwnerAfter = ethers.utils.formatUnits(await ethers.provider.getBalance(deployer.address));
        expect(Number(ethBalanceOwnerAfter)).closeTo(Number(ethBalanceOwnerBefore) + Number(balanceToClaim), 0.01);
    });

    it("Should mark a product as paid...", async function () {
        await expect(this.cryptoAvisosV1.connect(deployer).markAsPaid(4589)).to.be.revertedWith("cannot mark as paid a non existing product");
        await expect(this.cryptoAvisosV1.connect(deployer).markAsPaid(productArray[0])).to.be.revertedWith("Product already sold");

        let productId = productArray[4];
        let productPrice = "1.5";
        let productSeller = seller.address;
        let productToken = ethers.constants.AddressZero;
        await this.cryptoAvisosV1.submitProduct(productId, productSeller, ethers.utils.parseUnits(productPrice), productToken);

        await this.cryptoAvisosV1.connect(deployer).markAsPaid(productArray[4]);
        let product = await this.cryptoAvisosV1.productMapping(productArray[4]);
        expect(product.status).equal(2);
    });

    it("Should getProductsIds, successfully...", async function () {
        let productsIds = await this.cryptoAvisosV1.getProductsIds();
        expect(productsIds.length).greaterThan(0);
    });

});