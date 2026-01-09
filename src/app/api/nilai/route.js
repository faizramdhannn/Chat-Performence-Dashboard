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
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');
    const cs = searchParams.get('cs');
    const channel = searchParams.get('channel');
    const sop = searchParams.get('sop');
    
    const nilaiData = await googleSheets.getNilaiData();
    
    console.log('📊 Fetched nilai data:', nilaiData.length, 'rows');
    if (nilaiData.length > 0) {
      console.log('Sample row:', nilaiData[0]);
    }
    
    // Extract unique values for filters
    const uniqueCS = [...new Set(nilaiData.map(d => d.cs).filter(Boolean))].sort();
    const uniqueChannels = [...new Set(nilaiData.map(d => d.channel).filter(Boolean))].sort();
    const uniqueSOP = [...new Set(nilaiData.map(d => d.SOP).filter(Boolean))].sort();
    
    console.log('Unique CS:', uniqueCS);
    console.log('Unique Channels:', uniqueChannels);
    console.log('Unique SOP:', uniqueSOP);
    
    // Apply filters
    let filteredData = [...nilaiData];
    
    // Helper function to parse various date formats
    const parseDate = (dateStr) => {
      if (!dateStr) return null;
      
      try {
        // Handle DD/MM/YYYY format
        if (dateStr.includes('/')) {
          const parts = dateStr.split('/');
          if (parts.length === 3) {
            const day = parseInt(parts[0]);
            const month = parseInt(parts[1]) - 1; // JS months are 0-indexed
            const year = parseInt(parts[2]);
            return new Date(year, month, day);
          }
        }
        
        // Handle other formats
        const date = new Date(dateStr);
        if (!isNaN(date.getTime())) {
          return date;
        }
        
        return null;
      } catch (e) {
        console.error('Error parsing date:', dateStr, e);
        return null;
      }
    };
    
    if (dateFrom || dateTo) {
      filteredData = filteredData.filter(item => {
        if (!item.date) return false;
        
        const itemDate = parseDate(item.date);
        if (!itemDate) return false;
        
        if (dateFrom) {
          const fromDate = new Date(dateFrom);
          fromDate.setHours(0, 0, 0, 0);
          if (itemDate < fromDate) return false;
        }
        
        if (dateTo) {
          const toDate = new Date(dateTo);
          toDate.setHours(23, 59, 59, 999);
          if (itemDate > toDate) return false;
        }
        
        return true;
      });
    }
    
    if (sop && sop !== 'all') {
      filteredData = filteredData.filter(item => item.SOP === sop);
    }
    
    if (cs && cs !== 'all') {
      filteredData = filteredData.filter(item => item.cs === cs);
    }
    
    if (channel && channel !== 'all') {
      filteredData = filteredData.filter(item => item.channel === channel);
    }
    
    console.log('📊 Filtered data:', filteredData.length, 'rows');
    
    // Group by SOP and Channel, calculate average
    const grouped = {};
    
    filteredData.forEach(item => {
      const key = `${item.SOP}|${item.channel}`;
      
      if (!grouped[key]) {
        grouped[key] = {
          SOP: item.SOP,
          channel: item.channel,
          scores: []
        };
      }
      
      // Convert percentage string to number
      let score = 0;
      if (item.skor) {
        const scoreStr = String(item.skor).replace('%', '').trim();
        score = parseFloat(scoreStr) / 100;
      }
      
      if (!isNaN(score) && score > 0) {
        grouped[key].scores.push(score);
      }
    });
    
    // Calculate average and grade
    const summary = Object.values(grouped).map(item => {
      const avg = item.scores.length > 0 
        ? item.scores.reduce((a, b) => a + b, 0) / item.scores.length 
        : 0;
      
      // Determine grade
      let grade = 'E';
      if (avg === 0) {
        grade = '-';
      } else if (avg >= 0.9) {
        grade = 'A';
      } else if (avg >= 0.8) {
        grade = 'B';
      } else if (avg >= 0.7) {
        grade = 'C';
      } else if (avg >= 0.6) {
        grade = 'D';
      }
      
      return {
        SOP: item.SOP,
        channel: item.channel,
        average: avg,
        grade: grade,
        count: item.scores.length
      };
    }).sort((a, b) => {
      if (a.SOP !== b.SOP) return a.SOP.localeCompare(b.SOP);
      return a.channel.localeCompare(b.channel);
    });
    
    console.log('📊 Summary:', summary.length, 'items');
    
    return NextResponse.json({ 
      summary,
      uniqueCS,
      uniqueChannels,
      uniqueSOP,
      totalRows: nilaiData.length,
      filteredRows: filteredData.length
    });
  } catch (error) {
    console.error('Error fetching nilai data:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch nilai data',
      details: error.message 
    }, { status: 500 });
  }
}