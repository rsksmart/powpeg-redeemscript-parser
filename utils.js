const { NETWORKS } = require('./constants');
const EcPair = require('bitcoinjs-lib').ECPair;
const opcodes = require('bitcoinjs-lib').script.OPS;

const numberToHexString = (number) => number.toString(16);
const hexToDecimal = hex => parseInt(hex, 16);
const getRandomPubkey = () => EcPair.makeRandom().publicKey.toString('hex');

const COUNT_OF_BITS_IN_BYTE = 8;

const decimalToOpCode = {
    1: opcodes.OP_1,
    2: opcodes.OP_2,
    3: opcodes.OP_3,
    4: opcodes.OP_4,
    5: opcodes.OP_5,
    6: opcodes.OP_6,
    7: opcodes.OP_7,
    8: opcodes.OP_8,
    9: opcodes.OP_9,
    10: opcodes.OP_10,
    11: opcodes.OP_11,
    12: opcodes.OP_12,
    13: opcodes.OP_13,
    14: opcodes.OP_14,
    15: opcodes.OP_15,
    16: opcodes.OP_16
}

const isValidNetwork = (network) => {
    if (!NETWORKS[network]) {
        throw new Error(`Network ${network} is not valid value (valid values are: ${Object.keys(NETWORKS)})`);
    }
    return true;
};

/**
 *
 * @param {number} number to convert to a hex string representation in LE format
 * @returns {string} returns the string hex representation of the number in LE format
 * 
 */
 const signedNumberToHexStringLE = number => {
    const bitCount = Math.log2(number);
    const byteLength = parseInt(bitCount / COUNT_OF_BITS_IN_BYTE + 1);
    const oneByteMask = 0xFF;
    const byteArray = [];

    for(let i = 0; i < byteLength; i++) {
        const nextByte = (number >> (i * COUNT_OF_BITS_IN_BYTE)) & oneByteMask;
        byteArray.push(nextByte);
    }

    const mostSignificantBitPosition = byteLength * COUNT_OF_BITS_IN_BYTE - 1;
    const mostSignificantBitIsOn = (number & (1 << mostSignificantBitPosition)) > 0;

    if (mostSignificantBitIsOn) {
        byteArray.push(0);
    }

    return Buffer.from(byteArray).toString("hex");
};

module.exports = {
    numberToHexString,
    hexToDecimal,
    getRandomPubkey,
    decimalToOpCode,
    isValidNetwork,
    signedNumberToHexStringLE
}
