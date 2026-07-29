function toIntegerArray(value) {
    if (!Array.isArray(value)) return [];
    return value.map(item => Number(item));
}

const VARIANT_STOCK_TAG_PREFIX = 'variant-stock:';

export function getTaggedVariantStocks(tags) {
    if (!Array.isArray(tags)) return [];
    const tag = tags.find(item => String(item).startsWith(VARIANT_STOCK_TAG_PREFIX));
    if (!tag) return [];
    try {
        return toIntegerArray(JSON.parse(String(tag).slice(VARIANT_STOCK_TAG_PREFIX.length)));
    } catch {
        return [];
    }
}

export function setTaggedVariantStocks(tags, stocks) {
    const nextTags = (Array.isArray(tags) ? tags : [])
        .filter(tag => !String(tag).startsWith(VARIANT_STOCK_TAG_PREFIX));
    nextTags.push(`${VARIANT_STOCK_TAG_PREFIX}${JSON.stringify(stocks.map(Number))}`);
    return nextTags;
}

export function getProductVariantInventory(product = {}) {
    const weights = toIntegerArray(product.weight ?? product.weights);
    const prices = toIntegerArray(product.pricePerUnit ?? product.price_per_unit);
    const rawStocks = product.stockPerUnit
        ?? product.stock_per_unit
        ?? getTaggedVariantStocks(product.tags);
    const stocks = toIntegerArray(rawStocks);
    const totalStock = Number(product.stock) || 0;
    const hasVariantStock = (
        weights.length > 0
        && stocks.length === weights.length
        && stocks.every(stock => Number.isInteger(stock) && stock >= 0)
    );

    return {
        weights,
        prices,
        stocks: hasVariantStock ? stocks : [],
        totalStock,
        hasVariantStock,
    };
}

export function getAvailableVariantStock(product, variantIndex) {
    const inventory = getProductVariantInventory(product);
    if (inventory.hasVariantStock) return inventory.stocks[variantIndex] ?? 0;
    return inventory.totalStock;
}

export function createVariantStockDeduction(product, variantIndex, quantity) {
    const inventory = getProductVariantInventory(product);
    const normalizedQuantity = Number(quantity);

    if (!Number.isInteger(normalizedQuantity) || normalizedQuantity < 1) {
        throw new Error('Jumlah pengurangan stok tidak valid');
    }

    const availableStock = inventory.hasVariantStock
        ? (inventory.stocks[variantIndex] ?? 0)
        : inventory.totalStock;
    if (availableStock < normalizedQuantity) {
        throw new Error(`Stok varian tidak cukup. Tersedia: ${availableStock} unit`);
    }

    if (!inventory.hasVariantStock) {
        return {
            stock: inventory.totalStock - normalizedQuantity,
        };
    }

    const stockPerUnit = [...inventory.stocks];
    stockPerUnit[variantIndex] -= normalizedQuantity;
    return {
        stock: stockPerUnit.reduce((total, stock) => total + stock, 0),
        stock_per_unit: stockPerUnit,
    };
}

export function validateProductVariants({ weights, prices, stocks }) {
    if (!Array.isArray(weights) || !Array.isArray(prices) || !Array.isArray(stocks)) {
        return 'Ukuran, harga, dan stok per kemasan wajib berupa daftar';
    }
    if (weights.length !== prices.length || weights.length !== stocks.length) {
        return 'Setiap ukuran harus memiliki harga dan stoknya sendiri';
    }
    if (weights.length < 1 || weights.length > 6) {
        return 'Produk harus memiliki minimal 1 dan maksimal 6 varian kemasan';
    }

    const normalizedWeights = weights.map(Number);
    const normalizedPrices = prices.map(Number);
    const normalizedStocks = stocks.map(Number);

    if (normalizedWeights.some(value => !Number.isInteger(value) || value < 50 || value > 5000)) {
        return 'Berat produk harus berupa bilangan bulat antara 50 dan 5.000 gram';
    }
    if (new Set(normalizedWeights).size !== normalizedWeights.length) {
        return 'Ukuran kemasan tidak boleh duplikat';
    }
    if (normalizedPrices.some(value => !Number.isInteger(value) || value < 1000 || value > 10_000_000)) {
        return 'Harga produk harus berupa bilangan bulat antara Rp1.000 dan Rp10.000.000';
    }
    if (normalizedStocks.some(value => !Number.isInteger(value) || value < 0 || value > 1_000_000)) {
        return 'Stok setiap varian harus berupa bilangan bulat antara 0 dan 1.000.000';
    }
    if (normalizedStocks.reduce((total, stock) => total + stock, 0) > 1_000_000) {
        return 'Total stok seluruh varian maksimal 1.000.000 unit';
    }
    return null;
}
