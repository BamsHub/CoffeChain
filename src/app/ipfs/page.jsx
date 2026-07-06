import DashboardLayout from '@/components/DashboardLayout/DashboardLayout';
import IPFSPage from '@/sections/ipfs/IPFSPage';

export const metadata = {
    title: 'IPFS Off-Chain Storage - CoffeeChain',
    description: 'Lihat foto pipeline dan metadata produk yang tersimpan di IPFS.',
};

export default function IPFSRoute() {
    return <DashboardLayout><IPFSPage /></DashboardLayout>;
}
