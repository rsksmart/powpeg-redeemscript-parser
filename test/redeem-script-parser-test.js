const redeemScriptParser = require('../redeem-script-parser');
const crypto = require('crypto');
const opcodes = require('bitcoinjs-lib').script.OPS;
const EcPair = require('bitcoinjs-lib').ECPair;
const expect = require('chai').expect;

const getRandomPubkey = () =>  EcPair.makeRandom().publicKey;
const decimalToHexString = (number) => number.toString(16);

const checkPksIncludedInRedeemScript = (pks, rs) => {
    for (let pk of pks) {
        expect(rs.indexOf(pk.toString('hex'))).to.be.above(0);
    }
};

describe('getFederationRedeemScript', () => {
    it ('should fail for invalid data', () => {
        expect(() => redeemScriptParser.getFederationRedeemScript(null)).to.throw;
        expect(() => redeemScriptParser.getFederationRedeemScript('a-string')).to.throw;
    });

    it('should return a valid redeem script', () => {
        let pks = [
            getRandomPubkey(),
            getRandomPubkey(),
            getRandomPubkey(),
        ];
        let rs = redeemScriptParser.getFederationRedeemScript(pks).toString('hex');
        // First byte is M (pks.length / 2 + 1)
        expect(rs.substring(0,2)).to.be.eq(decimalToHexString(opcodes.OP_2));
        // Second to last byte is N (pks.length)
        expect(rs.slice(-4).substring(0,2)).to.be.eq(decimalToHexString(opcodes.OP_3));
        // Public keys should be in the redeem script
        checkPksIncludedInRedeemScript(pks, rs);
    });
});

describe('getErpRedeemScript', () => {
    it('fails for invalid data', () => {
        expect(() => redeemScriptParser.getErpRedeemScript()).to.throw();
        expect(() => redeemScriptParser.getErpRedeemScript('not-a-network')).to.throw();
        expect(() => redeemScriptParser.getErpRedeemScript(redeemScriptParser.NETWORKS.MAINNET, null)).to.throw();
    });
    it('should return a valid redeem script', () => {
        let pks = [
            getRandomPubkey(),
            getRandomPubkey(),
            getRandomPubkey(),
        ];
        let rs = redeemScriptParser.getErpRedeemScript(redeemScriptParser.NETWORKS.MAINNET, pks).toString('hex');
        // Public keys should be in the redeem script
        checkPksIncludedInRedeemScript(pks, rs);
    });
});

describe('getFlyoverRedeemScript', () => {
    it('should fail for invalid data', () => {
        expect(() => redeemScriptParser.getFlyoverRedeemScript(null)).to.throw();
        expect(() => redeemScriptParser.getFlyoverRedeemScript([getRandomPubkey()])).to.throw();
        // a short hash
        expect(() => redeemScriptParser.getFlyoverRedeemScript([getRandomPubkey()], crypto.randomBytes(1).toString('hex'))).to.throw;
        // a long hash
        expect(() => redeemScriptParser.getFlyoverRedeemScript([getRandomPubkey()], crypto.randomBytes(33).toString('hex'))).to.throw;
    });

    it('should return a valid redeem script', () => {
        let pks = [getRandomPubkey(), getRandomPubkey()];
        let dHash = crypto.randomBytes(32).toString('hex');
        let rs = redeemScriptParser.getFlyoverRedeemScript(pks, dHash).toString('hex');
        checkPksIncludedInRedeemScript(pks, rs);
        expect(rs.indexOf(dHash)).to.be.above(0);
    });
});
