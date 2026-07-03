export function getMidtransApiBaseUrl() {
    return process.env.MIDTRANS_API_BASE_URL || 'https://api.sandbox.midtrans.com';
}

export function getMidtransSnapBaseUrl() {
    return process.env.MIDTRANS_SNAP_BASE_URL || 'https://app.sandbox.midtrans.com';
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

    if (['cancel', 'deny', 'expire', 'expired', 'failure'].includes(transactionStatus)) {
        return 'expired';
    }

    return 'pending';
}

export function getPaidAtForStatus(normalizedStatus, midtransData = {}) {
    if (normalizedStatus !== 'paid') return null;
    const midtransPaidAt = midtransData.settlement_time || midtransData.transaction_time;
    if (midtransPaidAt) return new Date(midtransPaidAt.replace(' ', 'T') + '+07:00').toISOString();
    return new Date().toISOString();
}

export function getMidtransActionUrl(midtransData = {}, names = []) {
    const actions = Array.isArray(midtransData.actions) ? midtransData.actions : [];
    return actions.find(action => names.includes(action.name))?.url || null;
}

export function extractMidtransActions(midtransData = {}) {
    const actions = Array.isArray(midtransData.actions) ? midtransData.actions : [];
    return {
        qrCodeUrl: getMidtransActionUrl(midtransData, ['generate-qr-code-v2', 'generate-qr-code']),
        deeplinkUrl: getMidtransActionUrl(midtransData, ['deeplink-redirect']),
        statusUrl: getMidtransActionUrl(midtransData, ['get-status']),
        actions: actions.map(action => ({
            name: action.name,
            method: action.method,
            url: action.url,
        })),
    };
}

export function getMidtransPaymentLabel(paymentType, midtransData = {}) {
    if (paymentType === 'qris') return `${(midtransData.acquirer || midtransData.issuer || 'QRIS').toString().toUpperCase()} QRIS`;
    if (paymentType === 'gopay') return 'GoPay';
    if (paymentType === 'bank_transfer') return 'Bank Transfer';
    if (paymentType === 'credit_card') return 'Kartu Kredit';
    if (paymentType === 'echannel') return 'Mandiri Bill';
    if (paymentType === 'cstore') return 'Convenience Store';
    if (paymentType === 'shopeepay') return 'ShopeePay';
    return paymentType || 'Belum dipilih';
}

export function isMidtransQrPayment(midtransData = {}) {
    const paymentType = midtransData.payment_type;
    const acquirer = midtransData.acquirer || midtransData.issuer;
    const qrAction = getMidtransActionUrl(midtransData, ['generate-qr-code-v2', 'generate-qr-code']);
    return ['qris', 'gopay'].includes(paymentType) || acquirer === 'gopay' || Boolean(qrAction);
}

export function describeMidtransStatus(midtransData = {}, localOrder = null) {
    const transactionStatus = midtransData.transaction_status || 'unknown';
    const fraudStatus = midtransData.fraud_status || null;
    const normalizedStatus = normalizeMidtransStatus(transactionStatus, fraudStatus);
    const paymentType = midtransData.payment_type || null;
    const paymentLabel = getMidtransPaymentLabel(paymentType, midtransData);
    const isQrPayment = isMidtransQrPayment(midtransData);
    const actionDetails = extractMidtransActions(midtransData);
    const providerMessage = midtransData.status_message || midtransData.channel_response_message || null;

    let displayStatus = 'Menunggu pembayaran';
    let paymentInstruction = 'Silakan selesaikan pembayaran, lalu cek status kembali.';

    if (transactionStatus === 'pending' && isQrPayment) {
        displayStatus = 'Menunggu scan/bayar QR';
        paymentInstruction = 'QR GoPay/QRIS sudah aktif. Scan QR, selesaikan pembayaran di aplikasi, lalu status akan berubah otomatis saat Midtrans mengirim settlement.';
    } else if (transactionStatus === 'pending') {
        displayStatus = 'Menunggu pembayaran';
        paymentInstruction = 'Transaksi sudah dibuat dan menunggu pembayaran dari pelanggan.';
    } else if (normalizedStatus === 'paid') {
        displayStatus = 'Pembayaran berhasil';
        paymentInstruction = 'Midtrans sudah mengonfirmasi pembayaran.';
    } else if (transactionStatus === 'expire' || transactionStatus === 'expired') {
        displayStatus = 'QR/Transaksi kadaluarsa';
        paymentInstruction = 'Batas waktu pembayaran sudah habis. Buat pesanan baru untuk mendapatkan QR baru.';
    } else if (transactionStatus === 'deny') {
        displayStatus = 'Pembayaran ditolak';
        paymentInstruction = providerMessage || 'Pembayaran ditolak oleh provider atau sistem fraud Midtrans.';
    } else if (transactionStatus === 'cancel') {
        displayStatus = 'Pembayaran dibatalkan';
        paymentInstruction = 'Transaksi dibatalkan dan belum ada dana yang diterima.';
    } else if (transactionStatus === 'failure') {
        displayStatus = 'Pembayaran gagal';
        paymentInstruction = providerMessage || 'Terjadi kegagalan saat memproses pembayaran.';
    }

    return {
        status: normalizedStatus,
        displayStatus,
        paymentInstruction,
        paymentType,
        paymentLabel,
        isQrPayment,
        qrCodeUrl: actionDetails.qrCodeUrl,
        deeplinkUrl: actionDetails.deeplinkUrl,
        statusUrl: actionDetails.statusUrl,
        actions: actionDetails.actions,
        acquirer: midtransData.acquirer || null,
        issuer: midtransData.issuer || null,
        transactionType: midtransData.transaction_type || null,
        expiryTime: midtransData.expiry_time || localOrder?.expires_at || localOrder?.expiresAt || null,
        checkedAt: new Date().toISOString(),
    };
}
