import DashboardLayout from '@/components/DashboardLayout/DashboardLayout';
import WalletPage from '@/sections/wallet/WalletPage';

export const metadata = { title: 'Dompet — CoffeeChain' };

export default function Wallet() {
    return <DashboardLayout><WalletPage /></DashboardLayout>;
}
