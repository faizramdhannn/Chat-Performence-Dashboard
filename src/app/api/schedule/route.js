import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import googleSheets from '@/lib/googleSheets';

export async function GET(request) {
  const auth = await requireAuth();
  
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const scheduleData = await googleSheets.getScheduleData();
    
    // Get today, tomorrow, and day after tomorrow
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dayAfterTomorrow = new Date(today);
    dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 2);
    
    const formatDate = (date) => {
      const day = String(date.getDate()).padStart(2, '0');
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const month = months[date.getMonth()];
      const year = date.getFullYear();
      return `${day} ${month} ${year}`;
    };
    
    const todayStr = formatDate(today);
    const tomorrowStr = formatDate(tomorrow);
    const dayAfterTomorrowStr = formatDate(dayAfterTomorrow);
    
    const todaySchedule = scheduleData.find(s => s.date === todayStr);
    const tomorrowSchedule = scheduleData.find(s => s.date === tomorrowStr);
    const dayAfterTomorrowSchedule = scheduleData.find(s => s.date === dayAfterTomorrowStr);
    
    return NextResponse.json({ 
      today: todaySchedule || null,
      tomorrow: tomorrowSchedule || null,
      dayAfterTomorrow: dayAfterTomorrowSchedule || null,
      allSchedule: scheduleData
    });
  } catch (error) {
    console.error('Error fetching schedule:', error);
    return NextResponse.json({ error: 'Failed to fetch schedule' }, { status: 500 });
  }
}