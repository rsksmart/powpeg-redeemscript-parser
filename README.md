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

### buildPowpegRedeemScriptFromPublicKeys

```ts
function buildPowpegRedeemScriptFromPublicKeys(powpegBtcPublicKeys: Array<string|Buffer>): Buffer;
```

Generates a regular powpeg redeemscript.
This methods takes the parameterized powpegBtcPublicKeys, sorts them ascending and generates a p2ms script. The signature threshold is half public keys plus one.

### buildP2shErpRedeemScript

```ts
function buildP2shErpRedeemScript(powpegBtcPublicKeys: Array<string|Buffer>, emergencyBtcPublicKeys: Array<string|Buffer>, csvValue: number): Buffer;
```

Generates a P2SH ERP powpeg redeemscript. (this will become the default after the first powpeg changes after HOP 4.0.1)
This method takes the parameterized powpegBtcPublicKeys, the emergency multisig public keys, and the delay value to generate the P2SH ERP redeemscript.

### buildFlyoverRedeemScript

```ts
function buildFlyoverRedeemScript(powpegBtcPublicKeys: Array<string|Buffer>, derivationArgsHash: string): Buffer;
```

Generates a Flyover redeemscript.
This method expects a derivation arguments hash that represents the flyover protocol operation. With this it generates a prefix that is then joined with the regular powpeg redeemscript.

### getAddressFromRedeemScript

```ts
function getAddressFromRedeemScript(network: NETWORKS, redeemScript: Buffer): string;
```

Generates a base58 address for the P2SH calculated from the provided redeemscript. The network is used to set the network prefix of the address.

### getP2shP2wshAddressFromRedeemScript

```ts
function getAddressFromRedeemScript(network: NETWORKS, redeemScript: Buffer): string;
```

Generates a base58 address for the P2SH P2WSH calculated from the provided redeemscript. The network is used to set the network prefix of the address.

### getP2shP2wshScriptHashFromRedeemScript

```ts
function getP2shP2wshScriptHashFromRedeemScript(redeemScript: Buffer): string;
```

Returns the hex-encoded P2SH-P2WSH script hash (`hash160(OP_0 <sha256(redeemScript)>)`) for the provided redeemscript. This is the 20-byte hash embedded in the P2SH-P2WSH address, so it is network agnostic.

### getScriptHashFromAddress

```ts
function getScriptHashFromAddress(address: string): string;
```

Returns the hex-encoded script hash embedded in a base58check address (e.g. the P2SH script hash of a powpeg address). Useful for comparing a derived script hash against a federation address without deriving a network-prefixed address.

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

### getRedeemScriptFromWitness

```ts
function getRedeemScriptFromWitness(witness: string[]): Buffer;
```

Extracts the redeemscript (the last item of the witness stack) from a transaction input's witness.

For any comments or suggestions, feel free to contribute or reach out at our [Discord server](https://discord.gg/rootstock).
