const NETWORKS = {
    MAINNET: 'MAINNET',
    TESTNET: 'TESTNET',
    REGTEST: 'REGTEST'
}

const ERROR_MESSAGES = {
    INVALID_POWPEG_PUBLIC_KEYS: 'powpegBtcPublicKeys should be an array',
    INVALID_P2SH_ERP_PUBLIC_KEYS: 'p2shErpBtcPublicKeys should be an array',
    INVALID_CSV_VALUE: 'csvValue is required in the number format',
    INVALID_DHASH: 'derivationArgsHash must be hash represented as a 64 characters string',
    INVALID_POWPEG_REDEEM_SCRIPT: 'powpegRedeemScript must be a Buffer',
    INVALID_REDEEM_SCRIPT: 'redeemScript must be a Buffer',
    INVALID_NETWORK: 'Network undefined'
}

module.exports = {
    NETWORKS,
    ERROR_MESSAGES
}
