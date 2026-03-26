import DashboardLayout from '@/components/DashboardLayout/DashboardLayout';
import ProductsContent from '@/sections/products/ProductsContent';

export const metadata = { title: 'Kelola Produk — CoffeeChain' };

export default function ProductsPage() {
    return (
        <DashboardLayout>
            <ProductsContent />
        </DashboardLayout>
    );
}
