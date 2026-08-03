const redeemScriptParser = require('../index');
const crypto = require('crypto');
const opcodes = require('bitcoinjs-lib').script.OPS;
const expect = require('chai').expect;
const { NETWORKS, ERROR_MESSAGES, MAX_CSV_VALUE } = require('../constants');
const rawRedeemScripts = require('./resources/test-redeem-scripts.json');
const { signedNumberToHexStringLE, hexToDecimal, getRandomPubkey, numberToHexString, decimalToOpCode } = require('../utils');

// Mainnet ERP public keys
const ERP_PUBKEYS = [
    "0257c293086c4d4fe8943deda5f890a37d11bebd140e220faa76258a41d077b4d4",
    "03c2660a46aa73078ee6016dee953488566426cf55fc8011edd0085634d75395f9",
    "03cd3e383ec6e12719a6c69515e5559bcbe037d0aa24c187e1e26ce932e22ad7b3",
    "02370a9838e4d15708ad14a104ee5606b36caaaaf739d833e67770ce9fd9b3ec80",
];

// Mainnet ERP CSV value
const ERP_CSV_VALUE = 52_560;

const checkPubKeysIncludedInRedeemScript = (pubKeys, redeemScript) => {
    for (let pubKey of pubKeys) {
        expect(redeemScript.indexOf(pubKey.toString('hex'))).to.be.above(0);
    }
};

const validateStandardRedeemScriptFormat = (redeemScript, pubKeys) => {
    const M = parseInt(pubKeys.length / 2) + 1;
    const N = pubKeys.length;

    // First byte is M (pubKeys.length / 2 + 1)
    expect(redeemScript.substring(0,2)).to.be.eq(numberToHexString(decimalToOpCode[M]));
    // Second to last byte is N (pubKeys.length)
    expect(redeemScript.slice(-4).substring(0,2)).to.be.eq(numberToHexString(decimalToOpCode[N]));
    // Last byte is OP_CHECKMULTISIG
    expect(redeemScript.slice(-2)).to.be.eq(numberToHexString(opcodes.OP_CHECKMULTISIG));
    // Public keys should be in the redeem script
    checkPubKeysIncludedInRedeemScript(pubKeys, redeemScript);
}

const validateP2shErpRedeemScriptFormat = (p2shErpRedeemScript, pubKeys, erpPubKeys, csvValue) => {
    const OP_M = decimalToOpCode[parseInt(pubKeys.length / 2) + 1];
    const OP_N = decimalToOpCode[pubKeys.length];

    const ERP_OP_M = decimalToOpCode[parseInt(erpPubKeys.length / 2) + 1];
    const ERP_OP_N = decimalToOpCode[erpPubKeys.length];

    let position = 1;
    //  First byte is OP_NOTIF
    expect(p2shErpRedeemScript.subarray(0, position).toString('hex')).to.be.eq(numberToHexString(opcodes.OP_NOTIF));
    expect(p2shErpRedeemScript.subarray(position, ++position).toString('hex')).to.be.eq(numberToHexString(OP_M));

    // Check Publickeys in P2shErpRedeemScript
    for (let i = 0; i < pubKeys.length; i++) {
        let pubKeyLengthHex = p2shErpRedeemScript.subarray(position, ++position).toString('hex');
        let pubKeyLength = hexToDecimal(pubKeyLengthHex);
        let pubKey = p2shErpRedeemScript.subarray(position, position + pubKeyLength).toString('hex');
        expect(pubKeys).to.include(pubKey);
        position = position + pubKeyLength;
    }

    expect(p2shErpRedeemScript.subarray(position, ++position).toString('hex')).to.be.eq(numberToHexString(OP_N));
    expect(p2shErpRedeemScript.subarray(position, ++position).toString('hex')).to.be.eq(numberToHexString(opcodes.OP_CHECKMULTISIG));
    expect(p2shErpRedeemScript.subarray(position, ++position).toString('hex')).to.be.eq(numberToHexString(opcodes.OP_ELSE));
    const csvValuePushBytes = signedNumberToHexStringLE(csvValue).length / 2;
    expect(p2shErpRedeemScript.subarray(position, ++position).toString('hex')).to.be.eq(`0${csvValuePushBytes}`);
    const csvValueOffset = position + csvValuePushBytes;
    expect(p2shErpRedeemScript.subarray(position, csvValueOffset).toString('hex')).to.be.eq(signedNumberToHexStringLE(csvValue));
    position = csvValueOffset;
    expect(p2shErpRedeemScript.subarray(position, ++position).toString('hex')).to.be.eq(numberToHexString(opcodes.OP_CHECKSEQUENCEVERIFY));
    expect(p2shErpRedeemScript.subarray(position, ++position).toString('hex')).to.be.eq(numberToHexString(opcodes.OP_DROP));
    expect(p2shErpRedeemScript.subarray(position, ++position).toString('hex')).to.be.eq(numberToHexString(ERP_OP_M));

    // Check ERP Publickeys in P2shErpRedeemScript
    for (let i = 0; i < erpPubKeys.length; i++) {
        let pubKeyLengthHex = p2shErpRedeemScript.subarray(position, ++position).toString('hex');
        let pubKeyLength = hexToDecimal(pubKeyLengthHex);
        let pubKey = p2shErpRedeemScript.subarray(position, position + pubKeyLength).toString('hex');
        expect(erpPubKeys).to.include(pubKey);
        position = position + pubKeyLength;
    }

    expect(p2shErpRedeemScript.subarray(position, ++position).toString('hex')).to.be.eq(numberToHexString(ERP_OP_N));
    expect(p2shErpRedeemScript.subarray(position, ++position).toString('hex')).to.be.eq(numberToHexString(opcodes.OP_CHECKMULTISIG));
    //  Last byte is OP_ENDIF
    expect(p2shErpRedeemScript.subarray(position, ++position).toString('hex')).to.be.eq(numberToHexString(opcodes.OP_ENDIF));
}

describe('buildPowpegRedeemScriptFromPublicKeys', () => {
    it ('should fail for invalid data', () => {
        expect(() => redeemScriptParser.buildPowpegRedeemScriptFromPublicKeys(null)).to.throw(ERROR_MESSAGES.INVALID_POWPEG_PUBLIC_KEYS);
        expect(() => redeemScriptParser.buildPowpegRedeemScriptFromPublicKeys('a-string')).to.throw(ERROR_MESSAGES.INVALID_POWPEG_PUBLIC_KEYS);
    });

    it('should return a valid redeem script', () => {
        let pubKeys = [
            '02cd53fc53a07f211641a677d250f6de99caf620e8e77071e811a28b3bcddf0be1',
            '0362634ab57dae9cb373a5d536e66a8c4f67468bbcfb063809bab643072d78a124',
            '03c5946b3fbae03a654237da863c9ed534e0878657175b132b8ca630f245df04db',
        ];
        let redeemScript = redeemScriptParser.buildPowpegRedeemScriptFromPublicKeys(pubKeys).toString('hex');
        validateStandardRedeemScriptFormat(redeemScript, pubKeys);

        // Sort descending
        pubKeys = pubKeys.sort((a, b) => b.localeCompare(a));
        let otherRedeemScript = redeemScriptParser.buildPowpegRedeemScriptFromPublicKeys(pubKeys).toString('hex');
        expect(redeemScript).to.be.eq(otherRedeemScript);
    });
});

describe('buildP2shErpRedeemScript', () => {
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
        expect(() => redeemScriptParser.buildP2shErpRedeemScript()).to.throw(ERROR_MESSAGES.INVALID_POWPEG_PUBLIC_KEYS);
        expect(() => redeemScriptParser.buildP2shErpRedeemScript(null)).to.throw(ERROR_MESSAGES.INVALID_POWPEG_PUBLIC_KEYS);
        expect(() => redeemScriptParser.buildP2shErpRedeemScript('nothing')).to.throw(ERROR_MESSAGES.INVALID_POWPEG_PUBLIC_KEYS);
        expect(() => redeemScriptParser.buildP2shErpRedeemScript(null, null, null)).to.throw(ERROR_MESSAGES.INVALID_POWPEG_PUBLIC_KEYS);

        // fail because there are no erp public keys
        expect(() => redeemScriptParser.buildP2shErpRedeemScript(publicKeys, null, null)).to.throw(ERROR_MESSAGES.INVALID_EMERGENCY_PUBLIC_KEYS);
        expect(() => redeemScriptParser.buildP2shErpRedeemScript(publicKeys, '', null)).to.throw(ERROR_MESSAGES.INVALID_EMERGENCY_PUBLIC_KEYS);
        expect(() => redeemScriptParser.buildP2shErpRedeemScript(publicKeys, getRandomPubkey(), null)).to.throw(ERROR_MESSAGES.INVALID_EMERGENCY_PUBLIC_KEYS);

        // fail because there is no csv value
        expect(() => redeemScriptParser.buildP2shErpRedeemScript(publicKeys, emergencyBtcPublicKeys, null)).to.throw(ERROR_MESSAGES.INVALID_CSV_VALUE);
        expect(() => redeemScriptParser.buildP2shErpRedeemScript(publicKeys, emergencyBtcPublicKeys, '')).to.throw(ERROR_MESSAGES.INVALID_CSV_VALUE);

        // fail because the csv value is invalid
        expect(() => redeemScriptParser.buildP2shErpRedeemScript(publicKeys, emergencyBtcPublicKeys, "12345")).to.throw(ERROR_MESSAGES.INVALID_CSV_VALUE);
        expect(() => redeemScriptParser.buildP2shErpRedeemScript(publicKeys, emergencyBtcPublicKeys, 0)).to.throw(ERROR_MESSAGES.INVALID_CSV_VALUE);
        expect(() => redeemScriptParser.buildP2shErpRedeemScript(publicKeys, emergencyBtcPublicKeys, -1)).to.throw(ERROR_MESSAGES.INVALID_CSV_VALUE);
        expect(() => redeemScriptParser.buildP2shErpRedeemScript(publicKeys, emergencyBtcPublicKeys, MAX_CSV_VALUE + 1)).to.throw(ERROR_MESSAGES.INVALID_CSV_VALUE);
        expect(() => redeemScriptParser.buildP2shErpRedeemScript(publicKeys, emergencyBtcPublicKeys, csvValue - 0.5)).to.throw(ERROR_MESSAGES.INVALID_CSV_VALUE);

    });

    it('should return a valid p2sh erp redeem script', () => {
        const p2shErpRedeemScript = redeemScriptParser.buildP2shErpRedeemScript(publicKeys, emergencyBtcPublicKeys, csvValue);
        validateP2shErpRedeemScriptFormat(p2shErpRedeemScript, publicKeys, emergencyBtcPublicKeys, csvValue);
    });

    it('should return a valid p2sh erp redeem script passing public keys in a Buffer array', () => {
        const publicKeysBuffer = publicKeys.map(hex => Buffer.from(hex, 'hex'));
        const emergencyBtcPublicKeysBuffer = emergencyBtcPublicKeys.map(hex => Buffer.from(hex, 'hex'));
        const p2shErpRedeemScript = redeemScriptParser.buildP2shErpRedeemScript(publicKeysBuffer, emergencyBtcPublicKeysBuffer, csvValue);
        validateP2shErpRedeemScriptFormat(p2shErpRedeemScript, publicKeys, emergencyBtcPublicKeys, csvValue);
    });

});

describe('buildFlyoverRedeemScript', () => {
    const dHash = crypto.randomBytes(32).toString('hex');
    const publicKeys = [getRandomPubkey(), getRandomPubkey()];
    const redeemScript = redeemScriptParser.buildPowpegRedeemScriptFromPublicKeys(publicKeys);

    it('should fail for invalid data', () => {
        // fail because there is no redeem script
        expect(() => redeemScriptParser.buildFlyoverRedeemScript(null)).to.throw(ERROR_MESSAGES.INVALID_POWPEG_REDEEM_SCRIPT);
        expect(() => redeemScriptParser.buildFlyoverRedeemScript(null, null)).to.throw(ERROR_MESSAGES.INVALID_POWPEG_REDEEM_SCRIPT);
        expect(() => redeemScriptParser.buildFlyoverRedeemScript(null, dHash)).to.throw(ERROR_MESSAGES.INVALID_POWPEG_REDEEM_SCRIPT);
        expect(() => redeemScriptParser.buildFlyoverRedeemScript('', dHash)).to.throw(ERROR_MESSAGES.INVALID_POWPEG_REDEEM_SCRIPT);
        expect(() => redeemScriptParser.buildFlyoverRedeemScript('not-a-buffer', dHash)).to.throw(ERROR_MESSAGES.INVALID_POWPEG_REDEEM_SCRIPT);
        
        // fail because there is no derivation hash
        expect(() => redeemScriptParser.buildFlyoverRedeemScript(redeemScript, null)).to.throw(ERROR_MESSAGES.INVALID_DHASH);
        expect(() => redeemScriptParser.buildFlyoverRedeemScript(redeemScript, '')).to.throw(ERROR_MESSAGES.INVALID_DHASH);
        // a short hash
        expect(() => redeemScriptParser.buildFlyoverRedeemScript(redeemScript, dHash.substring(1))).to.throw(ERROR_MESSAGES.INVALID_DHASH);
        // a long hash
        expect(() => redeemScriptParser.buildFlyoverRedeemScript(redeemScript, dHash.concat('1'))).to.throw(ERROR_MESSAGES.INVALID_DHASH);
    });

    it('should return a valid flyover redeem script', () => {
        let flyoverRedeemScript = redeemScriptParser.buildFlyoverRedeemScript(redeemScript, dHash).toString('hex');
        checkPubKeysIncludedInRedeemScript(publicKeys, flyoverRedeemScript);
        expect(flyoverRedeemScript.indexOf(dHash)).to.be.above(0);
    });
});

describe('getAddressFromRedeemScript', () => {
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
        let redeemScript = redeemScriptParser.buildPowpegRedeemScriptFromPublicKeys(pubKeys);
        expect(redeemScriptParser.getAddressFromRedeemScript(
            NETWORKS.REGTEST, 
            redeemScript
        )).to.be.eq(expectedPowpegAddress);
    });
});

describe('getP2shP2wshAddressFromRedeemScript', () => {
    it('should fail for invalid data', () => {
        expect(() => redeemScriptParser.getP2shP2wshAddressFromRedeemScript()).to.throw(ERROR_MESSAGES.INVALID_NETWORK);
        expect(() => redeemScriptParser.getP2shP2wshAddressFromRedeemScript(NETWORKS.MAINNET)).to.throw(ERROR_MESSAGES.INVALID_REDEEM_SCRIPT);
        expect(() => redeemScriptParser.getP2shP2wshAddressFromRedeemScript(NETWORKS.MAINNET, 'not-a-buffer')).to.throw(ERROR_MESSAGES.INVALID_REDEEM_SCRIPT);
    });

    it('should generate a valid p2sh p2wsh addreses', () => {
        const pubKeys = [
            '02543951140f6349680d84e51ef02d3a333b86c682018f7d02e70c0c6bf835d230', // Generated with seed: segwitFed1
            '0375aef5f2ffd2753118b699ed75274008bc120ba07bbbd6b0307899482f664366', // Generated with seed: segwitFed2
            '038acb7b10e27d9dab86fb1c633757ac3e34e04e8bbd69c066cad22266598238b8', // Generated with seed: segwitFed3
            '02975acc8290a6b3a4a63799d41cc275e07235bc45df8b8cadb5e57251788c86ce', // Generated with seed: segwitFed4
            '020aa547e2226a117cd52da9d7c8c917287990a5334e99aaf99fa079a5f4ab35d9', // Generated with seed: segwitFed5
            '021f8ffe926a8cba95d69127dbadbe95ccd2f4c6a9dc53e7d97ca8c9450e904148', // Generated with seed: segwitFed6
        ];
        const expectedPowpegAddress = '3EctTj6zgEbuuTkTZskNUJh9GwKPtHAqZR';
        const redeemScript = redeemScriptParser.buildP2shErpRedeemScript(pubKeys, ERP_PUBKEYS, ERP_CSV_VALUE);
        const actualAddress = redeemScriptParser.getP2shP2wshAddressFromRedeemScript(
            NETWORKS.MAINNET, 
            redeemScript
        );
        expect(actualAddress).to.be.eq(expectedPowpegAddress);
    });
});

describe('getP2shP2wshScriptHashFromRedeemScript', () => {
    it('should fail for a non-Buffer redeem script', () => {
        expect(() => redeemScriptParser.getP2shP2wshScriptHashFromRedeemScript('not-a-buffer')).to.throw(ERROR_MESSAGES.INVALID_REDEEM_SCRIPT);
    });

    it('should generate the p2sh p2wsh script hash embedded in the p2sh p2wsh address', () => {
        const pubKeys = [
            '02543951140f6349680d84e51ef02d3a333b86c682018f7d02e70c0c6bf835d230', // Generated with seed: segwitFed1
            '0375aef5f2ffd2753118b699ed75274008bc120ba07bbbd6b0307899482f664366', // Generated with seed: segwitFed2
            '038acb7b10e27d9dab86fb1c633757ac3e34e04e8bbd69c066cad22266598238b8', // Generated with seed: segwitFed3
            '02975acc8290a6b3a4a63799d41cc275e07235bc45df8b8cadb5e57251788c86ce', // Generated with seed: segwitFed4
            '020aa547e2226a117cd52da9d7c8c917287990a5334e99aaf99fa079a5f4ab35d9', // Generated with seed: segwitFed5
            '021f8ffe926a8cba95d69127dbadbe95ccd2f4c6a9dc53e7d97ca8c9450e904148' // Generated with seed: segwitFed6
        ];
        // hash160 embedded in the p2sh p2wsh address 3EctTj6zgEbuuTkTZskNUJh9GwKPtHAqZR
        const expectedScriptHash = '8dd1bdf8a9d2800d15a85a6d505dea3e2d4c7290';
        const redeemScript = redeemScriptParser.buildP2shErpRedeemScript(pubKeys, ERP_PUBKEYS, ERP_CSV_VALUE);

        const scriptHash = redeemScriptParser.getP2shP2wshScriptHashFromRedeemScript(redeemScript);

        expect(scriptHash).to.be.eq(expectedScriptHash);
    });

    it('should generate the p2sh p2wsh script hash for a real testnet powpeg redeem script', () => {
        // values from https://mempool.space/testnet/tx/22d420150ad1bc3954830c0fc09afd5acfbe0aae9d3cb74e85e9a67762710107
        const redeemScript = Buffer.from(
            '64562102099fd69cf6a350679a05593c3ff814bfaa281eb6dde505c953cf2875979b1209210222caa9b1436ebf8cdf0c97233a8ca6713ed37b5105bcbbc674fd91353f43d9f7210227e1a5773a58e9be74cd1eaa670150f3ca39bead7cf0fbb6d6d53faca6e6b45c21022a159227df514c7b7808ee182ae07d71770b67eda1e5ee668272761eefb2c24c21027f49a747dfd39e4b0d71d01fcccb625a2dbe8a63d44407f1cb11d132d22bf4ac210292039a22480290feccf059d7be7cb541cba6af97897526befbf3e411dfa9ef8d2102afc230c2d355b1a577682b07bc2646041b5d0177af0f98395a46018da699b6da2102b1645d3f0cff938e3b3382b93d2d5c082880b86cbb70b6600f5276f235c2839221036a65b700e8dbb4a8c01a022b19b41e8c3501d2e3d3dbaa1953d2e1412e4111c62103857b9b09e19ffe17e39dd0274266f005ebfb99778a467469ea0f37e5d4bb0c482103cac7e78da7ca46910b3326438a9e784e8b1af5a3253fe7bd6cfac914449390155bae670350cd00b27552210216c23b2ea8e4f11c3f9e22711addb1d16a93964796913830856b568cc3ea21d3210275562901dd8faae20de0a4166362a4f82188db77dbed4ca887422ea1ec185f1421034db69f2112f4fb1bb6141bf6e2bd6631f0484d0bd95b16767902c9fe219d4a6f53ae68',
            'hex'
        );
        const expectedScriptHash = 'a3562b6a12b34eb98a8164ea5c5f7e40fd6ddac8';

        const scriptHash = redeemScriptParser.getP2shP2wshScriptHashFromRedeemScript(redeemScript);
        expect(scriptHash).to.be.eq(expectedScriptHash);
    });

    it('should generate the p2sh p2wsh script hash for a real mainnet powpeg redeem script', () => {
        // values from https://mempool.space/tx/0cc86245eab28c1ec568b03ad9796ab3d224422160ef077298a9561fa89fc832
        const redeemScript = Buffer.from(
            '6455210274c7a2c584eb9dbc3d78fede48d1258b974cd537d82fce4d18f0e85604774e652102daa3cd74c9d06bc7928e1214f0de4ee5744c694975d70e160f562c5e1c4f587d2102f0844d9c1df50f5597118659badf40ea6956903f405f6a604402c8014d926fd42103250c11be0561b1d7ae168b1f59e39cbc1fd1ba3cf4d2140c1a365b2723a2bf93210328f0386fe2b2840a424d3a5073be89a4cb643c434752b8c865e867611d00418321038cc42c8d3cee8360671d2e70226ef95eb840adf4b9c4c5c31b85ffc26eeca7a82103b8faf3ebcf3fe89085fe8c6046dd9cece45bb56e466103f96b4fca2f21072ded2103e59ed1ba1240ac6ff0cb9234afc0e44d6e7653219982d4f1eb55844395e934962103e8f68168606392c5e17f2f9bf1fd3fa55c295cad3990e72e7e3e4470ed644c8f59ae670350cd00b275532102370a9838e4d15708ad14a104ee5606b36caaaaf739d833e67770ce9fd9b3ec80210257c293086c4d4fe8943deda5f890a37d11bebd140e220faa76258a41d077b4d42103c2660a46aa73078ee6016dee953488566426cf55fc8011edd0085634d75395f92103cd3e383ec6e12719a6c69515e5559bcbe037d0aa24c187e1e26ce932e22ad7b354ae68',
            'hex'
        );
        const expectedScriptHash = 'a2aaed588a584e3b190d8219d3668749f52ece8a';

        const scriptHash = redeemScriptParser.getP2shP2wshScriptHashFromRedeemScript(redeemScript);
        expect(scriptHash).to.be.eq(expectedScriptHash);
    });
});

describe('getScriptHashFromAddress', () => {
    it('should return the script hash embedded in a p2sh address', () => {
        // values from https://mempool.space/testnet/tx/22d420150ad1bc3954830c0fc09afd5acfbe0aae9d3cb74e85e9a67762710107
        const address = '2N88sMiizxmbb8Y3yA4AtYmL1RxHogWfoHa';
        const expectedScriptHash = 'a3562b6a12b34eb98a8164ea5c5f7e40fd6ddac8';

        expect(redeemScriptParser.getScriptHashFromAddress(address)).to.be.eq(expectedScriptHash);
    });
});

describe('getRedeemScriptFromWitness', () => {
    it('should return the redeem script (last witness item) as a buffer', () => {
        const redeemScript = 'deadbeef';
        const witness = ['', '3045fakesignature01', '0275fakepublickey', redeemScript];

        expect(redeemScriptParser.getRedeemScriptFromWitness(witness).toString('hex')).to.be.eq(redeemScript);
    });

    it('should fail for an empty or non-array witness', () => {
        expect(() => redeemScriptParser.getRedeemScriptFromWitness([])).to.throw(ERROR_MESSAGES.INVALID_WITNESS);
        expect(() => redeemScriptParser.getRedeemScriptFromWitness(null)).to.throw(ERROR_MESSAGES.INVALID_WITNESS);
        expect(() => redeemScriptParser.getRedeemScriptFromWitness('not-an-array')).to.throw(
            ERROR_MESSAGES.INVALID_WITNESS
        );
    });
});

describe('test raw RedeemScripts from file', () => {
    it('should return same redeemscript', () => {
        const testAndValidateRawRedeemScript = (rawRedeemScript) => {
            validateP2shErpRedeemScriptFormat(Buffer.from(rawRedeemScript.script, 'hex'), rawRedeemScript.mainFed, rawRedeemScript.emergencyFed, rawRedeemScript.timelock);
            const powpegP2shErpRedeemScript = redeemScriptParser.buildP2shErpRedeemScript(rawRedeemScript.mainFed, rawRedeemScript.emergencyFed, rawRedeemScript.timelock).toString('hex');
            return rawRedeemScript.script == powpegP2shErpRedeemScript;
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
    const dHash = crypto.randomBytes(32).toString('hex');
    const powpegPublicKeys = [getRandomPubkey(), getRandomPubkey(), getRandomPubkey()];
    const emergencyPublicKeys = [getRandomPubkey(), getRandomPubkey()];
    const csvValue = 100;
    const powpegRedeemScript = redeemScriptParser.buildP2shErpRedeemScript(powpegPublicKeys, emergencyPublicKeys, csvValue);
    const flyoverRedeemScript = redeemScriptParser.buildFlyoverRedeemScript(powpegRedeemScript, dHash);

    describe('isFlyoverRedeemScript', () => {
        it('isFlyoverRedeemScript returns true for a flyover redeem script', () => {
            expect(redeemScriptParser.isFlyoverRedeemScript(flyoverRedeemScript)).to.be.true;
        });
    
        it('isFlyoverRedeemScript returns false for a non-flyover redeem script', () => {
            expect(redeemScriptParser.isFlyoverRedeemScript(powpegRedeemScript)).to.be.false;
        });
    
        it('isFlyoverRedeemScript fails for a non-Buffer redeem script', () => {
            expect(() => redeemScriptParser.isFlyoverRedeemScript('not-a-buffer')).to.throw(ERROR_MESSAGES.INVALID_REDEEM_SCRIPT);
        });

        it('isFlyoverRedeemScript returns false for scripts that are not flyover-shaped', () => {
            const script = require('bitcoinjs-lib').script;
            // unparseable script (decompile returns null) and a script with fewer than 3 chunks
            expect(redeemScriptParser.isFlyoverRedeemScript(Buffer.from('4c', 'hex'))).to.be.false;
            expect(redeemScriptParser.isFlyoverRedeemScript(Buffer.from('51', 'hex'))).to.be.false;
            // 3+ chunks but wrong shape: first push not 32 bytes, then wrong OP_DROP, then wrong OP_NOTIF
            const wrongAddressData = Buffer.from(script.compile([Buffer.alloc(20), opcodes.OP_DROP, opcodes.OP_NOTIF]));
            expect(redeemScriptParser.isFlyoverRedeemScript(wrongAddressData)).to.be.false;

            const wrongOpDrop = Buffer.from(script.compile([Buffer.alloc(32), opcodes.OP_NOTIF, opcodes.OP_NOTIF]));
            expect(redeemScriptParser.isFlyoverRedeemScript(wrongOpDrop)).to.be.false;

            const wrongOpNotif = Buffer.from(script.compile([Buffer.alloc(32), opcodes.OP_DROP, opcodes.OP_DROP]));
            expect(redeemScriptParser.isFlyoverRedeemScript(wrongOpNotif)).to.be.false;
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
