let redeemScriptParser = require('../redeem-script-parser');
let bridge = require('@rsksmart/rsk-precompiled-abis').bridge;
let web3 = require('web3');
let crypto = require('crypto');

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

    let powpegRedeemScript = redeemScriptParser.getFederationRedeemScript(powpegPublicKeys);
    console.log('powpeg redeem script', powpegRedeemScript.toString('hex'));
    console.log('powpeg address', redeemScriptParser.getAddressFromRedeemSript(network, powpegRedeemScript));

    let powpegErpRedeemScript = redeemScriptParser.getErpRedeemScript(network, powpegPublicKeys);
    console.log('powpeg ERP redeem script', powpegErpRedeemScript.toString('hex'));
    console.log('powpeg ERP address', redeemScriptParser.getAddressFromRedeemSript(network, powpegErpRedeemScript));

    let randomFlyoverHash = crypto.randomBytes(32).toString('hex');
    console.log('random Flyover derivation hash', randomFlyoverHash);

    let flyoverPowpegRedeemScript = redeemScriptParser.getFlyoverRedeemScript(powpegPublicKeys, randomFlyoverHash);
    console.log('flyover powpeg redeem script', flyoverPowpegRedeemScript.toString('hex'));
    console.log('flyover powpeg address', redeemScriptParser.getAddressFromRedeemSript(network, flyoverPowpegRedeemScript));

    let flyoverErpPowpegRedeemScript = redeemScriptParser.getFlyoverErpRedeemScript(network, powpegPublicKeys, randomFlyoverHash);
    console.log('flyover erp powpeg redeem script', flyoverErpPowpegRedeemScript.toString('hex'));
    console.log('flyover erp powpeg address', redeemScriptParser.getAddressFromRedeemSript(network, flyoverErpPowpegRedeemScript));

})();