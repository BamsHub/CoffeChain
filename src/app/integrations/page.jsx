import DashboardLayout from '@/components/DashboardLayout/DashboardLayout';
import ApiManagement from '@/sections/integrations/ApiManagement';

export const metadata = { title: 'Manajemen API Integration — CoffeeChain' };

export default function IntegrationsPage() {
    return (
        <DashboardLayout>
            <ApiManagement />
        </DashboardLayout>
    );
}
