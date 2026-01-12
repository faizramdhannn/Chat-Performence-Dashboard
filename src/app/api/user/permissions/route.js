import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import googleSheets from '@/lib/googleSheets';

export async function GET(request) {
  const session = await getServerSession(authOptions);
  
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const username = session.user.username;
    console.log('🔍 Looking for username:', username);
    
    const user = await googleSheets.getUserByUsername(username);
    
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    console.log('📦 Raw user object:', JSON.stringify(user, null, 2));
    console.log('📋 Keys in user object:', Object.keys(user));

    // Helper function
    const isTrue = (value) => {
      const strValue = String(value || '').toUpperCase();
      return strValue === 'TRUE' || strValue === '1' || value === true;
    };

    console.log('🔎 Checking permissions:');
    console.log('  - dashboard:', user.dashboard, '→', isTrue(user.dashboard));
    console.log('  - chat_creation:', user.chat_creation, '→', isTrue(user.chat_creation));
    console.log('  - analytics:', user.analytics, '→', isTrue(user.analytics));
    console.log('  - warranty:', user.warranty, '→', isTrue(user.warranty));
    console.log('  - bundling:', user.bundling, '→', isTrue(user.bundling));
    console.log('  - stock:', user.stock, '→', isTrue(user.stock));
    console.log('  - registrations:', user.registrations, '→', isTrue(user.registrations));
    console.log('  - user_management:', user.user_management, '→', isTrue(user.user_management));
    console.log('  - settings:', user.settings, '→', isTrue(user.settings));

    // PENTING: Mapping yang benar antara Google Sheets dan Frontend
    // Google Sheets menggunakan underscore: user_management, chat_creation, bundling
    // Frontend Sidebar menggunakan camelCase: userManagement, chatCreation, bundling
    const permissions = {
      dashboard: isTrue(user.dashboard),
      chatCreation: isTrue(user.chat_creation),    // ← chat_creation dari sheets → chatCreation di frontend
      analytics: isTrue(user.analytics),
      warranty: isTrue(user.warranty),
      bundling: isTrue(user.bundling),             // ← bundling dari sheets → bundling di frontend
      stock: isTrue(user.stock),
      registrations: isTrue(user.registrations),
      userManagement: isTrue(user.user_management), // ← user_management dari sheets → userManagement di frontend
      settings: isTrue(user.settings),
    };

    console.log('✅ Final permissions (camelCase for frontend):', permissions);

    return NextResponse.json({ permissions });
  } catch (error) {
    console.error('❌ Error fetching permissions:', error);
    return NextResponse.json({ error: 'Failed to fetch permissions' }, { status: 500 });
  }
}