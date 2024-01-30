const { NETWORKS } = require('./constants');
const EcPair = require('bitcoinjs-lib').ECPair;
const opcodes = require('bitcoinjs-lib').script.OPS;

const numberToHexString = (number) => number.toString(16);
const hexToDecimal = hex => parseInt(hex, 16);
const getRandomPubkey = () => EcPair.makeRandom().publicKey.toString('hex');

const COUNT_OF_BITS_IN_BYTE = 8;
const ONE_BYTE_MASK = 0xFF;
const ONE_BIT_MASK = 0x01;

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
 * If the most significant bit equals 1, it will add an extra 0 byte
 * 
 */
 const signedNumberToHexStringLE = number => {

    const bitCount = Math.log2(number);
    const bytesCount = parseInt(bitCount / COUNT_OF_BITS_IN_BYTE + 1);
    const leBytesArray = [];

    for(let i = 0; i < bytesCount; i++) {
        const nextByteStartIndex = i * COUNT_OF_BITS_IN_BYTE;
        const oneByteMaskMovedAtNextByteStartIndex = ONE_BYTE_MASK << nextByteStartIndex;
        const nextByteCopyAtOriginalPosition = number & oneByteMaskMovedAtNextByteStartIndex;
        const nextByteCopyMovedAtStart = nextByteCopyAtOriginalPosition >> nextByteStartIndex;
        leBytesArray.push(nextByteCopyMovedAtStart);
    }

    const mostSignificantBitPosition = bytesCount * COUNT_OF_BITS_IN_BYTE - 1;
    const oneBitMaskMovedAtMostSignificantBitPosition = ONE_BIT_MASK << mostSignificantBitPosition;
    const mostSignificantBitCopy = number & oneBitMaskMovedAtMostSignificantBitPosition;
    const mostSignificantBitIsOn = mostSignificantBitCopy > 0;

    if (mostSignificantBitIsOn) {
        leBytesArray.push(0);
    }

    return Buffer.from(leBytesArray).toString("hex");
};

module.exports = {
    numberToHexString,
    hexToDecimal,
    getRandomPubkey,
    decimalToOpCode,
    isValidNetwork,
    signedNumberToHexStringLE
}
