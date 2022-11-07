
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
 * @param p2shErpBtcPublicKeys Array of P2sh erp federation public keys to get redeemScript
 * @param csvValue CSV value to get redeemScript
 */
export function getP2shErpRedeemScript(powpegBtcPublicKeys: Array<string|Buffer>, p2shErpBtcPublicKeys: Array<string|Buffer>, csvValue: string): Buffer;

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
