import { LAMPORTS_PER_SOL } from '@solana/web3.js';

export const DEFAULT_MICRO_LAMPORTS_PER_CU = 1_000;
export const MAX_MEMO_COMPUTE_UNITS = 200_000;
export const MIN_MEMO_COMPUTE_UNITS = 10_000;
export const COMPUTE_SAFETY_MULTIPLIER = 1.1;

export function calculatePriorityFeeLamports(computeUnitLimit, microLamportsPerCu) {
    const units = Math.max(0, Number(computeUnitLimit) || 0);
    const price = Math.max(0, Number(microLamportsPerCu) || 0);
    return Math.ceil((units * price) / 1_000_000);
}

export function chooseComputeUnitLimit(unitsConsumed) {
    const measured = Number(unitsConsumed);
    if (!Number.isFinite(measured) || measured <= 0) return MAX_MEMO_COMPUTE_UNITS;
    return Math.min(
        MAX_MEMO_COMPUTE_UNITS,
        Math.max(MIN_MEMO_COMPUTE_UNITS, Math.ceil(measured * COMPUTE_SAFETY_MULTIPLIER)),
    );
}

export function buildSolanaFeeBreakdown({
    totalFeeLamports,
    computeUnitLimit,
    microLamportsPerCu,
    computeUnitsConsumed = null,
}) {
    const total = Number.isFinite(Number(totalFeeLamports)) ? Number(totalFeeLamports) : null;
    const priorityFeeLamports = calculatePriorityFeeLamports(computeUnitLimit, microLamportsPerCu);
    const baseFeeLamports = total == null ? null : Math.max(0, total - priorityFeeLamports);

    return {
        baseFeeLamports,
        priorityFeeLamports,
        totalFeeLamports: total,
        totalFeeSol: total == null ? null : total / LAMPORTS_PER_SOL,
        computeUnitLimit,
        computeUnitsConsumed,
        microLamportsPerCu,
        formula: 'total fee = base fee + ceil(CU limit x CU price / 1,000,000)',
        source: total == null ? 'estimated' : 'confirmed transaction meta.fee',
    };
}
