import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]/route';
import googleSheets from '@/lib/googleSheets';

export async function GET(request) {
  const session = await getServerSession(authOptions);
  
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const data = await googleSheets.getAllData();
    
    const stats = {
      totalChats: data.length,
      closedChats: data.filter(d => d.closing_status === 'Closed').length,
      openChats: data.filter(d => d.closing_status === 'Open' || !d.closing_status).length,
      channels: {}
    };

    data.forEach(item => {
      if (item.channel) {
        stats.channels[item.channel] = (stats.channels[item.channel] || 0) + 1;
      }
    });

    return NextResponse.json({ stats });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 });
  }
}