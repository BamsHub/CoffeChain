import DashboardLayout from '@/components/DashboardLayout/DashboardLayout';
import ProfilePage from '@/sections/profile/ProfilePage';

export const metadata = { title: 'Profil — CoffeeChain' };

export default function Profile() {
    return <DashboardLayout><ProfilePage /></DashboardLayout>;
}
