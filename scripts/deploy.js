const hre = require("hardhat");
const {
    CryptoAvisosEthereumMultiSig,
    CryptoAvisosBSCMultiSig,
    CryptoAvisosPolygonMultiSig,
    allowedSigner
} = require("../registry.json");

async function main() {
    await hre.run("clean");
    await hre.run("compile");

    //Deploy CAV1
    let initialFee = 0;
    const CryptoAvisosV1 = await hre.ethers.getContractFactory("CryptoAvisosV1");
    const cryptoAvisosV1 = await CryptoAvisosV1.deploy(ethers.utils.parseUnits(String(initialFee)), allowedSigner);

    console.log("Waiting to confirm");
    await cryptoAvisosV1.deployTransaction.wait(2);

    console.log("Deployed CryptoAvisosV1 to:", cryptoAvisosV1.address);

    let multisig;
    let network = await hre.ethers.provider.getNetwork();

    //Select CA multisig to transfer ownership
    switch (network.chainId) {
        case 1:
            multisig = CryptoAvisosEthereumMultiSig;
            break;
        case 56:
            multisig = CryptoAvisosBSCMultiSig;
            break;
        case 137:
            multisig = CryptoAvisosPolygonMultiSig;
            break;
        default:
            multisig = "";
            break;
    }

    //Transfer ownership
    if (multisig || multisig != "") {
        await cryptoAvisosV1.transferOwnership(multisig);
        console.log("Owner transferred to:", multisig);
    }

    //Verify
    await hre.run("verify:verify", {
        address: cryptoAvisosV1.address,
        constructorArguments: [ethers.utils.parseUnits(String(initialFee))],
    });

}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });