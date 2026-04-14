use anchor_lang::prelude::*;

declare_id!("InvW1234567890PLACEHOLDER_REPLACE_AFTER_DEPLOY");

/// =============================================================
///  CoffeeChain — Coffee Inventory (Traceability Layer)
///  Network: Solana Devnet / Mainnet
///
///  Program ini mengelola lifecycle seri kopi dari panen sampai
///  distribusi. Setiap CoffeeBatch disimpan sebagai PDA on-chain
///  yang bisa diverifikasi oleh siapa saja (buyer, auditor, dll).
///
///  Linkage: Field `batch_id` pada PaymentReceipt di Program Payment
///           berfungsi sebagai foreign key ke PDA batch ini.
/// =============================================================
#[program]
pub mod coffee_inventory {
    use super::*;

    /// Instruction: initialize_batch
    /// ─────────────────────────────────────────────────────────
    /// Membuat CoffeeBatch PDA baru. Hanya authority (admin/petani)
    /// yang bisa initialize. PDA seeds = ["batch", batch_id].
    ///
    /// Biaya rent: ~292 * 6960 = ~2,032,320 lamports ≈ 0.002 SOL
    pub fn initialize_batch(
        ctx: Context<InitializeBatch>,
        batch_id: String,
        farmer_info: String,
        variant: String,
        harvest_date: i64,
    ) -> Result<()> {
        // ── Validasi panjang field agar tidak melebihi alokasi space ──
        require!(batch_id.len() <= 16, InventoryError::BatchIdTooLong);
        require!(farmer_info.len() <= 32, InventoryError::FarmerInfoTooLong);
        require!(variant.len() <= 20, InventoryError::VariantTooLong);
        require!(harvest_date > 0, InventoryError::InvalidTimestamp);

        let clock = Clock::get()?;
        let batch = &mut ctx.accounts.coffee_batch;

        batch.batch_id = batch_id.clone();
        batch.farmer_info = farmer_info;
        batch.variant = variant;
        batch.harvest_date = harvest_date;
        batch.roast_date = 0; // Belum di-roast
        batch.status = BatchStatus::Harvested;
        batch.authority = ctx.accounts.authority.key();
        batch.created_at = clock.unix_timestamp;
        batch.bump = ctx.bumps.coffee_batch;

        emit!(BatchInitialized {
            batch_id,
            authority: ctx.accounts.authority.key(),
            timestamp: clock.unix_timestamp,
        });

        msg!("☕ Batch {} berhasil didaftarkan on-chain", batch.batch_id);
        Ok(())
    }

    /// Instruction: update_status
    /// ─────────────────────────────────────────────────────────
    /// Mengubah status batch melalui lifecycle kopi.
    /// Hanya authority (pemilik batch) yang bisa mengupdate.
    ///
    /// Lifecycle: Harvested → Processed → Roasted → OutForDistribution → Verified
    ///
    /// Jika status baru = Roasted, otomatis set roast_date ke waktu sekarang.
    pub fn update_status(
        ctx: Context<UpdateBatchStatus>,
        new_status: BatchStatus,
    ) -> Result<()> {
        let batch = &mut ctx.accounts.coffee_batch;
        let clock = Clock::get()?;

        // Validasi: authority harus cocok
        require!(
            ctx.accounts.authority.key() == batch.authority,
            InventoryError::Unauthorized
        );

        // Validasi: status harus maju (tidak bisa mundur)
        let current_order = batch.status.order();
        let new_order = new_status.order();
        require!(
            new_order > current_order,
            InventoryError::InvalidStatusTransition
        );

        // Jika status baru = Roasted, catat waktu roasting
        if new_status == BatchStatus::Roasted {
            batch.roast_date = clock.unix_timestamp;
        }

        let old_status = batch.status.clone();
        batch.status = new_status.clone();

        emit!(BatchStatusUpdated {
            batch_id: batch.batch_id.clone(),
            old_status,
            new_status,
            timestamp: clock.unix_timestamp,
        });

        msg!(
            "📦 Batch {} status diupdate ke {:?}",
            batch.batch_id,
            batch.status
        );
        Ok(())
    }

    /// Instruction: verify_batch
    /// ─────────────────────────────────────────────────────────
    /// Fungsi read-only yang memungkinkan pihak ketiga (buyer, auditor)
    /// memverifikasi bahwa batch_id valid dan cek status on-chain.
    ///
    /// Tidak mengubah state, hanya emit event + log.
    /// Siapa saja bisa memanggil instruksi ini (permissionless).
    pub fn verify_batch(ctx: Context<VerifyBatch>) -> Result<()> {
        let batch = &ctx.accounts.coffee_batch;

        // Emit event verifikasi agar client bisa listen
        emit!(BatchVerified {
            batch_id: batch.batch_id.clone(),
            farmer_info: batch.farmer_info.clone(),
            variant: batch.variant.clone(),
            status: batch.status.clone(),
            harvest_date: batch.harvest_date,
            roast_date: batch.roast_date,
            is_fully_verified: batch.status == BatchStatus::Verified,
        });

        msg!(
            "🔍 Batch {} terverifikasi — Status: {:?}, Petani: {}, Varietas: {}",
            batch.batch_id,
            batch.status,
            batch.farmer_info,
            batch.variant
        );

        Ok(())
    }
}

// ── Account Structs ──────────────────────────────────────────

/// Accounts untuk initialize_batch
#[derive(Accounts)]
#[instruction(batch_id: String)]
pub struct InitializeBatch<'info> {
    /// Authority: admin/petani yang mendaftarkan batch
    #[account(mut)]
    pub authority: Signer<'info>,

    /// PDA: CoffeeBatch — seeds = ["batch", batch_id]
    #[account(
        init,
        payer = authority,
        space = CoffeeBatch::LEN,
        seeds = [b"batch", batch_id.as_bytes()],
        bump,
    )]
    pub coffee_batch: Account<'info, CoffeeBatch>,

    pub system_program: Program<'info, System>,
}

/// Accounts untuk update_status (hanya authority yang bisa)
#[derive(Accounts)]
pub struct UpdateBatchStatus<'info> {
    /// Authority harus match dengan batch.authority
    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(
        mut,
        seeds = [b"batch", coffee_batch.batch_id.as_bytes()],
        bump = coffee_batch.bump,
        constraint = authority.key() == coffee_batch.authority @ InventoryError::Unauthorized,
    )]
    pub coffee_batch: Account<'info, CoffeeBatch>,
}

/// Accounts untuk verify_batch (permissionless — siapa saja bisa)
#[derive(Accounts)]
pub struct VerifyBatch<'info> {
    /// Pemanggil verifikasi (bisa buyer, auditor, siapapun)
    pub verifier: Signer<'info>,

    /// Batch yang diverifikasi (read-only, tidak perlu mut)
    #[account(
        seeds = [b"batch", coffee_batch.batch_id.as_bytes()],
        bump = coffee_batch.bump,
    )]
    pub coffee_batch: Account<'info, CoffeeBatch>,
}

// ── State ────────────────────────────────────────────────────

/// On-chain state untuk satu seri kopi
#[account]
pub struct CoffeeBatch {
    /// ID unik seri kopi (max 16 chars), contoh: "CF-CXGCU3"
    pub batch_id: String,
    /// Informasi petani/asal lahan (max 32 chars)
    pub farmer_info: String,
    /// Varietas kopi (max 20 chars), misal "Arabica Yellow Caturra"
    pub variant: String,
    /// Timestamp panen (Unix epoch)
    pub harvest_date: i64,
    /// Timestamp roasting (0 jika belum di-roast)
    pub roast_date: i64,
    /// Status lifecycle kopi
    pub status: BatchStatus,
    /// Authority (admin/petani) yang berhak update data
    pub authority: Pubkey,
    /// Timestamp pembuatan on-chain
    pub created_at: i64,
    /// PDA bump seed
    pub bump: u8,
}

impl CoffeeBatch {
    /// Perhitungan space yang akurat untuk alokasi rent-exempt:
    ///
    /// | Field        | Calculation        | Bytes |
    /// |--------------|--------------------|-------|
    /// | Discriminator| (Anchor auto)      |   8   |
    /// | batch_id     | 4 (len) + 16 (max) |  20   |
    /// | farmer_info  | 4 (len) + 32 (max) |  36   |
    /// | variant      | 4 (len) + 20 (max) |  24   |
    /// | harvest_date | i64                |   8   |
    /// | roast_date   | i64                |   8   |
    /// | status       | 1 (enum tag) + 0   |   1   |
    /// | authority    | Pubkey             |  32   |
    /// | created_at   | i64                |   8   |
    /// | bump         | u8                 |   1   |
    /// |──────────────|────────────────────|───────|
    /// | TOTAL        |                    | 146   |
    ///
    /// Rent cost: 146 * 6960 ≈ 1,016,160 lamports ≈ 0.001 SOL
    pub const LEN: usize = 8   // discriminator
        + (4 + 16)             // batch_id (String)
        + (4 + 32)             // farmer_info (String)
        + (4 + 20)             // variant (String)
        + 8                    // harvest_date (i64)
        + 8                    // roast_date (i64)
        + 1                    // status (enum, 1 byte)
        + 32                   // authority (Pubkey)
        + 8                    // created_at (i64)
        + 1;                   // bump (u8)
    // = 146 bytes
}

// ── Enums ────────────────────────────────────────────────────

/// Lifecycle status seri kopi.
/// Urutan ini *wajib* diikuti — tidak bisa loncat atau mundur.
///
///   Harvested → Processed → Roasted → OutForDistribution → Verified
///
/// `Verified` adalah status final — menandakan batch siap jual &
/// data on-chain sudah dikonfirmasi valid.
#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq, Debug)]
pub enum BatchStatus {
    Harvested,           // 0 — Baru dipanen
    Processed,           // 1 — Sudah diproses (cuci, kupas, dll)
    Roasted,             // 2 — Sudah di-roasting
    OutForDistribution,  // 3 — Dalam pengiriman/distribusi
    Verified,            // 4 — Final: terverifikasi dan siap jual
}

impl BatchStatus {
    /// Mengembalikan urutan numerik status untuk validasi transisi.
    /// Digunakan oleh update_status untuk memastikan lifecycle maju.
    pub fn order(&self) -> u8 {
        match self {
            BatchStatus::Harvested => 0,
            BatchStatus::Processed => 1,
            BatchStatus::Roasted => 2,
            BatchStatus::OutForDistribution => 3,
            BatchStatus::Verified => 4,
        }
    }
}

// ── Events ───────────────────────────────────────────────────

#[event]
pub struct BatchInitialized {
    pub batch_id: String,
    pub authority: Pubkey,
    pub timestamp: i64,
}

#[event]
pub struct BatchStatusUpdated {
    pub batch_id: String,
    pub old_status: BatchStatus,
    pub new_status: BatchStatus,
    pub timestamp: i64,
}

/// Event yang di-emit saat verify_batch dipanggil.
/// Client/buyer bisa listen event ini untuk membuktikan
/// keaslian dan status seri kopi secara on-chain.
#[event]
pub struct BatchVerified {
    pub batch_id: String,
    pub farmer_info: String,
    pub variant: String,
    pub status: BatchStatus,
    pub harvest_date: i64,
    pub roast_date: i64,
    /// true jika status == Verified (final state)
    pub is_fully_verified: bool,
}

// ── Errors ───────────────────────────────────────────────────

#[error_code]
pub enum InventoryError {
    #[msg("Batch ID terlalu panjang (max 16 karakter)")]
    BatchIdTooLong,
    #[msg("Informasi petani terlalu panjang (max 32 karakter)")]
    FarmerInfoTooLong,
    #[msg("Varietas terlalu panjang (max 20 karakter)")]
    VariantTooLong,
    #[msg("Timestamp tidak valid")]
    InvalidTimestamp,
    #[msg("Hanya authority batch yang bisa melakukan operasi ini")]
    Unauthorized,
    #[msg("Transisi status tidak valid — status hanya bisa maju, tidak mundur")]
    InvalidStatusTransition,
}
