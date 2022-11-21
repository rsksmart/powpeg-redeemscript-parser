const { NETWORKS } = require('./constants');

const numberToHexString = (number) => number.toString(16);

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
    isValidNetwork,
    signedNumberToHexStringLE
}
