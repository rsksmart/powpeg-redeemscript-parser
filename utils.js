const reverseString = (str) => {
    return str.split("").reverse().join("");
}

const swapCharacters = (str) => {
    const strArray = str.split("");
    for (let i = 0; i < strArray.length - 1; i += 2) {
        let temp = strArray[i]; 
        strArray[i] = strArray[i + 1]; 
        strArray[i + 1] = temp; 
    }
    return strArray.join("");
}

const numberToHexStringLE = (number) => {
    const numberAsBitArray = number.toString(2).split("");
    const bitLength = numberAsBitArray.length;
    let numberAsBitString = "";
    if (bitLength < 8) {
        numberAsBitString = numberAsBitArray.join("").padStart(8, '0');
    } else if (bitLength > 8) {
        numberAsBitString = numberAsBitArray.join("").padStart(16, '0');
    } else {
        numberAsBitString = numberAsBitArray.join("");
    }

    let numberAsHex = number.toString(16);
    if (Number(numberAsBitString.charAt(0)) > 0 || Number(numberAsBitString.charAt(1)) > 0) {
        numberAsHex = reverseString(swapCharacters(numberAsHex));
        numberAsHex = numberAsHex.padEnd(numberAsHex.length + 2, '0'); // pads hex with 2 zeros at the end
    } else if (numberAsHex.length % 2 != 0) {
        numberAsHex = numberAsHex.padStart(numberAsHex.length + 1, '0'); // pads hex with 1 zero at the beginning
        numberAsHex = reverseString(swapCharacters(numberAsHex));
    } else {
        numberAsHex = reverseString(swapCharacters(numberAsHex));
    }
    return numberAsHex;
};

module.exports = {
    numberToHexStringLE
}
