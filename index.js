const { ERROR_MESSAGES, MAX_CSV_VALUE } = require('./constants');
const { OPS, numberToHexString, decimalToOpCode, signedNumberToHexStringLE } = require('./utils');

// OP_CHECKMULTISIG only supports up to 20 keys (MAX_PUBKEYS_PER_MULTISIG in Bitcoin Script).
const MIN_MULTISIG_PUBLIC_KEYS_COUNT = 1;
const MAX_MULTISIG_PUBLIC_KEYS_COUNT = 20;

/**
 * Encodes a multisig M or N value as a script chunk. There's no OP_17..OP_20 opcode,
 * so 1-16 push a single OP_N opcode while 17-20 push the number as minimally-encoded data.
 * @param {Number} num
 * @returns {Buffer}
 */
const encodeMultisigNumber = (num) => {
    if (decimalToOpCode[num] !== undefined) {
        return Buffer.from([decimalToOpCode[num]]);
    }
    const hex = signedNumberToHexStringLE(num);
    return Buffer.concat([Buffer.from([hex.length / 2]), Buffer.from(hex, 'hex')]);
};

/**
 *
 * @param {String[] | Buffer[]} btcPublicKeys
 * @returns {Buffer}
 */
const buildStandardMultiSigRedeemScript = (btcPublicKeys) => {
    // Parse to Buffer and sort keys
    const pubkeys = btcPublicKeys
        .map(hex => hex instanceof Buffer ? hex: Buffer.from(hex, 'hex'))
        .sort((a, b) => a.compare(b));

    if (pubkeys.length < MIN_MULTISIG_PUBLIC_KEYS_COUNT || pubkeys.length > MAX_MULTISIG_PUBLIC_KEYS_COUNT) {
        throw new Error(ERROR_MESSAGES.INVALID_PUBLIC_KEYS_COUNT);
    }

    const m = parseInt(pubkeys.length / 2) + 1;
    const n = pubkeys.length;

    // OP_M <pushbyte(pubkey)>... OP_N OP_CHECKMULTISIG
    return Buffer.concat([
        encodeMultisigNumber(m),
        ...pubkeys.map(pubkey => Buffer.concat([Buffer.from([pubkey.length]), pubkey])),
        encodeMultisigNumber(n),
        Buffer.from([OPS.OP_CHECKMULTISIG])
    ]);
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

    redeemScript.write(numberToHexString(OPS.OP_NOTIF), 'hex');
    redeemScript.write(defaultRedeemScript, 1, 'hex');
    let position = 1 + parseInt(defaultRedeemScript.length / 2);
    redeemScript.write(numberToHexString(OPS.OP_ELSE), position, 'hex');
    position+= 1;
    redeemScript.write(`0${csvLEHexValue.length / 2}`, position, 'hex'); // OP_PUSHBYTES
    position+= 1;
    redeemScript.write(csvLEHexValue, position, 'hex');
    position+= csvLEHexValue.length / 2;
    redeemScript.write(numberToHexString(OPS.OP_CHECKSEQUENCEVERIFY), position, 'hex');
    position+= 1;
    redeemScript.write(numberToHexString(OPS.OP_DROP), position, 'hex');
    position+= 1;
    redeemScript.write(emergencyRedeemScript, position, 'hex');
    position+= emergencyRedeemScript.length / 2;
    redeemScript.write(numberToHexString(OPS.OP_ENDIF), position, 'hex');

    return redeemScript;
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
    prefix.write(numberToHexString(OPS.OP_DROP), prefix.length - 1, 'hex'); // DROP the hash

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
        throw new Error(ERROR_MESSAGES.INVALID_REDEEM_SCRIPT);
    }
    
    return Buffer.concat([
        buildFlyoverPrefix(derivationArgsHash), 
        powpegRedeemScript
    ]);
};

// Flyover prefix: OP_PUSHBYTES_32 (1) + 32-byte derivation hash + OP_DROP (1)
const FLYOVER_PREFIX_LENGTH_IN_BYTES = 34;
const OP_PUSHBYTES_32 = 0x20;

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

    // Must have at least one more byte after the prefix - a bare
    // "<hash> OP_DROP" with nothing left to guard is not a flyover script.
    return (
        redeemScript.length > FLYOVER_PREFIX_LENGTH_IN_BYTES &&
        redeemScript[0] === OP_PUSHBYTES_32 &&
        redeemScript[FLYOVER_PREFIX_LENGTH_IN_BYTES - 1] === OPS.OP_DROP
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
