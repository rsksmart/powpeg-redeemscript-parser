let redeemScriptParser = require('../index');
let bridge = require('@rsksmart/rsk-precompiled-abis').bridge;
let web3 = require('web3');
let crypto = require('crypto');

const erpPubKeys = 
[
    "0257c293086c4d4fe8943deda5f890a37d11bebd140e220faa76258a41d077b4d4",
    "03c2660a46aa73078ee6016dee953488566426cf55fc8011edd0085634d75395f9",
    "03cd3e383ec6e12719a6c69515e5559bcbe037d0aa24c187e1e26ce932e22ad7b3",
    "02370a9838e4d15708ad14a104ee5606b36caaaaf739d833e67770ce9fd9b3ec80",
];
const csvValue = 'cd50';

(async () => {
    let bridgeClient = bridge.build(new web3('https://public-node.rsk.co/'));
    let powpegPublicKeys = [];
    console.log('Bridge data:');
    let powpegSize = await bridgeClient.methods.getFederationSize().call();
    console.log('powpeg members', powpegSize);
    for (let i = 0; i < powpegSize; i++) {
        let publicKey = await bridgeClient.methods.getFederatorPublicKeyOfType(i, 'btc').call();
        powpegPublicKeys.push(publicKey.slice(2));
        console.log(`= pubkey[${i+1}] = ${publicKey}`);
    }
    let powpegAddress = await bridgeClient.methods.getFederationAddress().call();
    console.log('powpeg address', powpegAddress);

    let network = redeemScriptParser.NETWORKS.MAINNET;
    console.log('powpeg redeemscript parser data:')

    let powpegRedeemScript = redeemScriptParser.getPowpegRedeemScript(powpegPublicKeys);
    console.log('powpeg redeem script', powpegRedeemScript.toString('hex'));
    console.log('powpeg address', redeemScriptParser.getAddressFromRedeemScript(network, powpegRedeemScript));

    let powpegErpRedeemScript = redeemScriptParser.getP2shErpRedeemScript(powpegPublicKeys, erpPubKeys, csvValue);
    console.log('powpeg ERP redeem script', powpegErpRedeemScript.toString('hex'));
    console.log('powpeg ERP address', redeemScriptParser.getAddressFromRedeemScript(network, powpegErpRedeemScript));

    let randomFlyoverHash = crypto.randomBytes(32).toString('hex');
    console.log('random Flyover derivation hash', randomFlyoverHash);

    let flyoverPowpegRedeemScript = redeemScriptParser.getFlyoverRedeemScript(powpegRedeemScript, randomFlyoverHash);
    console.log('flyover powpeg redeem script', flyoverPowpegRedeemScript.toString('hex'));
    console.log('flyover powpeg address', redeemScriptParser.getAddressFromRedeemScript(network, flyoverPowpegRedeemScript));
})();
