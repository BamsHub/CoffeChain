import DashboardLayout from '@/components/DashboardLayout/DashboardLayout';
import SystemDesignPage from '@/sections/system-design/SystemDesignPage';

export const metadata = {
    title: 'Desain & Bukti Sistem | CoffeeChain',
    description: 'DFD, state transition, arsitektur, verifikasi, performa blockchain, dan network fee CoffeeChain',
};

export default function SystemDesign() {
    return (
        <DashboardLayout>
            <SystemDesignPage />
        </DashboardLayout>
    );
}
