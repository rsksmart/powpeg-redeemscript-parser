const NETWORKS = {
    MAINNET: 'MAINNET',
    TESTNET: 'TESTNET',
    REGTEST: 'REGTEST'
}

const ERROR_MESSAGES = {
    INVALID_POWPEG_PUBLIC_KEYS: 'powpegBtcPublicKeys should be an array',
    INVALID_EMERGENCY_PUBLIC_KEYS: 'emergencyBtcPublicKeys should be an array',
    INVALID_CSV_VALUE: 'csvValue is required in the number format and should be between 1 and 65535',
    INVALID_DHASH: 'derivationArgsHash must be hash represented as a 64 characters string',
    INVALID_POWPEG_REDEEM_SCRIPT: 'powpegRedeemScript must be a Buffer',
    INVALID_REDEEM_SCRIPT: 'redeemScript must be a Buffer',
    INVALID_NETWORK: 'Network undefined'
}

const MAX_CSV_VALUE = 65535; // 2^16 - 1, since bitcoin will interpret up to 16 bits as the CSV value

module.exports = {
    NETWORKS,
    ERROR_MESSAGES,
    MAX_CSV_VALUE
}
