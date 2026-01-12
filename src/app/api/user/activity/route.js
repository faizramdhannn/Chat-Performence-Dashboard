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
    // Get all users from Google Sheets
    const users = await googleSheets.getAllUsers();
    
    if (!users || users.length === 0) {
      return NextResponse.json({ users: [] });
    }

    const now = new Date();
    
    const userActivity = users.map(user => {
      const lastActivity = user.last_activity ? new Date(user.last_activity) : null;
      let isOnline = false;
      let minutesAgo = null;
      
      if (lastActivity) {
        const diffMs = now - lastActivity;
        const diffMinutes = Math.floor(diffMs / (1000 * 60));
        minutesAgo = diffMinutes;
        
        // Consider online if last activity was within 5 minutes
        isOnline = diffMinutes < 5;
      }
      
      return {
        id: user.id,
        username: user.username,
        name: user.name,
        isOnline,
        minutesAgo,
        lastActivity: user.last_activity || null,
        // Include permissions for reference
        permissions: {
          dashboard: user.dashboard === 'TRUE',
          chat_creation: user.chat_creation === 'TRUE',
          analytics: user.analytics === 'TRUE',
          warranty: user.warranty === 'TRUE',
          bundling: user.bundling === 'TRUE',
          stock: user.stock === 'TRUE',
          registrations: user.registrations === 'TRUE',
          user_management: user.user_management === 'TRUE',
          settings: user.settings === 'TRUE',
        }
      };
    });

    return NextResponse.json({ users: userActivity });
  } catch (error) {
    console.error('Error fetching user activity:', error);
    return NextResponse.json(
      { error: 'Failed to fetch user activity', details: error.message },
      { status: 500 }
    );
  }
}

// Optional: POST endpoint to update user's last activity
export async function POST(request) {
  const session = await getServerSession(authOptions);
  
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const username = session.user.username;
    const now = new Date().toISOString();
    
    // Update user's last_activity timestamp
    await googleSheets.updateUserLastActivity(username, now);
    
    return NextResponse.json({ 
      success: true, 
      message: 'Activity updated',
      timestamp: now 
    });
  } catch (error) {
    console.error('Error updating user activity:', error);
    return NextResponse.json(
      { error: 'Failed to update activity', details: error.message },
      { status: 500 }
    );
  }
}