import ContactPage from '@/sections/contact/ContactPage';
import DashboardLayout from '@/components/DashboardLayout/DashboardLayout';

export const metadata = {
    title: 'Hubungi Kami — CoffeeChain',
    description: 'Buat tiket bantuan petani untuk tim admin CoffeeChain.',
};

export default function ContactRoute() {
    return <DashboardLayout><ContactPage /></DashboardLayout>;
}
