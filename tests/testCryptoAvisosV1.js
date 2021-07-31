const { expect } = require("chai");

describe("CryptoAvisosV1", function () {
    it("Fee should be equal to 15...", async function () {
        const CryptoAvisosV1 = await ethers.getContractFactory("CryptoAvisosV1");
        const cryptoAvisosV1 = await CryptoAvisosV1.deploy(10);
        await cryptoAvisosV1.deployed();

        const setFeeTx = await cryptoAvisosV1.setFee(15);

        // wait until the transaction is mined
        await setFeeTx.wait();
        let viewFee = await cryptoAvisosV1.viewFee();
        console.log('Fee ->', viewFee)
        expect(await cryptoAvisosV1.fee()).to.equal(15);
    });

    it("Should submit a product and pay it with DAI, succesfully...", async function () {
        const accounts = await ethers.getSigners();

        //Deploy CAV1
        const CryptoAvisosV1 = await ethers.getContractFactory("CryptoAvisosV1");
        const cryptoAvisosV1 = await CryptoAvisosV1.deploy(10);
        await cryptoAvisosV1.deployed();

        //Deploy Example DAI
        const DAI = await ethers.getContractFactory("DAI");
        const dai = await DAI.deploy(10000000);
        await dai.deployed();

        //Transfer DAI to account 2
        await dai.transfer(accounts[2].address, 10000);

        //Submit product
        let daiAddress = dai.address;
        const submitProductTx = await cryptoAvisosV1.submitProduct(256, accounts[1].address, ethers.utils.parseUnits('200',"wei"), daiAddress);
        let receipt = await submitProductTx.wait();
        expect(receipt.status).to.equal(1);

        //View product
        let viewProduct = await cryptoAvisosV1.viewProduct(256);
        // console.log('view product', viewProduct)

        //Approve DAI
        const approveTx = await dai.connect(accounts[2]).approve(cryptoAvisosV1.address, 10000);

        //Pay product
        const payProductTx = await cryptoAvisosV1.connect(accounts[2]).payProduct(256);
        let receiptPay = await payProductTx.wait();
        expect(receiptPay.status).to.equal(1);

        //DAI amount
        let daiBalanceAcc2 = await dai.balanceOf(accounts[2].address);
        let daiBalanceContract = await dai.balanceOf(cryptoAvisosV1.address);
        let daiBalanceSeller = await dai.balanceOf(accounts[1].address);
        console.log('DAI balance ->', ethers.utils.formatUnits(daiBalanceAcc2, "wei"), ethers.utils.formatUnits(daiBalanceContract, "wei"), ethers.utils.formatUnits(daiBalanceSeller, "wei"));
    });

    it("Should submit a product and pay it with ETH, succesfully...", async function () {
        const accounts = await ethers.getSigners();

        //Deploy CAV1
        const CryptoAvisosV1 = await ethers.getContractFactory("CryptoAvisosV1");
        const cryptoAvisosV1 = await CryptoAvisosV1.deploy(15);
        await cryptoAvisosV1.deployed();

        //Submit product
        const submitProductTx = await cryptoAvisosV1.submitProduct(256, accounts[1].address, ethers.utils.parseUnits('200',"ether"), '0x0000000000000000000000000000000000000000');
        let receipt = await submitProductTx.wait();
        expect(receipt.status).to.equal(1);

        //View product
        let viewProduct = await cryptoAvisosV1.viewProduct(256);

        //Pay product
        const payProductTx = await cryptoAvisosV1.connect(accounts[2]).payProduct(256, { "value": ethers.utils.parseUnits('200',"ether") });
        let receiptPay = await payProductTx.wait();
        expect(receiptPay.status).to.equal(1);

        let ethAcc2 = await accounts[2].getBalance();
        let ethContract = await cryptoAvisosV1.viewETHBalance();
        let ethSeller = await accounts[1].getBalance();
        console.log('ETH balance ->', ethers.utils.formatUnits(ethAcc2), ethers.utils.formatUnits(ethSeller), ethers.utils.formatUnits(ethContract));
    });
});