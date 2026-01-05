import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import googleSheets from '@/lib/googleSheets';

export async function GET(request) {
  const auth = await requireAuth();
  
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'warranty';

    let data;
    if (type === 'warranty') {
      data = await googleSheets.getWarrantyData();
    } else if (type === 'check-activation') {
      data = await googleSheets.getCheckActivationData();
    } else {
      return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
    }

    // Extract unique channels (bukan platforms) for filter
    const channels = [...new Set(data.map(d => d.channel).filter(Boolean))].sort();

    return NextResponse.json({ data, channels });
  } catch (error) {
    console.error('Error fetching warranty data:', error);
    return NextResponse.json({ error: 'Failed to fetch warranty data' }, { status: 500 });
  }
}