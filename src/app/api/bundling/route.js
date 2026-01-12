import { NextResponse } from 'next/server';
import { google } from 'googleapis';

const SPREADSHEET_ID = process.env.USERS_SPREADSHEET_ID;
const BUNDLING_SHEET = 'master-bundling';
const STOCK_SHEET = 'master-stock';

// Initialize Google Sheets API
async function getSheetsClient() {
  let auth;
  if (process.env.GOOGLE_CREDENTIALS) {
    const credentials = JSON.parse(process.env.GOOGLE_CREDENTIALS);
    auth = new google.auth.GoogleAuth({
      credentials: credentials,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });
  } else {
    auth = new google.auth.GoogleAuth({
      keyFile: 'credentials.json',
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });
  }
  return google.sheets({ version: 'v4', auth });
}

// GET - Fetch bundling data and master-stock options
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    const sheets = await getSheetsClient();

    if (action === 'options') {
      // Fetch master-stock data for options
      const stockResponse = await sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: `${STOCK_SHEET}!A:Z`,
      });

      const stockRows = stockResponse.data.values;
      if (!stockRows || stockRows.length === 0) {
        return NextResponse.json({ nonGWP: [], GWP: [], prices: {} });
      }

      const headers = stockRows[0];
      const artikelIndex = headers.indexOf('Artikel');
      const gradeIndex = headers.indexOf('Grade');
      const hpjIndex = headers.indexOf('HPJ');
      const hptIndex = headers.indexOf('HPT');

      const nonGWPOptions = [];
      const GWPOptions = [];
      const prices = {};

      // Helper function to parse Indonesian currency format
      const parseRupiah = (value) => {
        if (!value) return 0;
        // Remove "Rp", spaces, and dots (thousand separator)
        // Then parse as float
        const cleaned = String(value)
          .replace(/Rp/gi, '')
          .replace(/\s/g, '')
          .replace(/\./g, '')
          .replace(/,/g, '.'); // Replace comma with dot for decimal
        return parseFloat(cleaned) || 0;
      };

      stockRows.slice(1).forEach(row => {
        const artikel = row[artikelIndex];
        const grade = row[gradeIndex];
        const hpj = parseRupiah(row[hpjIndex]);
        const hpt = parseRupiah(row[hptIndex]);

        if (!artikel) return;

        if (grade !== 'GWP') {
          if (!nonGWPOptions.includes(artikel)) {
            nonGWPOptions.push(artikel);
            prices[artikel] = { HPJ: hpj, HPT: hpt, type: 'nonGWP' };
          }
        } else {
          if (!GWPOptions.includes(artikel)) {
            GWPOptions.push(artikel);
            prices[artikel] = { HPJ: hpj, HPT: hpt, type: 'GWP' };
          }
        }
      });

      return NextResponse.json({
        nonGWP: nonGWPOptions.sort(),
        GWP: GWPOptions.sort(),
        prices,
      });
    }

    // Fetch bundling data
    const bundlingResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${BUNDLING_SHEET}!A:P`,
    });

    const rows = bundlingResponse.data.values;
    if (!rows || rows.length === 0) {
      return NextResponse.json({ data: [] });
    }

    const headers = rows[0];
    const data = rows.slice(1).map((row, index) => ({
      rowIndex: index + 2, // For update/delete reference
      id: row[0] || '',
      bundling_name: row[1] || '',
      option_1: row[2] || '',
      option_2: row[3] || '',
      option_3: row[4] || '',
      option_4: row[5] || '',
      option_5: row[6] || '',
      option_6: row[7] || '',
      total_value: parseFloat(row[8]) || 0,
      discount_percentage: parseFloat(row[9]) || 0,
      discount_value: parseFloat(row[10]) || 0,
      value: parseFloat(row[11]) || 0,
      stock: parseInt(row[12]) || 0,
      status: row[13] || 'Active',
      created_at: row[14] || '',
      update_at: row[15] || '',
    }));

    return NextResponse.json({ data });
  } catch (error) {
    console.error('Error fetching bundling data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch data', details: error.message },
      { status: 500 }
    );
  }
}

// POST - Create new bundling
export async function POST(request) {
  try {
    const body = await request.json();
    const sheets = await getSheetsClient();

    // Get existing data to generate new ID
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${BUNDLING_SHEET}!A:A`,
    });

    const rows = response.data.values || [];
    const lastId = rows.length > 1 ? parseInt(rows[rows.length - 1][0]) || 0 : 0;
    const newId = lastId + 1;

    const now = new Date().toISOString();

    // Calculate the new row number (lastId + 1 means row index will be lastId + 2 since row 1 is header)
    const newRowNumber = newId + 1; // If ID is 1, row is 2; if ID is 2, row is 3, etc.
    
    // Create stock formula that references the correct row
    // Formula pattern: =IF(C{row}<>"";MIN(MAP(FILTER(C{row}:H{row};C{row}:H{row}<>"");LAMBDA(opt;SUM(FILTER(stock!E:E;ISNUMBER(MATCH(stock!A:A;FILTER('master-stock'!A:A;'master-stock'!D:D=opt);0)))))));"")
    const stockFormula = `=IF(C${newRowNumber}<>"";MIN(MAP(FILTER(C${newRowNumber}:H${newRowNumber};C${newRowNumber}:H${newRowNumber}<>"");LAMBDA(opt;SUM(FILTER(stock!E:E;ISNUMBER(MATCH(stock!A:A;FILTER('master-stock'!A:A;'master-stock'!D:D=opt);0)))))));"")`;

    // Create new row with stock formula
    const newRow = [
      newId,                        // A - id
      body.bundling_name,           // B - bundling_name
      body.option_1 || '',          // C - option_1
      body.option_2 || '',          // D - option_2
      body.option_3 || '',          // E - option_3
      body.option_4 || '',          // F - option_4
      body.option_5 || '',          // G - option_5
      body.option_6 || '',          // H - option_6
      body.total_value || 0,        // I - total_value
      body.discount_percentage || 0,// J - discount_percentage
      body.discount_value || 0,     // K - discount_value
      body.value || 0,              // L - value
      stockFormula,                 // M - stock (formula that auto-adjusts)
      body.status || 'Active',      // N - status
      now,                          // O - created_at
      now,                          // P - update_at
    ];

    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: `${BUNDLING_SHEET}!A:P`,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [newRow],
      },
    });

    return NextResponse.json({ 
      success: true, 
      message: 'Bundling created successfully',
      id: newId 
    });
  } catch (error) {
    console.error('Error creating bundling:', error);
    return NextResponse.json(
      { error: 'Failed to create bundling', details: error.message },
      { status: 500 }
    );
  }
}

// PUT - Update bundling
export async function PUT(request) {
  try {
    const body = await request.json();
    const sheets = await getSheetsClient();

    const now = new Date().toISOString();

    // Update row WITHOUT touching stock column (column M)
    // We use batchUpdate to skip column M
    const data = [
      {
        // Update columns A-L (before stock)
        range: `${BUNDLING_SHEET}!A${body.rowIndex}:L${body.rowIndex}`,
        values: [[
          body.id,
          body.bundling_name,
          body.option_1 || '',
          body.option_2 || '',
          body.option_3 || '',
          body.option_4 || '',
          body.option_5 || '',
          body.option_6 || '',
          body.total_value || 0,
          body.discount_percentage || 0,
          body.discount_value || 0,
          body.value || 0,
        ]]
      },
      {
        // Update columns N-P (after stock, skip M)
        range: `${BUNDLING_SHEET}!N${body.rowIndex}:P${body.rowIndex}`,
        values: [[
          body.status || 'Active',
          body.created_at || now,
          now,
        ]]
      }
    ];

    await sheets.spreadsheets.values.batchUpdate({
      spreadsheetId: SPREADSHEET_ID,
      requestBody: {
        valueInputOption: 'USER_ENTERED',
        data: data,
      },
    });

    return NextResponse.json({ 
      success: true, 
      message: 'Bundling updated successfully' 
    });
  } catch (error) {
    console.error('Error updating bundling:', error);
    return NextResponse.json(
      { error: 'Failed to update bundling', details: error.message },
      { status: 500 }
    );
  }
}

// DELETE - Delete bundling
export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const rowIndex = searchParams.get('rowIndex');

    if (!rowIndex) {
      return NextResponse.json(
        { error: 'Row index is required' },
        { status: 400 }
      );
    }

    const sheets = await getSheetsClient();

    // Get sheet properties to find the correct sheetId
    const spreadsheet = await sheets.spreadsheets.get({
      spreadsheetId: SPREADSHEET_ID,
    });

    // Find the sheet with name 'master-bundling'
    const sheet = spreadsheet.data.sheets.find(
      s => s.properties.title === BUNDLING_SHEET
    );

    if (!sheet) {
      return NextResponse.json(
        { error: 'Sheet not found' },
        { status: 404 }
      );
    }

    const sheetId = sheet.properties.sheetId;

    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: SPREADSHEET_ID,
      requestBody: {
        requests: [
          {
            deleteDimension: {
              range: {
                sheetId: sheetId,
                dimension: 'ROWS',
                startIndex: parseInt(rowIndex) - 1,
                endIndex: parseInt(rowIndex),
              },
            },
          },
        ],
      },
    });

    return NextResponse.json({ 
      success: true, 
      message: 'Bundling deleted successfully' 
    });
  } catch (error) {
    console.error('Error deleting bundling:', error);
    return NextResponse.json(
      { error: 'Failed to delete bundling', details: error.message },
      { status: 500 }
    );
  }
}