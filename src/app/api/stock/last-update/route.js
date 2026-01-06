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
    const lastUpdate = await googleSheets.getStockLastUpdate();
    return NextResponse.json({ lastUpdate });
  } catch (error) {
    console.error('Error fetching last update:', error);
    return NextResponse.json({ 
      lastUpdate: {
        shopify: null,
        javelin: null,
        threshold: null
      }
    });
  }
}