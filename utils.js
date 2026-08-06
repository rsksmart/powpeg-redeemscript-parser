// Bitcoin script opcode values (BIP-62 / Script wiki), hardcoded so this library
// doesn't need a Bitcoin script-encoding dependency for a handful of stable constants.
const OPS = {
    OP_1: 0x51,
    OP_2: 0x52,
    OP_3: 0x53,
    OP_4: 0x54,
    OP_5: 0x55,
    OP_6: 0x56,
    OP_7: 0x57,
    OP_8: 0x58,
    OP_9: 0x59,
    OP_10: 0x5a,
    OP_11: 0x5b,
    OP_12: 0x5c,
    OP_13: 0x5d,
    OP_14: 0x5e,
    OP_15: 0x5f,
    OP_16: 0x60,
    OP_NOTIF: 0x64,
    OP_ELSE: 0x67,
    OP_ENDIF: 0x68,
    OP_DROP: 0x75,
    OP_CHECKSEQUENCEVERIFY: 0xb2,
    OP_CHECKMULTISIG: 0xae
};

// Zero-padded to an even length: Buffer#write(str, ..., 'hex') silently writes zero
// bytes for odd-length hex instead of throwing, so an unpadded string here would
// corrupt the redeem script instead of failing loudly.
const numberToHexString = (number) => number.toString(16).padStart(2, '0');
const hexToDecimal = hex => parseInt(hex, 16);

const COUNT_OF_BITS_IN_BYTE = 8;
const ONE_BYTE_MASK = 0xFF;
const ONE_BIT_MASK = 0x01;

const decimalToOpCode = {
    1: OPS.OP_1,
    2: OPS.OP_2,
    3: OPS.OP_3,
    4: OPS.OP_4,
    5: OPS.OP_5,
    6: OPS.OP_6,
    7: OPS.OP_7,
    8: OPS.OP_8,
    9: OPS.OP_9,
    10: OPS.OP_10,
    11: OPS.OP_11,
    12: OPS.OP_12,
    13: OPS.OP_13,
    14: OPS.OP_14,
    15: OPS.OP_15,
    16: OPS.OP_16
}

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
    const bytesInLE = [];

    for(let i = 0; i < bytesCount; i++) {
        const nextByteStartIndex = i * COUNT_OF_BITS_IN_BYTE;
        const oneByteMaskMovedAtNextByteStartIndex = ONE_BYTE_MASK << nextByteStartIndex;
        const nextByteCopyAtOriginalPosition = number & oneByteMaskMovedAtNextByteStartIndex;
        const nextByteCopyMovedAtStart = nextByteCopyAtOriginalPosition >> nextByteStartIndex;
        bytesInLE.push(nextByteCopyMovedAtStart);
    }

    const mostSignificantBitPosition = bytesCount * COUNT_OF_BITS_IN_BYTE - 1;
    const oneBitMaskMovedAtMostSignificantBitPosition = ONE_BIT_MASK << mostSignificantBitPosition;
    const mostSignificantBitCopy = number & oneBitMaskMovedAtMostSignificantBitPosition;
    const mostSignificantBitIsOn = mostSignificantBitCopy > 0;

    if (mostSignificantBitIsOn) {
        bytesInLE.push(0);
    }

    return Buffer.from(bytesInLE).toString("hex");
};

module.exports = {
    OPS,
    numberToHexString,
    hexToDecimal,
    decimalToOpCode,
    signedNumberToHexStringLE
}
