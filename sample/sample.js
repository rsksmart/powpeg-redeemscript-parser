const redeemScriptParser = require('../index');
const bridge = require('@rsksmart/rsk-precompiled-abis').bridge;
const web3 = require('web3');
const crypto = require('crypto');

const erpPubKeys = [
    "0257c293086c4d4fe8943deda5f890a37d11bebd140e220faa76258a41d077b4d4",
    "03c2660a46aa73078ee6016dee953488566426cf55fc8011edd0085634d75395f9",
    "03cd3e383ec6e12719a6c69515e5559bcbe037d0aa24c187e1e26ce932e22ad7b3",
    "02370a9838e4d15708ad14a104ee5606b36caaaaf739d833e67770ce9fd9b3ec80",
];

const csvValue = 52560;

(async () => {

    const bridgeClient = bridge.build(new web3('https://public-node.rsk.co/'));
    const powpegPublicKeys = [];

    console.log('\nBridge data:');

    const powpegSize = await bridgeClient.methods.getFederationSize().call();

    console.log('\nPowpeg members:', powpegSize, '\n');

    for (let i = 0; i < powpegSize; i++) {
        const publicKey = await bridgeClient.methods.getFederatorPublicKeyOfType(i, 'btc').call();
        powpegPublicKeys.push(publicKey.slice(2));
        console.log(`= pubkey[${i+1}] = ${publicKey}`);
    }

    const currentFederationAddress = await bridgeClient.methods.getFederationAddress().call();

    console.log('\nCurrent federation address:', currentFederationAddress);

    const network = redeemScriptParser.NETWORKS.MAINNET;

    console.log('\nPowpeg redeemscript parser data:');

    const powpegRedeemScript = redeemScriptParser.getPowpegRedeemScript(powpegPublicKeys);

    console.log('\nPowpeg redeem script:', powpegRedeemScript.toString('hex'));

    const p2shErpRedeemScript = redeemScriptParser.getP2shErpRedeemScript(powpegPublicKeys, erpPubKeys, csvValue);

    console.log('\nP2sh ERP redeem script:', p2shErpRedeemScript.toString('hex'));
    console.log('\nDerived federation address:', redeemScriptParser.getAddressFromRedeemScript(network, p2shErpRedeemScript));

    const randomFlyoverHash = crypto.randomBytes(32).toString('hex');
    console.log('\nRandom Flyover derivation hash:', randomFlyoverHash);

    const flyoverPowpegRedeemScript = redeemScriptParser.getFlyoverRedeemScript(powpegRedeemScript, randomFlyoverHash);
    console.log('\nFlyover powpeg redeem script:', flyoverPowpegRedeemScript.toString('hex'));

})();
