import DashboardLayout from '@/components/DashboardLayout/DashboardLayout';
import MarketsPage from '@/sections/markets/MarketsPage';

export const metadata = { title: 'Pasar Kopi — CoffeeChain' };

export default function Markets() {
    return <DashboardLayout><MarketsPage /></DashboardLayout>;
}
