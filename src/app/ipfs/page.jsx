import IPFSPage from '@/sections/ipfs/IPFSPage';

export const metadata = {
    title: 'IPFS Off-Chain Storage — CoffeeChain',
    description: 'Upload dan simpan file ke IPFS secara desentralisasi. CID hash tercatat on-chain di Solana.',
};

export default function IPFSRoute() {
    return <IPFSPage />;
}
