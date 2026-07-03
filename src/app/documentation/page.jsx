import DashboardLayout from '@/components/DashboardLayout/DashboardLayout';
import DocumentationPage from '@/sections/documentation/DocumentationPage';

export const metadata = {
    title: 'Dokumentasi | CoffeeChain',
    description: 'Panduan fitur CoffeeChain sesuai role akun',
};

export default function Documentation() {
    return (
        <DashboardLayout>
            <DocumentationPage />
        </DashboardLayout>
    );
}
