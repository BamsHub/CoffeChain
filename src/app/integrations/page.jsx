import DashboardLayout from '@/components/DashboardLayout/DashboardLayout';
import IntegrationsContent from '@/sections/integrations/IntegrationsContent';

export const metadata = {
    title: 'Integrasi API — CoffeeChain',
};

export default function IntegrationsPage() {
    return (
        <DashboardLayout>
            <IntegrationsContent />
        </DashboardLayout>
    );
}
