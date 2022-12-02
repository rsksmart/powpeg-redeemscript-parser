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
 * @returns {string} returns the string hex representation of the signed number in LE format.
 * If the most significant bit equals 1 it will add an extra 0 byte
 * 
 */
 const signedNumberToHexStringLE = number => {
    // `Math.log2` is useful to get the count of significant bits in a number, - 1.
    // If number has the binary 101010 which has 6 significant bits, Math.log2(number) would return 5 (6 - 1).
    // This happens because the `Math.log2` function does an operation similar to dividing number by 2 until it reaches 1,
    // which yields the number of significant bits, minus 1, due to the power of 2 nature of binary.
    const bitCount = Math.log2(number);
    const byteLength = parseInt(bitCount / COUNT_OF_BITS_IN_BYTE + 1);
    const oneByteMask = 0xFF;
    const byteArray = [];

    for(let i = 0; i < byteLength; i++) {
        // right-shifts `number` by `i * COUNT_OF_BITS_IN_BYTE` to bring the next byte to be the first byte,
        // copies it and adds it to `byteArray`, and keeps doing that until all bytes are copied.
        // When `i` is 0, then `i * COUNT_OF_BITS_IN_BYTE` is 0 and hence `number` does not git shifted and we copy the first byte.
        const nextByte = (number >> (i * COUNT_OF_BITS_IN_BYTE)) & oneByteMask;
        byteArray.push(nextByte);
    }

    const mostSignificantBitPosition = byteLength * COUNT_OF_BITS_IN_BYTE - 1;
    // Checks if the most significant bit (MSB) is on (1) by left-shifting 1 to take it to
    // the post significant bit and do an `&` bitwise operation. If the result is greater than 0,
    // then the bit is on.
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
