const hre = require("hardhat");

async function main() {
    await hre.run("clean");
    await hre.run("compile");
    //Deploy CAV1
    let initialFee = 2;
    const CryptoAvisosV1 = await hre.ethers.getContractFactory("CryptoAvisosV1");
    const cryptoAvisosV1 = await CryptoAvisosV1.deploy(initialFee);
    await cryptoAvisosV1.deployed();

    console.log("Deployed CryptoAvisosV1 to:", cryptoAvisosV1.address);

    //Verify
    // await hre.run("verify:verify", {
    //     address: cryptoAvisosV1.address,
    //     constructorArguments: [initialFee],
    // });

}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });