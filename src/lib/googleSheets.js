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
    this.warrantySpreadsheetId = process.env.WARRANTY_SPREADSHEET_ID;
    
    // Simple cache
    this.cache = {
      data: null,
      timestamp: null,
      ttl: 30000 // 30 seconds cache
    };
  }

  // Cache helper
  isCacheValid() {
    if (!this.cache.data || !this.cache.timestamp) return false;
    return (Date.now() - this.cache.timestamp) < this.cache.ttl;
  }

  clearCache() {
    this.cache.data = null;
    this.cache.timestamp = null;
  }

  // Helper function to capitalize first letter of each word
  toProperCase(str) {
    if (!str) return '';
    return str.toLowerCase().replace(/\b\w/g, char => char.toUpperCase());
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

  // ============ REGISTRATION MANAGEMENT ============
  async getPendingRegistrations() {
    try {
      const sheetName = process.env.REGISTRATIONS_SHEET || 'registrations';
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: `${sheetName}!A:F`,
      });

      const rows = response.data.values;
      if (!rows || rows.length === 0) {
        return [];
      }

      const headers = rows[0];
      return rows.slice(1)
        .map((row, index) => {
          const obj = { rowIndex: index + 2 };
          headers.forEach((header, i) => {
            obj[header] = row[i] || '';
          });
          return obj;
        })
        .filter(reg => reg.status === 'pending');
    } catch (error) {
      console.error('Error fetching registrations:', error);
      // If sheet doesn't exist, return empty array
      return [];
    }
  }

  async createPendingRegistration(data) {
    try {
      const sheetName = process.env.REGISTRATIONS_SHEET || 'registrations';
      
      const values = [[
        data.id,
        data.username,
        data.password,
        data.name,
        data.status,
        data.requestedAt
      ]];

      const response = await this.sheets.spreadsheets.values.append({
        spreadsheetId: this.spreadsheetId,
        range: `${sheetName}!A:F`,
        valueInputOption: 'USER_ENTERED',
        resource: { values },
      });

      return response.data;
    } catch (error) {
      console.error('Error creating registration:', error);
      throw error;
    }
  }

  async approveRegistration(registrationId, role) {
    try {
      const sheetName = process.env.REGISTRATIONS_SHEET || 'registrations';
      const registrations = await this.getPendingRegistrations();
      const registration = registrations.find(r => r.id === registrationId);

      if (!registration) {
        throw new Error('Registration not found');
      }

      // Create user in users sheet
      await this.createUserFromRegistration(registration, role);

      // Update registration status
      const values = [[
        registration.id,
        registration.username,
        registration.password,
        registration.name,
        'approved',
        registration.requestedAt
      ]];

      await this.sheets.spreadsheets.values.update({
        spreadsheetId: this.spreadsheetId,
        range: `${sheetName}!A${registration.rowIndex}:F${registration.rowIndex}`,
        valueInputOption: 'USER_ENTERED',
        resource: { values },
      });

      return { success: true };
    } catch (error) {
      console.error('Error approving registration:', error);
      throw error;
    }
  }

  async createUserFromRegistration(registration, role) {
    try {
      const values = [[
        registration.id,
        registration.username,
        registration.password, // Already hashed
        role,
        registration.name
      ]];

      const response = await this.sheets.spreadsheets.values.append({
        spreadsheetId: this.spreadsheetId,
        range: `${process.env.USERS_SHEET}!A:E`,
        valueInputOption: 'USER_ENTERED',
        resource: { values },
      });

      return response.data;
    } catch (error) {
      console.error('Error creating user from registration:', error);
      throw error;
    }
  }

  async rejectRegistration(registrationId) {
    try {
      const sheetName = process.env.REGISTRATIONS_SHEET || 'registrations';
      const registrations = await this.getPendingRegistrations();
      const registration = registrations.find(r => r.id === registrationId);

      if (!registration) {
        throw new Error('Registration not found');
      }

      // Delete the registration row
      return await this.deleteRow(sheetName, registration.rowIndex);
    } catch (error) {
      console.error('Error rejecting registration:', error);
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
      // Check cache first
      if (this.isCacheValid()) {
        console.log('📦 Using cached data');
        return this.cache.data;
      }

      console.log('🔄 Fetching fresh data from Google Sheets');
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

      // Update cache
      this.cache.data = data;
      this.cache.timestamp = Date.now();

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

      // Clear cache after adding data
      this.clearCache();

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

      // Clear cache after updating data
      this.clearCache();

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
      
      const result = await this.deleteRow(sheetName, rowIndex);
      
      // Clear cache after deleting data
      this.clearCache();
      
      return result;
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

  // ============ WARRANTY DATA ============
  async getWarrantyData() {
    try {
      // Fetch dari sheet 'form_warranty' dengan kolom A sampai N
      // Struktur: id, order_number, full_name, birth_date, gender, whatsapp, 
      //           email, address, postal_code, created_at, updated_at, channel, valid_order
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.warrantySpreadsheetId,
        range: 'form_warranty!A:N',
      });

      const rows = response.data.values;
      if (!rows || rows.length === 0) {
        return [];
      }

      const headers = rows[0];
      const data = rows.slice(1).map((row, index) => {
        const obj = { rowIndex: index + 2 };
        headers.forEach((header, i) => {
          // Convert channel to proper case if exists
          if (header === 'channel') {
            obj[header] = this.toProperCase(row[i] || '');
          } else {
            obj[header] = row[i] || '';
          }
        });
        return obj;
      });

      return data;
    } catch (error) {
      console.error('Error fetching warranty data:', error);
      throw error;
    }
  }

  async getCheckActivationData() {
    try {
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.warrantySpreadsheetId,
        range: 'check-activation!A:Q',
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
      console.error('Error fetching check activation data:', error);
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