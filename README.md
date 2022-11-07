[![CI/CD Using Github actions workflow](https://github.com/rsksmart/powpeg-redeemscript-parser/actions/workflows/workflow.yml/badge.svg)](https://github.com/rsksmart/powpeg-redeemscript-parser/actions/workflows/workflow.yml)

# Disclaimer

This is a beta version until audited by the security team. Any comments or suggestions feel free to contribute or reach out at our [open slack](https://developers.rsk.co/slack).

# powpeg-redeemscript-parser

This library helps obtaining the redeem script of the RSK powpeg as well as generating its address.

## local usage

Run `npm ci` to install dependencies

Run `node sample/sample.js` to get a full run of all the methods availables in the library.

## details

The library offers methods to calculate each type of redeemscript available for the RSK powpeg. It also has a method to, given a redeemscript, get the powpeg address.

### getPowpegRedeemScript

```
function getPowpegRedeemScript(powpegBtcPublicKeys: Array<string|Buffer>): Buffer;
```

Generates a regular powpeg redeemscript.
This methods takes the parameterized powpegBtcPublicKeys, sorts them ascending and generates a p2ms script. The signature threshold is half public keys plus one.

### getP2shErpRedeemScript

```
function getP2shErpRedeemScript(powpegBtcPublicKeys: Array<string|Buffer>, erpBtcPublicKeys: Array<string|Buffer>, csvValue: string): Buffer;
```

Generates a P2SH ERP powpeg redeemscript. (this will become the default after the first powpeg change after IRIS)
This method takes the parameterized powpegBtcPublicKeys, the emergency multisig public keys, and the delay value to generate the P2SH ERP redeeemscript.

### getFlyoverRedeemScript

```
function getFlyoverRedeemScript(powpegBtcPublicKeys: Array<string|Buffer>, derivationArgsHash: string): Buffer;
```

Generates a Flyover redeemscript.
This method expects a derivation arguments hash that represents the flyover protocol operation. With this it generates a prefix that is then joined with the regular powpeg redeemscript.

### getAddressFromRedeemScript

```
function getAddressFromRedeemScript(network: NETWORKS, redeemScript: Buffer): string;
```

Generates a base58 address for the P2SH calculated from the provided redeemscript. The network is used to set the network prefix of the address.
