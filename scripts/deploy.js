const hre = require("hardhat");

async function main() {
    //Deploy CAV1
    const CryptoAvisosV1 = await hre.ethers.getContractFactory("CryptoAvisosV1");
    const cryptoAvisosV1 = await CryptoAvisosV1.deploy(2);
    await cryptoAvisosV1.deployed();

    console.log("Deployed CryptoAvisosV1 to:", cryptoAvisosV1.address);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
.then(() => process.exit(0))
.catch((error) => {
    console.error(error);
    process.exit(1);
});