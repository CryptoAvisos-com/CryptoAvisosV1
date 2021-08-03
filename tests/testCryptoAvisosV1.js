const { expect } = require("chai");

describe("CryptoAvisosV1", function () {
    beforeEach(async function(){
        this.accounts = await ethers.getSigners();

        //Deploy CAV1
        this.CryptoAvisosV1 = await ethers.getContractFactory("CryptoAvisosV1");
        this.cryptoAvisosV1 = await this.CryptoAvisosV1.deploy(15);
        await this.cryptoAvisosV1.deployed();
    });

    it("Fee should be equal to 15...", async function () {
        const setFeeTx = await this.cryptoAvisosV1.setFee(15);

        // wait until the transaction is mined
        await setFeeTx.wait();
        let viewFee = await this.cryptoAvisosV1.viewFee();
        console.log('Fee ->', viewFee)
        expect(await this.cryptoAvisosV1.fee()).to.equal(15);
    });

    it("Should submit a product and pay it with DAI, succesfully...", async function () {
        //Deploy Example DAI
        const DAI = await ethers.getContractFactory("DAI");
        const dai = await DAI.deploy(ethers.utils.parseUnits('10000000',"ether"));
        await dai.deployed();

        //Transfer DAI to account 2
        await dai.transfer(this.accounts[2].address, ethers.utils.parseUnits('10000',"ether"));

        //Submit product
        let daiAddress = dai.address;
        const submitProductTx = await this.cryptoAvisosV1.submitProduct(256, this.accounts[1].address, ethers.utils.parseUnits('200',"ether"), daiAddress);
        let receipt = await submitProductTx.wait();
        expect(receipt.status).to.equal(1);

        //View product
        let viewProduct = await this.cryptoAvisosV1.viewProduct(256);

        //Approve DAI
        const approveTx = await dai.connect(this.accounts[2]).approve(this.cryptoAvisosV1.address, ethers.utils.parseUnits('10000',"ether"));

        //Pay product
        const payProductTx = await this.cryptoAvisosV1.connect(this.accounts[2]).payProduct(256);
        let receiptPay = await payProductTx.wait();
        expect(receiptPay.status).to.equal(1);

        //DAI amount
        let daiBalanceAcc2 = await dai.balanceOf(this.accounts[2].address);
        let daiBalanceSeller = await dai.balanceOf(this.accounts[1].address);
        let daiBalanceContract = await dai.balanceOf(this.cryptoAvisosV1.address);
        console.log('DAI balance ->', ethers.utils.formatUnits(daiBalanceAcc2), ethers.utils.formatUnits(daiBalanceSeller), ethers.utils.formatUnits(daiBalanceContract));
    });

    it("Should submit a product and pay it with ETH, succesfully...", async function () {
        //Submit product
        const submitProductTx = await this.cryptoAvisosV1.submitProduct(256, this.accounts[1].address, ethers.utils.parseUnits('200',"ether"), ethers.constants.AddressZero);
        let receipt = await submitProductTx.wait();
        expect(receipt.status).to.equal(1);

        //View product
        let viewProduct = await this.cryptoAvisosV1.viewProduct(256);

        //Pay product
        const payProductTx = await this.cryptoAvisosV1.connect(this.accounts[2]).payProduct(256, { "value": ethers.utils.parseUnits('200',"ether") });
        let receiptPay = await payProductTx.wait();
        expect(receiptPay.status).to.equal(1);

        let ethAcc2 = await this.accounts[2].getBalance();
        let ethSeller = await this.accounts[1].getBalance();
        let ethContract = await this.cryptoAvisosV1.viewETHBalance();
        console.log('ETH balance ->', ethers.utils.formatUnits(ethAcc2), ethers.utils.formatUnits(ethSeller), ethers.utils.formatUnits(ethContract));
    });

    it("Should claim fees in DAI, succesfully...", async function () {
        //Deploy Example DAI
        const DAI = await ethers.getContractFactory("DAI");
        const dai = await DAI.deploy(ethers.utils.parseUnits('10000000',"ether"));
        await dai.deployed();

        //Transfer DAI to account 2
        await dai.transfer(this.accounts[2].address, ethers.utils.parseUnits('10000',"ether"));

        //Submit product
        let daiAddress = dai.address;
        const submitProductTx = await this.cryptoAvisosV1.submitProduct(256, this.accounts[1].address, ethers.utils.parseUnits('200',"ether"), daiAddress);
        let receipt = await submitProductTx.wait();
        expect(receipt.status).to.equal(1);

        //View product
        let viewProduct = await this.cryptoAvisosV1.viewProduct(256);

        //Approve DAI
        const approveTx = await dai.connect(this.accounts[2]).approve(this.cryptoAvisosV1.address, ethers.utils.parseUnits('10000',"ether"));

        //Pay product
        const payProductTx = await this.cryptoAvisosV1.connect(this.accounts[2]).payProduct(256);
        let receiptPay = await payProductTx.wait();
        expect(receiptPay.status).to.equal(1);

        //DAI amount
        let daiBalanceAcc2 = await dai.balanceOf(this.accounts[2].address);
        let daiBalanceSeller = await dai.balanceOf(this.accounts[1].address);
        let daiBalanceContract = await dai.balanceOf(this.cryptoAvisosV1.address);
        console.log('DAI balance ->', ethers.utils.formatUnits(daiBalanceAcc2), ethers.utils.formatUnits(daiBalanceSeller), ethers.utils.formatUnits(daiBalanceContract));

        let claimTx = await this.cryptoAvisosV1.connect(this.accounts[0]).claimFee(daiAddress);
        let daiBalanceOwner = await dai.balanceOf(this.accounts[0].address);
        console.log('DAI balance ->', ethers.utils.formatUnits(daiBalanceOwner));
    });

    it("Should claim fees in ETH, succesfully...", async function () {
        //Submit product
        const submitProductTx = await this.cryptoAvisosV1.submitProduct(256, this.accounts[1].address, ethers.utils.parseUnits('200',"ether"), ethers.constants.AddressZero);
        let receipt = await submitProductTx.wait();
        expect(receipt.status).to.equal(1);

        //View product
        let viewProduct = await this.cryptoAvisosV1.viewProduct(256);

        //Pay product
        const payProductTx = await this.cryptoAvisosV1.connect(this.accounts[2]).payProduct(256, { "value": ethers.utils.parseUnits('200',"ether") });
        let receiptPay = await payProductTx.wait();
        expect(receiptPay.status).to.equal(1);

        let ethAcc2 = await this.accounts[2].getBalance();
        let ethSeller = await this.accounts[1].getBalance();
        let ethContract = await this.cryptoAvisosV1.viewETHBalance();
        console.log('ETH balance ->', ethers.utils.formatUnits(ethAcc2), ethers.utils.formatUnits(ethSeller), ethers.utils.formatUnits(ethContract));

        let claimTx = await this.cryptoAvisosV1.connect(this.accounts[0]).claimFee(ethers.constants.AddressZero);
        let ethBalanceOwner = await this.accounts[0].getBalance();
        console.log('ETH balance owner ->', ethers.utils.formatUnits(ethBalanceOwner));
    });
});