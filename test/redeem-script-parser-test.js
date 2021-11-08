const redeemScriptParser = require('../index');
const crypto = require('crypto');
const opcodes = require('bitcoinjs-lib').script.OPS;
const EcPair = require('bitcoinjs-lib').ECPair;
const expect = require('chai').expect;

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
    // Second to last byte is OP_ENDIF
    expect(erpRedeemScript.slice(-4).substring(0,2)).to.be.eq(decimalToHexString(opcodes.OP_ENDIF));
    // Last byte is OP_CHECKMULTISIG
    expect(erpRedeemScript.slice(-2)).to.be.eq(decimalToHexString(opcodes.OP_CHECKMULTISIG));
    
    // Public keys should be in the redeem script
    checkPubKeysIncludedInRedeemScript(pubKeys, erpRedeemScript);
    checkPubKeysIncludedInRedeemScript(erpPubKeys, erpRedeemScript);

    //TODO Check valid format of the rest of the erp redeem script (standard redeem script included, csv value, op_else, op_pushbytes, etc)
}

describe('getPowpegRedeemScript', () => {
    it ('should fail for invalid data', () => {
        expect(() => redeemScriptParser.getPowpegRedeemScript(null)).to.throw();
        expect(() => redeemScriptParser.getPowpegRedeemScript('a-string')).to.throw();
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

describe('getErpRedeemScript', () => {
    it('fails for invalid data', () => {
        expect(() => redeemScriptParser.getErpRedeemScript()).to.throw();
        expect(() => redeemScriptParser.getErpRedeemScript('nothing')).to.throw();
        expect(() => redeemScriptParser.getErpRedeemScript([getRandomPubkey()], null, null)).to.throw();
    });

    it('should return a valid erp redeem script', () => {
        let pubKeys = [
            getRandomPubkey(),
            getRandomPubkey(),
            getRandomPubkey()
        ];
        let erpPubKeys = [
            getRandomPubkey(),
            getRandomPubkey(),
        ];
        let csvValue = 'cd50';
        let erpRedeemScript = redeemScriptParser.getErpRedeemScript(pubKeys, erpPubKeys, csvValue).toString('hex');

        validateErpRedeemScriptFormat(erpRedeemScript, pubKeys, erpPubKeys);
    });
});

describe('getFlyoverRedeemScript', () => {
    it('should fail for invalid data', () => {
        expect(() => redeemScriptParser.getFlyoverRedeemScript(null)).to.throw();
        expect(() => redeemScriptParser.getFlyoverRedeemScript([getRandomPubkey()])).to.throw();
        // a short hash
        expect(() => redeemScriptParser.getFlyoverRedeemScript([getRandomPubkey()], [getRandomPubkey()], '9', crypto.randomBytes(1).toString('hex'))).to.throw;
        // a long hash
        expect(() => redeemScriptParser.getFlyoverRedeemScript([getRandomPubkey()], [getRandomPubkey()], 'a', crypto.randomBytes(33).toString('hex'))).to.throw;
    });

    it('should return a valid flyover redeem script', () => {
        let pubKeys = [getRandomPubkey(), getRandomPubkey()];
        let dHash = crypto.randomBytes(32).toString('hex');
        let redeemScript = redeemScriptParser.getFlyoverRedeemScript(pubKeys, dHash).toString('hex');
        checkPubKeysIncludedInRedeemScript(pubKeys, redeemScript);
        expect(redeemScript.indexOf(dHash)).to.be.above(0);
    });
});

describe('getFlyoverErpRedeemScript', () => {
    it('should fail for invalid data', () => {
        // fail because there is no derivation hash
        expect(() => redeemScriptParser.getFlyoverErpRedeemScript()).to.throw();
        // fail because there is no network
        expect(() => redeemScriptParser.getFlyoverErpRedeemScript(
            undefined, 
            undefined, 
            crypto.randomBytes(32).toString('hex')
        )).to.throw();
        // fail because there is no public keys
        expect(() => redeemScriptParser.getFlyoverErpRedeemScript(
            undefined, 
            undefined, 
            'a', 
            crypto.randomBytes(32).toString('hex'))
        ).to.throw();
    });

    it('should return a valid flyover erp redeem script', () => {
        let pubKeys = [
            getRandomPubkey(),
            getRandomPubkey(),
            getRandomPubkey()
        ];
        let erpPubKeys = [
            getRandomPubkey(),
            getRandomPubkey(),
        ];
        let csvValue = 'cd50';
        let dHash = crypto.randomBytes(32).toString('hex');
        let redeemScript = redeemScriptParser.getFlyoverErpRedeemScript(pubKeys, erpPubKeys, csvValue, dHash).toString('hex');
        checkPubKeysIncludedInRedeemScript(pubKeys, redeemScript);
        checkPubKeysIncludedInRedeemScript(erpPubKeys, redeemScript);
        expect(redeemScript.indexOf(csvValue)).to.be.above(0);
        expect(redeemScript.indexOf(dHash)).to.be.above(0);
    });
});

describe('getAddressFromRedeemSript', () => {
    it('should fail for invalid data', () => {
        expect(() => redeemScriptParser.getAddressFromRedeemSript()).to.throw();
        expect(() => redeemScriptParser.getAddressFromRedeemSript(redeemScriptParser.NETWORKS.MAINNET)).to.throw();
        expect(() => redeemScriptParser.getAddressFromRedeemSript(redeemScriptParser.NETWORKS.MAINNET, 'not-a-buffer')).to.throw();
    });

    it('should generate a valid addreses', () => {
        // This is the regtest genesis powpeg address
        let pubKeys = [
            '02cd53fc53a07f211641a677d250f6de99caf620e8e77071e811a28b3bcddf0be1',
            '0362634ab57dae9cb373a5d536e66a8c4f67468bbcfb063809bab643072d78a124',
            '03c5946b3fbae03a654237da863c9ed534e0878657175b132b8ca630f245df04db',
        ];
        let expectedPowpegAddress = '2N5muMepJizJE1gR7FbHJU6CD18V3BpNF9p';
        let redeemScript = redeemScriptParser.getPowpegRedeemScript(pubKeys);
        expect(redeemScriptParser.getAddressFromRedeemSript(redeemScriptParser.NETWORKS.REGTEST, redeemScript)).to.be.eq(expectedPowpegAddress);
    });
});
