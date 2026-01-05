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

    // Read file
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    
    // Parse Excel
    const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(worksheet);

    if (jsonData.length === 0) {
      return NextResponse.json({ error: 'File is empty' }, { status: 400 });
    }

    // Get master data for validation
    const masterData = await googleSheets.getMasterData();

    // Function to format date
    const formatDate = (dateValue) => {
      if (!dateValue) return '';
      
      let date;
      
      if (dateValue instanceof Date) {
        date = dateValue;
      } else if (typeof dateValue === 'number') {
        const excelDate = XLSX.SSF.parse_date_code(dateValue);
        date = new Date(excelDate.y, excelDate.m - 1, excelDate.d);
      } else if (typeof dateValue === 'string') {
        if (/^\d{2} [A-Za-z]{3} \d{4}$/.test(dateValue)) {
          return dateValue;
        }
        date = new Date(dateValue);
      } else {
        return '';
      }
      
      if (isNaN(date.getTime())) {
        return dateValue;
      }
      
      const day = String(date.getDate()).padStart(2, '0');
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const month = months[date.getMonth()];
      const year = date.getFullYear();
      
      return `${day} ${month} ${year}`;
    };

    // Check if row is empty
    const isEmptyRow = (row) => {
      return !row.date && !row.shift && !row.cs && !row.channel && 
             !row.name && !row.cust && !row.order_number && 
             !row.intention && !row.case && !row.product_name && 
             !row.closing_status && !row.note && !row.chat_status && 
             !row.chat_status2 && !row.follow_up && !row.survey;
    };

    // Validate and process data
    const errors = [];
    const warnings = [];
    const previewData = [];

    jsonData.forEach((row, index) => {
      const rowNumber = index + 2;
      
      // Skip empty rows
      if (isEmptyRow(row)) {
        return;
      }
      
      const rowErrors = [];
      
      // Format date
      let formattedDate = '';
      let dateStatus = 'valid';
      try {
        formattedDate = formatDate(row.date);
        if (!formattedDate) {
          rowErrors.push('Date is required');
          dateStatus = 'error';
        }
      } catch (e) {
        rowErrors.push('Invalid date format');
        dateStatus = 'error';
        formattedDate = row.date || '';
      }
      
      // Validate required fields
      if (!row.shift) rowErrors.push('Shift is required');
      if (!row.cs) rowErrors.push('CS is required');
      if (!row.channel) rowErrors.push('Channel is required');
      if (!row.closing_status) rowErrors.push('Closing Status is required');

      // Validate against master data - PAKAI ARTIKEL untuk product_name
      const fieldValidations = {
        shift: row.shift && masterData.shift && !masterData.shift.includes(row.shift),
        cs: row.cs && masterData.cs && !masterData.cs.includes(row.cs),
        channel: row.channel && masterData.channel && !masterData.channel.includes(row.channel),
        intention: row.intention && masterData.intention && !masterData.intention.includes(row.intention),
        case: row.case && masterData.case && !masterData.case.includes(row.case),
        product_name: row.product_name && masterData.artikel && !masterData.artikel.includes(row.product_name), // CHECK ARTIKEL
        closing_status: row.closing_status && masterData.closing_status && !masterData.closing_status.includes(row.closing_status),
        chat_status: row.chat_status && masterData.chat_status && !masterData.chat_status.includes(row.chat_status),
        chat_status2: row.chat_status2 && masterData.chat_status2 && !masterData.chat_status2.includes(row.chat_status2),
        follow_up: row.follow_up && masterData.follow_up && !masterData.follow_up.includes(row.follow_up)
      };

      Object.entries(fieldValidations).forEach(([field, isInvalid]) => {
        if (isInvalid) {
          rowErrors.push(`Invalid ${field} "${row[field]}"`);
        }
      });

      // Validate survey
      let surveyValue = '';
      if (row.survey !== undefined && row.survey !== '') {
        const surveyStr = String(row.survey).toLowerCase();
        if (['true', '1', 'yes', 'ya'].includes(surveyStr)) {
          surveyValue = 'TRUE';
        } else if (['false', '0', 'no', 'tidak'].includes(surveyStr)) {
          surveyValue = 'FALSE';
        } else {
          rowErrors.push('Survey must be TRUE/FALSE');
        }
      }

      // Add to errors array if any
      if (rowErrors.length > 0) {
        rowErrors.forEach(err => {
          errors.push(`Row ${rowNumber}: ${err}`);
        });
      }

      // Build preview data
      previewData.push({
        rowNumber,
        status: rowErrors.length > 0 ? 'error' : 'valid',
        dateStatus,
        data: {
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
        },
        errors: rowErrors
      });
    });

    return NextResponse.json({
      success: true,
      totalRows: previewData.length, // Only count non-empty rows
      validRows: previewData.filter(r => r.status === 'valid').length,
      errorRows: previewData.filter(r => r.status === 'error').length,
      errors,
      warnings,
      preview: previewData.slice(0, 10),
      hasErrors: errors.length > 0
    });

  } catch (error) {
    console.error('Error previewing data:', error);
    return NextResponse.json({ error: 'Failed to preview data: ' + error.message }, { status: 500 });
  }
}