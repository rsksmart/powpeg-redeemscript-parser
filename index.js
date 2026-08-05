const bitcoin = require('bitcoinjs-lib');
const { ERROR_MESSAGES, MAX_CSV_VALUE } = require('./constants');
const { numberToHexString, signedNumberToHexStringLE } = require('./utils');

/**
 * 
 * @param {String[] | Buffer[]} btcPublicKeys 
 * @returns {Buffer}
 */
const buildStandardMultiSigRedeemScript = (btcPublicKeys) => {
    // Parse to Buffer and sort keys
    const defaultPubkeys = btcPublicKeys
        .map(hex => hex instanceof Buffer ? hex: Buffer.from(hex, 'hex'))
        .sort((a, b) => a.compare(b));
    return Buffer.from(bitcoin.payments.p2ms({ m: parseInt(defaultPubkeys.length / 2) + 1, pubkeys: defaultPubkeys }).output);
};

/**
 * 
 * @param {String[] | Buffer[]} powpegBtcPublicKeys 
 * @param {String[] | Buffer[]} erpBtcPublicKeys 
 * @param {Number} csvValue 
 * @returns {Buffer}
 */
const buildPowpegRedeemScript = (powpegBtcPublicKeys, erpBtcPublicKeys, csvValue) => {
    if (!Array.isArray(powpegBtcPublicKeys)) {
        throw new Error(ERROR_MESSAGES.INVALID_POWPEG_PUBLIC_KEYS);
    }
    if (!Array.isArray(erpBtcPublicKeys)) {
        throw new Error(ERROR_MESSAGES.INVALID_EMERGENCY_PUBLIC_KEYS);
    }

    if (!Number.isInteger(csvValue) || csvValue < 1 || csvValue > MAX_CSV_VALUE) {
        throw new Error(ERROR_MESSAGES.INVALID_CSV_VALUE);
    }

    const csvLEHexValue = signedNumberToHexStringLE(csvValue);

    const defaultRedeemScript = buildStandardMultiSigRedeemScript(powpegBtcPublicKeys).toString('hex');
    const emergencyRedeemScript = buildStandardMultiSigRedeemScript(erpBtcPublicKeys).toString('hex');

    const bufferLength = parseInt(
        1 + 
        defaultRedeemScript.length / 2 + 
        2 + 
        csvLEHexValue.length / 2 + 
        2 + 
        emergencyRedeemScript.length / 2 + 
        1
    );

    const redeemScript = Buffer.alloc(bufferLength);

    redeemScript.write(numberToHexString(bitcoin.script.OPS.OP_NOTIF), 'hex');
    redeemScript.write(defaultRedeemScript, 1, 'hex');
    let position = 1 + parseInt(defaultRedeemScript.length / 2);
    redeemScript.write(numberToHexString(bitcoin.script.OPS.OP_ELSE), position, 'hex');
    position+= 1;
    redeemScript.write(`0${csvLEHexValue.length / 2}`, position, 'hex'); // OP_PUSHBYTES
    position+= 1;
    redeemScript.write(csvLEHexValue, position, 'hex');
    position+= csvLEHexValue.length / 2;
    redeemScript.write(numberToHexString(bitcoin.script.OPS.OP_CHECKSEQUENCEVERIFY), position, 'hex');
    position+= 1;
    redeemScript.write(numberToHexString(bitcoin.script.OPS.OP_DROP), position, 'hex');
    position+= 1;
    redeemScript.write(emergencyRedeemScript, position, 'hex');
    position+= emergencyRedeemScript.length / 2;
    redeemScript.write(numberToHexString(bitcoin.script.OPS.OP_ENDIF), position, 'hex');

    return Buffer.from(redeemScript, 'hex');
};

/**
 * 
 * @param {String} derivationArgsHash 
 * @returns {Buffer}
 */
const buildFlyoverPrefix = (derivationArgsHash) => {
    if (!derivationArgsHash || derivationArgsHash.length !== 64) {
        throw new Error(ERROR_MESSAGES.INVALID_DHASH);
    }
    const prefix = Buffer.alloc(34);
    prefix.write('20', 'hex'); // hash length
    prefix.write(derivationArgsHash, 1, 'hex');
    prefix.write(numberToHexString(bitcoin.script.OPS.OP_DROP), prefix.length - 1, 'hex'); // DROP the hash

    return prefix;
};

/**
 * 
 * @param {Buffer} powpegRedeemScript 
 * @param {String} derivationArgsHash 
 * @returns {Buffer}
 */
const buildFlyoverRedeemScript = (powpegRedeemScript, derivationArgsHash) => {
    if (!Buffer.isBuffer(powpegRedeemScript)) {
        throw new Error(ERROR_MESSAGES.INVALID_POWPEG_REDEEM_SCRIPT);
    }
    
    return Buffer.concat([
        buildFlyoverPrefix(derivationArgsHash), 
        powpegRedeemScript
    ]);
};

// Flyover prefix: OP_PUSHBYTES_32 (1) + 32-byte derivation hash + OP_DROP (1)
const FLYOVER_PREFIX_LENGTH_IN_BYTES = 34;

/**
 * Checks whether a redeem script is a flyover redeem script, i.e. a powpeg redeem script prefixed
 * with OP_PUSHBYTES_32 <derivationHash> OP_DROP.
 * @param {Buffer} redeemScript
 * @returns {Boolean}
 */
const isFlyoverRedeemScript = (redeemScript) => {
    if (!Buffer.isBuffer(redeemScript)) {
        throw new Error(ERROR_MESSAGES.INVALID_REDEEM_SCRIPT);
    }

    const chunks = bitcoin.script.decompile(redeemScript);
    if (!chunks || chunks.length < 3) {
        return false;
    }

    const [derivationHash, dropOpcode] = chunks;
    return (
        derivationHash instanceof Uint8Array &&
        derivationHash.length === 32 &&
        dropOpcode === bitcoin.script.OPS.OP_DROP
    );
};

/**
 * Removes the flyover prefix (OP_PUSHBYTES_32 <derivationHash> OP_DROP) from a flyover redeem script,
 * returning the underlying powpeg redeem script.
 * @param {Buffer} redeemScript
 * @returns {Buffer}
 */
const removeFlyoverPrefix = (redeemScript) => {
    if (!isFlyoverRedeemScript(redeemScript)) {
        throw new Error(ERROR_MESSAGES.NOT_A_FLYOVER_REDEEM_SCRIPT);
    }
    return redeemScript.slice(FLYOVER_PREFIX_LENGTH_IN_BYTES);
};

module.exports = {
    buildPowpegRedeemScript,
    buildFlyoverRedeemScript,
    isFlyoverRedeemScript,
    removeFlyoverPrefix
};
