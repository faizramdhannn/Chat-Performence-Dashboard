import { NextResponse } from 'next/server';
import { google } from 'googleapis';

const SPREADSHEET_ID = process.env.STORE_ANALYTICS_SPREADSHEET_ID;
const SHEET_NAME = process.env.STORE_ANALYTICS_SHEET || 'Daily-Report-2026';

// Parse date in format "11 Jan 2026"
function parseDate(dateStr) {
  if (!dateStr) return null;
  try {
    const date = new Date(dateStr);
    return isNaN(date.getTime()) ? null : date;
  } catch (e) {
    return null;
  }
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const view = searchParams.get('view'); // 'intensi' or 'case'
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const cs = searchParams.get('cs');
    const channel = searchParams.get('channel');

    // Initialize Google Sheets API
    let auth;
    if (process.env.GOOGLE_CREDENTIALS) {
      const credentials = JSON.parse(process.env.GOOGLE_CREDENTIALS);
      auth = new google.auth.GoogleAuth({
        credentials: credentials,
        scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
      });
    } else {
      auth = new google.auth.GoogleAuth({
        keyFile: 'credentials.json',
        scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
      });
    }

    const sheets = google.sheets({ version: 'v4', auth });

    // Fetch data from Google Sheets
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SHEET_NAME}!A:J`,
    });

    const rows = response.data.values;
    if (!rows || rows.length === 0) {
      return NextResponse.json({ 
        data: [],
        stores: [],
        csList: [],
        rows: []
      });
    }

    // Parse header and data
    // Columns: date, taft_name, store, visitor, intensi, case, product_name, status, reason, ket
    const rawData = rows.slice(1).map((row) => ({
      date: row[0] || '',
      taft_name: row[1] || '',
      store: row[2] || '',
      visitor: parseInt(row[3]) || 0,
      intensi: row[4] || '', // Keep as string to get unique values
      case: row[5] || '',     // Keep as string to get unique values
      intensiCount: parseInt(row[4]) || 0, // For counting
      caseCount: parseInt(row[5]) || 0,    // For counting
      product_name: row[6] || '',
      status: row[7] || '',
      reason: row[8] || '',
      ket: row[9] || '',
    }));

    // Filter data based on parameters
    let filteredData = rawData;

    // Filter by date range
    if (startDate) {
      const start = new Date(startDate);
      filteredData = filteredData.filter((item) => {
        const itemDate = parseDate(item.date);
        return itemDate && itemDate >= start;
      });
    }

    if (endDate) {
      const end = new Date(endDate);
      filteredData = filteredData.filter((item) => {
        const itemDate = parseDate(item.date);
        return itemDate && itemDate <= end;
      });
    }

    // Filter by CS (taft_name)
    if (cs && cs !== 'all') {
      filteredData = filteredData.filter((item) => item.taft_name === cs);
    }

    // Filter by Channel (store)
    if (channel && channel !== 'all') {
      filteredData = filteredData.filter((item) => item.store === channel);
    }

    // Get the field name based on view
    const fieldName = view === 'intensi' ? 'intensi' : 'case';

    // Get unique stores
    const uniqueStores = [...new Set(filteredData.map(item => item.store))].filter(Boolean).sort();
    
    // Get unique intensi/case values (as strings, not counts)
    const uniqueRows = [...new Set(filteredData.map(item => item[fieldName]))].filter(Boolean).sort();
    
    const uniqueCS = [...new Set(filteredData.map(item => item.taft_name))].filter(Boolean).sort();

    // Create pivot table structure
    // Row = unique intensi/case value (as string)
    // Column = store
    // Value = count of occurrences
    const pivotMap = {};

    // Initialize pivot map
    uniqueRows.forEach(rowValue => {
      pivotMap[rowValue] = {};
      uniqueStores.forEach(store => {
        pivotMap[rowValue][store] = 0;
      });
      pivotMap[rowValue].total = 0;
    });

    // Fill pivot map with data
    // We count how many times each intensi/case value appears in each store
    filteredData.forEach(item => {
      const rowKey = item[fieldName]; // The intensi or case value (as string)
      const store = item.store;

      if (rowKey && store && pivotMap[rowKey] && pivotMap[rowKey][store] !== undefined) {
        // Count this occurrence
        pivotMap[rowKey][store] += 1;
        pivotMap[rowKey].total += 1;
      }
    });

    // Calculate column totals
    const columnTotals = {};
    uniqueStores.forEach(store => {
      columnTotals[store] = 0;
    });
    columnTotals.total = 0;

    uniqueRows.forEach(rowValue => {
      uniqueStores.forEach(store => {
        columnTotals[store] += pivotMap[rowValue][store] || 0;
      });
      columnTotals.total += pivotMap[rowValue].total || 0;
    });

    return NextResponse.json({
      pivotMap,
      rows: uniqueRows,
      stores: uniqueStores,
      csList: uniqueCS,
      columnTotals,
    });
  } catch (error) {
    console.error('Error fetching store analytics data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch data', details: error.message },
      { status: 500 }
    );
  }
}