import {
    createVariantStockDeduction,
    getAvailableVariantStock,
    setTaggedVariantStocks,
} from '@/lib/productVariants';

export async function deductPaidOrderStock(supabase, order) {
    if (!order?.product_id) return null;

    const { data: product, error } = await supabase
        .from('products')
        .select('*')
        .eq('id', order.product_id)
        .maybeSingle();
    if (error) throw error;
    if (!product) return null;

    const weights = Array.isArray(product.weight) ? product.weight.map(Number) : [];
    const variantIndex = weights.indexOf(Number(order.weight));
    if (variantIndex < 0) throw new Error('Varian produk pada order tidak ditemukan');

    const quantity = Number(order.quantity || 1);
    const availableBefore = getAvailableVariantStock(product, variantIndex);
    const updates = createVariantStockDeduction(product, variantIndex, quantity);
    let { error: updateError } = await supabase
        .from('products')
        .update(updates)
        .eq('id', product.id);
    if (updateError && updates.stock_per_unit && /stock_per_unit/i.test(updateError.message || '')) {
        ({ error: updateError } = await supabase
            .from('products')
            .update({
                stock: updates.stock,
                tags: setTaggedVariantStocks(product.tags, updates.stock_per_unit),
            })
            .eq('id', product.id));
    }
    if (updateError) throw updateError;

    return {
        stockLeft: updates.stock,
        variantStockLeft: availableBefore - quantity,
    };
}
