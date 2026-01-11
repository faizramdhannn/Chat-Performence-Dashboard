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
    
    // Main data spreadsheet
    this.spreadsheetId = process.env.SPREADSHEET_ID;
    
    // Users & Settings spreadsheet (BARU - Spreadsheet terpisah)
    this.usersSpreadsheetId = process.env.USERS_SPREADSHEET_ID;
    
    // Warranty spreadsheet
    this.warrantySpreadsheetId = process.env.WARRANTY_SPREADSHEET_ID;
    
    // CS Nilai spreadsheet
    this.csNilaiSpreadsheetId = process.env.CS_NILAI_SPREADSHEET_ID;
    
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

  // ============ USER MANAGEMENT (GUNAKAN usersSpreadsheetId) ============
  async getAllUsers() {
    try {
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.usersSpreadsheetId, // PAKAI spreadsheet terpisah
        range: `${process.env.USERS_SHEET}!A:N`, // UPDATE: A-N untuk include permissions
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
        userData.role || 'user', // Legacy field
        userData.name || userData.username,
        userData.dashboard || 'FALSE',
        userData.chat_creation || 'FALSE',
        userData.analytics || 'FALSE',
        userData.warranty || 'FALSE',
        userData.stock || 'FALSE',
        userData.registrations || 'FALSE',
        userData.user_management || 'FALSE',
        userData.settings || 'FALSE',
        '', // N: last_activity (empty on create)
      ]];

      const response = await this.sheets.spreadsheets.values.append({
        spreadsheetId: this.usersSpreadsheetId,
        range: `${process.env.USERS_SHEET}!A:N`, // UPDATE: A-N
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
        userData.role || 'user', // Legacy field
        userData.name,
        userData.dashboard || 'FALSE',
        userData.chat_creation || 'FALSE',
        userData.analytics || 'FALSE',
        userData.warranty || 'FALSE',
        userData.stock || 'FALSE',
        userData.registrations || 'FALSE',
        userData.user_management || 'FALSE',
        userData.settings || 'FALSE',
        userData.last_activity || '', // N: last_activity
      ]];

      const response = await this.sheets.spreadsheets.values.update({
        spreadsheetId: this.usersSpreadsheetId,
        range: `${process.env.USERS_SHEET}!A${rowIndex}:N${rowIndex}`, // UPDATE: A-N
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
      return await this.deleteRow(this.usersSpreadsheetId, process.env.USERS_SHEET, rowIndex);
    } catch (error) {
      console.error('Error deleting user:', error);
      throw error;
    }
  }

  // ============ USER ACTIVITY TRACKING ============
  async updateUserLastActivity(username, timestamp) {
    try {
      const users = await this.getAllUsers();
      const user = users.find(u => u.username === username);
      
      if (!user) {
        throw new Error('User not found');
      }

      // Update only column N (last_activity)
      const response = await this.sheets.spreadsheets.values.update({
        spreadsheetId: this.usersSpreadsheetId,
        range: `${process.env.USERS_SHEET}!N${user.rowIndex}`,
        valueInputOption: 'USER_ENTERED',
        resource: {
          values: [[timestamp]]
        },
      });

      return response.data;
    } catch (error) {
      console.error('Error updating last activity:', error);
      throw error;
    }
  }

  // ============ REGISTRATION MANAGEMENT (GUNAKAN usersSpreadsheetId) ============
  async getPendingRegistrations() {
    try {
      const sheetName = process.env.REGISTRATIONS_SHEET || 'registrations';
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.usersSpreadsheetId, // PAKAI spreadsheet terpisah
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
        spreadsheetId: this.usersSpreadsheetId, // PAKAI spreadsheet terpisah
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

  async approveRegistration(registrationId, role, permissions) {
    try {
      const sheetName = process.env.REGISTRATIONS_SHEET || 'registrations';
      const registrations = await this.getPendingRegistrations();
      const registration = registrations.find(r => r.id === registrationId);

      if (!registration) {
        throw new Error('Registration not found');
      }

      // Create user in users sheet with permissions
      await this.createUserFromRegistration(registration, role, permissions);

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
        spreadsheetId: this.usersSpreadsheetId, // PAKAI spreadsheet terpisah
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

  async createUserFromRegistration(registration, role, permissions) {
    try {
      const values = [[
        registration.id,
        registration.username,
        registration.password, // Already hashed
        role || 'user', // Legacy field
        registration.name,
        permissions.dashboard || 'FALSE',
        permissions.chat_creation || 'FALSE',
        permissions.analytics || 'FALSE',
        permissions.warranty || 'FALSE',
        permissions.stock || 'FALSE',
        permissions.registrations || 'FALSE',
        permissions.user_management || 'FALSE',
        permissions.settings || 'FALSE',
        '', // N: last_activity (empty on create)
      ]];

      const response = await this.sheets.spreadsheets.values.append({
        spreadsheetId: this.usersSpreadsheetId, // PAKAI spreadsheet terpisah
        range: `${process.env.USERS_SHEET}!A:N`, // UPDATE: A-N
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
      return await this.deleteRow(this.usersSpreadsheetId, sheetName, registration.rowIndex);
    } catch (error) {
      console.error('Error rejecting registration:', error);
      throw error;
    }
  }

  // ============ SETTINGS MANAGEMENT (GUNAKAN usersSpreadsheetId) ============
  async getSettings() {
    try {
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.usersSpreadsheetId, // PAKAI spreadsheet terpisah
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
        spreadsheetId: this.usersSpreadsheetId, // PAKAI spreadsheet terpisah
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

  // ============ MASTER DATA (DROPDOWNS) - TETAP DI spreadsheetId ============
  async getMasterData() {
    try {
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId, // Tetap di spreadsheet utama
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

  // ============ CHAT PERFORMANCE DATA - TETAP DI spreadsheetId ============
  async getAllData() {
    try {
      // Check cache first
      if (this.isCacheValid()) {
        console.log('📦 Using cached data');
        return this.cache.data;
      }

      console.log('🔄 Fetching fresh data from Google Sheets');
      const sheetName = process.env.DATA_SHEET;

      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId, // Tetap di spreadsheet utama
        range: `${sheetName}!A:Q`,
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
      const sheetName = process.env.DATA_SHEET;

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
        spreadsheetId: this.spreadsheetId, // Tetap di spreadsheet utama
        range: `${sheetName}!A:Q`,
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
      const sheetName = process.env.DATA_SHEET;

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
        spreadsheetId: this.spreadsheetId, // Tetap di spreadsheet utama
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
      const sheetName = process.env.DATA_SHEET;
      
      const result = await this.deleteRow(this.spreadsheetId, sheetName, rowIndex);
      
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

  // ============ SCHEDULE DATA ============
  async getScheduleData() {
    try {
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId, // Main spreadsheet
        range: 'Jadwal CS!A:J',
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
      console.error('Error fetching schedule data:', error);
      throw error;
    }
  }

  // ============ NILAI CS DATA ============
  async getNilaiData() {
    try {
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.csNilaiSpreadsheetId,
        range: 'rekap_nilai!A:E',
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
      console.error('Error fetching nilai data:', error);
      throw error;
    }
  }

  // ============ WARRANTY DATA ============
  async getWarrantyData() {
    try {
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

  // ============ MASTER STOCK DATA ============
  async getMasterStockData() {
    try {
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.usersSpreadsheetId,
        range: 'master-stock!A:J',
      });

      const rows = response.data.values;
      if (!rows || rows.length === 0) {
        return [];
      }

      const headers = rows[0]; // SKU, Product_name, Category, Grade, HPP, HPJ
      const data = rows.slice(1).map((row, index) => {
        const obj = { rowIndex: index + 2 };
        headers.forEach((header, i) => {
          obj[header] = row[i] || '';
        });
        return obj;
      });

      return data;
    } catch (error) {
      console.error('Error fetching master stock data:', error);
      throw error;
    }
  }

  async addMasterStockData(data) {
    try {
      const values = [[
        data.SKU || '',
        data.Product_name || '',
        data.Category || '',
        data.Grade || '',
        data.HPP || '',
        data.HPJ || ''
      ]];

      const response = await this.sheets.spreadsheets.values.append({
        spreadsheetId: this.usersSpreadsheetId,
        range: 'master-stock!A:J',
        valueInputOption: 'USER_ENTERED',
        resource: { values },
      });

      return response.data;
    } catch (error) {
      console.error('Error adding master stock data:', error);
      throw error;
    }
  }

  async updateMasterStockData(rowIndex, data) {
    try {
      const values = [[
        data.SKU || '',
        data.Product_name || '',
        data.Category || '',
        data.Grade || '',
        data.HPP || '',
        data.HPJ || ''
      ]];

      const response = await this.sheets.spreadsheets.values.update({
        spreadsheetId: this.usersSpreadsheetId,
        range: `master-stock!A${rowIndex}:J${rowIndex}`,
        valueInputOption: 'USER_ENTERED',
        resource: { values },
      });

      return response.data;
    } catch (error) {
      console.error('Error updating master stock data:', error);
      throw error;
    }
  }

  async deleteMasterStockData(rowIndex) {
    try {
      return await this.deleteRow(this.usersSpreadsheetId, 'master-stock', rowIndex);
    } catch (error) {
      console.error('Error deleting master stock data:', error);
      throw error;
    }
  }

  // ============ STOCK LAST UPDATE ============
  async getStockLastUpdate() {
    try {
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.usersSpreadsheetId,
        range: 'stock-updates!A:B',
      });

      const rows = response.data.values;
      if (!rows || rows.length === 0) {
        return { shopify: null, javelin: null, threshold: null };
      }

      const lastUpdate = {};
      rows.slice(1).forEach(row => {
        if (row[0]) {
          lastUpdate[row[0]] = row[1] || null;
        }
      });

      return lastUpdate;
    } catch (error) {
      console.error('Error fetching stock last update:', error);
      return { shopify: null, javelin: null, threshold: null };
    }
  }

  async updateStockLastUpdate(type) {
    try {
      // Find row for this type
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.usersSpreadsheetId,
        range: 'stock-updates!A:A',
      });

      const rows = response.data.values || [];
      let rowIndex = -1;

      for (let i = 1; i < rows.length; i++) {
        if (rows[i][0] === type) {
          rowIndex = i + 1; // +1 because sheets are 1-indexed
          break;
        }
      }

      // If not found, append new row
      if (rowIndex === -1) {
        await this.sheets.spreadsheets.values.append({
          spreadsheetId: this.usersSpreadsheetId,
          range: 'stock-updates!A:B',
          valueInputOption: 'USER_ENTERED',
          resource: {
            values: [[type, new Date().toISOString()]]
          }
        });
      } else {
        // Update existing row
        await this.sheets.spreadsheets.values.update({
          spreadsheetId: this.usersSpreadsheetId,
          range: `stock-updates!B${rowIndex}`,
          valueInputOption: 'USER_ENTERED',
          resource: {
            values: [[new Date().toISOString()]]
          }
        });
      }

      return true;
    } catch (error) {
      console.error('Error updating stock last update:', error);
      throw error;
    }
  }

  // ============ STOCK DATA ============
  async getStockData() {
    try {
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.usersSpreadsheetId,
        range: 'stock!A:J',
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

      // Sort: Grade A-Z, then PCA descending
      return data.sort((a, b) => {
        const gradeCompare = String(a.Grade || '').localeCompare(String(b.Grade || ''));
        if (gradeCompare !== 0) return gradeCompare;
        
        const pcaA = parseFloat(a.PCA) || 0;
        const pcaB = parseFloat(b.PCA) || 0;
        return pcaB - pcaA;
      });
    } catch (error) {
      console.error('Error fetching stock data:', error);
      throw error;
    }
  }

  async importToSheet(sheetName, data) {
    try {
      // Clear existing data (except header)
      await this.sheets.spreadsheets.values.clear({
        spreadsheetId: this.usersSpreadsheetId,
        range: `${sheetName}!A2:ZZ`,
      });

      // Prepare values
      const values = data.map(row => {
        // Get all keys from first row to maintain column order
        const keys = Object.keys(data[0]);
        return keys.map(key => row[key] || '');
      });

      // Insert new data
      const response = await this.sheets.spreadsheets.values.append({
        spreadsheetId: this.usersSpreadsheetId,
        range: `${sheetName}!A2`,
        valueInputOption: 'USER_ENTERED',
        resource: { values },
      });

      return {
        rowsImported: values.length,
        response: response.data
      };
    } catch (error) {
      console.error('Error importing to sheet:', error);
      throw error;
    }
  }

  // ============ HELPER METHODS ============
  async deleteRow(spreadsheetId, sheetName, rowIndex) {
    try {
      const sheetMetadata = await this.sheets.spreadsheets.get({
        spreadsheetId: spreadsheetId,
      });

      const sheet = sheetMetadata.data.sheets.find(
        s => s.properties.title === sheetName
      );

      if (!sheet) {
        throw new Error(`Sheet "${sheetName}" not found`);
      }

      const sheetId = sheet.properties.sheetId;

      const response = await this.sheets.spreadsheets.batchUpdate({
        spreadsheetId: spreadsheetId,
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