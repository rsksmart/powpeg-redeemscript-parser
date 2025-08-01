
export enum NETWORKS {
    MAINNET = 'MAINNET',
    TESTNET = 'TESTNET',
    REGTEST = 'REGTEST',
}

/**
 * Sorts public keys and creates powpeg redeem script
 * @param powpegBtcPublicKeys Array of pegnatories public keys to get redeemScript
 */
export function getPowpegRedeemScript(powpegBtcPublicKeys: Array<string|Buffer>): Buffer;

/**
 * generates custom ERP redeemscript, also uses getPowpegRedeemScript to generate base redeemScript
 * @param powpegBtcPublicKeys Array of pegnatories public keys to get redeemScript
 * @param emergencyBtcPublicKeys Array of emergency multisig public keys to get redeemScript
 * @param csvValue CSV value in number format get redeemScript
 */
export function getP2shErpRedeemScript(powpegBtcPublicKeys: Array<string|Buffer>, emergencyBtcPublicKeys: Array<string|Buffer>, csvValue: number): Buffer;

/**
 * generates a Flyover prefix and prepends it to the redeemscript received
 * @param powpegRedeemScript Powpeg redeem script
 * @param derivationArgsHash String of 64 characters representing a derivation hash for Flyover protocol
 */
 export function getFlyoverRedeemScript(powpegRedeemScript: Buffer, derivationArgsHash: string): Buffer;

 /**
  * generates a p2sh BTC address for the parameterized network using the parameterized redeemscript
  * @param network network is used to select the proper ERP constants
  * @param redeemScript a calculated redeemscript
  */
 export function getAddressFromRedeemScript(network: NETWORKS, redeemScript: Buffer): string;

 /**
  * generates a p2sh p2wsh BTC address for the parameterized network using the parameterized redeemscript
  * @param network network is used to select the proper ERP constants
  * @param redeemScript a calculated redeemscript
  */
 export function getP2shP2wshAddressFromRedeemScript(network: NETWORKS, redeemScript: Buffer): string;
