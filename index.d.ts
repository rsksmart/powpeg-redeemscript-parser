/**
 * generates the powpeg (P2SH-P2wSH ERP) redeemscript from the powpeg and emergency public keys
 * @param powpegBtcPublicKeys Array of pegnatories public keys to get redeemScript
 * @param emergencyBtcPublicKeys Array of emergency multisig public keys to get redeemScript
 * @param csvValue CSV value in number format get redeemScript
 */
export function buildPowpegRedeemScript(powpegBtcPublicKeys: Array<string|Buffer>, emergencyBtcPublicKeys: Array<string|Buffer>, csvValue: number): Buffer;

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
