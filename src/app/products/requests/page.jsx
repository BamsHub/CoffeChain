import DashboardLayout from '@/components/DashboardLayout/DashboardLayout';
import RequestLog from '@/sections/request-log/RequestLog';

export const metadata = { title: 'Request Log Produk — CoffeeChain' };

export default function RequestLogPage() {
    return (
        <DashboardLayout>
            <RequestLog />
        </DashboardLayout>
    );
}
