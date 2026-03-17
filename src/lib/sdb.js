/**
 * Supabase DB helper — menggantikan JSON file-based db.js
 * Semua operasi coba Supabase dulu, fallback ke JSON jika gagal
 */

import { supabaseAdmin } from './supabase';
import { readDb as readJson, writeDb as writeJson, addItem as addJson, updateItem as updateJson } from './db';

// ── Generic crud via Supabase ─────────────────────────────────
export async function sbSelect(table, filters = {}) {
    try {
        let q = supabaseAdmin.from(table).select('*');
        for (const [key, val] of Object.entries(filters)) {
            if (val !== undefined && val !== null) q = q.eq(key, val);
        }
        const { data, error } = await q;
        if (error) throw error;
        return data || [];
    } catch (e) {
        console.warn(`[sdb] Supabase ${table} select failed, fallback JSON:`, e.message);
        return null; // caller should fallback
    }
}

export async function sbInsert(table, row) {
    try {
        const { data, error } = await supabaseAdmin.from(table).insert(row).select().single();
        if (error) throw error;
        return data;
    } catch (e) {
        console.warn(`[sdb] Supabase ${table} insert failed:`, e.message);
        return null;
    }
}

export async function sbUpsert(table, row, onConflict = 'id') {
    try {
        const { data, error } = await supabaseAdmin.from(table).upsert(row, { onConflict }).select().single();
        if (error) throw error;
        return data;
    } catch (e) {
        console.warn(`[sdb] Supabase ${table} upsert failed:`, e.message);
        return null;
    }
}

export async function sbUpdate(table, id, updates) {
    try {
        const { data, error } = await supabaseAdmin.from(table).update(updates).eq('id', id).select().single();
        if (error) throw error;
        return data;
    } catch (e) {
        console.warn(`[sdb] Supabase ${table} update failed:`, e.message);
        return null;
    }
}

export async function sbDelete(table, id) {
    try {
        const { error } = await supabaseAdmin.from(table).delete().eq('id', id);
        if (error) throw error;
        return true;
    } catch (e) {
        console.warn(`[sdb] Supabase ${table} delete failed:`, e.message);
        return false;
    }
}

// ── Column name mapping (camelCase JSON → snake_case Supabase) ──
export function ordersToSnake(o) {
    return {
        id: o.id,
        order_id: o.orderId,
        user_id: o.userId || 'guest',
        user_name: o.userName || 'Guest',
        product_id: o.productId,
        product_name: o.productName,
        weight: o.weight,
        quantity: o.quantity || 1,
        total_price: o.totalPrice,
        payment_method: o.paymentMethod,
        virtual_account: o.virtualAccount,
        tx_signature: o.txSignature,
        status: o.status || 'pending',
        created_at: o.createdAt,
        expires_at: o.expiresAt,
        paid_at: o.paidAt,
    };
}

export function ordersToCamel(o) {
    if (!o) return null;
    return {
        id: o.id,
        orderId: o.order_id,
        userId: o.user_id,
        userName: o.user_name,
        productId: o.product_id,
        productName: o.product_name,
        weight: o.weight,
        quantity: o.quantity,
        totalPrice: o.total_price,
        paymentMethod: o.payment_method,
        virtualAccount: o.virtual_account,
        txSignature: o.tx_signature,
        status: o.status,
        createdAt: o.created_at,
        expiresAt: o.expires_at,
        paidAt: o.paid_at,
    };
}

export function usersToCamel(u) {
    if (!u) return null;
    return {
        id: u.id,
        name: u.name,
        email: u.email,
        password: u.password,
        role: u.role,
        region: u.region,
        wallet: u.wallet,
        avatar: u.avatar,
        bio: u.bio,
        location: u.location,
        phone: u.phone,
        language: u.language,
        photoBase64: u.photo_base64,
        active: u.active,
        createdAt: u.created_at,
        lastLogin: u.last_login,
    };
}

export function usersToSnake(u) {
    const s = {};
    if (u.id !== undefined) s.id = u.id;
    if (u.name !== undefined) s.name = u.name;
    if (u.email !== undefined) s.email = u.email;
    if (u.password !== undefined) s.password = u.password;
    if (u.role !== undefined) s.role = u.role;
    if (u.region !== undefined) s.region = u.region;
    if (u.wallet !== undefined) s.wallet = u.wallet;
    if (u.avatar !== undefined) s.avatar = u.avatar;
    if (u.bio !== undefined) s.bio = u.bio;
    if (u.location !== undefined) s.location = u.location;
    if (u.phone !== undefined) s.phone = u.phone;
    if (u.language !== undefined) s.language = u.language;
    if (u.photoBase64 !== undefined) s.photo_base64 = u.photoBase64;
    if (u.active !== undefined) s.active = u.active;
    if (u.lastLogin !== undefined) s.last_login = u.lastLogin;
    return s;
}
