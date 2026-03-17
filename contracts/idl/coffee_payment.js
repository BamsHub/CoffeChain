/**
 * IDL (Interface Definition Language) untuk CoffeeChain Smart Contract
 * Di-generate oleh `anchor build` dan dipakai oleh frontend (PaymentModal.jsx)
 * 
 * Jika sudah deploy: ganti PROGRAM_ID dengan ID dari `solana address -k target/deploy/coffee_payment-keypair.json`
 */

export const COFFEE_PAYMENT_PROGRAM_ID = "CoffW1234567890PLACEHOLDER_REPLACE_AFTER_DEPLOY";

export const IDL = {
    "version": "0.1.0",
    "name": "coffee_payment",
    "instructions": [
        {
            "name": "payForCoffee",
            "accounts": [
                { "name": "buyer", "isMut": true, "isSigner": true },
                { "name": "storeWallet", "isMut": true, "isSigner": false },
                { "name": "paymentReceipt", "isMut": true, "isSigner": false },
                { "name": "systemProgram", "isMut": false, "isSigner": false }
            ],
            "args": [
                { "name": "orderId", "type": "string" },
                { "name": "productId", "type": "string" },
                { "name": "amountLamports", "type": "u64" },
                { "name": "marketId", "type": "string" }
            ]
        },
        {
            "name": "refundPayment",
            "accounts": [
                { "name": "storeWallet", "isMut": true, "isSigner": true },
                { "name": "buyer", "isMut": true, "isSigner": false },
                { "name": "paymentReceipt", "isMut": true, "isSigner": false },
                { "name": "systemProgram", "isMut": false, "isSigner": false }
            ],
            "args": []
        }
    ],
    "accounts": [
        {
            "name": "PaymentReceipt",
            "type": {
                "kind": "struct",
                "fields": [
                    { "name": "orderId", "type": "string" },
                    { "name": "productId", "type": "string" },
                    { "name": "marketId", "type": "string" },
                    { "name": "buyer", "type": "publicKey" },
                    { "name": "store", "type": "publicKey" },
                    { "name": "amountLamports", "type": "u64" },
                    { "name": "paidAt", "type": "i64" },
                    { "name": "status", "type": { "defined": "PaymentStatus" } },
                    { "name": "bump", "type": "u8" }
                ]
            }
        }
    ],
    "types": [
        {
            "name": "PaymentStatus",
            "type": {
                "kind": "enum",
                "variants": [
                    { "name": "Paid" },
                    { "name": "Refunded" }
                ]
            }
        }
    ],
    "events": [
        {
            "name": "PaymentConfirmed",
            "fields": [
                { "name": "orderId", "type": "string", "index": false },
                { "name": "buyer", "type": "publicKey", "index": false },
                { "name": "store", "type": "publicKey", "index": false },
                { "name": "amountLamports", "type": "u64", "index": false },
                { "name": "paidAt", "type": "i64", "index": false }
            ]
        },
        {
            "name": "PaymentRefunded",
            "fields": [
                { "name": "orderId", "type": "string", "index": false },
                { "name": "buyer", "type": "publicKey", "index": false },
                { "name": "refundAmount", "type": "u64", "index": false }
            ]
        }
    ],
    "errors": [
        { "code": 6000, "name": "OrderIdTooLong", "msg": "Order ID terlalu panjang (max 36 karakter)" },
        { "code": 6001, "name": "ProductIdTooLong", "msg": "Product ID terlalu panjang (max 20 karakter)" },
        { "code": 6002, "name": "InvalidAmount", "msg": "Jumlah pembayaran tidak valid" },
        { "code": 6003, "name": "InsufficientFunds", "msg": "Saldo SOL tidak cukup" },
        { "code": 6004, "name": "AlreadyRefunded", "msg": "Pembayaran sudah di-refund" },
        { "code": 6005, "name": "Unauthorized", "msg": "Hanya store wallet yang bisa refund" },
        { "code": 6006, "name": "SameAccount", "msg": "Buyer dan store tidak boleh sama" }
    ]
};
