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
        console.log('view fee', viewFee)
        expect(await cryptoAvisosV1.fee()).to.equal(15);
    });

    it("Should submit a product and pay it, succesfully...", async function () {
        const accounts = await ethers.getSigners();
        let provider = await ethers.getDefaultProvider();

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
        const submitProductTx = await cryptoAvisosV1.submitProduct(256, accounts[1].address, 200, '0x0000000000000000000000000000000000000000');
        let receipt = await submitProductTx.wait();
        expect(receipt.status).to.equal(1);

        //View product
        let viewProduct = await cryptoAvisosV1.viewProduct(256);
        // console.log('view product', viewProduct)

        //Approve DAI
        const approveTx = await dai.connect(accounts[2]).approve(cryptoAvisosV1.address, 10000);

        //Pay product
        const payProductTx = await cryptoAvisosV1.connect(accounts[2]).payProduct(256, { "value":250 });
        let receiptPay = await payProductTx.wait();
        expect(receiptPay.status).to.equal(1);

        let ethAcc2 = await provider.getBalance(accounts[2].address);
        let ethContract = await provider.getBalance(cryptoAvisosV1.address);
        let ethSeller = await provider.getBalance(accounts[1].address);
        console.log('eth saldo', ethAcc2, ethContract, ethSeller);

        //DAI amount
        // let daiBalanceAcc2 = await dai.balanceOf(accounts[2].address);
        // let daiBalanceContract = await dai.balanceOf(cryptoAvisosV1.address);
        // let daiBalanceSeller = await dai.balanceOf(accounts[1].address);
        // console.log('dai balance: ', daiBalanceAcc2, daiBalanceContract, daiBalanceSeller);
    });
});