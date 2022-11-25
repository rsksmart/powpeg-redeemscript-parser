const { NETWORKS } = require('./constants');
const EcPair = require('bitcoinjs-lib').ECPair;
const opcodes = require('bitcoinjs-lib').script.OPS;

const numberToHexString = (number) => number.toString(16);
const hexToDecimal = hex => parseInt(hex, 16);
const getRandomPubkey = () => EcPair.makeRandom().publicKey.toString('hex');

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

const signedNumberToHexStringLE = (number) => {

    let numberAsHex = numberToHexString(number);

    // Prepends '0' to hex string if it's odd
    if (numberAsHex.length % 2 === 1) {
        numberAsHex = `0${numberAsHex}`;
    }

    // Breaks the hex string in groups of 2 characters, which make up a byte
    const numberAsHexArray = numberAsHex.match(/.{1,2}/g);
    const msbPosition = numberAsHexArray.length * 8 - 1;
    const mostSignificantBitIsOn = (number & (1 << msbPosition)) >> msbPosition === 1;

    // Adds extra empty byte to indicate that the MSB was on
    if (mostSignificantBitIsOn) {
        numberAsHexArray.unshift('00');
    }

    // Returns the hex string in Little Endian (LE) format.
    return numberAsHexArray.reverse().join('');
}

module.exports = {
    numberToHexString,
    hexToDecimal,
    getRandomPubkey,
    decimalToOpCode,
    isValidNetwork,
    signedNumberToHexStringLE
}
