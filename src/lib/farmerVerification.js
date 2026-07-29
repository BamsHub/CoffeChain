export const FARMER_VERIFICATION_STATUS = Object.freeze({
    PENDING: 'pending',
    VERIFIED: 'verified',
    REJECTED: 'rejected',
});

export function normalizeFarmerVerificationStatus(user = {}) {
    const explicit = String(
        user.farmer_verification_status
        ?? user.farmerVerificationStatus
        ?? '',
    ).toLowerCase();

    if (Object.values(FARMER_VERIFICATION_STATUS).includes(explicit)) {
        return explicit;
    }

    // Compatibility for accounts created before the verification workflow existed.
    const emailVerified = user.email_verified ?? user.emailVerified;
    return user.active !== false && emailVerified !== false
        ? FARMER_VERIFICATION_STATUS.VERIFIED
        : FARMER_VERIFICATION_STATUS.PENDING;
}

export function isPlausibleSolanaWallet(value) {
    const wallet = String(value || '').trim();
    return wallet.length >= 32
        && wallet.length <= 44
        && /^[1-9A-HJ-NP-Za-km-z]+$/.test(wallet);
}

export function buildFarmerVerificationChecklist(user = {}) {
    const emailVerified = (user.email_verified ?? user.emailVerified) === true;
    const name = String(user.name || '').trim();
    const region = String(user.region || user.location || '').trim();
    const wallet = String(user.wallet || '').trim();

    return [
        {
            id: 'email',
            label: 'Email terverifikasi',
            passed: emailVerified,
            detail: emailVerified
                ? String(user.email || 'Email akun telah dikonfirmasi')
                : 'Petani harus membuka tautan verifikasi email.',
        },
        {
            id: 'identity',
            label: 'Identitas petani lengkap',
            passed: name.length >= 3,
            detail: name.length >= 3 ? name : 'Nama petani minimal 3 karakter.',
        },
        {
            id: 'region',
            label: 'Wilayah kebun tersedia',
            passed: region.length >= 2,
            detail: region || 'Wilayah atau lokasi kebun belum diisi.',
        },
        {
            id: 'wallet',
            label: 'Wallet Solana valid',
            passed: isPlausibleSolanaWallet(wallet),
            detail: isPlausibleSolanaWallet(wallet)
                ? `${wallet.slice(0, 6)}...${wallet.slice(-4)}`
                : 'Alamat wallet Base58 Solana belum valid.',
        },
    ];
}

export function isFarmerVerificationReady(user = {}) {
    return buildFarmerVerificationChecklist(user).every(item => item.passed);
}
