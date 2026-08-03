
export enum NETWORKS {
    MAINNET = 'MAINNET',
    TESTNET = 'TESTNET',
    REGTEST = 'REGTEST',
}

/**
 * generates custom ERP redeemscript from the powpeg and emergency public keys
 * @param powpegBtcPublicKeys Array of pegnatories public keys to get redeemScript
 * @param emergencyBtcPublicKeys Array of emergency multisig public keys to get redeemScript
 * @param csvValue CSV value in number format get redeemScript
 */
export function buildP2shErpRedeemScript(powpegBtcPublicKeys: Array<string|Buffer>, emergencyBtcPublicKeys: Array<string|Buffer>, csvValue: number): Buffer;

/**
 * generates a Flyover prefix and prepends it to the redeemscript received
 * @param powpegRedeemScript Powpeg redeem script
 * @param derivationArgsHash String of 64 characters representing a derivation hash for Flyover protocol
 */
 export function buildFlyoverRedeemScript(powpegRedeemScript: Buffer, derivationArgsHash: string): Buffer;

 /**
  * Checks whether a redeem script is a flyover redeem script (powpeg redeem script prefixed with
  * OP_PUSHBYTES_32 <derivationHash> OP_DROP)
  * @param redeemScript a redeem script
  */
 export function isFlyoverRedeemScript(redeemScript: Buffer): boolean;

 /**
  * Removes the flyover prefix from a flyover redeem script, returning the underlying powpeg redeem script
  * @param redeemScript a flyover redeem script
  */
 export function removeFlyoverPrefix(redeemScript: Buffer): Buffer;

 /**
  * generates a p2sh p2wsh BTC address for the parameterized network using the parameterized redeemscript
  * @param network network is used to select the proper ERP constants
  * @param redeemScript a calculated redeemscript
  */
 export function getP2shP2wshAddressFromRedeemScript(network: NETWORKS, redeemScript: Buffer): string;

  /**
  * generates the p2sh-p2wsh script hash using the parameterized redeemscript
  * @param redeemScript a calculated redeemscript
  */
 export function getP2shP2wshScriptHashFromRedeemScript(redeemScript: Buffer): string;

 /**
  * extracts the redeem script (the last witness stack item) from a witness
  * @param witness the witness stack (array of hex-encoded items)
  */
 export function getRedeemScriptFromWitness(witness: string[]): Buffer;

 /**
  * returns the script hash embedded in a base58check address
  * @param address a base58check address
  */
 export function getScriptHashFromAddress(address: string): string;
