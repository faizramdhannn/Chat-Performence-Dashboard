/**
 * Setup Verification Script
 * 
 * Script untuk verifikasi setup Google Sheets dan credentials
 * 
 * Usage:
 * node scripts/verifySetup.js
 */

const { google } = require('googleapis');
const path = require('path');
const fs = require('fs');

async function verifySetup() {
  console.log('='.repeat(50));
  console.log('Setup Verification');
  console.log('='.repeat(50));
  console.log('');

  // Check .env file
  console.log('1. Checking .env file...');
  if (!fs.existsSync('.env')) {
    console.log('   ❌ .env file not found!');
    console.log('   → Copy .env.example to .env and fill in the values');
    return;
  }
  console.log('   ✅ .env file found');
  console.log('');

  // Load environment variables
  require('dotenv').config();

  // Check credentials.json
  console.log('2. Checking credentials.json...');
  const credentialsPath = path.join(process.cwd(), 'credentials.json');
  if (!fs.existsSync(credentialsPath)) {
    console.log('   ❌ credentials.json not found!');
    console.log('   → Download from Google Cloud Console and place in root directory');
    return;
  }
  console.log('   ✅ credentials.json found');
  console.log('');

  // Check environment variables
  console.log('3. Checking environment variables...');
  const requiredEnvVars = [
    'SPREADSHEET_ID',
    'USERS_SHEET',
    'SETTINGS_SHEET',
    'MASTER_DATA_SHEET',
    'DATA_SHEET',
    'NEXTAUTH_SECRET'
  ];

  let envVarsOk = true;
  for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
      console.log(`   ❌ ${envVar} not set`);
      envVarsOk = false;
    } else {
      console.log(`   ✅ ${envVar} set`);
    }
  }
  
  if (!envVarsOk) {
    console.log('');
    console.log('   → Please set all required environment variables in .env file');
    return;
  }
  console.log('');

  // Test Google Sheets connection
  console.log('4. Testing Google Sheets connection...');
  try {
    const auth = new google.auth.GoogleAuth({
      keyFile: credentialsPath,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const sheets = google.sheets({ version: 'v4', auth });
    
    // Try to get spreadsheet metadata
    const response = await sheets.spreadsheets.get({
      spreadsheetId: process.env.SPREADSHEET_ID,
    });

    console.log(`   ✅ Connected to spreadsheet: "${response.data.properties.title}"`);
    console.log('');

    // Check sheets
    console.log('5. Checking required sheets...');
    const sheetNames = response.data.sheets.map(s => s.properties.title);
    
    const requiredSheets = [
      process.env.USERS_SHEET,
      process.env.SETTINGS_SHEET,
      process.env.MASTER_DATA_SHEET,
      process.env.DATA_SHEET
    ];

    let sheetsOk = true;
    for (const sheetName of requiredSheets) {
      if (sheetNames.includes(sheetName)) {
        console.log(`   ✅ Sheet "${sheetName}" found`);
      } else {
        console.log(`   ❌ Sheet "${sheetName}" not found`);
        sheetsOk = false;
      }
    }

    if (!sheetsOk) {
      console.log('');
      console.log('   → Please create the missing sheets in your Google Sheets');
      console.log('   → Refer to GOOGLE_SHEETS_GUIDE.md for structure');
      return;
    }

    console.log('');
    console.log('='.repeat(50));
    console.log('✅ All checks passed!');
    console.log('='.repeat(50));
    console.log('');
    console.log('Next steps:');
    console.log('1. Make sure you have at least one user in the "users" sheet');
    console.log('2. Run: npm run dev');
    console.log('3. Open: http://localhost:3000');
    console.log('');

  } catch (error) {
    console.log('   ❌ Failed to connect to Google Sheets');
    console.log('');
    console.log('Error details:');
    console.log(error.message);
    console.log('');
    console.log('Possible issues:');
    console.log('- Service account email not shared with the spreadsheet');
    console.log('- Incorrect spreadsheet ID');
    console.log('- Credentials file is invalid');
    console.log('- API not enabled in Google Cloud Console');
  }
}

verifySetup();
