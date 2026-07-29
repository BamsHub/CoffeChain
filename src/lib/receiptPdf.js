function safeText(value, fallback = '-') {
    if (value === null || value === undefined || value === '') return fallback;
    return String(value);
}

function money(value) {
    return `Rp ${Number(value || 0).toLocaleString('id-ID')}`;
}

function dateTime(value) {
    if (!value) return '-';
    return new Date(String(value).replace(' ', 'T')).toLocaleString('id-ID');
}

function paymentMethodLabel(method) {
    if (method === 'midtrans') return 'Midtrans';
    if (method === 'transfer') return 'Transfer SOL';
    if (method === 'qr') return 'Solana Pay QR';
    if (method === 'transfer-idr') return 'Transfer IDR';
    if (method === 'qr-idr') return 'QR IDR';
    return safeText(method);
}

function drawRow(doc, label, value, y, options = {}) {
    doc.setDrawColor(226, 232, 240);
    doc.line(20, y + 6, 190, y + 6);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text(label, 20, y);
    doc.setFont('helvetica', options.bold === false ? 'normal' : 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text(safeText(value), 190, y, { align: 'right', maxWidth: 112 });
}

export async function buildReceiptPdf({
    order,
    receiptUrl,
    certificationUrl,
    explorerUrl,
}) {
    const [{ jsPDF }, qrModule] = await Promise.all([
        import('jspdf'),
        import('qrcode'),
    ]);
    const QRCode = qrModule.default;
    const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });

    doc.setFillColor(16, 45, 31);
    doc.rect(0, 0, 210, 38, 'F');
    doc.setTextColor(126, 212, 74);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('COFFEECHAIN', 20, 14);
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.text('Receipt Transaksi', 20, 27);

    const qrDataUrl = await QRCode.toDataURL(receiptUrl, {
        width: 320,
        margin: 1,
        color: { dark: '#102D1F', light: '#FFFFFF' },
    });
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(158, 6, 34, 34, 2, 2, 'F');
    doc.addImage(qrDataUrl, 'PNG', 160, 8, 30, 30);

    doc.setFillColor(240, 253, 244);
    doc.roundedRect(20, 47, 170, 17, 3, 3, 'F');
    doc.setTextColor(22, 101, 52);
    doc.setFontSize(10);
    doc.text('Pembayaran Berhasil', 26, 55);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(`Order ${safeText(order.orderId)}`, 26, 60);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(15, 23, 42);
    doc.text('Detail Pembelian', 20, 76);

    const ppnPercent = Number(order.ppnRate || 0) * 100;
    const rows = [
        ['Produk', order.productName],
        ['Metode', paymentMethodLabel(order.paymentMethod)],
        ['Jumlah', `${order.quantity || 1} x ${safeText(order.weight)}g`],
        ['Subtotal', money(order.subtotalPrice ?? order.totalPrice)],
        ['Biaya trace Solana', money(order.solanaTraceFee)],
        [`PPN Indonesia ${ppnPercent}%`, money(order.ppnAmount)],
        ['Total dibayar', money(order.totalPrice)],
        ['Dibuat', dateTime(order.createdAt)],
        ['Dibayar', dateTime(order.paidAt)],
    ];
    rows.forEach(([label, value], index) => drawRow(doc, label, value, 87 + (index * 10)));

    const traceTop = 184;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(15, 23, 42);
    doc.text('Trace Pembayaran Solana', 20, traceTop);

    doc.setFillColor(248, 250, 252);
    doc.roundedRect(20, traceTop + 7, 170, 55, 3, 3, 'F');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text('COFFEE ID PRODUK', 26, traceTop + 17);
    doc.setFont('courier', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(22, 101, 52);
    doc.text(safeText(order.coffeeId, 'Belum tersedia'), 26, traceTop + 24);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text('PAYMENT TRACE', 26, traceTop + 34);
    doc.setFont('courier', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(76, 29, 149);
    const signatureText = safeText(
        order.txSignature,
        order.solanaTraceError || 'Sinkronisasi trace on-chain',
    );
    doc.text(doc.splitTextToSize(signatureText, 156), 26, traceTop + 41);

    let linkY = traceTop + 72;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(22, 101, 52);
    if (certificationUrl) {
        doc.textWithLink('Lihat Sertifikasi Produk', 20, linkY, { url: certificationUrl });
        linkY += 8;
    }
    if (explorerUrl) {
        doc.setTextColor(109, 40, 217);
        doc.textWithLink('Lihat Payment Trace di Solana Explorer', 20, linkY, { url: explorerUrl });
    }

    doc.setDrawColor(226, 232, 240);
    doc.line(20, 278, 190, 278);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text('Receipt online:', 20, 284);
    doc.textWithLink('Buka receipt online', 42, 284, { url: receiptUrl });
    doc.text('CoffeeChain - Solana Testnet', 190, 290, { align: 'right' });

    return doc;
}

export async function downloadReceiptPdf(options) {
    const doc = await buildReceiptPdf(options);
    doc.save(`CoffeeChain-Receipt-${safeText(options.order?.orderId, 'order')}.pdf`);
}
