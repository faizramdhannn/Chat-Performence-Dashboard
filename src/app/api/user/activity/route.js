import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import googleSheets from '@/lib/googleSheets';

export async function POST(request) {
  const auth = await requireAuth();
  
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const username = auth.session.user.username;
    const timestamp = new Date().toISOString();

    // Update last activity di Google Sheets
    await googleSheets.updateUserLastActivity(username, timestamp);

    return NextResponse.json({ success: true, timestamp });
  } catch (error) {
    console.error('Error updating activity:', error);
    return NextResponse.json({ error: 'Failed to update activity' }, { status: 500 });
  }
}

export async function GET(request) {
  const auth = await requireAuth();
  
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    // Get all users with last activity
    const users = await googleSheets.getAllUsers();
    
    const now = new Date();
    const usersWithStatus = users.map(user => {
      const lastActivity = user.last_activity ? new Date(user.last_activity) : null;
      const minutesAgo = lastActivity ? Math.floor((now - lastActivity) / 1000 / 60) : null;
      
      // Online if active within last 5 minutes
      const isOnline = minutesAgo !== null && minutesAgo < 5;
      
      return {
        username: user.username,
        name: user.name,
        lastActivity: user.last_activity,
        minutesAgo,
        isOnline
      };
    });

    return NextResponse.json({ users: usersWithStatus });
  } catch (error) {
    console.error('Error fetching user activity:', error);
    return NextResponse.json({ error: 'Failed to fetch user activity' }, { status: 500 });
  }
}