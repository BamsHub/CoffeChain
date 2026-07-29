export const FARMER_VERIFICATION_STATUS = Object.freeze({
    PENDING: 'pending',
    VERIFIED: 'verified',
    REJECTED: 'rejected',
});

export const FARMER_CATEGORY_LABELS = Object.freeze({
    legacy: 'Akun petani lama',
    individual: 'Petani individu / mandiri',
    farmer_group: 'Anggota kelompok tani / komunitas',
    cooperative_member: 'Anggota koperasi',
});

export function getFarmerCategory(user = {}) {
    const category = String(
        user.farmer_category
        ?? user.farmerCategory
        ?? 'legacy',
    ).toLowerCase();
    return FARMER_CATEGORY_LABELS[category] ? category : 'legacy';
}

export function getFarmerLocation(user = {}) {
    const structured = [
        user.village,
        user.district,
        user.regency,
        user.province,
    ].map(value => String(value || '').trim()).filter(Boolean);

    return structured.length
        ? structured.join(', ')
        : String(user.region || user.location || '').trim();
}

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
    const region = getFarmerLocation(user);
    const wallet = String(user.wallet || '').trim();
    const category = getFarmerCategory(user);
    const categoryLabel = FARMER_CATEGORY_LABELS[category];
    const declarationAt = user.farmer_declaration_at ?? user.farmerDeclarationAt;
    const categoryComplete = category === 'legacy' || Boolean(declarationAt);
    const communityName = String(
        user.farmer_community_name
        ?? user.farmerCommunityName
        ?? '',
    ).trim();
    const communityRequired = ['farmer_group', 'cooperative_member'].includes(category);
    const communityComplete = !communityRequired || communityName.length >= 3;

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
            id: 'farmer-category',
            label: 'Status pemohon sebagai petani',
            passed: categoryComplete,
            detail: category === 'legacy'
                ? 'Akun petani lama; kategori dikonfirmasi manual oleh reviewer.'
                : categoryComplete
                    ? categoryLabel
                    : 'Pernyataan dan kategori petani belum tercatat.',
        },
        {
            id: 'community',
            label: 'Afiliasi komunitas jelas',
            passed: communityComplete,
            detail: communityRequired
                ? communityName || 'Nama kelompok tani atau koperasi belum diisi.'
                : communityName || 'Petani independen / tidak wajib memiliki komunitas.',
        },
        {
            id: 'region',
            label: 'Wilayah kebun tersedia',
            passed: region.length >= 2,
            detail: region || 'Desa, kecamatan, kabupaten/kota, atau provinsi belum diisi.',
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
