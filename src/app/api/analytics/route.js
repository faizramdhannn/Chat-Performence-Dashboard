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
    
    // Extract unique filter options
    const filterOptions = {
      intentions: [...new Set(data.map(d => d.intention).filter(Boolean))].sort(),
      cases: [...new Set(data.map(d => d.case).filter(Boolean))].sort(),
      channels: [...new Set(data.map(d => d.channel).filter(Boolean))].sort(),
      shifts: [...new Set(data.map(d => d.shift).filter(Boolean))].sort(),
      cs: [...new Set(data.map(d => d.cs).filter(Boolean))].sort(),
      closingStatus: [...new Set(data.map(d => d.closing_status).filter(Boolean))].sort(),
    };

    return NextResponse.json({ data, filterOptions });
  } catch (error) {
    console.error('Error fetching analytics:', error);
    return NextResponse.json({ error: 'Failed to fetch analytics' }, { status: 500 });
  }
}