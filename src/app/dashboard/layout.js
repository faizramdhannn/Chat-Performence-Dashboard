import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '../api/auth/[...nextauth]/route';
import Sidebar from '@/components/Sidebar';
import ActivityTracker from '@/components/ActivityTracker';

export default async function DashboardLayout({ children }) {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/login');
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <ActivityTracker /> {/* Tambah ActivityTracker */}
      <main className="flex-1 lg:ml-64 p-4 lg:p-8">
        <div className="pt-16 lg:pt-0">
          {children}
        </div>
      </main>
    </div>
  );
}