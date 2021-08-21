const bitcoin = require('bitcoinjs-lib');

const isValidNetwork = (network) => {
    if (!NETWORKS[network]) {
        throw new Error(`Network ${network} is not valid value (valid values are: ${Object.keys(NETWORKS)})`);
    }
    return true;
};

const getFederationRedeemScript = (powpegBtcPublicKeys) => {
    if (!powpegBtcPublicKeys || !(powpegBtcPublicKeys instanceof Array)) {
        throw new Error("powpegBtcPublicKeys should be an array");
    }
    // Parse to Buffer and sort keys
    let defaultPubkeys = powpegBtcPublicKeys
        .map(hex => hex instanceof Buffer ? hex: Buffer.from(hex, 'hex'))
        .sort((a, b) => a.compare(b));
    return bitcoin.payments.p2ms({ m: parseInt(defaultPubkeys.length / 2) + 1, pubkeys: defaultPubkeys }).output;
};

const getErpRedeemScript = (network, powpegBtcPublicKeys) => {
    isValidNetwork(network);

    let erpPubKeys = erpPubkeysLists[network].map(hex => Buffer.from(hex, 'hex'));
    let csvValue = csvValues[network];

    let erpRedeemScriptBuff = bitcoin.payments.p2ms({ m: parseInt(erpPubKeys.length / 2) + 1, pubkeys: erpPubKeys });
    
    // Remove OP_CHECKMULTISIG from redeem scripts
    let defaultRedeemScriptWithouCheckMultisig = getFederationRedeemScript(powpegBtcPublicKeys).toString('hex').slice(0, -2);
    let erpRedeemScriptWithoutCheckMultisig = erpRedeemScriptBuff.output.toString('hex').slice(0, -2);

    let bufferLength = 1 + defaultRedeemScriptWithouCheckMultisig.length / 2 + 2 + csvValue.length / 2 + 2 + erpRedeemScriptWithoutCheckMultisig.length / 2 + 2;

    let erpRedeemScript = Buffer.alloc(bufferLength);
    erpRedeemScript.write(numberToHexString(bitcoin.script.OPS.OP_NOTIF), 'hex');
    erpRedeemScript.write(defaultRedeemScriptWithouCheckMultisig, 1, 'hex');
    let position = 1 + defaultRedeemScriptWithouCheckMultisig.length / 2;
    erpRedeemScript.write(numberToHexString(bitcoin.script.OPS.OP_ELSE), position, 'hex');
    position+= 1;
    erpRedeemScript.write('02', position, 'hex');
    position+= 1;
    erpRedeemScript.write(csvValue, position, 'hex');
    position+= csvValue.length / 2;
    erpRedeemScript.write(numberToHexString(bitcoin.script.OPS.OP_CHECKSEQUENCEVERIFY), position, 'hex');
    position+= 1;
    erpRedeemScript.write(numberToHexString(bitcoin.script.OPS.OP_DROP), position, 'hex');
    position+= 1;
    erpRedeemScript.write(erpRedeemScriptWithoutCheckMultisig, position, 'hex');
    position+= erpRedeemScriptWithoutCheckMultisig.length / 2;
    erpRedeemScript.write(numberToHexString(bitcoin.script.OPS.OP_ENDIF), position, 'hex');
    position+= 1;
    erpRedeemScript.write(numberToHexString(bitcoin.script.OPS.OP_CHECKMULTISIG), position, 'hex');

    return Buffer.from(erpRedeemScript, 'hex');
}

const getFlyoverPrefix = (derivationArgsHash) => {
    if (!derivationArgsHash || derivationArgsHash.length !== 64) {
        throw new Error("derivationArgsHash must be hash represented as a 64 characters string");
    }
    let prefix = Buffer.alloc(34);
    prefix.write('20', 'hex'); // hash length
    prefix.write(derivationArgsHash, 1, 'hex');
    prefix.write(numberToHexString(bitcoin.script.OPS.OP_DROP), prefix.length - 1, 'hex'); // DROP the hash

    return prefix;
};

const getFlyoverErpRedeemScript = (network, powpegBtcPublicKeys, derivationArgsHash) => {
    return Buffer.concat([
        getFlyoverPrefix(derivationArgsHash), 
        getErpRedeemScript(network, powpegBtcPublicKeys)
    ]);
}

const getFlyoverRedeemScript = (powpegBtcPublicKeys, derivationArgsHash) => {
    return Buffer.concat([
        getFlyoverPrefix(derivationArgsHash), 
        getFederationRedeemScript(powpegBtcPublicKeys)
    ]);
}

const getAddressFromRedeemSript = (network, redeemScript) => {
    isValidNetwork(network);

    if (!redeemScript || !(redeemScript instanceof Buffer)) {
        throw new Error("redeemScript must be a Buffer");
    }

    let doubleHash = bitcoin.crypto.ripemd160(bitcoin.crypto.sha256(redeemScript));
    return bitcoin.address.toBase58Check(doubleHash, bitcoinjsNetworks[network].scriptHash);
}

const numberToHexString = (number) => number.toString(16);

const NETWORKS = {
    MAINNET: 'MAINNET',
    TESTNET: 'TESTNET',
    REGTEST: 'REGTEST'
};

const bitcoinjsNetworks = {};
bitcoinjsNetworks[NETWORKS.MAINNET] = bitcoin.networks.bitcoin;
bitcoinjsNetworks[NETWORKS.TESTNET] = bitcoin.networks.testnet;
bitcoinjsNetworks[NETWORKS.REGTEST] = bitcoin.networks.regtest;

const erpPubkeysLists = {};
erpPubkeysLists[NETWORKS.MAINNET] = 
    [
        "0257c293086c4d4fe8943deda5f890a37d11bebd140e220faa76258a41d077b4d4",
        "03c2660a46aa73078ee6016dee953488566426cf55fc8011edd0085634d75395f9",
        "03cd3e383ec6e12719a6c69515e5559bcbe037d0aa24c187e1e26ce932e22ad7b3",
        "02370a9838e4d15708ad14a104ee5606b36caaaaf739d833e67770ce9fd9b3ec80",
    ];
erpPubkeysLists[NETWORKS.TESTNET] = [
        "0216c23b2ea8e4f11c3f9e22711addb1d16a93964796913830856b568cc3ea21d3",
        "034db69f2112f4fb1bb6141bf6e2bd6631f0484d0bd95b16767902c9fe219d4a6f",
        "0275562901dd8faae20de0a4166362a4f82188db77dbed4ca887422ea1ec185f14",
    ];
erpPubkeysLists[NETWORKS.REGTEST] = [
    "03b9fc46657cf72a1afa007ecf431de1cd27ff5cc8829fa625b66ca47b967e6b24",
    "029cecea902067992d52c38b28bf0bb2345bda9b21eca76b16a17c477a64e43301",
    "03284178e5fbcc63c54c3b38e3ef88adf2da6c526313650041b0ef955763634ebd",
    "03776b1fd8f86da3c1db3d69699e8250a15877d286734ea9a6da8e9d8ad25d16c1",
    "03ab0e2cd7ed158687fc13b88019990860cdb72b1f5777b58513312550ea1584bc",
];

const csvValues = {};
csvValues[NETWORKS.MAINNET] = 'CD50'; // 52560 in hexa
csvValues[NETWORKS.TESTNET] = 'CD50';
csvValues[NETWORKS.REGTEST] = '01F4'; // 500 in hexa

module.exports = {
    getFederationRedeemScript,
    getErpRedeemScript,
    getFlyoverRedeemScript,
    getFlyoverErpRedeemScript,
    getAddressFromRedeemSript,
    NETWORKS,
};
