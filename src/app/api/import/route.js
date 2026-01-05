import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import googleSheets from '@/lib/googleSheets';
import * as XLSX from 'xlsx';

export async function POST(request) {
  const auth = await requireAuth();
  
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const formData = await request.formData();
    const file = formData.get('file');
    
    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    
    const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(worksheet);

    if (jsonData.length === 0) {
      return NextResponse.json({ error: 'File is empty' }, { status: 400 });
    }

    const masterData = await googleSheets.getMasterData();

    // Check if row is empty
    const isEmptyRow = (row) => {
      return !row.date && !row.shift && !row.cs && !row.channel && 
             !row.name && !row.cust && !row.order_number && 
             !row.intention && !row.case && !row.product_name && 
             !row.closing_status && !row.note && !row.chat_status && 
             !row.chat_status2 && !row.follow_up && !row.survey;
    };

    const errors = [];
    const validData = [];

    jsonData.forEach((row, index) => {
      const rowNumber = index + 2;
      
      // Skip empty rows
      if (isEmptyRow(row)) {
        return;
      }
      
      // Validate required fields
      if (!row.date) errors.push(`Row ${rowNumber}: Date is required`);
      if (!row.shift) errors.push(`Row ${rowNumber}: Shift is required`);
      if (!row.cs) errors.push(`Row ${rowNumber}: CS is required`);
      if (!row.channel) errors.push(`Row ${rowNumber}: Channel is required`);
      if (!row.closing_status) errors.push(`Row ${rowNumber}: Closing Status is required`);

      // Validate against master data - PAKAI ARTIKEL
      if (row.shift && masterData.shift && !masterData.shift.includes(row.shift)) {
        errors.push(`Row ${rowNumber}: Invalid shift "${row.shift}"`);
      }
      if (row.cs && masterData.cs && !masterData.cs.includes(row.cs)) {
        errors.push(`Row ${rowNumber}: Invalid CS "${row.cs}"`);
      }
      if (row.channel && masterData.channel && !masterData.channel.includes(row.channel)) {
        errors.push(`Row ${rowNumber}: Invalid channel "${row.channel}"`);
      }
      if (row.intention && masterData.intention && !masterData.intention.includes(row.intention)) {
        errors.push(`Row ${rowNumber}: Invalid intention "${row.intention}"`);
      }
      if (row.case && masterData.case && !masterData.case.includes(row.case)) {
        errors.push(`Row ${rowNumber}: Invalid case "${row.case}"`);
      }
      if (row.product_name && masterData.artikel && !masterData.artikel.includes(row.product_name)) {
        errors.push(`Row ${rowNumber}: Invalid product_name "${row.product_name}"`);
      }
      if (row.closing_status && masterData.closing_status && !masterData.closing_status.includes(row.closing_status)) {
        errors.push(`Row ${rowNumber}: Invalid closing_status "${row.closing_status}"`);
      }
      if (row.chat_status && masterData.chat_status && !masterData.chat_status.includes(row.chat_status)) {
        errors.push(`Row ${rowNumber}: Invalid chat_status "${row.chat_status}"`);
      }
      if (row.chat_status2 && masterData.chat_status2 && !masterData.chat_status2.includes(row.chat_status2)) {
        errors.push(`Row ${rowNumber}: Invalid chat_status2 "${row.chat_status2}"`);
      }
      if (row.follow_up && masterData.follow_up && !masterData.follow_up.includes(row.follow_up)) {
        errors.push(`Row ${rowNumber}: Invalid follow_up "${row.follow_up}"`);
      }

      // Parse date
      let formattedDate = '';
      if (row.date) {
        try {
          let date;
          if (row.date instanceof Date) {
            date = row.date;
          } else if (typeof row.date === 'number') {
            const excelDate = XLSX.SSF.parse_date_code(row.date);
            date = new Date(excelDate.y, excelDate.m - 1, excelDate.d);
          } else {
            date = new Date(row.date);
          }

          if (isNaN(date.getTime())) {
            errors.push(`Row ${rowNumber}: Invalid date format`);
          } else {
            const day = String(date.getDate()).padStart(2, '0');
            const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            const month = months[date.getMonth()];
            const year = date.getFullYear();
            formattedDate = `${day} ${month} ${year}`;
          }
        } catch (e) {
          errors.push(`Row ${rowNumber}: Error parsing date`);
        }
      }

      // Normalize survey
      let surveyValue = '';
      if (row.survey !== undefined && row.survey !== '') {
        const surveyStr = String(row.survey).toLowerCase();
        if (['true', '1', 'yes', 'ya'].includes(surveyStr)) {
          surveyValue = 'TRUE';
        } else if (['false', '0', 'no', 'tidak'].includes(surveyStr)) {
          surveyValue = 'FALSE';
        } else {
          errors.push(`Row ${rowNumber}: Survey must be TRUE/FALSE`);
        }
      }

      const dataRow = {
        date: formattedDate,
        shift: row.shift || '',
        cs: row.cs || '',
        channel: row.channel || '',
        name: row.name || '',
        cust: row.cust || '',
        order_number: row.order_number || '',
        intention: row.intention || '',
        case: row.case || '',
        product_name: row.product_name || '',
        closing_status: row.closing_status || '',
        note: row.note || '',
        chat_status: row.chat_status || '',
        chat_status2: row.chat_status2 || '',
        follow_up: row.follow_up || '',
        survey: surveyValue
      };

      validData.push(dataRow);
    });

    if (errors.length > 0) {
      return NextResponse.json({
        success: false,
        errors: errors,
        preview: validData.slice(0, 5)
      }, { status: 400 });
    }

    let successCount = 0;
    let failCount = 0;

    for (const row of validData) {
      try {
        await googleSheets.addData(row);
        successCount++;
      } catch (error) {
        console.error('Error inserting row:', error);
        failCount++;
      }
    }

    return NextResponse.json({
      success: true,
      message: `Successfully imported ${successCount} rows${failCount > 0 ? `, ${failCount} failed` : ''}`,
      successCount,
      failCount,
      totalRows: validData.length
    });

  } catch (error) {
    console.error('Error importing data:', error);
    return NextResponse.json({ error: 'Failed to import data: ' + error.message }, { status: 500 });
  }
}