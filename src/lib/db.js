import { promises as fs } from 'fs';
import path from 'path';

const dataDir = path.join(process.cwd(), 'data');

async function ensureFile(filePath, defaultData) {
    try {
        await fs.access(filePath);
    } catch {
        await fs.mkdir(dataDir, { recursive: true });
        await fs.writeFile(filePath, JSON.stringify(defaultData, null, 2));
    }
}

export async function readDb(collection) {
    const filePath = path.join(dataDir, `${collection}.json`);
    await ensureFile(filePath, { items: [] });
    const raw = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(raw);
}

export async function writeDb(collection, data) {
    const filePath = path.join(dataDir, `${collection}.json`);
    await fs.mkdir(dataDir, { recursive: true });
    await fs.writeFile(filePath, JSON.stringify(data, null, 2));
    return data;
}

export async function addItem(collection, item) {
    const db = await readDb(collection);
    db.items.unshift(item);
    await writeDb(collection, db);
    return item;
}

export async function deleteItem(collection, id) {
    const db = await readDb(collection);
    db.items = db.items.filter(i => i.id !== id);
    await writeDb(collection, db);
    return true;
}

export async function updateItem(collection, id, updates) {
    const db = await readDb(collection);
    const idx = db.items.findIndex(i => i.id === id);
    if (idx >= 0) {
        db.items[idx] = { ...db.items[idx], ...updates };
        await writeDb(collection, db);
        return db.items[idx];
    }
    return null;
}
