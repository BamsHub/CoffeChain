use anchor_lang::prelude::*;
use anchor_lang::system_program;

declare_id!("CoffW1234567890PLACEHOLDER_REPLACE_AFTER_DEPLOY");

/// =============================================================
///  CoffeeChain — Smart Contract Pembayaran Kopi
///  Network: Solana Devnet / Mainnet
///  Gas: ~5000 lamports (< Rp 1) — paling hemat dengan Compute Budget
/// =============================================================
#[program]
pub mod coffee_payment {
    use super::*;

    /// Instruction: pay_for_coffee
    /// Buyer mengirim SOL ke store_wallet, program mencatat order on-chain.
    /// Gas sangat murah karena hanya SystemProgram.transfer + tulis 1 PDA kecil.
    pub fn pay_for_coffee(
        ctx: Context<PayForCoffee>,
        order_id: String,      // UUID order dari backend
        product_id: String,    // ID produk kopi
        amount_lamports: u64,  // Jumlah yang HARUS diterima store
        market_id: String,     // ID market (Pasar Kopi Aceh, dll.)
    ) -> Result<()> {
        let clock = Clock::get()?;

        require!(order_id.len() <= 36, CoffeeError::OrderIdTooLong);
        require!(product_id.len() <= 20, CoffeeError::ProductIdTooLong);
        require!(amount_lamports > 0, CoffeeError::InvalidAmount);
        require!(
            ctx.accounts.buyer.lamports() >= amount_lamports,
            CoffeeError::InsufficientFunds
        );

        // Transfer SOL dari buyer ke store wallet via CPI
        let cpi_ctx = CpiContext::new(
            ctx.accounts.system_program.to_account_info(),
            system_program::Transfer {
                from: ctx.accounts.buyer.to_account_info(),
                to: ctx.accounts.store_wallet.to_account_info(),
            },
        );
        system_program::transfer(cpi_ctx, amount_lamports)?;

        // Catat bukti pembayaran on-chain di PDA
        let receipt = &mut ctx.accounts.payment_receipt;
        receipt.order_id = order_id.clone();
        receipt.product_id = product_id.clone();
        receipt.buyer = ctx.accounts.buyer.key();
        receipt.store = ctx.accounts.store_wallet.key();
        receipt.amount_lamports = amount_lamports;
        receipt.market_id = market_id;
        receipt.paid_at = clock.unix_timestamp;
        receipt.status = PaymentStatus::Paid;
        receipt.bump = ctx.bumps.payment_receipt;

        emit!(PaymentConfirmed {
            order_id,
            buyer: ctx.accounts.buyer.key(),
            store: ctx.accounts.store_wallet.key(),
            amount_lamports,
            paid_at: clock.unix_timestamp,
        });

        msg!(
            "✅ Pembayaran berhasil: {} lamports dari {} ke {}",
            amount_lamports,
            ctx.accounts.buyer.key(),
            ctx.accounts.store_wallet.key()
        );

        Ok(())
    }

    /// Instruction: refund_payment
    /// Admin (store) bisa refund ke buyer jika ada masalah.
    pub fn refund_payment(ctx: Context<RefundPayment>) -> Result<()> {
        let receipt = &mut ctx.accounts.payment_receipt;

        require!(
            receipt.status == PaymentStatus::Paid,
            CoffeeError::AlreadyRefunded
        );
        require!(
            ctx.accounts.store_wallet.key() == receipt.store,
            CoffeeError::Unauthorized
        );

        // Transfer balik dari store ke buyer
        let refund_amount = receipt.amount_lamports;
        let cpi_ctx = CpiContext::new(
            ctx.accounts.system_program.to_account_info(),
            system_program::Transfer {
                from: ctx.accounts.store_wallet.to_account_info(),
                to: ctx.accounts.buyer.to_account_info(),
            },
        );
        system_program::transfer(cpi_ctx, refund_amount)?;

        receipt.status = PaymentStatus::Refunded;

        emit!(PaymentRefunded {
            order_id: receipt.order_id.clone(),
            buyer: receipt.buyer,
            refund_amount,
        });

        Ok(())
    }
}

// ── Account Structs ──────────────────────────────────────────

#[derive(Accounts)]
#[instruction(order_id: String, product_id: String)]
pub struct PayForCoffee<'info> {
    #[account(mut)]
    pub buyer: Signer<'info>,

    /// CHECK: Store wallet validated via constraint
    #[account(
        mut,
        constraint = store_wallet.key().to_string() != buyer.key().to_string() @ CoffeeError::SameAccount
    )]
    pub store_wallet: AccountInfo<'info>,

    /// PDA: bukti pembayaran — seeds = ["coffee-pay", order_id]
    /// Space dihitung minimal agar rent murah
    #[account(
        init,
        payer = buyer,
        space = PaymentReceipt::LEN,
        seeds = [b"coffee-pay", order_id.as_bytes()],
        bump,
    )]
    pub payment_receipt: Account<'info, PaymentReceipt>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct RefundPayment<'info> {
    #[account(mut)]
    pub store_wallet: Signer<'info>,

    /// CHECK: Buyer address from receipt
    #[account(mut, address = payment_receipt.buyer)]
    pub buyer: AccountInfo<'info>,

    #[account(
        mut,
        seeds = [b"coffee-pay", payment_receipt.order_id.as_bytes()],
        bump = payment_receipt.bump,
    )]
    pub payment_receipt: Account<'info, PaymentReceipt>,

    pub system_program: Program<'info, System>,
}

// ── State ────────────────────────────────────────────────────

#[account]
pub struct PaymentReceipt {
    pub order_id: String,           // max 36 chars (UUID)
    pub product_id: String,         // max 20 chars
    pub market_id: String,          // max 20 chars
    pub buyer: Pubkey,              // 32 bytes
    pub store: Pubkey,              // 32 bytes
    pub amount_lamports: u64,       // 8 bytes
    pub paid_at: i64,               // 8 bytes (unix timestamp)
    pub status: PaymentStatus,      // 1 byte
    pub bump: u8,                   // 1 byte
}

impl PaymentReceipt {
    // Discriminator(8) + String(4+36) + String(4+20) + String(4+20) + Pubkey(32)*2 + u64(8) + i64(8) + status(1+1) + bump(1)
    pub const LEN: usize = 8 + (4 + 36) + (4 + 20) + (4 + 20) + 32 + 32 + 8 + 8 + 2 + 1;
    // = 8 + 40 + 24 + 24 + 32 + 32 + 8 + 8 + 2 + 1 = 179 bytes
    // Rent-exempt cost: ~179 * 6960 lamports ≈ 1,245,000 lamports ≈ 0.00125 SOL ≈ Rp 2.5
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq)]
pub enum PaymentStatus {
    Paid,
    Refunded,
}

// ── Events ───────────────────────────────────────────────────

#[event]
pub struct PaymentConfirmed {
    pub order_id: String,
    pub buyer: Pubkey,
    pub store: Pubkey,
    pub amount_lamports: u64,
    pub paid_at: i64,
}

#[event]
pub struct PaymentRefunded {
    pub order_id: String,
    pub buyer: Pubkey,
    pub refund_amount: u64,
}

// ── Errors ───────────────────────────────────────────────────

#[error_code]
pub enum CoffeeError {
    #[msg("Order ID terlalu panjang (max 36 karakter)")]
    OrderIdTooLong,
    #[msg("Product ID terlalu panjang (max 20 karakter)")]
    ProductIdTooLong,
    #[msg("Jumlah pembayaran tidak valid")]
    InvalidAmount,
    #[msg("Saldo SOL tidak cukup")]
    InsufficientFunds,
    #[msg("Pembayaran sudah di-refund")]
    AlreadyRefunded,
    #[msg("Hanya store wallet yang bisa refund")]
    Unauthorized,
    #[msg("Buyer dan store tidak boleh sama")]
    SameAccount,
}
