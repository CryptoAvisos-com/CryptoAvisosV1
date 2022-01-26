let { EthersAdapter } = require('@gnosis.pm/safe-core-sdk');
let Safe = require('@gnosis.pm/safe-core-sdk').default;
let SafeServiceClient = require('@gnosis.pm/safe-service-client').default;
let { ContractNetworksConfig } = require('@gnosis.pm/safe-core-sdk');
let safeService = new SafeServiceClient("https://safe.fantom.network");
let registry = require("../registry.json");

task("batchSubmit", "Submit products in batch")
    .addParam("filename", "Name of the JSON file")
    .setAction(async (taskArgs) => {
        let jsonFile = require(`../toSubmit/${taskArgs.filename}`);

        [this.deployer] = await ethers.getSigners();

        this.ethAdapterDeployer = new EthersAdapter({
            ethers,
            signer: this.deployer
        });

        const id = await this.ethAdapterDeployer.getChainId();

        switch (id) {
            case 56:
                //BSC
                this.multiSendAddress = registry.CryptoAvisosBSCMultiSig;
                this.safeMasterCopyAddress = registry.safeMasterCopyAddressBSC;
                this.safeProxyFactoryAddress = registry.safeProxyFactoryAddressBSC;
                this.CryptoAvisosV1Addr = registry.CryptoAvisosV1BSC;
                break;
            case 137:
                //Polygon
                this.multiSendAddress = registry.CryptoAvisosPolygonMultiSig;
                this.safeMasterCopyAddress = registry.safeMasterCopyAddressPolygon;
                this.safeProxyFactoryAddress = registry.safeProxyFactoryAddressPolygon;
                this.CryptoAvisosV1Addr = registry.CryptoAvisosV1Polygon;
                break;
        }

        const ContractNetworksConfig = {
            [id]: {
                multiSendAddress: this.multiSendAddress,
                safeMasterCopyAddress: this.safeMasterCopyAddress,
                safeProxyFactoryAddress: this.safeProxyFactoryAddress
            }
        }

        this.safeSdk = await Safe.create({ ethAdapter: this.ethAdapterDeployer, safeAddress: this.multiSendAddress, contractNetworks: ContractNetworksConfig });

        this.batchTxs = [];

        function addToBatch(batch, tx) {
            let _value = 0;
            if (tx.value != undefined) {
                _value = tx.value;
            }

            let _to = ethers.constants.AddressZero;
            if (tx.to != undefined) {
                _to = tx.to;
            }

            batch.push({
                to: _to,
                data: tx.data,
                value: _value
            });
        }

        //Instance CA
        this.CryptoAvisosV1 = await ethers.getContractFactory("CryptoAvisosV1");
        //Instance ERC20
        this.ERC20 = new ethers.Contract(ethers.constants.AddressZero, [
            'function decimals() external view returns (uint8)',
        ], this.deployer);

        //Loop all products
        for (let i = 0; i < jsonFile.globalList.length; i++) {
            const item = jsonFile.globalList[i];

            for (let e = 0; e < item.productList.length; e++) {
                const subItem = item.productList[e];
                const sellerAddr = item.sellerAddress;
                const tokenAddr = subItem.tokenAddress;
                const decimals = 18; //Number(await this.ERC20.attach(tokenAddr).decimals());

                for (let x = 0; x < subItem.list.length; x++) {
                    const product = subItem.list[x];
                    const price = product.priceInHuman;
                    
                    // addToBatch(await this.cryptoAvisosV1.attach(this.CryptoAvisosV1Addr).populateTransaction.submitProduct(
                    //     product.productId,
                    //     sellerAddr,
                    //     ethers.utils.parseUnits(String(price), decimals),
                    //     tokenAddr
                    // ));

                    console.log(product.productId, sellerAddr, tokenAddr, decimals, price);
                }
            }
        }

        // this.safeTransaction = await safeSdk.createTransaction(this.batchTxs);
        // await safeSdk.signTransaction(this.safeTransaction);
        // this.safeTxHash = await safeSdk.getTransactionHash(this.safeTransaction);

        // let safeTransaction = this.safeTransaction;
        // let safeTxHash = this.safeTxHash;
        // let deployer = this.deployer.address;
        // await safeService.proposeTransaction({
        //     safeAddress: this.multiSendAddress,
        //     safeTransaction: safeTransaction,
        //     safeTxHash: safeTxHash,
        //     senderAddress: deployer
        // });

    });

module.exports = {};