import { supabaseAdmin } from './supabase';

// ── Key converters: camelCase ↔ snake_case ──────────────────────
function toCamel(str) {
    return str.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
}
function toSnake(str) {
    return str.replace(/[A-Z]/g, c => `_${c.toLowerCase()}`);
}
function convertKeys(obj, converter) {
    if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return obj;
    const result = {};
    for (const key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
            result[converter(key)] = obj[key];
        }
    }
    return result;
}

// ── readDb: fetch all rows from a table ─────────────────────────
export async function readDb(collection) {
    try {
        const { data, error } = await supabaseAdmin
            .from(collection)
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            console.error(`[db] readDb ${collection} error:`, error.message, error.details);
            return { items: [] };
        }
        return { items: (data || []).map(row => convertKeys(row, toCamel)) };
    } catch (e) {
        console.error(`[db] readDb ${collection} exception:`, e.message);
        return { items: [] };
    }
}

// ── addItem: insert one row ──────────────────────────────────────
export async function addItem(collection, item) {
    try {
        const snakeItem = convertKeys(item, toSnake);
        const { data, error } = await supabaseAdmin
            .from(collection)
            .insert(snakeItem)
            .select()
            .single();

        if (error) {
            console.error(`[db] addItem ${collection} error:`, error.message, error.details, error.hint);
            // Rethrow so callers can detect failure
            throw new Error(error.message);
        }
        return convertKeys(data, toCamel);
    } catch (e) {
        console.error(`[db] addItem ${collection} exception:`, e.message);
        throw e; // Propagate — don't silently swallow
    }
}

// ── updateItem: update one row by id ────────────────────────────
export async function updateItem(collection, id, updates) {
    try {
        const snakeUpdates = convertKeys(updates, toSnake);
        const { data, error } = await supabaseAdmin
            .from(collection)
            .update(snakeUpdates)
            .eq('id', id)
            .select()
            .single();

        if (error) {
            console.error(`[db] updateItem ${collection} error:`, error.message, error.details);
            throw new Error(error.message);
        }
        return convertKeys(data, toCamel);
    } catch (e) {
        console.error(`[db] updateItem ${collection} exception:`, e.message);
        throw e;
    }
}

// ── deleteItem: delete one row by id ────────────────────────────
export async function deleteItem(collection, id) {
    try {
        const { error } = await supabaseAdmin
            .from(collection)
            .delete()
            .eq('id', id);

        if (error) {
            console.error(`[db] deleteItem ${collection} error:`, error.message);
            throw new Error(error.message);
        }
        return true;
    } catch (e) {
        console.error(`[db] deleteItem ${collection} exception:`, e.message);
        throw e;
    }
}

// ── writeDb: bulk upsert (legacy support) ───────────────────────
export async function writeDb(collection, dbData) {
    if (!dbData || !dbData.items) return dbData;
    try {
        const snakeItems = dbData.items.map(i => convertKeys(i, toSnake));
        const { error } = await supabaseAdmin.from(collection).upsert(snakeItems);
        if (error) {
            console.error(`[db] writeDb ${collection} error:`, error.message);
        }
    } catch (e) {
        console.error(`[db] writeDb ${collection} exception:`, e.message);
    }
    return dbData;
}
