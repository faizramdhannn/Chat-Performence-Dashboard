import { google } from 'googleapis';
import path from 'path';
import bcrypt from 'bcryptjs';

class GoogleSheetsService {
  constructor() {
    let auth;
    
    // Check if GOOGLE_CREDENTIALS environment variable exists (for Vercel)
    if (process.env.GOOGLE_CREDENTIALS) {
      try {
        const credentials = JSON.parse(process.env.GOOGLE_CREDENTIALS);
        auth = new google.auth.GoogleAuth({
          credentials: credentials,
          scopes: ['https://www.googleapis.com/auth/spreadsheets'],
        });
        console.log('✅ Using GOOGLE_CREDENTIALS from environment variable');
      } catch (error) {
        console.error('❌ Failed to parse GOOGLE_CREDENTIALS:', error.message);
        throw new Error('Invalid GOOGLE_CREDENTIALS format');
      }
    } else {
      // Fall back to credentials.json file (for local development)
      const credentialsPath = path.join(process.cwd(), 'credentials.json');
      auth = new google.auth.GoogleAuth({
        keyFile: credentialsPath,
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
      });
      console.log('✅ Using credentials.json from file system');
    }
    
    this.auth = auth;
    this.sheets = google.sheets({ version: 'v4', auth: this.auth });
    this.spreadsheetId = process.env.SPREADSHEET_ID;
  }

  // ============ USER MANAGEMENT ============
  async getAllUsers() {
    try {
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: `${process.env.USERS_SHEET}!A:E`,
      });

      const rows = response.data.values;
      if (!rows || rows.length === 0) {
        return [];
      }

      const headers = rows[0];
      return rows.slice(1).map((row, index) => {
        const obj = { rowIndex: index + 2 };
        headers.forEach((header, i) => {
          obj[header] = row[i] || '';
        });
        return obj;
      });
    } catch (error) {
      console.error('Error fetching users:', error);
      throw error;
    }
  }

  async getUserByUsername(username) {
    try {
      const users = await this.getAllUsers();
      return users.find(user => user.username === username);
    } catch (error) {
      console.error('Error fetching user:', error);
      throw error;
    }
  }

  async createUser(userData) {
    try {
      const hashedPassword = await bcrypt.hash(userData.password, 10);
      
      const values = [[
        userData.id || Date.now().toString(),
        userData.username,
        hashedPassword,
        userData.role || 'cs',
        userData.name || userData.username
      ]];

      const response = await this.sheets.spreadsheets.values.append({
        spreadsheetId: this.spreadsheetId,
        range: `${process.env.USERS_SHEET}!A:E`,
        valueInputOption: 'USER_ENTERED',
        resource: { values },
      });

      return response.data;
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    }
  }

  async updateUser(rowIndex, userData) {
    try {
      let passwordValue = userData.password;
      
      // Only hash if password is being changed
      if (userData.password && !userData.password.startsWith('$2')) {
        passwordValue = await bcrypt.hash(userData.password, 10);
      }

      const values = [[
        userData.id,
        userData.username,
        passwordValue,
        userData.role,
        userData.name
      ]];

      const response = await this.sheets.spreadsheets.values.update({
        spreadsheetId: this.spreadsheetId,
        range: `${process.env.USERS_SHEET}!A${rowIndex}:E${rowIndex}`,
        valueInputOption: 'USER_ENTERED',
        resource: { values },
      });

      return response.data;
    } catch (error) {
      console.error('Error updating user:', error);
      throw error;
    }
  }

  async deleteUser(rowIndex) {
    try {
      return await this.deleteRow(process.env.USERS_SHEET, rowIndex);
    } catch (error) {
      console.error('Error deleting user:', error);
      throw error;
    }
  }

  // ============ SETTINGS MANAGEMENT ============
  async getSettings() {
    try {
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: `${process.env.SETTINGS_SHEET}!A:B`,
      });

      const rows = response.data.values;
      if (!rows || rows.length === 0) {
        return {};
      }

      const settings = {};
      rows.forEach(row => {
        if (row[0]) {
          settings[row[0]] = row[1] || '';
        }
      });

      return settings;
    } catch (error) {
      console.error('Error fetching settings:', error);
      throw error;
    }
  }

  async updateSettings(settings) {
    try {
      const values = Object.entries(settings).map(([key, value]) => [key, value]);

      const response = await this.sheets.spreadsheets.values.update({
        spreadsheetId: this.spreadsheetId,
        range: `${process.env.SETTINGS_SHEET}!A:B`,
        valueInputOption: 'USER_ENTERED',
        resource: { values },
      });

      return response.data;
    } catch (error) {
      console.error('Error updating settings:', error);
      throw error;
    }
  }

  // ============ MASTER DATA (DROPDOWNS) ============
  async getMasterData() {
    try {
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: `${process.env.MASTER_DATA_SHEET}!A:O`,
      });

      const rows = response.data.values;
      if (!rows || rows.length === 0) {
        return {};
      }

      const headers = rows[0];
      const masterData = {};

      headers.forEach((header, index) => {
        masterData[header] = rows.slice(1)
          .map(row => row[index])
          .filter(val => val && val.trim() !== '');
      });

      return masterData;
    } catch (error) {
      console.error('Error fetching master data:', error);
      throw error;
    }
  }

  // ============ CHAT PERFORMANCE DATA ============
  async getAllData() {
    try {
      const settings = await this.getSettings();
      const sheetName = settings.data_sheet || process.env.DATA_SHEET;

      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: `${sheetName}!A:P`,
      });

      const rows = response.data.values;
      if (!rows || rows.length === 0) {
        return [];
      }

      const headers = rows[0];
      const data = rows.slice(1).map((row, index) => {
        const obj = { rowIndex: index + 2 };
        headers.forEach((header, i) => {
          obj[header] = row[i] || '';
        });
        return obj;
      });

      return data;
    } catch (error) {
      console.error('Error fetching data:', error);
      throw error;
    }
  }

  async addData(data) {
    try {
      const settings = await this.getSettings();
      const sheetName = settings.data_sheet || process.env.DATA_SHEET;

      const values = [[
        data.date || '',
        data.shift || '',
        data.cs || '',
        data.channel || '',
        data.name || '',
        data.cust || '',
        data.order_number || '',
        data.intention || '',
        data.case || '',
        data.product_name || '',
        data.closing_status || '',
        data.note || '',
        data.chat_status || '',
        data.chat_status2 || '',
        data.follow_up || '',
        data.survey || ''
      ]];

      const response = await this.sheets.spreadsheets.values.append({
        spreadsheetId: this.spreadsheetId,
        range: `${sheetName}!A:P`,
        valueInputOption: 'USER_ENTERED',
        resource: { values },
      });

      return response.data;
    } catch (error) {
      console.error('Error adding data:', error);
      throw error;
    }
  }

  async updateData(rowIndex, data) {
    try {
      const settings = await this.getSettings();
      const sheetName = settings.data_sheet || process.env.DATA_SHEET;

      const values = [[
        data.date || '',
        data.shift || '',
        data.cs || '',
        data.channel || '',
        data.name || '',
        data.cust || '',
        data.order_number || '',
        data.intention || '',
        data.case || '',
        data.product_name || '',
        data.closing_status || '',
        data.note || '',
        data.chat_status || '',
        data.chat_status2 || '',
        data.follow_up || '',
        data.survey || ''
      ]];

      const response = await this.sheets.spreadsheets.values.update({
        spreadsheetId: this.spreadsheetId,
        range: `${sheetName}!A${rowIndex}:P${rowIndex}`,
        valueInputOption: 'USER_ENTERED',
        resource: { values },
      });

      return response.data;
    } catch (error) {
      console.error('Error updating data:', error);
      throw error;
    }
  }

  async deleteData(rowIndex) {
    try {
      const settings = await this.getSettings();
      const sheetName = settings.data_sheet || process.env.DATA_SHEET;
      
      return await this.deleteRow(sheetName, rowIndex);
    } catch (error) {
      console.error('Error deleting data:', error);
      throw error;
    }
  }

  async getDataByRowIndex(rowIndex) {
    try {
      const allData = await this.getAllData();
      return allData.find(item => item.rowIndex === rowIndex);
    } catch (error) {
      console.error('Error fetching single data:', error);
      throw error;
    }
  }

  // ============ HELPER METHODS ============
  async deleteRow(sheetName, rowIndex) {
    try {
      const sheetMetadata = await this.sheets.spreadsheets.get({
        spreadsheetId: this.spreadsheetId,
      });

      const sheet = sheetMetadata.data.sheets.find(
        s => s.properties.title === sheetName
      );

      if (!sheet) {
        throw new Error(`Sheet "${sheetName}" not found`);
      }

      const sheetId = sheet.properties.sheetId;

      const response = await this.sheets.spreadsheets.batchUpdate({
        spreadsheetId: this.spreadsheetId,
        resource: {
          requests: [
            {
              deleteDimension: {
                range: {
                  sheetId: sheetId,
                  dimension: 'ROWS',
                  startIndex: rowIndex - 1,
                  endIndex: rowIndex,
                },
              },
            },
          ],
        },
      });

      return response.data;
    } catch (error) {
      console.error('Error deleting row:', error);
      throw error;
    }
  }
}

export default new GoogleSheetsService();