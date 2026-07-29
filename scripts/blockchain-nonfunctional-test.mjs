import { readFile, writeFile } from 'node:fs/promises';
import { execSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Connection, LAMPORTS_PER_SOL } from '@solana/web3.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const rpcUrl = process.env.SOLANA_RPC_URL || 'https://api.testnet.solana.com';
const requestCount = Math.max(10, Number(process.env.PERF_REQUESTS || 12));
const concurrency = Math.max(1, Math.min(20, Number(process.env.PERF_CONCURRENCY || 2)));
const connection = new Connection(rpcUrl, 'confirmed');
const wait = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds));

function percentile(values, ratio) {
    if (!values.length) return null;
    const sorted = [...values].sort((a, b) => a - b);
    return sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * ratio) - 1)];
}

function rounded(value, digits = 2) {
    return value == null ? null : Number(Number(value).toFixed(digits));
}

async function rpcRequest(id) {
    const started = performance.now();
    const response = await fetch(rpcUrl, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
            jsonrpc: '2.0',
            id,
            method: 'getLatestBlockhash',
            params: [{ commitment: 'confirmed' }],
        }),
    });
    const body = await response.json();
    const durationMs = performance.now() - started;
    if (!response.ok || body.error || !body.result?.value?.blockhash) {
        throw Object.assign(new Error(body.error?.message || `HTTP ${response.status}`), { durationMs });
    }
    return durationMs;
}

async function runReadLoad() {
    const durations = [];
    const errors = [];
    let nextId = 1;
    const started = performance.now();

    async function worker() {
        while (nextId <= requestCount) {
            const id = nextId;
            nextId += 1;
            try {
                durations.push(await rpcRequest(id));
            } catch (error) {
                errors.push({
                    id,
                    message: error.message,
                    durationMs: rounded(error.durationMs),
                });
            }
        }
    }

    await Promise.all(Array.from({ length: concurrency }, () => worker()));
    const elapsedSeconds = (performance.now() - started) / 1000;
    const totalLatency = durations.reduce((sum, value) => sum + value, 0);

    return {
        scope: 'Read-only JSON-RPC getLatestBlockhash load test; not Solana write TPS.',
        requests: requestCount,
        concurrency,
        successes: durations.length,
        failures: errors.length,
        errorRatePercent: rounded((errors.length / requestCount) * 100),
        elapsedSeconds: rounded(elapsedSeconds, 3),
        throughputRequestsPerSecond: rounded(durations.length / elapsedSeconds),
        latencyMs: {
            min: rounded(Math.min(...durations)),
            average: rounded(durations.length ? totalLatency / durations.length : null),
            p50: rounded(percentile(durations, 0.5)),
            p95: rounded(percentile(durations, 0.95)),
            p99: rounded(percentile(durations, 0.99)),
            max: rounded(Math.max(...durations)),
        },
        errors: errors.slice(0, 10),
    };
}

async function verifyHistoricalTransactions(perfResults) {
    const results = [];
    for (const item of perfResults.transactions || []) {
        const started = performance.now();
        try {
            const transaction = await connection.getTransaction(item.signature, {
                commitment: 'confirmed',
                maxSupportedTransactionVersion: 0,
            });
            results.push({
                signature: item.signature,
                slot: transaction?.slot ?? item.slot,
                found: Boolean(transaction),
                confirmedSuccess: Boolean(transaction && !transaction.meta?.err),
                blockTime: transaction?.blockTime ?? null,
                feeLamports: transaction?.meta?.fee ?? null,
                feeSol: transaction?.meta?.fee == null
                    ? null
                    : transaction.meta.fee / LAMPORTS_PER_SOL,
                computeUnitsConsumed: transaction?.meta?.computeUnitsConsumed ?? null,
                rpcLookupMs: rounded(performance.now() - started),
                historicalConfirmationSeconds: item.seconds,
            });
        } catch (error) {
            results.push({
                signature: item.signature,
                slot: item.slot,
                found: false,
                confirmedSuccess: false,
                blockTime: null,
                feeLamports: null,
                feeSol: null,
                computeUnitsConsumed: null,
                rpcLookupMs: rounded(performance.now() - started),
                historicalConfirmationSeconds: item.seconds,
                error: error.message,
            });
        }
        await wait(350);
    }
    return results;
}

async function runSecurityChecks() {
    const files = {
        memo: await readFile(path.join(root, 'src/lib/serverSolanaMemo.js'), 'utf8'),
        trace: await readFile(path.join(root, 'src/app/api/coffee-trace/route.js'), 'utf8'),
        payment: await readFile(path.join(root, 'src/lib/solanaPayment.js'), 'utf8'),
    };
    return [
        {
            control: 'Preflight enabled',
            passed: /skipPreflight:\s*false/.test(files.memo),
            evidence: 'sendRawTransaction rejects invalid transactions during preflight.',
        },
        {
            control: 'Confirmation required before persistence',
            passed: /waitForConfirmation/.test(files.memo) && /confirmationStatus/.test(files.memo),
            evidence: 'The server waits for confirmed/finalized transaction status.',
        },
        {
            control: 'Pinned signer verification',
            passed: /PINNED_MEMO_SIGNER_PUBLIC/.test(files.trace) && /expectedSigner/.test(files.memo),
            evidence: 'Stored certification signatures must include the configured server signer.',
        },
        {
            control: 'SOL amount and receiver verification',
            passed: /expectedLamports/.test(files.payment) && /receiverWallet/.test(files.payment),
            evidence: 'Payment verification checks sender, receiver, and exact lamport amount.',
        },
        {
            control: 'On-chain immutability guard',
            passed: /immutableSignature/.test(files.trace) && /verifySolanaTransaction/.test(files.trace),
            evidence: 'An existing confirmed certificate signature is verified and reused, not overwritten.',
        },
    ];
}

function runDependencyAudit() {
    const checkedAt = new Date().toISOString();
    let output = '';
    try {
        output = execSync('npm audit --omit=dev --json', {
            cwd: root,
            encoding: 'utf8',
            stdio: ['ignore', 'pipe', 'pipe'],
        });
    } catch (error) {
        output = String(error.stdout || '');
        if (!output.trim()) {
            return {
                checkedAt,
                completed: false,
                scope: 'Production dependencies',
                message: String(error.message || 'Dependency audit failed'),
            };
        }
    }

    try {
        const audit = JSON.parse(output);
        const counts = audit.metadata?.vulnerabilities || {};
        return {
            checkedAt,
            completed: true,
            scope: 'Production dependencies',
            counts,
            affectedPackages: Object.entries(audit.vulnerabilities || {}).map(([name, value]) => ({
                name,
                severity: value.severity,
                direct: Boolean(value.isDirect),
            })),
            interpretation: 'An advisory scan is not a penetration test; High or Critical findings must not be reported as zero.',
        };
    } catch (error) {
        return {
            checkedAt,
            completed: false,
            scope: 'Production dependencies',
            message: `Dependency audit output could not be parsed: ${error.message}`,
        };
    }
}

function determineBottleneck(readLoad, historical) {
    const findings = [];
    if (readLoad.failures > 0) {
        findings.push('Public Testnet RPC rate limiting or transient RPC errors are the primary observed load bottleneck.');
    }
    if (
        readLoad.latencyMs.p95 != null
        && readLoad.latencyMs.p50 != null
        && readLoad.latencyMs.p95 > readLoad.latencyMs.p50 * 2
    ) {
        findings.push('High p95-to-median spread indicates RPC/network latency variability.');
    }
    const writeAverageMs = (historical.summary?.avg_seconds || 0) * 1000;
    if (writeAverageMs > (readLoad.latencyMs.average || 0)) {
        findings.push('Transaction confirmation is slower than a read-only RPC call and dominates end-to-end blockchain response time.');
    }
    if (!findings.length) findings.push('No error bottleneck was observed at this small read-only load; database, IPFS, and write concurrency require separate tests.');
    return findings;
}

const historical = JSON.parse(await readFile(path.join(root, 'perf_results.json'), 'utf8'));
const startedAt = new Date().toISOString();
const securityChecks = await runSecurityChecks();
const dependencyAudit = runDependencyAudit();
const transactions = await verifyHistoricalTransactions(historical);
await wait(1500);
const readLoad = await runReadLoad();
const verifiedFees = transactions.map(item => item.feeLamports).filter(Number.isFinite);
const fallbackPerTransaction = historical.summary?.total
    ? Math.round((historical.summary.cost_sol * LAMPORTS_PER_SOL) / historical.summary.total)
    : null;
const actualAverageFeeLamports = verifiedFees.length
    ? verifiedFees.reduce((sum, value) => sum + value, 0) / verifiedFees.length
    : fallbackPerTransaction;

const report = {
    generatedAt: new Date().toISOString(),
    startedAt,
    network: historical.summary?.network || 'solana-testnet',
    rpcUrl,
    writeConfirmationSample: {
        scope: 'Three historical CoffeeChain Memo transactions; this sample is not network TPS.',
        transactions: historical.summary?.total || transactions.length,
        successes: historical.summary?.success || transactions.filter(item => item.confirmedSuccess).length,
        latencySeconds: {
            min: historical.summary?.min_seconds ?? null,
            average: historical.summary?.avg_seconds ?? null,
            max: historical.summary?.max_seconds ?? null,
        },
        exactTransactions: transactions,
    },
    readRpcLoadTest: readLoad,
    securityChecks,
    dependencyAudit,
    feeAudit: {
        source: verifiedFees.length
            ? 'Confirmed transaction meta.fee from Solana getTransaction'
            : 'Historical wallet balance delta in perf_results.json',
        verifiedTransactionCount: verifiedFees.length,
        averageTotalFeeLamports: rounded(actualAverageFeeLamports, 0),
        averageTotalFeeSol: actualAverageFeeLamports == null
            ? null
            : actualAverageFeeLamports / LAMPORTS_PER_SOL,
        historicalConfiguration: {
            signatures: 1,
            baseFeeLamports: 5_000,
            computeUnitLimit: 200_000,
            microLamportsPerCu: 1_000,
            priorityFeeLamports: 200,
            expectedTotalLamports: 5_200,
        },
        optimizedImplementation: {
            method: 'Simulate transaction, add 10% CU safety margin, then use confirmed meta.fee as the final amount.',
            fallbackComputeUnitLimit: 200_000,
            minimumComputeUnitLimit: 10_000,
            microLamportsPerCu: 1_000,
        },
        formula: 'priority fee = ceil(CU limit x microLamports per CU / 1,000,000); total = base fee + priority fee',
    },
    bottleneckFindings: determineBottleneck(readLoad, historical),
    limitations: [
        'Read RPC throughput is not equivalent to Solana write TPS.',
        'The write sample contains only three transactions and must not be generalized to the full network.',
        'IPFS, Supabase, browser rendering, and multi-user end-to-end load require separate scenarios.',
        'Testnet measurements can change with RPC provider and network conditions.',
        'Static controls and npm advisory scanning are not substitutes for penetration testing or a smart-contract audit.',
    ],
};

const output = path.join(root, 'src/data/blockchainNonFunctionalReport.json');
await writeFile(output, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
process.stdout.write(`${output}\n`);
