import DashboardLayout from '@/components/DashboardLayout/DashboardLayout';
import TransactionsPage from '@/sections/transactions/TransactionsPage';

export const metadata = { title: 'Transaksi — CoffeeChain' };

export default function Transactions() {
    return <DashboardLayout><TransactionsPage /></DashboardLayout>;
}
