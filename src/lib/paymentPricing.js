const DEFAULT_INDONESIA_PPN_RATE = 0.11;
const DEFAULT_SOLANA_TRACE_FEE_IDR = 1_000;

function parseNonNegativeNumber(value, fallback) {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

export function getPaymentPricingConfig() {
    const ppnRate = parseNonNegativeNumber(
        process.env.NEXT_PUBLIC_INDONESIA_PPN_RATE,
        DEFAULT_INDONESIA_PPN_RATE,
    );
    const solanaTraceFee = Math.round(parseNonNegativeNumber(
        process.env.NEXT_PUBLIC_SOLANA_TRACE_FEE_IDR,
        DEFAULT_SOLANA_TRACE_FEE_IDR,
    ));

    return {
        ppnRate,
        ppnPercent: ppnRate * 100,
        solanaTraceFee,
    };
}

export function calculatePaymentPricing({ unitPrice, quantity = 1 }) {
    const normalizedUnitPrice = Math.max(0, Math.round(Number(unitPrice) || 0));
    const normalizedQuantity = Math.max(1, Math.floor(Number(quantity) || 1));
    const { ppnRate, ppnPercent, solanaTraceFee } = getPaymentPricingConfig();

    const subtotalPrice = normalizedUnitPrice * normalizedQuantity;
    const taxableBase = subtotalPrice + solanaTraceFee;
    const ppnAmount = Math.round(taxableBase * ppnRate);
    const totalPrice = taxableBase + ppnAmount;

    return {
        unitPrice: normalizedUnitPrice,
        quantity: normalizedQuantity,
        subtotalPrice,
        taxableBase,
        ppnRate,
        ppnPercent,
        ppnAmount,
        solanaTraceFee,
        totalPrice,
    };
}

export function getStoredOrderPricing(order = {}) {
    const totalPrice = Math.max(0, Number(order.total_price ?? order.totalPrice ?? 0) || 0);
    const subtotalPrice = Math.max(
        0,
        Number(order.subtotal_price ?? order.subtotalPrice ?? totalPrice) || 0,
    );
    const ppnRate = Math.max(0, Number(order.ppn_rate ?? order.ppnRate ?? 0) || 0);
    const ppnAmount = Math.max(0, Number(order.ppn_amount ?? order.ppnAmount ?? 0) || 0);
    const solanaTraceFee = Math.max(
        0,
        Number(order.solana_trace_fee ?? order.solanaTraceFee ?? 0) || 0,
    );

    return {
        subtotalPrice,
        ppnRate,
        ppnPercent: ppnRate * 100,
        ppnAmount,
        solanaTraceFee,
        totalPrice,
    };
}
