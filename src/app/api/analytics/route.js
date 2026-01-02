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
    
    // Get unique values for filters
    const uniqueIntentions = [...new Set(data.map(d => d.intention).filter(Boolean))];
    const uniqueCases = [...new Set(data.map(d => d.case).filter(Boolean))];
    const uniqueChannels = [...new Set(data.map(d => d.channel).filter(Boolean))];
    const uniqueShifts = [...new Set(data.map(d => d.shift).filter(Boolean))];
    const uniqueCS = [...new Set(data.map(d => d.cs).filter(Boolean))];
    const uniqueClosingStatus = [...new Set(data.map(d => d.closing_status).filter(Boolean))];
    
    // Get date range
    const dates = data.map(d => d.date).filter(Boolean);
    const minDate = dates.length > 0 ? dates.reduce((a, b) => a < b ? a : b) : null;
    const maxDate = dates.length > 0 ? dates.reduce((a, b) => a > b ? a : b) : null;
    
    // Calculate statistics
    const stats = {
      totalChats: data.length,
      closedChats: data.filter(d => d.closing_status === 'Closed').length,
      openChats: data.filter(d => d.closing_status === 'Open' || !d.closing_status).length,
      dateRange: {
        min: minDate,
        max: maxDate
      },
      uniqueIntentions: {
        count: uniqueIntentions.length,
        values: uniqueIntentions.sort()
      },
      uniqueCases: {
        count: uniqueCases.length,
        values: uniqueCases.sort()
      },
      channels: {},
      shifts: {},
      csPerformance: {}
    };

    // Channel statistics
    data.forEach(item => {
      if (item.channel) {
        stats.channels[item.channel] = (stats.channels[item.channel] || 0) + 1;
      }
      if (item.shift) {
        stats.shifts[item.shift] = (stats.shifts[item.shift] || 0) + 1;
      }
      if (item.cs) {
        if (!stats.csPerformance[item.cs]) {
          stats.csPerformance[item.cs] = { total: 0, closed: 0, open: 0 };
        }
        stats.csPerformance[item.cs].total++;
        if (item.closing_status === 'Closed') {
          stats.csPerformance[item.cs].closed++;
        } else {
          stats.csPerformance[item.cs].open++;
        }
      }
    });

    // Filter options
    const filterOptions = {
      intentions: uniqueIntentions.sort(),
      cases: uniqueCases.sort(),
      channels: uniqueChannels.sort(),
      shifts: uniqueShifts.sort(),
      cs: uniqueCS.sort(),
      closingStatus: uniqueClosingStatus.sort()
    };

    return NextResponse.json({ 
      stats,
      filterOptions,
      data 
    });
  } catch (error) {
    console.error('Analytics error:', error);
    return NextResponse.json({ error: 'Failed to fetch analytics' }, { status: 500 });
  }
}