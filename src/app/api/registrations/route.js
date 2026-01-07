import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import googleSheets from '@/lib/googleSheets';

export async function GET(request) {
  // PERBAIKAN: Hanya check apakah user sudah login, tidak check role
  const auth = await requireAuth();
  
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  // Permission check dilakukan di frontend page (registrations-page.js)
  // API hanya memastikan user sudah authenticated

  try {
    console.log('📋 GET /api/registrations - Fetching pending registrations');
    const registrations = await googleSheets.getPendingRegistrations();
    console.log('📋 Found registrations:', registrations.length);
    
    return NextResponse.json({ registrations });
  } catch (error) {
    console.error('Error fetching registrations:', error);
    return NextResponse.json({ error: 'Failed to fetch registrations' }, { status: 500 });
  }
}