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
        const cryptoAvisosV1 = await CryptoAvisosV1.deploy(15);
        await cryptoAvisosV1.deployed();

        //Deploy Example DAI
        const DAI = await ethers.getContractFactory("DAI");
        const dai = await DAI.deploy(ethers.utils.parseUnits('10000000',"ether"));
        await dai.deployed();

        //Transfer DAI to account 2
        await dai.transfer(accounts[2].address, ethers.utils.parseUnits('10000',"ether"));

        //Submit product
        let daiAddress = dai.address;
        const submitProductTx = await cryptoAvisosV1.submitProduct(256, accounts[1].address, ethers.utils.parseUnits('200',"ether"), daiAddress);
        let receipt = await submitProductTx.wait();
        expect(receipt.status).to.equal(1);

        //View product
        let viewProduct = await cryptoAvisosV1.viewProduct(256);
        // console.log('view product', viewProduct)

        //Approve DAI
        const approveTx = await dai.connect(accounts[2]).approve(cryptoAvisosV1.address, ethers.utils.parseUnits('10000',"ether"));

        //Pay product
        const payProductTx = await cryptoAvisosV1.connect(accounts[2]).payProduct(256);
        let receiptPay = await payProductTx.wait();
        expect(receiptPay.status).to.equal(1);

        //DAI amount
        let daiBalanceAcc2 = await dai.balanceOf(accounts[2].address);
        let daiBalanceSeller = await dai.balanceOf(accounts[1].address);
        let daiBalanceContract = await dai.balanceOf(cryptoAvisosV1.address);
        console.log('DAI balance ->', ethers.utils.formatUnits(daiBalanceAcc2), ethers.utils.formatUnits(daiBalanceSeller), ethers.utils.formatUnits(daiBalanceContract));
    });

    it("Should submit a product and pay it with ETH, succesfully...", async function () {
        const accounts = await ethers.getSigners();

        //Deploy CAV1
        const CryptoAvisosV1 = await ethers.getContractFactory("CryptoAvisosV1");
        const cryptoAvisosV1 = await CryptoAvisosV1.deploy(15);
        await cryptoAvisosV1.deployed();

        //Submit product
        const submitProductTx = await cryptoAvisosV1.submitProduct(256, accounts[1].address, ethers.utils.parseUnits('200',"ether"), ethers.constants.AddressZero);
        let receipt = await submitProductTx.wait();
        expect(receipt.status).to.equal(1);

        //View product
        let viewProduct = await cryptoAvisosV1.viewProduct(256);

        //Pay product
        const payProductTx = await cryptoAvisosV1.connect(accounts[2]).payProduct(256, { "value": ethers.utils.parseUnits('200',"ether") });
        let receiptPay = await payProductTx.wait();
        expect(receiptPay.status).to.equal(1);

        let ethAcc2 = await accounts[2].getBalance();
        let ethSeller = await accounts[1].getBalance();
        let ethContract = await cryptoAvisosV1.viewETHBalance();
        console.log('ETH balance ->', ethers.utils.formatUnits(ethAcc2), ethers.utils.formatUnits(ethSeller), ethers.utils.formatUnits(ethContract));
    });

    it("Should claim fees in ETH, succesfully...", async function () {

    });

    it("Should claim fees in DAI, succesfully...", async function () {

    });
});