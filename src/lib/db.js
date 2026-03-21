import { supabaseAdmin } from './supabase';

// Helper konversi format JSON lama (camelCase) ke PG Supabase (snake_case)
function toCamel(str) {
    return str.replace(/_([a-z])/g, g => g[1].toUpperCase());
}
function toSnake(str) {
    return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
}
function convertKeys(obj, converter) {
    if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return obj;
    const result = {};
    for (const key in obj) {
        result[converter(key)] = obj[key];
    }
    return result;
}

export async function readDb(collection) {
    try {
        const { data, error } = await supabaseAdmin.from(collection).select('*').order('id', { ascending: false });
        if (error) throw error;
        return { items: (data || []).map(row => convertKeys(row, toCamel)) };
    } catch (e) {
        console.error(`[db] Error reading ${collection}:`, e.message);
        return { items: [] };
    }
}

export async function writeDb(collection, dbData) {
    if (!dbData || !dbData.items) return dbData;
    try {
        const snakeItems = dbData.items.map(i => convertKeys(i, toSnake));
        // Fallback bulk upsert untuk API lama yang langsung nyimpan seluruh state JSON
        const { error } = await supabaseAdmin.from(collection).upsert(snakeItems);
        if (error) throw error;
    } catch (e) {
        console.error(`[db] Error writeDb ${collection}:`, e.message);
    }
    return dbData;
}

export async function addItem(collection, item) {
    try {
        const snakeItem = convertKeys(item, toSnake);
        const { data, error } = await supabaseAdmin.from(collection).insert(snakeItem).select().single();
        if (error) throw error;
        return convertKeys(data, toCamel);
    } catch (e) {
        console.error(`[db] Error addItem ${collection}:`, e.message);
        return item; // Fallback return the passed item
    }
}

export async function updateItem(collection, id, updates) {
    try {
        const snakeUpdates = convertKeys(updates, toSnake);
        const { data, error } = await supabaseAdmin.from(collection).update(snakeUpdates).eq('id', id).select().single();
        if (error) throw error;
        return convertKeys(data, toCamel);
    } catch (e) {
        console.error(`[db] Error updateItem ${collection}:`, e.message);
        return null;
    }
}

export async function deleteItem(collection, id) {
    try {
        const { error } = await supabaseAdmin.from(collection).delete().eq('id', id);
        if (error) throw error;
        return true;
    } catch (e) {
        console.error(`[db] Error deleteItem ${collection}:`, e.message);
        return false;
    }
}
