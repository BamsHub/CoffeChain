# CoffeeChain Solana Identity — CAUTION

These rules are mandatory for every AI or developer working in this repository.

## Pinned Testnet server wallet

- Network: Solana Testnet
- Server Memo signer public key: `8erURhHZgSvoFeXAJSDWzk2JDEiLsWeKq11zpiPs7AhJ`
- `STORE_WALLET`, `FARMER_WALLET`, and `PINNED_MEMO_SIGNER_PUBLIC` must resolve to this same public key.
- All Phantom SOL payments must transfer into this wallet. The buyer wallet must be a different public key; a wallet cannot make a real payment to itself.
- Product registration/certification on Testnet is signed by this server wallet, and its network fee is paid from this wallet through `MEMO_SIGNER_SECRET_KEY`.
- Explorer address: `https://explorer.solana.com/address/8erURhHZgSvoFeXAJSDWzk2JDEiLsWeKq11zpiPs7AhJ?cluster=testnet`

Never replace this public key or create a new signer unless the repository owner explicitly requests a wallet rotation. Never write the secret key to source code, logs, documentation, commits, chat, or screenshots.

## Immutable signatures

- A non-null `coffee_traces.tx_signature` is the permanent product-certificate signature.
- A non-null `orders.tx_signature` is the permanent payment-receipt signature.
- Once either signature is stored, never overwrite, regenerate, backfill, or "repair" it.
- Automatic tracing and batch jobs may only write a signature when the database field is still `NULL`.
- If an existing signature cannot be confirmed, report it for manual investigation. Do not replace it.
- Explorer URLs must always be derived from the stored signature with `?cluster=testnet`.

## Artifact separation

- Registering a new product creates one product certificate.
- A payment creates a receipt and one payment trace; it must never create or replace a product certificate.
- Checkout and payment require a valid authenticated account.
- All current account roles may pay: `farmer`, `koperasi`, `developer`, and `admin`.
- Roles `developer` and `admin` are equivalent administrator roles for payment access.
- Never make a payment endpoint public: signed JWT verification and order ownership checks remain mandatory.

Current reference records after the July 25, 2026 repair:

- Product certificate `CF-BE0076`: `5sq3DC7D3t2kj35wUYotU791kWtoWRF2jJFUzHKNEnqVNuE54kMXQ4P6UF3PcBdmpk5yqJj5B9yqgGz73qkQseMd`
- Payment receipt `ORD-MS0DKQWW`: `4QcKd47A5iYUQeNShXeWt4LsMheyhvFJ1mj2QFk3tEVLUL8vwPXmEPhR7VAEmXXXg3CVYqmgUzom9x8x23WFfrKU`
