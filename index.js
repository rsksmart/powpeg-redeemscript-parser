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
    return getRedeemScriptFromBtcPublicKeys(powpegBtcPublicKeys);
};

const getRedeemScriptFromBtcPublicKeys = (btcPublicKeys) => {
    // Parse to Buffer and sort keys
    const defaultPubkeys = btcPublicKeys
        .map(hex => hex instanceof Buffer ? hex: Buffer.from(hex, 'hex'))
        .sort((a, b) => a.compare(b));
    return bitcoin.payments.p2ms({ m: parseInt(defaultPubkeys.length / 2) + 1, pubkeys: defaultPubkeys }).output;
};

const getP2shErpRedeemScript = (powpegBtcPublicKeys, p2shErpBtcPublicKeys, csvValue) => {
    if (!powpegBtcPublicKeys || !(powpegBtcPublicKeys instanceof Array)) {
        throw new Error(ERROR_MESSAGES.INVALID_POWPEG_PUBLIC_KEYS);
    }
    if (!p2shErpBtcPublicKeys || !(p2shErpBtcPublicKeys instanceof Array)) {
        throw new Error(ERROR_MESSAGES.INVALID_P2SH_ERP_PUBLIC_KEYS);
    }
    if (!csvValue || csvValue.length === 0) {
        throw new Error(ERROR_MESSAGES.INVALID_CSV_VALUE);
    }

    const defaultRedeemScript = getPowpegRedeemScript(powpegBtcPublicKeys).toString('hex');
    const p2shErpRedeemScript = getRedeemScriptFromBtcPublicKeys(p2shErpBtcPublicKeys).toString('hex');

    const bufferLength = parseInt(
        1 + 
        defaultRedeemScript.length / 2 + 
        2 + 
        csvValue.length / 2 + 
        2 + 
        p2shErpRedeemScript.length / 2 + 
        1
    );

    const redeemScript = Buffer.alloc(bufferLength);

    redeemScript.write(numberToHexString(bitcoin.script.OPS.OP_NOTIF), 'hex');
    redeemScript.write(defaultRedeemScript, 1, 'hex');
    let position = 1 + parseInt(defaultRedeemScript.length / 2);
    redeemScript.write(numberToHexString(bitcoin.script.OPS.OP_ELSE), position, 'hex');
    position+= 1;
    redeemScript.write(`0${csvValue.length / 2}`, position, 'hex'); // OP_PUSHBYTES
    position+= 1;
    redeemScript.write(csvValue, position, 'hex');
    position+= csvValue.length / 2;
    redeemScript.write(numberToHexString(bitcoin.script.OPS.OP_CHECKSEQUENCEVERIFY), position, 'hex');
    position+= 1;
    redeemScript.write(numberToHexString(bitcoin.script.OPS.OP_DROP), position, 'hex');
    position+= 1;
    redeemScript.write(p2shErpRedeemScript, position, 'hex');
    position+= p2shErpRedeemScript.length / 2;
    redeemScript.write(numberToHexString(bitcoin.script.OPS.OP_ENDIF), position, 'hex');

    return Buffer.from(redeemScript, 'hex');
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
    getP2shErpRedeemScript,
    getFlyoverRedeemScript,
    getAddressFromRedeemScript,
    NETWORKS: NETWORKS
};
