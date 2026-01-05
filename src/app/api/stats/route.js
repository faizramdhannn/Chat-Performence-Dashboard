import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import googleSheets from '@/lib/googleSheets';

export async function GET(request) {
  const auth = await requireAuth();
  
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const data = await googleSheets.getAllData();
    
    // Filter data yang kolom cust terisi
    const dataWithCust = data.filter(d => d.cust && d.cust.trim() !== '');
    
    const stats = {
      totalChats: dataWithCust.length, // ← HITUNG dari cust yang terisi
      closedChats: dataWithCust.filter(d => d.chat_status2 === 'Solved').length,
      openChats: dataWithCust.filter(d => d.chat_status2 === 'On Going' || !d.chat_status2).length,
      channels: {},
      shifts: {},
      csPerformance: {}
    };

    // Stats lainnya tetap dari semua data
    data.forEach(item => {
      // Channel stats
      if (item.channel) {
        stats.channels[item.channel] = (stats.channels[item.channel] || 0) + 1;
      }

      // Shift stats
      if (item.shift) {
        stats.shifts[item.shift] = (stats.shifts[item.shift] || 0) + 1;
      }

      // CS Performance
      if (item.cs) {
        if (!stats.csPerformance[item.cs]) {
          stats.csPerformance[item.cs] = {
            total: 0,
            closed: 0,
            open: 0
          };
        }
        stats.csPerformance[item.cs].total += 1;
        if (item.closing_status === 'Closed') {
          stats.csPerformance[item.cs].closed += 1;
        } else {
          stats.csPerformance[item.cs].open += 1;
        }
      }
    });

    return NextResponse.json({ stats });
  } catch (error) {
    console.error('Error fetching stats:', error);
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 });
  }
}