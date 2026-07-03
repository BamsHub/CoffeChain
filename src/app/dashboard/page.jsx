import DashboardLayout from '@/components/DashboardLayout/DashboardLayout';
import DashboardPage from '@/sections/dashboard/DashboardPage';

export const metadata = {
    title: 'Dashboard — CoffeeChain',
};

export default function Dashboard() {
    return (
        <DashboardLayout>
            <DashboardPage />
        </DashboardLayout>
    );
}
