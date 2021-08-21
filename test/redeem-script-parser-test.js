const redeemScriptParser = require('../index');
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

describe('getPowpegRedeemScript', () => {
    it ('should fail for invalid data', () => {
        expect(() => redeemScriptParser.getPowpegRedeemScript(null)).to.throw;
        expect(() => redeemScriptParser.getPowpegRedeemScript('a-string')).to.throw;
    });

    it('should return a valid redeem script', () => {
        let pks = [
            '02cd53fc53a07f211641a677d250f6de99caf620e8e77071e811a28b3bcddf0be1',
            '0362634ab57dae9cb373a5d536e66a8c4f67468bbcfb063809bab643072d78a124',
            '03c5946b3fbae03a654237da863c9ed534e0878657175b132b8ca630f245df04db',
        ];
        let rs = redeemScriptParser.getPowpegRedeemScript(pks).toString('hex');
        // First byte is M (pks.length / 2 + 1)
        expect(rs.substring(0,2)).to.be.eq(decimalToHexString(opcodes.OP_2));
        // Second to last byte is N (pks.length)
        expect(rs.slice(-4).substring(0,2)).to.be.eq(decimalToHexString(opcodes.OP_3));
        // Public keys should be in the redeem script
        checkPksIncludedInRedeemScript(pks, rs);

        // Sort descending
        pks = pks.sort((a, b) => b > a);
        let otherRs = redeemScriptParser.getPowpegRedeemScript(pks).toString('hex');
        expect(rs).to.be.eq(otherRs);
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
            redeemScriptParser.NETWORKS.MAINNET, 
            undefined, 
            crypto.randomBytes(32).toString('hex'))
        ).to.throw();
    });

    it('should return a valid redeem script', () => {
        let pks = [getRandomPubkey(), getRandomPubkey()];
        let dHash = crypto.randomBytes(32).toString('hex');
        let rs = redeemScriptParser.getFlyoverErpRedeemScript(
            redeemScriptParser.NETWORKS.MAINNET,
            pks, 
            dHash
        ).toString('hex');
        checkPksIncludedInRedeemScript(pks, rs);
        expect(rs.indexOf(dHash)).to.be.above(0);
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
        let pks = [
            '02cd53fc53a07f211641a677d250f6de99caf620e8e77071e811a28b3bcddf0be1',
            '0362634ab57dae9cb373a5d536e66a8c4f67468bbcfb063809bab643072d78a124',
            '03c5946b3fbae03a654237da863c9ed534e0878657175b132b8ca630f245df04db',
        ];
        let expectedPowpegAddress = '2N5muMepJizJE1gR7FbHJU6CD18V3BpNF9p';
        let rs = redeemScriptParser.getPowpegRedeemScript(pks);
        expect(redeemScriptParser.getAddressFromRedeemSript(redeemScriptParser.NETWORKS.REGTEST, rs)).to.be.eq(expectedPowpegAddress);
    });
});
