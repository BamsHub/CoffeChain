import DashboardLayout from '@/components/DashboardLayout/DashboardLayout';
import StockManagement from '@/sections/products/StockManagement';

export const metadata = { title: 'Kelola Stok — CoffeeChain' };

export default function StockPage() {
    return (
        <DashboardLayout>
            <StockManagement />
        </DashboardLayout>
    );
}
