[![Build and Test](https://github.com/rsksmart/powpeg-redeemscript-parser/actions/workflows/build-test.yml/badge.svg)](https://github.com/rsksmart/powpeg-redeemscript-parser/actions/workflows/build-test.yml)
[![CodeQL](https://github.com/rsksmart/powpeg-redeemscript-parser/workflows/CodeQL/badge.svg)](https://github.com/rsksmart/powpeg-redeemscript-parser/actions?query=workflow%3ACodeQL)
[![OpenSSF Scorecard](https://api.scorecard.dev/projects/github.com/rsksmart/powpeg-redeemscript-parser/badge)](https://scorecard.dev/viewer/?uri=github.com/rsksmart/powpeg-redeemscript-parser)

# powpeg-redeemscript-parser

This library helps obtaining the redeem script of the RSK powpeg as well as generating its address.

## Local usage

Run `npm ci` to install dependencies.

Run `node sample/sample.js` to get a full run of all the methods available in the library.

## Details

The library offers methods to calculate each type of redeemscript available for the RSK powpeg. It also has a method to, given a redeemscript, get the powpeg address.

### buildPowpegRedeemScript

```ts
function buildPowpegRedeemScript(powpegBtcPublicKeys: Array<string|Buffer>, emergencyBtcPublicKeys: Array<string|Buffer>, csvValue: number): Buffer;
```

Generates the powpeg (P2SH-P2WSH ERP) redeemscript.
This method takes the parameterized powpegBtcPublicKeys, the emergency multisig public keys, and the delay value to generate the redeemscript.

### buildFlyoverRedeemScript

```ts
function buildFlyoverRedeemScript(powpegRedeemScript: Buffer, derivationArgsHash: string): Buffer;
```

Generates a Flyover redeemscript.
This method expects a derivation arguments hash that represents the flyover protocol operation. With this it generates a prefix that is then joined with the regular powpeg redeemscript.

### isFlyoverRedeemScript

```ts
function isFlyoverRedeemScript(redeemScript: Buffer): boolean;
```

Returns whether the redeemscript is a flyover redeemscript, i.e. a powpeg redeemscript prefixed with `OP_PUSHBYTES_32 <derivationHash> OP_DROP`.

### removeFlyoverPrefix

```ts
function removeFlyoverPrefix(redeemScript: Buffer): Buffer;
```

Removes the flyover prefix from a flyover redeemscript, returning the underlying powpeg redeemscript. Throws if the redeemscript is not a flyover redeemscript.

For any comments or suggestions, feel free to contribute or reach out at our [Discord server](https://discord.gg/rootstock).
