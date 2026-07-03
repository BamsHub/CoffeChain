import DashboardLayout from '@/components/DashboardLayout/DashboardLayout';
import SupplyChainPage from '@/sections/supply-chain/SupplyChainPage';

export const metadata = { title: 'Supply Chain — CoffeeChain' };

export default function SupplyChain() {
    return <DashboardLayout><SupplyChainPage /></DashboardLayout>;
}
