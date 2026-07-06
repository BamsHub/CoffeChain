import { createHash } from 'node:crypto';
import { fetchFromIPFS, getIPFSGatewayUrl, getIPFSUrl, pinFileToIPFS, pinJSONToIPFS } from '@/lib/ipfs';

function sha256(value) {
    return createHash('sha256').update(value).digest('hex');
}

function sortValue(value) {
    if (Array.isArray(value)) return value.map(sortValue);
    if (!value || typeof value !== 'object') return value;
    return Object.keys(value).sort().reduce((result, key) => {
        if (value[key] !== undefined) result[key] = sortValue(value[key]);
        return result;
    }, {});
}

export function stableStringify(value) {
    return JSON.stringify(sortValue(value));
}

export function extractIpfsCid(value) {
    if (!value || typeof value !== 'string') return null;
    const trimmed = value.trim();
    if (trimmed.startsWith('ipfs://')) return trimmed.slice(7).split(/[/?#]/)[0] || null;
    if (trimmed.startsWith('ipfs-image:') || trimmed.startsWith('ipfs-metadata:')) {
        return trimmed.slice(trimmed.indexOf(':') + 1).split(/[/?#]/)[0] || null;
    }
    const match = trimmed.match(/\/ipfs\/([^/?#]+)/i);
    return match?.[1] || null;
}

function getTaggedCid(tags, prefix) {
    return (Array.isArray(tags) ? tags : [])
        .map(tag => String(tag))
        .find(tag => tag.startsWith(prefix))
        ?.slice(prefix.length) || null;
}

function extensionFor(contentType, sourceUrl) {
    const byType = {
        'image/jpeg': 'jpg',
        'image/png': 'png',
        'image/webp': 'webp',
        'image/gif': 'gif',
    };
    if (byType[contentType]) return byType[contentType];
    const extension = sourceUrl?.split('?')[0].match(/\.([a-z0-9]{2,5})$/i)?.[1];
    return extension || 'jpg';
}

export async function ensureProductImageOnIpfs(product) {
    const taggedCid = getTaggedCid(product.tags, 'ipfs-image:');
    const existingCid = taggedCid || extractIpfsCid(product.image);
    if (existingCid) {
        return {
            cid: existingCid,
            uri: getIPFSUrl(existingCid),
            gatewayUrl: getIPFSGatewayUrl(existingCid),
            originalUrl: product.image || null,
            sha256: null,
            reused: true,
        };
    }

    if (!product.image || !/^https:\/\//i.test(product.image)) {
        throw new Error(`Produk ${product.id || product.name} belum memiliki URL foto yang dapat dimigrasikan`);
    }

    const source = new URL(product.image);
    const hostname = source.hostname.toLowerCase();
    const privateHost = hostname === 'localhost'
        || hostname === '127.0.0.1'
        || hostname === '::1'
        || /^10\./.test(hostname)
        || /^192\.168\./.test(hostname)
        || /^172\.(1[6-9]|2\d|3[01])\./.test(hostname);
    if (privateHost) throw new Error('Host foto privat tidak diizinkan');

    const response = await fetch(product.image, { redirect: 'follow' });
    if (!response.ok) throw new Error(`Gagal mengunduh foto produk (${response.status})`);
    const contentType = response.headers.get('content-type')?.split(';')[0]?.trim() || 'image/jpeg';
    if (!contentType.startsWith('image/')) throw new Error('File produk bukan gambar yang valid');

    const buffer = Buffer.from(await response.arrayBuffer());
    if (!buffer.length) throw new Error('File foto produk kosong');
    const filename = `${product.id || 'product'}-${Date.now()}.${extensionFor(contentType, product.image)}`;
    const pinned = await pinFileToIPFS(buffer, filename, {
        productId: String(product.id || ''),
        coffeeId: String(product.coffee_id || product.coffeeId || ''),
        purpose: 'verified-product-image',
    });

    return {
        cid: pinned.IpfsHash,
        uri: getIPFSUrl(pinned.IpfsHash),
        gatewayUrl: pinned.gatewayUrl,
        originalUrl: product.image,
        sha256: sha256(buffer),
        reused: false,
    };
}

export async function createProductOffchainProof({ coffeeId, productId, product, traceData = {} }) {
    if (!coffeeId || !productId || !product) throw new Error('coffeeId, productId, dan product wajib tersedia');

    const image = await ensureProductImageOnIpfs(product);
    const manifest = {
        schema: 'coffeechain.product.v2',
        coffeeId,
        productId,
        product: {
            name: traceData.name || product.name || '',
            origin: traceData.origin || product.origin || '',
            variety: traceData.variety || product.variety || '',
            grade: traceData.grade || product.grade || '',
            roastLevel: traceData.roastLevel || product.roast || '',
            weightKg: traceData.weightKg ?? product.weight?.[0] ?? null,
            description: traceData.description || product.description || '',
        },
        production: {
            farmerName: traceData.farmerName || '',
            farmerId: traceData.farmerId || null,
            harvestDate: traceData.harvestDate || null,
            processMethod: traceData.processMethod || null,
            certification: traceData.certification || null,
            registeredBy: traceData.registeredBy || null,
        },
        image: {
            cid: image.cid,
            uri: image.uri,
            gatewayUrl: image.gatewayUrl,
            originalUrl: image.originalUrl,
            sha256: image.sha256,
        },
        createdAt: new Date().toISOString(),
    };

    const contentHash = sha256(stableStringify(manifest));
    const pinned = await pinJSONToIPFS(manifest, `coffeechain-${coffeeId}-${productId}`);
    const memo = JSON.stringify({
        v: 2,
        type: 'coffee-proof',
        id: coffeeId,
        pid: productId,
        cid: pinned.IpfsHash,
        sha256: contentHash,
    });

    return {
        version: 2,
        coffeeId,
        productId,
        metadataCid: pinned.IpfsHash,
        metadataUri: getIPFSUrl(pinned.IpfsHash),
        metadataGatewayUrl: pinned.gatewayUrl,
        contentHash,
        image,
        memo,
    };
}

export async function verifyProductOffchainProof(proof) {
    if (!proof?.metadataCid || !proof?.contentHash || !proof?.coffeeId || !proof?.productId) {
        throw new Error('Bukti off-chain tidak lengkap');
    }
    const manifest = JSON.parse((await fetchFromIPFS(proof.metadataCid)).toString('utf8'));
    const actualHash = sha256(stableStringify(manifest));
    if (actualHash !== proof.contentHash) throw new Error('Hash metadata IPFS tidak cocok');
    if (manifest.coffeeId !== proof.coffeeId || manifest.productId !== proof.productId) {
        throw new Error('Identitas produk pada metadata IPFS tidak cocok');
    }
    if (!manifest.image?.cid || manifest.image.cid !== proof.image?.cid) {
        throw new Error('Referensi foto IPFS tidak cocok dengan metadata');
    }
    const expectedMemo = JSON.stringify({
        v: 2,
        type: 'coffee-proof',
        id: proof.coffeeId,
        pid: proof.productId,
        cid: proof.metadataCid,
        sha256: proof.contentHash,
    });
    if (proof.memo !== expectedMemo) throw new Error('Memo bukti off-chain telah berubah');
    return { manifest, expectedMemo };
}

export function mergeOffchainTags(tags, proof, txSignature = null) {
    const retained = (Array.isArray(tags) ? tags : []).filter(tag => {
        const value = String(tag);
        return !value.startsWith('ipfs-image:') && !value.startsWith('ipfs-metadata:') && !value.startsWith('offchain-proof:');
    });
    return [
        ...retained,
        `ipfs-image:${proof.image.cid}`,
        `ipfs-metadata:${proof.metadataCid}`,
        ...(txSignature ? [`offchain-proof:${txSignature}`] : []),
    ];
}
