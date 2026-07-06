import AdminContactPage from '@/sections/admin-contact/AdminContactPage';
import DashboardLayout from '@/components/DashboardLayout/DashboardLayout';

export const metadata = {
    title: 'Admin — Pengaduan Masuk — CoffeeChain',
    description: 'Kelola pesan pengaduan dan masukan dari pengguna.',
};

export default function AdminContactRoute() {
    return <DashboardLayout><AdminContactPage /></DashboardLayout>;
}
