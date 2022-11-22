const redeemScriptParser = require('../index');
const crypto = require('crypto');
const opcodes = require('bitcoinjs-lib').script.OPS;
const EcPair = require('bitcoinjs-lib').ECPair;
const expect = require('chai').expect;
const { NETWORKS, ERROR_MESSAGES, MAX_CSV_VALUE } = require('../constants');
const rawRedeemScripts = require('./resources/test-redeem-scripts.json');
const { signedNumberToHexStringLE } = require('../utils');

const hexToDecimal = hex => parseInt(hex, 16);
const getRandomPubkey = () => EcPair.makeRandom().publicKey.toString('hex');
const decimalToHexString = (number) => number.toString(16);
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

const checkPubKeysIncludedInRedeemScript = (pubKeys, redeemScript) => {
    for (let pubKey of pubKeys) {
        expect(redeemScript.indexOf(pubKey.toString('hex'))).to.be.above(0);
    }
};

const validateStandardRedeemScriptFormat = (redeemScript, pubKeys) => {
    const M = parseInt(pubKeys.length / 2) + 1;
    const N = pubKeys.length;

    // First byte is M (pubKeys.length / 2 + 1)
    expect(redeemScript.substring(0,2)).to.be.eq(decimalToHexString(decimalToOpCode[M]));
    // Second to last byte is N (pubKeys.length)
    expect(redeemScript.slice(-4).substring(0,2)).to.be.eq(decimalToHexString(decimalToOpCode[N]));
    // Last byte is OP_CHECKMULTISIG
    expect(redeemScript.slice(-2)).to.be.eq(decimalToHexString(opcodes.OP_CHECKMULTISIG));
    // Public keys should be in the redeem script
    checkPubKeysIncludedInRedeemScript(pubKeys, redeemScript);
}

const validateP2shErpRedeemScriptFormat = (p2shErpRedeemScript, pubKeys, erpPubKeys, csvValue) => {

    const OP_M = parseInt(pubKeys.length / 2) + 1;
    const OP_N = pubKeys.length;

    const ERP_OP_M = parseInt(erpPubKeys.length / 2) + 1;
    const ERP_OP_N = erpPubKeys.length;

    const bufferP2shErpRedeemScript = Buffer.from(p2shErpRedeemScript, 'hex');

    let position = 1;
    //  First byte is OP_NOTIF
    expect(bufferP2shErpRedeemScript.subarray(0, position).toString('hex')).to.be.eq(decimalToHexString(opcodes.OP_NOTIF));
    expect(bufferP2shErpRedeemScript.subarray(position, ++position).toString('hex')).to.be.eq(decimalToHexString(decimalToOpCode[OP_M]));

    let pubKeyLengthHex = bufferP2shErpRedeemScript.subarray(position, ++position).toString('hex');
    // Check Publickeys in P2shErpRedeemScript
    while (pubKeys.length >= 0 && pubKeyLengthHex == "21") {
        let pubKeyLength = hexToDecimal(pubKeyLengthHex);
        let pubKey = bufferP2shErpRedeemScript.subarray(position, position + pubKeyLength).toString('hex');
        expect(pubKeys).to.include(pubKey);
        position = position + pubKeyLength;
        pubKeyLengthHex = bufferP2shErpRedeemScript.subarray(position, ++position).toString('hex');
    }

    expect(pubKeyLengthHex).to.be.eq(decimalToHexString(decimalToOpCode[OP_N]));
    expect(bufferP2shErpRedeemScript.subarray(position, ++position).toString('hex')).to.be.eq(decimalToHexString(opcodes.OP_CHECKMULTISIG));
    expect(bufferP2shErpRedeemScript.subarray(position, ++position).toString('hex')).to.be.eq(decimalToHexString(opcodes.OP_ELSE));
    expect(bufferP2shErpRedeemScript.subarray(position, ++position).toString('hex')).to.be.eq(`0${signedNumberToHexStringLE(csvValue).length / 2}`);
    const csvValueOffset = position + 3;
    expect(bufferP2shErpRedeemScript.subarray(position, csvValueOffset).toString('hex')).to.be.eq(signedNumberToHexStringLE(csvValue));
    position = csvValueOffset;
    expect(bufferP2shErpRedeemScript.subarray(position, ++position).toString('hex')).to.be.eq(decimalToHexString(opcodes.OP_CHECKSEQUENCEVERIFY));
    expect(bufferP2shErpRedeemScript.subarray(position, ++position).toString('hex')).to.be.eq(decimalToHexString(opcodes.OP_DROP));
    expect(bufferP2shErpRedeemScript.subarray(position, ++position).toString('hex')).to.be.eq(decimalToHexString(decimalToOpCode[ERP_OP_M]));

    pubKeyLengthHex = bufferP2shErpRedeemScript.subarray(position, ++position).toString('hex');
    // Check ERP Publickeys in P2shErpRedeemScript
    while (erpPubKeys.length >= 0 && pubKeyLengthHex == "21") {
        let pubKeyLength = hexToDecimal(pubKeyLengthHex);
        let pubKey = bufferP2shErpRedeemScript.subarray(position, position + pubKeyLength).toString('hex');
        expect(erpPubKeys).to.include(pubKey);
        position = position + pubKeyLength;
        pubKeyLengthHex = bufferP2shErpRedeemScript.subarray(position, ++position).toString('hex');
    }

    expect(pubKeyLengthHex).to.be.eq(decimalToHexString(decimalToOpCode[ERP_OP_N]));
    expect(bufferP2shErpRedeemScript.subarray(position, ++position).toString('hex')).to.be.eq(decimalToHexString(opcodes.OP_CHECKMULTISIG));
    //  Last byte is OP_ENDIF
    expect(bufferP2shErpRedeemScript.subarray(position, ++position).toString('hex')).to.be.eq(decimalToHexString(opcodes.OP_ENDIF));
}

describe('getPowpegRedeemScript', () => {
    it ('should fail for invalid data', () => {
        expect(() => redeemScriptParser.getPowpegRedeemScript(null)).to.throw(ERROR_MESSAGES.INVALID_POWPEG_PUBLIC_KEYS);
        expect(() => redeemScriptParser.getPowpegRedeemScript('a-string')).to.throw(ERROR_MESSAGES.INVALID_POWPEG_PUBLIC_KEYS);
    });

    it('should return a valid redeem script', () => {
        let pubKeys = [
            '02cd53fc53a07f211641a677d250f6de99caf620e8e77071e811a28b3bcddf0be1',
            '0362634ab57dae9cb373a5d536e66a8c4f67468bbcfb063809bab643072d78a124',
            '03c5946b3fbae03a654237da863c9ed534e0878657175b132b8ca630f245df04db',
        ];
        let redeemScript = redeemScriptParser.getPowpegRedeemScript(pubKeys).toString('hex');
        validateStandardRedeemScriptFormat(redeemScript, pubKeys);

        // Sort descending
        pubKeys = pubKeys.sort((a, b) => b > a);
        let otherRedeemScript = redeemScriptParser.getPowpegRedeemScript(pubKeys).toString('hex');
        expect(redeemScript).to.be.eq(otherRedeemScript);
    });
});

describe('getP2shErpRedeemScript', () => {
    const publicKeys = [
        getRandomPubkey(),
        getRandomPubkey(),
        getRandomPubkey()
    ];
    const emergencyBtcPublicKeys = [
        getRandomPubkey(),
        getRandomPubkey(),
    ];
    const csvValue = 52560;
    
    it('fails for invalid data', () => {
        // fail because there are no powpeg public keys
        expect(() => redeemScriptParser.getP2shErpRedeemScript()).to.throw(ERROR_MESSAGES.INVALID_POWPEG_PUBLIC_KEYS);
        expect(() => redeemScriptParser.getP2shErpRedeemScript(null)).to.throw(ERROR_MESSAGES.INVALID_POWPEG_PUBLIC_KEYS);
        expect(() => redeemScriptParser.getP2shErpRedeemScript('nothing')).to.throw(ERROR_MESSAGES.INVALID_POWPEG_PUBLIC_KEYS);
        expect(() => redeemScriptParser.getP2shErpRedeemScript(null, null, null)).to.throw(ERROR_MESSAGES.INVALID_POWPEG_PUBLIC_KEYS);

        // fail because there are no p2sh erp public keys
        expect(() => redeemScriptParser.getP2shErpRedeemScript(publicKeys, null, null)).to.throw(ERROR_MESSAGES.INVALID_ERP_PUBLIC_KEYS);
        expect(() => redeemScriptParser.getP2shErpRedeemScript(publicKeys, '', null)).to.throw(ERROR_MESSAGES.INVALID_ERP_PUBLIC_KEYS);
        expect(() => redeemScriptParser.getP2shErpRedeemScript(publicKeys, getRandomPubkey(), null)).to.throw(ERROR_MESSAGES.INVALID_ERP_PUBLIC_KEYS);

        // fail because there is no csv value
        expect(() => redeemScriptParser.getP2shErpRedeemScript(publicKeys, emergencyBtcPublicKeys, null)).to.throw(ERROR_MESSAGES.INVALID_CSV_VALUE);
        expect(() => redeemScriptParser.getP2shErpRedeemScript(publicKeys, emergencyBtcPublicKeys, '')).to.throw(ERROR_MESSAGES.INVALID_CSV_VALUE);

        // fail because the csv value is invalid
        expect(() => redeemScriptParser.getP2shErpRedeemScript(publicKeys, emergencyBtcPublicKeys, "12345")).to.throw(ERROR_MESSAGES.INVALID_CSV_VALUE);
        expect(() => redeemScriptParser.getP2shErpRedeemScript(publicKeys, emergencyBtcPublicKeys, 0)).to.throw(ERROR_MESSAGES.INVALID_CSV_VALUE);
        expect(() => redeemScriptParser.getP2shErpRedeemScript(publicKeys, emergencyBtcPublicKeys, -1)).to.throw(ERROR_MESSAGES.INVALID_CSV_VALUE);
        expect(() => redeemScriptParser.getP2shErpRedeemScript(publicKeys, emergencyBtcPublicKeys, MAX_CSV_VALUE + 1)).to.throw(ERROR_MESSAGES.INVALID_CSV_VALUE);
    });

    it('should return a valid p2sh erp redeem script', () => {
        const p2shErpRedeemScript = redeemScriptParser.getP2shErpRedeemScript(publicKeys, emergencyBtcPublicKeys, csvValue).toString('hex');
        validateP2shErpRedeemScriptFormat(p2shErpRedeemScript, publicKeys, emergencyBtcPublicKeys, csvValue);
    });
});

describe('getFlyoverRedeemScript', () => {
    const dHash = crypto.randomBytes(32).toString('hex');
    const publicKeys = [getRandomPubkey(), getRandomPubkey()];
    const redeemScript = redeemScriptParser.getPowpegRedeemScript(publicKeys);

    it('should fail for invalid data', () => {
        // fail because there is no redeem script
        expect(() => redeemScriptParser.getFlyoverRedeemScript(null)).to.throw(ERROR_MESSAGES.INVALID_POWPEG_REDEEM_SCRIPT);
        expect(() => redeemScriptParser.getFlyoverRedeemScript(null, null)).to.throw(ERROR_MESSAGES.INVALID_POWPEG_REDEEM_SCRIPT);
        expect(() => redeemScriptParser.getFlyoverRedeemScript(null, dHash)).to.throw(ERROR_MESSAGES.INVALID_POWPEG_REDEEM_SCRIPT);
        expect(() => redeemScriptParser.getFlyoverRedeemScript('', dHash)).to.throw(ERROR_MESSAGES.INVALID_POWPEG_REDEEM_SCRIPT);
        expect(() => redeemScriptParser.getFlyoverRedeemScript('not-a-buffer', dHash)).to.throw(ERROR_MESSAGES.INVALID_POWPEG_REDEEM_SCRIPT);
        
        // fail because there is no derivation hash
        expect(() => redeemScriptParser.getFlyoverRedeemScript(redeemScript, null)).to.throw(ERROR_MESSAGES.INVALID_DHASH);
        expect(() => redeemScriptParser.getFlyoverRedeemScript(redeemScript, '')).to.throw(ERROR_MESSAGES.INVALID_DHASH);
        // a short hash
        expect(() => redeemScriptParser.getFlyoverRedeemScript(redeemScript, dHash.substring(1))).to.throw(ERROR_MESSAGES.INVALID_DHASH);
        // a long hash
        expect(() => redeemScriptParser.getFlyoverRedeemScript(redeemScript, dHash.concat('1'))).to.throw(ERROR_MESSAGES.INVALID_DHASH);
    });

    it('should return a valid flyover redeem script', () => {
        let flyoverRedeemScript = redeemScriptParser.getFlyoverRedeemScript(redeemScript, dHash).toString('hex');
        checkPubKeysIncludedInRedeemScript(publicKeys, flyoverRedeemScript);
        expect(flyoverRedeemScript.indexOf(dHash)).to.be.above(0);
    });
});

describe('getAddressFromRedeemSript', () => {
    it('should fail for invalid data', () => {
        expect(() => redeemScriptParser.getAddressFromRedeemScript()).to.throw(ERROR_MESSAGES.INVALID_NETWORK);
        expect(() => redeemScriptParser.getAddressFromRedeemScript(NETWORKS.MAINNET)).to.throw(ERROR_MESSAGES.INVALID_REDEEM_SCRIPT);
        expect(() => redeemScriptParser.getAddressFromRedeemScript(NETWORKS.MAINNET, 'not-a-buffer')).to.throw(ERROR_MESSAGES.INVALID_REDEEM_SCRIPT);
    });

    it('should generate a valid addreses', () => {
        // This is the regtest genesis powpeg address
        const pubKeys = [
            '02cd53fc53a07f211641a677d250f6de99caf620e8e77071e811a28b3bcddf0be1',
            '0362634ab57dae9cb373a5d536e66a8c4f67468bbcfb063809bab643072d78a124',
            '03c5946b3fbae03a654237da863c9ed534e0878657175b132b8ca630f245df04db',
        ];
        const expectedPowpegAddress = '2N5muMepJizJE1gR7FbHJU6CD18V3BpNF9p';
        let redeemScript = redeemScriptParser.getPowpegRedeemScript(pubKeys);
        expect(redeemScriptParser.getAddressFromRedeemScript(
            NETWORKS.REGTEST, 
            redeemScript
        )).to.be.eq(expectedPowpegAddress);
    });
});


describe('test raw RedeemScripts from file', () => {
    it('should return same redeemscript', () => {
        const testRawRedeemScript = (rawRedeemScript) => {
            const powpegP2shErpRedeemScript = redeemScriptParser.getP2shErpRedeemScript(rawRedeemScript.mainFed, rawRedeemScript.emergencyFed, rawRedeemScript.timelock).toString('hex');
            return rawRedeemScript.script == powpegP2shErpRedeemScript;
        }
        expect(rawRedeemScripts.every(testRawRedeemScript)).to.be.true;
    });
});

describe('test numberToHexStringLE utility method', () => {
    it('should convert numbers to hex string in little endian format', () => {
        const numbersArray = [32, 64, 123, 127, 128, 58766, 51138, 14907, 2149, 44175];
        const expectedNumbersInHexStringLE = ["20", "40", "7b", "7f", "8000", "8ee500", "c2c700", "3b3a", "6508", "8fac00"];

        for (let i = 0; i < numbersArray.length; i++) {
            expect(signedNumberToHexStringLE(numbersArray[i])).to.be.eq(expectedNumbersInHexStringLE[i]);
        }
    });
});
