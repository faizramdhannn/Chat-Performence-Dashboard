import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import googleSheets from '@/lib/googleSheets';

export async function GET(request) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const data = await googleSheets.getStockInfoData();
    return NextResponse.json({ data });
  } catch (error) {
    console.error('Error fetching stock info data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch stock info data', detail: error.message },
      { status: 500 }
    );
  }
}