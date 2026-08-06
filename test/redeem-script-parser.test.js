const redeemScriptParser = require('../index');
const expect = require('chai').expect;
const { ERROR_MESSAGES, MAX_CSV_VALUE } = require('../constants');
const rawRedeemScripts = require('./resources/test-redeem-scripts.json');
const { OPS: opcodes, signedNumberToHexStringLE, hexToDecimal, numberToHexString } = require('../utils');

// Compiles a single push of an arbitrary-length buffer, for constructing
// test-only script fixtures without a Bitcoin script-encoding dependency.
// Only handles direct pushes (buffers under 76 bytes), which is all these tests need.
const pushBuffer = (buffer) => Buffer.concat([Buffer.from([buffer.length]), buffer]);

// Deterministic compressed-pubkey-shaped (33-byte) hex strings, for exercising the
// 1-20 public key count boundary. buildStandardMultiSigRedeemScript only checks
// count and length here, not whether they're real EC points.
const dummyPubKeys = (count) => Array.from(
    { length: count },
    (_, i) => Buffer.concat([Buffer.from([0x02]), Buffer.alloc(32, i + 1)]).toString('hex')
);

// Deterministic powpeg public keys (generated with seeds segwitFed1..3)
const POWPEG_PUBLIC_KEYS = [
    '02543951140f6349680d84e51ef02d3a333b86c682018f7d02e70c0c6bf835d230',
    '0375aef5f2ffd2753118b699ed75274008bc120ba07bbbd6b0307899482f664366',
    '038acb7b10e27d9dab86fb1c633757ac3e34e04e8bbd69c066cad22266598238b8'
];

// ERP (emergency) public keys
const ERP_PUBKEYS = [
    '0257c293086c4d4fe8943deda5f890a37d11bebd140e220faa76258a41d077b4d4',
    '03c2660a46aa73078ee6016dee953488566426cf55fc8011edd0085634d75395f9',
    '03cd3e383ec6e12719a6c69515e5559bcbe037d0aa24c187e1e26ce932e22ad7b3',
    '02370a9838e4d15708ad14a104ee5606b36caaaaf739d833e67770ce9fd9b3ec80'
];

// Mainnet ERP CSV value
const ERP_CSV_VALUE = 52_560;

// Deterministic 32-byte flyover derivation hash (64 hex chars)
const DERIVATION_HASH = 'ca28b7f4c28bed28b1a38876a292993754f8f3f22b974be5975a4110a7010d3f';

const checkPubKeysIncludedInRedeemScript = (pubKeys, redeemScript) => {
    for (let pubKey of pubKeys) {
        expect(redeemScript.indexOf(pubKey.toString('hex'))).to.be.above(0);
    }
};

// Asserts that redeemScript encodes `num` (a multisig M or N value) starting at `position`,
// mirroring encodeMultisigNumber: a single OP_N opcode for 1-16, or a minimally-encoded
// data push for 17-20 (there's no OP_17..OP_20). Returns the position after the chunk.
const assertMultisigNumber = (redeemScript, position, num) => {
    if (num <= 16) {
        // OP_1..OP_16 are 0x51..0x60
        expect(redeemScript.subarray(position, position + 1).toString('hex'))
            .to.be.eq((0x50 + num).toString(16));
        return position + 1;
    }
    // 17-20: no opcode, so a 1-byte data push
    expect(redeemScript.subarray(position, position + 2).toString('hex'))
        .to.be.eq('01' + num.toString(16));
    return position + 2;
};

const validateRedeemScriptFormat = (redeemScript, pubKeys, erpPubKeys, csvValue) => {
    const M = parseInt(pubKeys.length / 2) + 1;
    const N = pubKeys.length;

    const ERP_M = parseInt(erpPubKeys.length / 2) + 1;
    const ERP_N = erpPubKeys.length;

    let position = 1;
    //  First byte is OP_NOTIF
    expect(redeemScript.subarray(0, position).toString('hex')).to.be.eq(numberToHexString(opcodes.OP_NOTIF));
    position = assertMultisigNumber(redeemScript, position, M);

    // Check Publickeys in redeem script
    for (let i = 0; i < pubKeys.length; i++) {
        let pubKeyLengthHex = redeemScript.subarray(position, ++position).toString('hex');
        let pubKeyLength = hexToDecimal(pubKeyLengthHex);
        let pubKey = redeemScript.subarray(position, position + pubKeyLength).toString('hex');
        expect(pubKeys).to.include(pubKey);
        position = position + pubKeyLength;
    }

    position = assertMultisigNumber(redeemScript, position, N);
    expect(redeemScript.subarray(position, ++position).toString('hex')).to.be.eq(numberToHexString(opcodes.OP_CHECKMULTISIG));
    expect(redeemScript.subarray(position, ++position).toString('hex')).to.be.eq(numberToHexString(opcodes.OP_ELSE));
    const csvValuePushBytes = signedNumberToHexStringLE(csvValue).length / 2;
    expect(redeemScript.subarray(position, ++position).toString('hex')).to.be.eq(`0${csvValuePushBytes}`);
    const csvValueOffset = position + csvValuePushBytes;
    expect(redeemScript.subarray(position, csvValueOffset).toString('hex')).to.be.eq(signedNumberToHexStringLE(csvValue));
    position = csvValueOffset;
    expect(redeemScript.subarray(position, ++position).toString('hex')).to.be.eq(numberToHexString(opcodes.OP_CHECKSEQUENCEVERIFY));
    expect(redeemScript.subarray(position, ++position).toString('hex')).to.be.eq(numberToHexString(opcodes.OP_DROP));
    position = assertMultisigNumber(redeemScript, position, ERP_M);

    // Check ERP Publickeys in redeem script
    for (let i = 0; i < erpPubKeys.length; i++) {
        let pubKeyLengthHex = redeemScript.subarray(position, ++position).toString('hex');
        let pubKeyLength = hexToDecimal(pubKeyLengthHex);
        let pubKey = redeemScript.subarray(position, position + pubKeyLength).toString('hex');
        expect(erpPubKeys).to.include(pubKey);
        position = position + pubKeyLength;
    }

    position = assertMultisigNumber(redeemScript, position, ERP_N);
    expect(redeemScript.subarray(position, ++position).toString('hex')).to.be.eq(numberToHexString(opcodes.OP_CHECKMULTISIG));
    //  Last byte is OP_ENDIF
    expect(redeemScript.subarray(position, ++position).toString('hex')).to.be.eq(numberToHexString(opcodes.OP_ENDIF));
}

describe('buildPowpegRedeemScript', () => {

    it('fails for invalid data', () => {
        // fail because there are no powpeg public keys
        expect(() => redeemScriptParser.buildPowpegRedeemScript()).to.throw(ERROR_MESSAGES.INVALID_POWPEG_PUBLIC_KEYS);
        expect(() => redeemScriptParser.buildPowpegRedeemScript(null)).to.throw(ERROR_MESSAGES.INVALID_POWPEG_PUBLIC_KEYS);
        expect(() => redeemScriptParser.buildPowpegRedeemScript('nothing')).to.throw(ERROR_MESSAGES.INVALID_POWPEG_PUBLIC_KEYS);
        expect(() => redeemScriptParser.buildPowpegRedeemScript(null, null, null)).to.throw(ERROR_MESSAGES.INVALID_POWPEG_PUBLIC_KEYS);

        // fail because there are no erp public keys
        expect(() => redeemScriptParser.buildPowpegRedeemScript(POWPEG_PUBLIC_KEYS, null, null)).to.throw(ERROR_MESSAGES.INVALID_EMERGENCY_PUBLIC_KEYS);
        expect(() => redeemScriptParser.buildPowpegRedeemScript(POWPEG_PUBLIC_KEYS, '', null)).to.throw(ERROR_MESSAGES.INVALID_EMERGENCY_PUBLIC_KEYS);
        expect(() => redeemScriptParser.buildPowpegRedeemScript(POWPEG_PUBLIC_KEYS, POWPEG_PUBLIC_KEYS[0], null)).to.throw(ERROR_MESSAGES.INVALID_EMERGENCY_PUBLIC_KEYS);

        // fail because there is no csv value
        expect(() => redeemScriptParser.buildPowpegRedeemScript(POWPEG_PUBLIC_KEYS, ERP_PUBKEYS, null)).to.throw(ERROR_MESSAGES.INVALID_CSV_VALUE);
        expect(() => redeemScriptParser.buildPowpegRedeemScript(POWPEG_PUBLIC_KEYS, ERP_PUBKEYS, '')).to.throw(ERROR_MESSAGES.INVALID_CSV_VALUE);

        // fail because the csv value is invalid
        expect(() => redeemScriptParser.buildPowpegRedeemScript(POWPEG_PUBLIC_KEYS, ERP_PUBKEYS, "12345")).to.throw(ERROR_MESSAGES.INVALID_CSV_VALUE);
        expect(() => redeemScriptParser.buildPowpegRedeemScript(POWPEG_PUBLIC_KEYS, ERP_PUBKEYS, 0)).to.throw(ERROR_MESSAGES.INVALID_CSV_VALUE);
        expect(() => redeemScriptParser.buildPowpegRedeemScript(POWPEG_PUBLIC_KEYS, ERP_PUBKEYS, -1)).to.throw(ERROR_MESSAGES.INVALID_CSV_VALUE);
        expect(() => redeemScriptParser.buildPowpegRedeemScript(POWPEG_PUBLIC_KEYS, ERP_PUBKEYS, MAX_CSV_VALUE + 1)).to.throw(ERROR_MESSAGES.INVALID_CSV_VALUE);
        expect(() => redeemScriptParser.buildPowpegRedeemScript(POWPEG_PUBLIC_KEYS, ERP_PUBKEYS, ERP_CSV_VALUE - 0.5)).to.throw(ERROR_MESSAGES.INVALID_CSV_VALUE);
    });

    it('fails for an invalid public key count', () => {
        // fails because there are no powpeg public keys
        expect(() => redeemScriptParser.buildPowpegRedeemScript([], ERP_PUBKEYS, ERP_CSV_VALUE)).to.throw(ERROR_MESSAGES.INVALID_PUBLIC_KEYS_COUNT);
        // fails because there are too many powpeg public keys (OP_CHECKMULTISIG caps at 20)
        expect(() => redeemScriptParser.buildPowpegRedeemScript(dummyPubKeys(21), ERP_PUBKEYS, ERP_CSV_VALUE)).to.throw(ERROR_MESSAGES.INVALID_PUBLIC_KEYS_COUNT);
        // fails because there are no erp public keys
        expect(() => redeemScriptParser.buildPowpegRedeemScript(POWPEG_PUBLIC_KEYS, [], ERP_CSV_VALUE)).to.throw(ERROR_MESSAGES.INVALID_PUBLIC_KEYS_COUNT);
        // fails because there are too many erp public keys
        expect(() => redeemScriptParser.buildPowpegRedeemScript(POWPEG_PUBLIC_KEYS, dummyPubKeys(21), ERP_CSV_VALUE)).to.throw(ERROR_MESSAGES.INVALID_PUBLIC_KEYS_COUNT);
    });

    it('should return a valid redeem script at the 16 public key boundary', () => {
        const powpegKeys = dummyPubKeys(16);
        const erpKeys = dummyPubKeys(16);
        const redeemScript = redeemScriptParser.buildPowpegRedeemScript(powpegKeys, erpKeys, ERP_CSV_VALUE);
        validateRedeemScriptFormat(redeemScript, powpegKeys, erpKeys, ERP_CSV_VALUE);
    });

    it('should return a valid redeem script for 17 public keys (no single-opcode N encoding above 16)', () => {
        // N=17 falls outside OP_1..OP_16 and need the minimally-encoded data push
        const powpegKeys = dummyPubKeys(17);
        const erpKeys = dummyPubKeys(4);
        const redeemScript = redeemScriptParser.buildPowpegRedeemScript(powpegKeys, erpKeys, ERP_CSV_VALUE);
        validateRedeemScriptFormat(redeemScript, powpegKeys, erpKeys, ERP_CSV_VALUE);
    });

    it('should return a valid redeem script for 20 public keys (max public key count)', () => {
        // N=20 falls outside OP_1..OP_16 and need the minimally-encoded data push
        const powpegKeys = dummyPubKeys(20);
        const erpKeys = dummyPubKeys(4);
        const redeemScript = redeemScriptParser.buildPowpegRedeemScript(powpegKeys, erpKeys, ERP_CSV_VALUE);
        validateRedeemScriptFormat(redeemScript, powpegKeys, erpKeys, ERP_CSV_VALUE);
    });

    it('should return a valid powpeg redeem script', () => {
        const redeemScript = redeemScriptParser.buildPowpegRedeemScript(POWPEG_PUBLIC_KEYS, ERP_PUBKEYS, ERP_CSV_VALUE);
        validateRedeemScriptFormat(redeemScript, POWPEG_PUBLIC_KEYS, ERP_PUBKEYS, ERP_CSV_VALUE);
    });

    it('should return a valid powpeg redeem script passing public keys in a Buffer array', () => {
        const publicKeysBuffer = POWPEG_PUBLIC_KEYS.map(hex => Buffer.from(hex, 'hex'));
        const emergencyBtcPublicKeysBuffer = ERP_PUBKEYS.map(hex => Buffer.from(hex, 'hex'));
        const redeemScript = redeemScriptParser.buildPowpegRedeemScript(publicKeysBuffer, emergencyBtcPublicKeysBuffer, ERP_CSV_VALUE);
        validateRedeemScriptFormat(redeemScript, POWPEG_PUBLIC_KEYS, ERP_PUBKEYS, ERP_CSV_VALUE);
    });
});

describe('buildFlyoverRedeemScript', () => {
    const redeemScript = redeemScriptParser.buildPowpegRedeemScript(POWPEG_PUBLIC_KEYS, ERP_PUBKEYS, ERP_CSV_VALUE);

    it('should fail for invalid data', () => {
        // fail because there is no redeem script
        expect(() => redeemScriptParser.buildFlyoverRedeemScript(null)).to.throw(ERROR_MESSAGES.INVALID_REDEEM_SCRIPT);
        expect(() => redeemScriptParser.buildFlyoverRedeemScript(null, null)).to.throw(ERROR_MESSAGES.INVALID_REDEEM_SCRIPT);
        expect(() => redeemScriptParser.buildFlyoverRedeemScript(null, DERIVATION_HASH)).to.throw(ERROR_MESSAGES.INVALID_REDEEM_SCRIPT);
        expect(() => redeemScriptParser.buildFlyoverRedeemScript('', DERIVATION_HASH)).to.throw(ERROR_MESSAGES.INVALID_REDEEM_SCRIPT);
        expect(() => redeemScriptParser.buildFlyoverRedeemScript('not-a-buffer', DERIVATION_HASH)).to.throw(ERROR_MESSAGES.INVALID_REDEEM_SCRIPT);

        // fail because there is no derivation hash
        expect(() => redeemScriptParser.buildFlyoverRedeemScript(redeemScript, null)).to.throw(ERROR_MESSAGES.INVALID_DHASH);
        expect(() => redeemScriptParser.buildFlyoverRedeemScript(redeemScript, '')).to.throw(ERROR_MESSAGES.INVALID_DHASH);
        // a short hash
        expect(() => redeemScriptParser.buildFlyoverRedeemScript(redeemScript, DERIVATION_HASH.substring(1))).to.throw(ERROR_MESSAGES.INVALID_DHASH);
        // a long hash
        expect(() => redeemScriptParser.buildFlyoverRedeemScript(redeemScript, DERIVATION_HASH.concat('1'))).to.throw(ERROR_MESSAGES.INVALID_DHASH);
        // right length, but not valid hex
        expect(() => redeemScriptParser.buildFlyoverRedeemScript(redeemScript, 'g'.repeat(64))).to.throw(ERROR_MESSAGES.INVALID_DHASH);
    });

    it('should return a valid flyover redeem script', () => {
        let flyoverRedeemScript = redeemScriptParser.buildFlyoverRedeemScript(redeemScript, DERIVATION_HASH).toString('hex');
        checkPubKeysIncludedInRedeemScript(POWPEG_PUBLIC_KEYS, flyoverRedeemScript);
        expect(flyoverRedeemScript.indexOf(DERIVATION_HASH)).to.be.above(0);
    });
});

describe('test raw RedeemScripts from file', () => {
    it('should return same redeemscript', () => {
        const testAndValidateRawRedeemScript = (rawRedeemScript) => {
            validateRedeemScriptFormat(Buffer.from(rawRedeemScript.script, 'hex'), rawRedeemScript.mainFed, rawRedeemScript.emergencyFed, rawRedeemScript.timelock);
            const powpegRedeemScript = redeemScriptParser.buildPowpegRedeemScript(rawRedeemScript.mainFed, rawRedeemScript.emergencyFed, rawRedeemScript.timelock).toString('hex');
            return rawRedeemScript.script === powpegRedeemScript;
        }
        expect(rawRedeemScripts.every(testAndValidateRawRedeemScript)).to.be.true;
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

describe('flyover redeem scripts', () => {
    const powpegRedeemScript = redeemScriptParser.buildPowpegRedeemScript(POWPEG_PUBLIC_KEYS, ERP_PUBKEYS, ERP_CSV_VALUE);
    const flyoverRedeemScript = redeemScriptParser.buildFlyoverRedeemScript(powpegRedeemScript, DERIVATION_HASH);

    describe('isFlyoverRedeemScript', () => {
        it('returns true for a flyover redeem script', () => {
            expect(redeemScriptParser.isFlyoverRedeemScript(flyoverRedeemScript)).to.be.true;
        });

        it('returns false for a non-flyover redeem script', () => {
            expect(redeemScriptParser.isFlyoverRedeemScript(powpegRedeemScript)).to.be.false;
        });

        it('fails for a non-Buffer redeem script', () => {
            expect(() => redeemScriptParser.isFlyoverRedeemScript('not-a-buffer')).to.throw(ERROR_MESSAGES.INVALID_REDEEM_SCRIPT);
        });

        it('returns false for scripts that are not flyover-shaped', () => {
            // too short to even contain the 34-byte prefix
            expect(redeemScriptParser.isFlyoverRedeemScript(Buffer.from('4c', 'hex'))).to.be.false;
            expect(redeemScriptParser.isFlyoverRedeemScript(Buffer.from('51', 'hex'))).to.be.false;
            // long enough, but the first push is not 32 bytes (33, not 32)
            expect(redeemScriptParser.isFlyoverRedeemScript(Buffer.concat([pushBuffer(Buffer.alloc(33)), Buffer.from([opcodes.OP_DROP, opcodes.OP_NOTIF])]))).to.be.false;
            // 32-byte first push, long enough, but the second chunk is not OP_DROP
            expect(redeemScriptParser.isFlyoverRedeemScript(Buffer.concat([pushBuffer(Buffer.alloc(32)), Buffer.from([opcodes.OP_NOTIF, opcodes.OP_NOTIF])]))).to.be.false;
        });
    });

    describe('removeFlyoverPrefix', () => {
        it('removeFlyoverPrefix returns the underlying powpeg redeem script', () => {
            expect(redeemScriptParser.removeFlyoverPrefix(flyoverRedeemScript).equals(powpegRedeemScript)).to.be.true;
        });

        it('removeFlyoverPrefix fails for a non-flyover redeem script', () => {
            expect(() => redeemScriptParser.removeFlyoverPrefix(powpegRedeemScript)).to.throw(
                ERROR_MESSAGES.NOT_A_FLYOVER_REDEEM_SCRIPT
            );
        });
    });
});
