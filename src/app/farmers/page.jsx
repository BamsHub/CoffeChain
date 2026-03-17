import DashboardLayout from '@/components/DashboardLayout/DashboardLayout';
import FarmersPage from '@/sections/farmers/FarmersPage';

export const metadata = { title: 'Petani — CoffeeChain' };

export default function Farmers() {
    return <DashboardLayout><FarmersPage /></DashboardLayout>;
}
