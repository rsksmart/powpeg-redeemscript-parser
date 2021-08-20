const redeemScriptParser = require('../redeem-script-parser');
const bitcoin = require('bitcoinjs-lib');
const expect = require('chai').expect;

const PUBKEYS_LIST = [ 
    '02ed3bace23c5e17652e174c835fb72bf53ee306b3406a26890221b4cef7500f88',
    '0385a7b790fc9d962493788317e4874a4ab07f1e9c78c773c47f2f6c96df756f05',
    '03cd5a3be41717d65683fe7a9de8ae5b4b8feced69f26a8b55eeefbcc2e74b75fb',
  ];

const ERP_PUBKEYS_LIST = [
    '02cfd70505faacd3caf4419000bf4b6ab9e7dc2e4bcf43bbcaa550839cf4713b42',
    '02ed8fb84ea356e8571e6de009ab1584b65d7e864911cf1792cd3d49a8e116bcf0',
    '0314a4b6e04384dabd15f1a3c8b0beeb6c1328213abb7232407340c277ad792a3a',
    '03bf1a1f6d7f73b09d03efbd73eb9ea2c623e179119063489b42fb13037b53fce4',
    '03d902ff7196ddc842ef5b4ea5d0aa17608e9b7f5f9a964ba1281cd432a7abe2e9'  
];

const DERIVATION_ARGS_HASH = bitcoin.crypto.sha256(Buffer.alloc(1)).toString('hex');
const CSV_VALUE = "00c8";

// TODO: redesign tests following new code structure and functionalities
describe.skip('redeemScriptParser', function() {
    it('should return expected fast bridge redeem script', async() => {
        let obtainedFastBridgeRedeemScript = redeemScriptParser.getFastBridgeRedeemScript(PUBKEYS_LIST, DERIVATION_ARGS_HASH);
        let expectedFastBridgeRedeemScript = 
        "206e340b9cffb37a989ca544e6bb780a2c78901d3fb33738768511a30617afa01d75522102ed3bac" + 
        "e23c5e17652e174c835fb72bf53ee306b3406a26890221b4cef7500f88210385a7b790fc9d962493" + 
        "788317e4874a4ab07f1e9c78c773c47f2f6c96df756f052103cd5a3be41717d65683fe7a9de8ae5b" + 
        "4b8feced69f26a8b55eeefbcc2e74b75fb53ae";

        expect(obtainedFastBridgeRedeemScript.toString('hex')).equal(expectedFastBridgeRedeemScript);
    });

    it('should return expected fast bridge federation address', async() => {
        let fastBridgeRedeemScript = redeemScriptParser.getFastBridgeRedeemScript(PUBKEYS_LIST, DERIVATION_ARGS_HASH);
        let obtainedFastBridgeFederationAddress = redeemScriptParser.getAddressFromRedeemSript(fastBridgeRedeemScript);
        let expectedFastBridgeFederationAddress = "2MyTSK3enCt1iZUYEfu7QiVJA3DdWoLeiAY";

        expect(obtainedFastBridgeFederationAddress).equal(expectedFastBridgeFederationAddress);
    });

    it('should return expected ERP redeem script', async() => {
        let obtainedErpRedeemScript = redeemScriptParser.getErpRedeemScript(PUBKEYS_LIST, ERP_PUBKEYS_LIST, "00c8");
        let expectedErpRedeemScript = 
        "64522102ed3bace23c5e17652e174c835fb72bf53ee306b3406a26890221b4cef7500f88210385a7b79" +
        "0fc9d962493788317e4874a4ab07f1e9c78c773c47f2f6c96df756f052103cd5a3be41717d65683fe7a" + 
        "9de8ae5b4b8feced69f26a8b55eeefbcc2e74b75fb53670200c8b275532102cfd70505faacd3caf44190" +
        "00bf4b6ab9e7dc2e4bcf43bbcaa550839cf4713b422102ed8fb84ea356e8571e6de009ab1584b65d7e864" + 
        "911cf1792cd3d49a8e116bcf0210314a4b6e04384dabd15f1a3c8b0beeb6c1328213abb7232407340c277a" + 
        "d792a3a2103bf1a1f6d7f73b09d03efbd73eb9ea2c623e179119063489b42fb13037b53fce42103d902ff71" +
        "96ddc842ef5b4ea5d0aa17608e9b7f5f9a964ba1281cd432a7abe2e95568ae";

        expect(expectedErpRedeemScript).equal(obtainedErpRedeemScript.toString('hex'));
    });

    it('should return expected ERP address', async() => {
        let erpRedeemScript = redeemScriptParser.getErpRedeemScript(PUBKEYS_LIST, ERP_PUBKEYS_LIST, CSV_VALUE);
        let obtainedAddress = redeemScriptParser.getAddressFromRedeemSript(erpRedeemScript);
        let expectedAddress = "2N6CpkYqZBy7ikgznGn1J2J6PiuK1gQ7cd9";

        expect(expectedAddress).equal(obtainedAddress);
    });

    it('should return expected fast bridge ERP redeem script', async() => {
        let erpRedeemScript = redeemScriptParser.getErpRedeemScript(PUBKEYS_LIST, ERP_PUBKEYS_LIST, "00c8");
        let obtainedFastBridgeErpRedeemScript = redeemScriptParser.getFastBridgeErpRedeemScript(erpRedeemScript, DERIVATION_ARGS_HASH);
        let expectedErpRedeemScript = 
        "206e340b9cffb37a989ca544e6bb780a2c78901d3fb33738768511a30617afa01d7564522102ed3bace23c5e17652e17" +
        "4c835fb72bf53ee306b3406a26890221b4cef7500f88210385a7b790fc9d962493788317e4874a4ab07f1e9c78c773c4" +
        "7f2f6c96df756f052103cd5a3be41717d65683fe7a9de8ae5b4b8feced69f26a8b55eeefbcc2e74b75fb53670200c8b27" + 
        "5532102cfd70505faacd3caf4419000bf4b6ab9e7dc2e4bcf43bbcaa550839cf4713b422102ed8fb84ea356e8571e6de0" + 
        "09ab1584b65d7e864911cf1792cd3d49a8e116bcf0210314a4b6e04384dabd15f1a3c8b0beeb6c1328213abb7232407340" + 
        "c277ad792a3a2103bf1a1f6d7f73b09d03efbd73eb9ea2c623e179119063489b42fb13037b53fce42103d902ff7196ddc84" + 
        "2ef5b4ea5d0aa17608e9b7f5f9a964ba1281cd432a7abe2e95568ae";

        expect(expectedErpRedeemScript).equal(obtainedFastBridgeErpRedeemScript.toString('hex'));
    });
});
