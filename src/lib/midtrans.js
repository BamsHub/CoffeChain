export function getMidtransApiBaseUrl() {
    return process.env.MIDTRANS_API_BASE_URL || 'https://api.sandbox.midtrans.com';
}

export function getMidtransAuthHeader() {
    const serverKey = process.env.MIDTRANS_SERVER_KEY;
    if (!serverKey) throw new Error('MIDTRANS_SERVER_KEY environment variable is not set');
    return `Basic ${Buffer.from(`${serverKey}:`).toString('base64')}`;
}

export function normalizeMidtransStatus(transactionStatus, fraudStatus) {
    if (
        transactionStatus === 'settlement' ||
        (transactionStatus === 'capture' && (!fraudStatus || fraudStatus === 'accept'))
    ) {
        return 'paid';
    }

    if (['cancel', 'deny', 'expire', 'failure'].includes(transactionStatus)) {
        return 'expired';
    }

    return 'pending';
}

export function getPaidAtForStatus(normalizedStatus) {
    return normalizedStatus === 'paid' ? new Date().toISOString() : null;
}
