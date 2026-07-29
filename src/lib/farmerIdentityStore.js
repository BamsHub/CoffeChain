import { getSupabaseAdmin } from '@/lib/supabase';

const FARMER_METADATA_KEYS = [
    'farmerCategory',
    'farmerCommunityName',
    'province',
    'regency',
    'district',
    'village',
    'farmerDeclarationAt',
    'farmerVerificationStatus',
    'farmerVerificationNotes',
    'farmerVerifiedBy',
    'farmerVerifiedByName',
    'farmerVerifiedAt',
    'emailVerified',
    'emailVerifiedAt',
];

export function mergeFarmerIdentity(user = {}, authUser = null) {
    const metadata = authUser?.user_metadata || user.authMetadata || {};
    const merged = { ...user };

    for (const key of FARMER_METADATA_KEYS) {
        if (merged[key] == null && metadata[key] != null) {
            merged[key] = metadata[key];
        }
    }

    return merged;
}

export async function getFarmerAuthUser(userId) {
    if (!userId) return null;
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase.auth.admin.getUserById(userId);
    if (error) return null;
    return data?.user || null;
}

export async function updateFarmerAuthMetadata(userId, updates) {
    const supabase = getSupabaseAdmin();
    const current = await getFarmerAuthUser(userId);
    if (!current) return null;

    const allowedUpdates = {};
    for (const key of FARMER_METADATA_KEYS) {
        if (updates[key] !== undefined) allowedUpdates[key] = updates[key];
    }

    const { data, error } = await supabase.auth.admin.updateUserById(userId, {
        user_metadata: {
            ...(current.user_metadata || {}),
            ...allowedUpdates,
        },
    });
    if (error) throw new Error(error.message);
    return data?.user || null;
}

export async function listFarmerAuthUsers() {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
    if (error) return new Map();
    return new Map((data?.users || []).map(user => [user.id, user]));
}
