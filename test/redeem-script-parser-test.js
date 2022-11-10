const redeemScriptParser = require('../index');
const crypto = require('crypto');
const opcodes = require('bitcoinjs-lib').script.OPS;
const EcPair = require('bitcoinjs-lib').ECPair;
const expect = require('chai').expect;
const { NETWORKS, ERROR_MESSAGES } = require('../constants');

const getRandomPubkey = () =>  EcPair.makeRandom().publicKey;
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

const validateErpRedeemScriptFormat = (erpRedeemScript, pubKeys, erpPubKeys) => {
    // First byte is OP_NOTIF
    expect(erpRedeemScript.substring(0,2)).to.be.eq(decimalToHexString(opcodes.OP_NOTIF));
    // Second to last byte is OP_CHECKMULTISIG
    expect(erpRedeemScript.slice(-4).substring(0,2)).to.be.eq(decimalToHexString(opcodes.OP_CHECKMULTISIG));
    // Last byte is OP_ENDIF
    expect(erpRedeemScript.slice(-2)).to.be.eq(decimalToHexString(opcodes.OP_ENDIF));
    
    // Public keys should be in the redeem script
    checkPubKeysIncludedInRedeemScript(pubKeys, erpRedeemScript);
    checkPubKeysIncludedInRedeemScript(erpPubKeys, erpRedeemScript);

    //TODO Check valid format of the rest of the erp redeem script (standard redeem script included, csv value, op_else, op_pushbytes, etc)
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
    const p2shErpBtcPublicKeys = [
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
        expect(() => redeemScriptParser.getP2shErpRedeemScript(publicKeys, p2shErpBtcPublicKeys, null)).to.throw(ERROR_MESSAGES.INVALID_CSV_VALUE);
        expect(() => redeemScriptParser.getP2shErpRedeemScript(publicKeys, p2shErpBtcPublicKeys, '')).to.throw(ERROR_MESSAGES.INVALID_CSV_VALUE);
    });

    it('should return a valid p2sh erp redeem script', () => {
        const p2shErpRedeemScript = redeemScriptParser.getP2shErpRedeemScript(publicKeys, p2shErpBtcPublicKeys, csvValue).toString('hex');
        validateErpRedeemScriptFormat(p2shErpRedeemScript, publicKeys, p2shErpBtcPublicKeys);
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
