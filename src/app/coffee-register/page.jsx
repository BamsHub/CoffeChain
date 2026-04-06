import DashboardLayout from '@/components/DashboardLayout/DashboardLayout';
import CoffeeRegisterContent from '@/sections/coffee-register/CoffeeRegisterContent';

export const metadata = { title: 'Register Kopi Blockchain — CoffeeChain' };

export default function CoffeeRegisterPage() {
    return (
        <DashboardLayout>
            <CoffeeRegisterContent />
        </DashboardLayout>
    );
}
