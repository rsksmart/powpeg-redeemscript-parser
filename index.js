const bitcoin = require('bitcoinjs-lib');
const { NETWORKS, ERROR_MESSAGES } = require('./constants');

const bitcoinjsNetworks = {};
bitcoinjsNetworks[NETWORKS.MAINNET] = bitcoin.networks.bitcoin;
bitcoinjsNetworks[NETWORKS.TESTNET] = bitcoin.networks.testnet;
bitcoinjsNetworks[NETWORKS.REGTEST] = bitcoin.networks.regtest;

const numberToHexString = (number) => number.toString(16);

const isValidNetwork = (network) => {
    if (!NETWORKS[network]) {
        throw new Error(`Network ${network} is not valid value (valid values are: ${Object.keys(NETWORKS)})`);
    }
    return true;
};

const getPowpegRedeemScript = (powpegBtcPublicKeys) => {
    if (!powpegBtcPublicKeys || !(powpegBtcPublicKeys instanceof Array)) {
        throw new Error(ERROR_MESSAGES.INVALID_POWPEG_PUBLIC_KEYS);
    }
    // Parse to Buffer and sort keys
    let defaultPubkeys = powpegBtcPublicKeys
        .map(hex => hex instanceof Buffer ? hex: Buffer.from(hex, 'hex'))
        .sort((a, b) => a.compare(b));
    return bitcoin.payments.p2ms({ m: parseInt(defaultPubkeys.length / 2) + 1, pubkeys: defaultPubkeys }).output;
};

const getErpRedeemScript = (powpegBtcPublicKeys, erpBtcPublicKeys, csvValue) => {
    if (!powpegBtcPublicKeys || !(powpegBtcPublicKeys instanceof Array)) {
        throw new Error(ERROR_MESSAGES.INVALID_POWPEG_PUBLIC_KEYS);
    }
    if (!erpBtcPublicKeys || !(erpBtcPublicKeys instanceof Array)) {
        throw new Error(ERROR_MESSAGES.INVALID_ERP_PUBLIC_KEYS);
    }
    if (!csvValue || csvValue.length === 0) {
        throw new Error(ERROR_MESSAGES.INVALID_CSV_VALUE);
    }
    
    let erpPubKeys = erpBtcPublicKeys.map(hex => Buffer.from(hex, 'hex'));
    let erpRedeemScriptBuff = bitcoin.payments.p2ms({ m: parseInt(erpPubKeys.length / 2) + 1, pubkeys: erpPubKeys });
    
    // Remove OP_CHECKMULTISIG from redeem scripts
    let defaultRedeemScriptWithoutCheckMultisig = getPowpegRedeemScript(powpegBtcPublicKeys).toString('hex').slice(0, -2);
    let erpRedeemScriptWithoutCheckMultisig = erpRedeemScriptBuff.output.toString('hex').slice(0, -2);

    let bufferLength = parseInt(
        1 + 
        defaultRedeemScriptWithoutCheckMultisig.length / 2 + 
        2 + 
        csvValue.length / 2 + 
        2 + 
        erpRedeemScriptWithoutCheckMultisig.length / 2 + 
        2
    );

    let erpRedeemScript = Buffer.alloc(bufferLength);
    erpRedeemScript.write(numberToHexString(bitcoin.script.OPS.OP_NOTIF), 'hex');
    erpRedeemScript.write(defaultRedeemScriptWithoutCheckMultisig, 1, 'hex');
    let position = 1 + parseInt(defaultRedeemScriptWithoutCheckMultisig.length / 2);
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
        throw new Error(ERROR_MESSAGES.INVALID_DHASH);
    }
    let prefix = Buffer.alloc(34);
    prefix.write('20', 'hex'); // hash length
    prefix.write(derivationArgsHash, 1, 'hex');
    prefix.write(numberToHexString(bitcoin.script.OPS.OP_DROP), prefix.length - 1, 'hex'); // DROP the hash

    return prefix;
};

const getFlyoverErpRedeemScript = (powpegBtcPublicKeys, erpBtcPublicKeys, csvValue, derivationArgsHash) => {
    return Buffer.concat([
        getFlyoverPrefix(derivationArgsHash), 
        getErpRedeemScript(powpegBtcPublicKeys, erpBtcPublicKeys, csvValue)
    ]);
}

const getFlyoverRedeemScriptFromPublicKeys = (powpegBtcPublicKeys, derivationArgsHash) => {
    return Buffer.concat([
        getFlyoverPrefix(derivationArgsHash), 
        getPowpegRedeemScript(powpegBtcPublicKeys)
    ]);
}

const getFlyoverRedeemScript = (powpegRedeemScript, derivationArgsHash) => {
    if (!powpegRedeemScript || !(powpegRedeemScript instanceof Buffer)) {
        throw new Error(ERROR_MESSAGES.INVALID_POWPEG_REDEEM_SCRIPT);
    }
    
    return Buffer.concat([
        getFlyoverPrefix(derivationArgsHash), 
        powpegRedeemScript
    ]);
}

const getAddressFromRedeemScript = (network, redeemScript) => {
    isValidNetwork(network);

    if (!redeemScript || !(redeemScript instanceof Buffer)) {
        throw new Error(ERROR_MESSAGES.INVALID_REDEEM_SCRIPT);
    }

    let doubleHash = bitcoin.crypto.ripemd160(bitcoin.crypto.sha256(redeemScript));
    return bitcoin.address.toBase58Check(doubleHash, bitcoinjsNetworks[network].scriptHash);
}

module.exports = {
    getPowpegRedeemScript,
    getErpRedeemScript,
    getFlyoverRedeemScriptFromPublicKeys,
    getFlyoverRedeemScript,
    getFlyoverErpRedeemScript,
    getAddressFromRedeemScript,
    NETWORKS: NETWORKS
};
