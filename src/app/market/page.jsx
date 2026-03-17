import DashboardLayout from '@/components/DashboardLayout/DashboardLayout';
import MarketPage from '@/sections/market/MarketPage';

export const metadata = { title: 'Harga Pasar — CoffeeChain' };

export default function Market() {
    return <DashboardLayout><MarketPage /></DashboardLayout>;
}
