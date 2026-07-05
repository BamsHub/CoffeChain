import PinataSDK from '@pinata/sdk';
import { Readable } from 'stream';

// ============================================================
// CoffeeChain — Pinata IPFS Client Library
// ============================================================

let pinataClient = null;

/** Check if Pinata IPFS credentials are configured */
export function isIPFSConfigured() {
    return !!(
        process.env.PINATA_JWT
        || (process.env.PINATA_API_KEY && process.env.PINATA_API_SECRET)
    );
}

/** Lazy-init Pinata SDK client */
export function getPinataClient() {
    if (pinataClient) return pinataClient;

    if (!isIPFSConfigured()) {
        throw new Error('PINATA_JWT or PINATA_API_KEY and PINATA_API_SECRET environment variables are required');
    }

    pinataClient = new PinataSDK(process.env.PINATA_JWT
        ? { pinataJWTKey: process.env.PINATA_JWT }
        : {
            pinataApiKey: process.env.PINATA_API_KEY,
            pinataSecretApiKey: process.env.PINATA_API_SECRET,
        });

    console.log('[IPFS] Pinata client initialized');
    return pinataClient;
}

/**
 * Pin a file buffer to IPFS via Pinata
 * @param {Buffer} buffer - File contents as a Buffer
 * @param {string} filename - Original filename
 * @param {object} [metadata] - Optional metadata keyvalues
 * @returns {{ IpfsHash: string, PinSize: number, Timestamp: string, gatewayUrl: string }}
 */
export async function pinFileToIPFS(buffer, filename, metadata = {}) {
    const pinata = getPinataClient();

    const stream = Readable.from(buffer);
    // Pinata SDK requires a path property on the stream
    stream.path = filename;

    const options = {
        pinataMetadata: {
            name: filename,
            ...(Object.keys(metadata).length > 0 ? { keyvalues: metadata } : {}),
        },
        pinataOptions: {
            cidVersion: 1,
        },
    };

    console.log(`[IPFS] Pinning file: ${filename} (${buffer.length} bytes)`);

    const result = await pinata.pinFileToIPFS(stream, options);

    console.log(`[IPFS] File pinned — CID: ${result.IpfsHash}`);

    return {
        IpfsHash: result.IpfsHash,
        PinSize: result.PinSize,
        Timestamp: result.Timestamp,
        gatewayUrl: getIPFSGatewayUrl(result.IpfsHash),
    };
}

/**
 * Pin a JSON object to IPFS via Pinata
 * @param {object} jsonObject - JSON data to pin
 * @param {string} name - Descriptive name for the pin
 * @returns {{ IpfsHash: string, PinSize: number, Timestamp: string, gatewayUrl: string }}
 */
export async function pinJSONToIPFS(jsonObject, name = 'metadata') {
    const pinata = getPinataClient();

    const options = {
        pinataMetadata: {
            name,
        },
        pinataOptions: {
            cidVersion: 1,
        },
    };

    console.log(`[IPFS] Pinning JSON: ${name}`);

    const result = await pinata.pinJSONToIPFS(jsonObject, options);

    console.log(`[IPFS] JSON pinned — CID: ${result.IpfsHash}`);

    return {
        IpfsHash: result.IpfsHash,
        PinSize: result.PinSize,
        Timestamp: result.Timestamp,
        gatewayUrl: getIPFSGatewayUrl(result.IpfsHash),
    };
}

/**
 * Unpin a CID from Pinata
 * @param {string} cid - The IPFS CID to unpin
 */
export async function unpinFromIPFS(cid) {
    const pinata = getPinataClient();

    console.log(`[IPFS] Unpinning CID: ${cid}`);

    await pinata.unpin(cid);

    console.log(`[IPFS] CID unpinned: ${cid}`);
}

/** Get public Pinata gateway URL for a CID */
export function getIPFSGatewayUrl(cid) {
    const configured = process.env.IPFS_GATEWAY_URL
        || process.env.NEXT_PUBLIC_IPFS_GATEWAY
        || 'https://gateway.pinata.cloud/ipfs';
    const base = configured.trim().replace(/\/+$/, '');
    return `${base.endsWith('/ipfs') ? base : `${base}/ipfs`}/${cid}`;
}

/** Get IPFS protocol URL for a CID */
export function getIPFSUrl(cid) {
    return `ipfs://${cid}`;
}

/**
 * Fetch content from IPFS gateway
 * @param {string} cid - The IPFS CID to fetch
 * @returns {Buffer} - Content as a Buffer
 */
export async function fetchFromIPFS(cid) {
    const url = getIPFSGatewayUrl(cid);

    console.log(`[IPFS] Fetching from gateway: ${url}`);

    const response = await fetch(url);

    if (!response.ok) {
        throw new Error(`Failed to fetch from IPFS: ${response.status} ${response.statusText}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    console.log(`[IPFS] Fetched ${buffer.length} bytes from CID: ${cid}`);

    return buffer;
}
