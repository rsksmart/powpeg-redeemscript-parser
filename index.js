const bitcoin = require('bitcoinjs-lib');
const constants = require('./constants');

const bitcoinjsNetworks = {};
bitcoinjsNetworks[constants.NETWORKS.MAINNET] = bitcoin.networks.bitcoin;
bitcoinjsNetworks[constants.NETWORKS.TESTNET] = bitcoin.networks.testnet;
bitcoinjsNetworks[constants.NETWORKS.REGTEST] = bitcoin.networks.regtest;

const numberToHexString = (number) => number.toString(16);

const isValidNetwork = (network) => {
    if (!constants.NETWORKS[network]) {
        throw new Error(`Network ${network} is not valid value (valid values are: ${Object.keys(NETWORKS)})`);
    }
    return true;
};

const getPowpegRedeemScript = (powpegBtcPublicKeys) => {
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

    let erpPubKeys = constants.erpPubkeysLists[network].map(hex => Buffer.from(hex, 'hex'));
    let csvValue = constants.csvValues[network];

    let erpRedeemScriptBuff = bitcoin.payments.p2ms({ m: parseInt(erpPubKeys.length / 2) + 1, pubkeys: erpPubKeys });
    
    // Remove OP_CHECKMULTISIG from redeem scripts
    let defaultRedeemScriptWithouCheckMultisig = getPowpegRedeemScript(powpegBtcPublicKeys).toString('hex').slice(0, -2);
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
        getPowpegRedeemScript(powpegBtcPublicKeys)
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

module.exports = {
    getPowpegRedeemScript,
    getErpRedeemScript,
    getFlyoverRedeemScript,
    getFlyoverErpRedeemScript,
    getAddressFromRedeemSript,
    NETWORKS: constants.NETWORKS,
};
