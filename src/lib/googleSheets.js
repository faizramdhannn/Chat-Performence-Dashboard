import { google } from "googleapis";
import path from "path";
import bcrypt from "bcryptjs";

class GoogleSheetsService {
  constructor() {
    let auth;

    // Check if GOOGLE_CREDENTIALS environment variable exists (for Vercel)
    if (process.env.GOOGLE_CREDENTIALS) {
      try {
        const credentials = JSON.parse(process.env.GOOGLE_CREDENTIALS);
        auth = new google.auth.GoogleAuth({
          credentials: credentials,
          scopes: ["https://www.googleapis.com/auth/spreadsheets"],
        });
        console.log("✅ Using GOOGLE_CREDENTIALS from environment variable");
      } catch (error) {
        console.error("❌ Failed to parse GOOGLE_CREDENTIALS:", error.message);
        throw new Error("Invalid GOOGLE_CREDENTIALS format");
      }
    } else {
      // Fall back to credentials.json file (for local development)
      const credentialsPath = path.join(process.cwd(), "credentials.json");
      auth = new google.auth.GoogleAuth({
        keyFile: credentialsPath,
        scopes: ["https://www.googleapis.com/auth/spreadsheets"],
      });
      console.log("✅ Using credentials.json from file system");
    }

    this.auth = auth;
    this.sheets = google.sheets({ version: "v4", auth: this.auth });

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
      ttl: 30000, // 30 seconds cache
    };
  }

  // Cache helper
  isCacheValid() {
    if (!this.cache.data || !this.cache.timestamp) return false;
    return Date.now() - this.cache.timestamp < this.cache.ttl;
  }

  clearCache() {
    this.cache.data = null;
    this.cache.timestamp = null;
  }

  // Helper function to capitalize first letter of each word
  toProperCase(str) {
    if (!str) return "";
    return str.toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase());
  }

  // ============ USER MANAGEMENT (FIXED - ID-BASED) ============
  async getAllUsers() {
    try {
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.usersSpreadsheetId,
        range: `${process.env.USERS_SHEET}!A:Q`,
      });

      const rows = response.data.values;
      if (!rows || rows.length === 0) {
        return [];
      }

      const headers = rows[0];
      return rows.slice(1).map((row, index) => {
        const obj = { rowIndex: index + 2 };
        headers.forEach((header, i) => {
          obj[header] = row[i] || "";
        });
        return obj;
      });
    } catch (error) {
      console.error("Error fetching users:", error);
      throw error;
    }
  }

  async getUserByUsername(username) {
    try {
      const users = await this.getAllUsers();
      return users.find((user) => user.username === username);
    } catch (error) {
      console.error("Error fetching user:", error);
      throw error;
    }
  }

  async createUser(userData) {
    try {
      console.log(`➕ Creating new user: ${userData.username}`);

      const hashedPassword = await bcrypt.hash(userData.password, 10);

      const values = [
        [
          userData.id || Date.now().toString(),
          userData.username,
          hashedPassword,
          userData.role || "user", // Legacy field
          userData.name || userData.username,
          userData.dashboard || "FALSE",
          userData.chat_creation || "FALSE",
          userData.analytics || "FALSE",
          userData.warranty || "FALSE",
          userData.bundling || "FALSE",
          userData.stock || "FALSE",
          userData.notes || "FALSE", // NEW
          userData.registrations || "FALSE",
          userData.user_management || "FALSE",
          userData.settings || "FALSE",
          new Date().toISOString(), // P: created_at
          "", // Q: last_activity
        ],
      ];

      const response = await this.sheets.spreadsheets.values.append({
        spreadsheetId: this.usersSpreadsheetId,
        range: `${process.env.USERS_SHEET}!A:Q`,
        valueInputOption: "USER_ENTERED",
        resource: { values },
      });

      console.log(`✅ Successfully created user: ${userData.username}`);
      return response.data;
    } catch (error) {
      console.error("❌ Error creating user:", error);
      throw error;
    }
  }

  // CRITICAL FIX: Now uses userId instead of rowIndex
  async updateUser(userId, userData) {
    try {
      // CRITICAL: Always fetch fresh data to get correct rowIndex
      const users = await this.getAllUsers();
      const user = users.find(u => u.id === userId);

      if (!user) {
        throw new Error(`User with id ${userId} not found`);
      }

      console.log(`📝 Updating user ${userData.username} (ID: ${userId}) at row ${user.rowIndex}`);

      let passwordValue = userData.password;

      // Only hash if password is being changed and not already hashed
      if (userData.password && !userData.password.startsWith("$2")) {
        passwordValue = await bcrypt.hash(userData.password, 10);
      } else if (!userData.password) {
        // If no password provided, keep the old one
        passwordValue = user.password;
      }

      const values = [
        [
          userId, // Use the userId parameter to ensure consistency
          userData.username,
          passwordValue,
          userData.role || "user", // Legacy field
          userData.name,
          userData.dashboard || "FALSE",
          userData.chat_creation || "FALSE",
          userData.analytics || "FALSE",
          userData.warranty || "FALSE",
          userData.bundling || "FALSE",
          userData.stock || "FALSE",
          userData.notes || "FALSE",
          userData.registrations || "FALSE",
          userData.user_management || "FALSE",
          userData.settings || "FALSE",
          userData.created_at || user.created_at || "", // P: created_at
          userData.last_activity || "", // Q: last_activity
        ],
      ];

      const response = await this.sheets.spreadsheets.values.update({
        spreadsheetId: this.usersSpreadsheetId,
        range: `${process.env.USERS_SHEET}!A${user.rowIndex}:Q${user.rowIndex}`,
        valueInputOption: "USER_ENTERED",
        resource: { values },
      });

      console.log(`✅ Successfully updated user ${userData.username}`);
      return response.data;
    } catch (error) {
      console.error("❌ Error updating user:", error);
      throw error;
    }
  }

  // CRITICAL FIX: Now uses userId instead of rowIndex
  async deleteUser(userId) {
    try {
      // CRITICAL: Always fetch fresh data to get correct rowIndex
      const users = await this.getAllUsers();
      const user = users.find(u => u.id === userId);

      if (!user) {
        throw new Error(`User with id ${userId} not found`);
      }

      // SAFETY CHECK: Don't delete the last super admin
      const superAdmins = users.filter(u => u.role === 'super_admin');
      if (user.role === 'super_admin' && superAdmins.length <= 1) {
        throw new Error('Cannot delete the last super admin');
      }

      console.log(`🗑️  Attempting to delete user: ${user.username} (ID: ${userId}) at row ${user.rowIndex}`);

      const result = await this.deleteRow(
        this.usersSpreadsheetId,
        process.env.USERS_SHEET,
        user.rowIndex,
      );

      console.log(`✅ Successfully deleted user ${user.username}`);
      return result;
    } catch (error) {
      console.error("❌ Error deleting user:", error);
      throw error;
    }
  }

  // ============ USER ACTIVITY TRACKING (IMPROVED ERROR HANDLING) ============
  async updateUserLastActivity(username, timestamp) {
    try {
      const users = await this.getAllUsers();
      const user = users.find((u) => u.username === username);

      if (!user) {
        console.warn(`⚠️  User ${username} not found for activity update`);
        return null;
      }

      console.log(`📍 Updating last activity for ${username} at row ${user.rowIndex}`);

      // Update only column Q (last_activity)
      const response = await this.sheets.spreadsheets.values.update({
        spreadsheetId: this.usersSpreadsheetId,
        range: `${process.env.USERS_SHEET}!Q${user.rowIndex}`,
        valueInputOption: "USER_ENTERED",
        resource: {
          values: [[timestamp]],
        },
      });

      return response.data;
    } catch (error) {
      console.error("❌ Error updating last activity:", error);
      // Don't throw - activity update failure shouldn't break the app
      return null;
    }
  }

  // ============ REGISTRATION MANAGEMENT ============
  async getPendingRegistrations() {
    try {
      const sheetName = process.env.REGISTRATIONS_SHEET || "registrations";
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.usersSpreadsheetId,
        range: `${sheetName}!A:F`,
      });

      const rows = response.data.values;
      if (!rows || rows.length === 0) {
        return [];
      }

      const headers = rows[0];
      return rows
        .slice(1)
        .map((row, index) => {
          const obj = { rowIndex: index + 2 };
          headers.forEach((header, i) => {
            obj[header] = row[i] || "";
          });
          return obj;
        })
        .filter((reg) => reg.status === "pending");
    } catch (error) {
      console.error("Error fetching registrations:", error);
      return [];
    }
  }

  async createPendingRegistration(data) {
    try {
      const sheetName = process.env.REGISTRATIONS_SHEET || "registrations";

      const values = [
        [
          data.id,
          data.username,
          data.password,
          data.name,
          data.status,
          data.requestedAt,
        ],
      ];

      const response = await this.sheets.spreadsheets.values.append({
        spreadsheetId: this.usersSpreadsheetId,
        range: `${sheetName}!A:F`,
        valueInputOption: "USER_ENTERED",
        resource: { values },
      });

      return response.data;
    } catch (error) {
      console.error("Error creating registration:", error);
      throw error;
    }
  }

  async approveRegistration(registrationId, role, permissions) {
    try {
      const sheetName = process.env.REGISTRATIONS_SHEET || "registrations";
      const registrations = await this.getPendingRegistrations();
      const registration = registrations.find((r) => r.id === registrationId);

      if (!registration) {
        throw new Error("Registration not found");
      }

      // Create user in users sheet with permissions
      await this.createUserFromRegistration(registration, role, permissions);

      // Update registration status
      const values = [
        [
          registration.id,
          registration.username,
          registration.password,
          registration.name,
          "approved",
          registration.requestedAt,
        ],
      ];

      await this.sheets.spreadsheets.values.update({
        spreadsheetId: this.usersSpreadsheetId,
        range: `${sheetName}!A${registration.rowIndex}:F${registration.rowIndex}`,
        valueInputOption: "USER_ENTERED",
        resource: { values },
      });

      return { success: true };
    } catch (error) {
      console.error("Error approving registration:", error);
      throw error;
    }
  }

  async createUserFromRegistration(registration, role, permissions) {
    try {
      console.log(`➕ Creating user from registration: ${registration.username}`);

      const values = [
        [
          registration.id,
          registration.username,
          registration.password, // Already hashed
          role || "user", // Legacy field
          registration.name,
          permissions.dashboard || "FALSE",
          permissions.chat_creation || "FALSE",
          permissions.analytics || "FALSE",
          permissions.warranty || "FALSE",
          permissions.bundling || "FALSE",
          permissions.stock || "FALSE",
          permissions.notes || "FALSE",
          permissions.registrations || "FALSE",
          permissions.user_management || "FALSE",
          permissions.settings || "FALSE",
          new Date().toISOString(), // P: created_at
          "", // Q: last_activity
        ],
      ];

      const response = await this.sheets.spreadsheets.values.append({
        spreadsheetId: this.usersSpreadsheetId,
        range: `${process.env.USERS_SHEET}!A:Q`,
        valueInputOption: "USER_ENTERED",
        resource: { values },
      });

      console.log(`✅ Successfully created user from registration: ${registration.username}`);
      return response.data;
    } catch (error) {
      console.error("❌ Error creating user from registration:", error);
      throw error;
    }
  }

  async rejectRegistration(registrationId) {
    try {
      const sheetName = process.env.REGISTRATIONS_SHEET || "registrations";
      const registrations = await this.getPendingRegistrations();
      const registration = registrations.find((r) => r.id === registrationId);

      if (!registration) {
        throw new Error("Registration not found");
      }

      // Delete the registration row
      return await this.deleteRow(
        this.usersSpreadsheetId,
        sheetName,
        registration.rowIndex,
      );
    } catch (error) {
      console.error("Error rejecting registration:", error);
      throw error;
    }
  }

  // ============ NOTES MANAGEMENT (FIXED - ID-BASED) ============
  async getAllNotes() {
    try {
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.usersSpreadsheetId,
        range: 'notes!A:D',
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
      console.error('Error fetching notes:', error);
      throw error;
    }
  }

  async addNote(data) {
    try {
      console.log(`➕ Creating new note: ${data.title}`);

      const values = [
        [
          data.id || Date.now().toString(),
          data.title || '',
          data.description || '',
          data.url_link || '',
        ],
      ];

      const response = await this.sheets.spreadsheets.values.append({
        spreadsheetId: this.usersSpreadsheetId,
        range: 'notes!A:D',
        valueInputOption: 'USER_ENTERED',
        resource: { values },
      });

      console.log(`✅ Successfully created note: ${data.title}`);
      return response.data;
    } catch (error) {
      console.error('❌ Error adding note:', error);
      throw error;
    }
  }

  // CRITICAL FIX: Now uses noteId instead of rowIndex
  async updateNote(noteId, data) {
    try {
      // CRITICAL: Always fetch fresh data to get correct rowIndex
      const notes = await this.getAllNotes();
      const note = notes.find(n => n.id === noteId);

      if (!note) {
        throw new Error(`Note with id ${noteId} not found`);
      }

      console.log(`📝 Updating note: ${data.title} (ID: ${noteId}) at row ${note.rowIndex}`);

      const values = [
        [
          noteId,
          data.title || '',
          data.description || '',
          data.url_link || '',
        ],
      ];

      const response = await this.sheets.spreadsheets.values.update({
        spreadsheetId: this.usersSpreadsheetId,
        range: `notes!A${note.rowIndex}:D${note.rowIndex}`,
        valueInputOption: 'USER_ENTERED',
        resource: { values },
      });

      console.log(`✅ Successfully updated note: ${data.title}`);
      return response.data;
    } catch (error) {
      console.error('❌ Error updating note:', error);
      throw error;
    }
  }

  // CRITICAL FIX: Now uses noteId instead of rowIndex
  async deleteNote(noteId) {
    try {
      // CRITICAL: Always fetch fresh data to get correct rowIndex
      const notes = await this.getAllNotes();
      const note = notes.find(n => n.id === noteId);

      if (!note) {
        throw new Error(`Note with id ${noteId} not found`);
      }

      console.log(`🗑️  Deleting note: ${note.title} (ID: ${noteId}) at row ${note.rowIndex}`);

      const result = await this.deleteRow(this.usersSpreadsheetId, 'notes', note.rowIndex);

      console.log(`✅ Successfully deleted note: ${note.title}`);
      return result;
    } catch (error) {
      console.error('❌ Error deleting note:', error);
      throw error;
    }
  }

  // ============ SETTINGS MANAGEMENT ============
  async getSettings() {
    try {
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.usersSpreadsheetId,
        range: `${process.env.SETTINGS_SHEET}!A:B`,
      });

      const rows = response.data.values;
      if (!rows || rows.length === 0) {
        return {};
      }

      const settings = {};
      rows.forEach((row) => {
        if (row[0]) {
          settings[row[0]] = row[1] || "";
        }
      });

      return settings;
    } catch (error) {
      console.error("Error fetching settings:", error);
      throw error;
    }
  }

  async updateSettings(settings) {
    try {
      const values = Object.entries(settings).map(([key, value]) => [
        key,
        value,
      ]);

      const response = await this.sheets.spreadsheets.values.update({
        spreadsheetId: this.usersSpreadsheetId,
        range: `${process.env.SETTINGS_SHEET}!A:B`,
        valueInputOption: "USER_ENTERED",
        resource: { values },
      });

      return response.data;
    } catch (error) {
      console.error("Error updating settings:", error);
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
        masterData[header] = rows
          .slice(1)
          .map((row) => row[index])
          .filter((val) => val && val.trim() !== "");
      });

      return masterData;
    } catch (error) {
      console.error("Error fetching master data:", error);
      throw error;
    }
  }

  // ============ CHAT PERFORMANCE DATA ============
  async getAllData() {
    try {
      // Check cache first
      if (this.isCacheValid()) {
        console.log("📦 Using cached data");
        return this.cache.data;
      }

      console.log("🔄 Fetching fresh data from Google Sheets");
      const sheetName = process.env.DATA_SHEET;

      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
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
          obj[header] = row[i] || "";
        });
        return obj;
      });

      // Update cache
      this.cache.data = data;
      this.cache.timestamp = Date.now();

      return data;
    } catch (error) {
      console.error("Error fetching data:", error);
      throw error;
    }
  }

  async addData(data) {
    try {
      const sheetName = process.env.DATA_SHEET;

      const values = [
        [
          data.date || "",
          data.shift || "",
          data.cs || "",
          data.channel || "",
          data.name || "",
          data.cust || "",
          data.order_number || "",
          data.intention || "",
          data.case || "",
          data.product_name || "",
          data.closing_status || "",
          data.note || "",
          data.chat_status || "",
          data.chat_status2 || "",
          data.follow_up || "",
          data.survey || "",
        ],
      ];

      const response = await this.sheets.spreadsheets.values.append({
        spreadsheetId: this.spreadsheetId,
        range: `${sheetName}!A:Q`,
        valueInputOption: "USER_ENTERED",
        resource: { values },
      });

      // Clear cache after adding data
      this.clearCache();

      return response.data;
    } catch (error) {
      console.error("Error adding data:", error);
      throw error;
    }
  }

  async updateData(rowIndex, data) {
    try {
      const sheetName = process.env.DATA_SHEET;

      const values = [
        [
          data.date || "",
          data.shift || "",
          data.cs || "",
          data.channel || "",
          data.name || "",
          data.cust || "",
          data.order_number || "",
          data.intention || "",
          data.case || "",
          data.product_name || "",
          data.closing_status || "",
          data.note || "",
          data.chat_status || "",
          data.chat_status2 || "",
          data.follow_up || "",
          data.survey || "",
        ],
      ];

      const response = await this.sheets.spreadsheets.values.update({
        spreadsheetId: this.spreadsheetId,
        range: `${sheetName}!A${rowIndex}:P${rowIndex}`,
        valueInputOption: "USER_ENTERED",
        resource: { values },
      });

      // Clear cache after updating data
      this.clearCache();

      return response.data;
    } catch (error) {
      console.error("Error updating data:", error);
      throw error;
    }
  }

  async deleteData(rowIndex) {
    try {
      const sheetName = process.env.DATA_SHEET;

      const result = await this.deleteRow(
        this.spreadsheetId,
        sheetName,
        rowIndex,
      );

      // Clear cache after deleting data
      this.clearCache();

      return result;
    } catch (error) {
      console.error("Error deleting data:", error);
      throw error;
    }
  }

  async getDataByRowIndex(rowIndex) {
    try {
      const allData = await this.getAllData();
      return allData.find((item) => item.rowIndex === rowIndex);
    } catch (error) {
      console.error("Error fetching single data:", error);
      throw error;
    }
  }

  // ============ SCHEDULE DATA ============
  async getScheduleData() {
    try {
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: "Jadwal CS!A:J",
      });

      const rows = response.data.values;
      if (!rows || rows.length === 0) {
        return [];
      }

      const headers = rows[0];
      const data = rows.slice(1).map((row, index) => {
        const obj = { rowIndex: index + 2 };
        headers.forEach((header, i) => {
          obj[header] = row[i] || "";
        });
        return obj;
      });

      return data;
    } catch (error) {
      console.error("Error fetching schedule data:", error);
      throw error;
    }
  }

  // ============ NILAI CS DATA ============
  async getNilaiData() {
    try {
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.csNilaiSpreadsheetId,
        range: "rekap_nilai!A:E",
      });

      const rows = response.data.values;
      if (!rows || rows.length === 0) {
        return [];
      }

      const headers = rows[0];
      const data = rows.slice(1).map((row, index) => {
        const obj = { rowIndex: index + 2 };
        headers.forEach((header, i) => {
          obj[header] = row[i] || "";
        });
        return obj;
      });

      return data;
    } catch (error) {
      console.error("Error fetching nilai data:", error);
      throw error;
    }
  }

  // ============ WARRANTY DATA ============
  async getWarrantyData() {
    try {
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.warrantySpreadsheetId,
        range: "form_warranty!A:N",
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
          if (header === "channel") {
            obj[header] = this.toProperCase(row[i] || "");
          } else {
            obj[header] = row[i] || "";
          }
        });
        return obj;
      });

      return data;
    } catch (error) {
      console.error("Error fetching warranty data:", error);
      throw error;
    }
  }

  async getCheckActivationData() {
    try {
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.warrantySpreadsheetId,
        range: "check-activation!A:Q",
      });

      const rows = response.data.values;
      if (!rows || rows.length === 0) {
        return [];
      }

      const headers = rows[0];
      const data = rows.slice(1).map((row, index) => {
        const obj = { rowIndex: index + 2 };
        headers.forEach((header, i) => {
          obj[header] = row[i] || "";
        });
        return obj;
      });

      return data;
    } catch (error) {
      console.error("Error fetching check activation data:", error);
      throw error;
    }
  }

  // ============ MASTER STOCK DATA ============
  async getMasterStockData() {
    try {
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.usersSpreadsheetId,
        range: "master-stock!A:K",
      });

      const rows = response.data.values;
      if (!rows || rows.length === 0) {
        return [];
      }

      const headers = rows[0];
      const data = rows.slice(1).map((row, index) => {
        const obj = { rowIndex: index + 2 };
        headers.forEach((header, i) => {
          obj[header] = row[i] || "";
        });
        return obj;
      });

      return data;
    } catch (error) {
      console.error("Error fetching master stock data:", error);
      throw error;
    }
  }

  async addMasterStockData(data) {
    try {
      const values = [
        [
          data.SKU || "",
          data.Product_name || "",
          data.Category || "",
          data.Grade || "",
          data.HPP || "",
          data.HPJ || "",
          data.HPT || "",
          data.Artikel || "",
          "",
          "",
          data.image_url || "",
        ],
      ];

      const response = await this.sheets.spreadsheets.values.append({
        spreadsheetId: this.usersSpreadsheetId,
        range: "master-stock!A:K",
        valueInputOption: "USER_ENTERED",
        resource: { values },
      });

      return response.data;
    } catch (error) {
      console.error("Error adding master stock data:", error);
      throw error;
    }
  }

  async updateMasterStockData(rowIndex, data) {
    try {
      const values = [
        [
          data.SKU || "",
          data.Product_name || "",
          data.Category || "",
          data.Grade || "",
          data.HPP || "",
          data.HPJ || "",
          data.HPT || "",
          data.Artikel || "",
          "",
          "",
          data.image_url || "",
        ],
      ];

      const response = await this.sheets.spreadsheets.values.update({
        spreadsheetId: this.usersSpreadsheetId,
        range: `master-stock!A${rowIndex}:K${rowIndex}`,
        valueInputOption: "USER_ENTERED",
        resource: { values },
      });

      return response.data;
    } catch (error) {
      console.error("Error updating master stock data:", error);
      throw error;
    }
  }

  async deleteMasterStockData(rowIndex) {
    try {
      return await this.deleteRow(
        this.usersSpreadsheetId,
        "master-stock",
        rowIndex,
      );
    } catch (error) {
      console.error("Error deleting master stock data:", error);
      throw error;
    }
  }

  // ============ STOCK LAST UPDATE ============
  async getStockLastUpdate() {
    try {
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.usersSpreadsheetId,
        range: "stock-updates!A:B",
      });

      const rows = response.data.values;
      if (!rows || rows.length === 0) {
        return { shopify: null, javelin: null, threshold: null };
      }

      const lastUpdate = {};
      rows.slice(1).forEach((row) => {
        if (row[0]) {
          lastUpdate[row[0]] = row[1] || null;
        }
      });

      return lastUpdate;
    } catch (error) {
      console.error("Error fetching stock last update:", error);
      return { shopify: null, javelin: null, threshold: null };
    }
  }

  async updateStockLastUpdate(type) {
    try {
      // Find row for this type
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.usersSpreadsheetId,
        range: "stock-updates!A:A",
      });

      const rows = response.data.values || [];
      let rowIndex = -1;

      for (let i = 1; i < rows.length; i++) {
        if (rows[i][0] === type) {
          rowIndex = i + 1;
          break;
        }
      }

      // If not found, append new row
      if (rowIndex === -1) {
        await this.sheets.spreadsheets.values.append({
          spreadsheetId: this.usersSpreadsheetId,
          range: "stock-updates!A:B",
          valueInputOption: "USER_ENTERED",
          resource: {
            values: [[type, new Date().toISOString()]],
          },
        });
      } else {
        // Update existing row
        await this.sheets.spreadsheets.values.update({
          spreadsheetId: this.usersSpreadsheetId,
          range: `stock-updates!B${rowIndex}`,
          valueInputOption: "USER_ENTERED",
          resource: {
            values: [[new Date().toISOString()]],
          },
        });
      }

      return true;
    } catch (error) {
      console.error("Error updating stock last update:", error);
      throw error;
    }
  }

  // ============ STOCK DATA (WITH IMAGE URL FROM MASTER STOCK) ============
  async getStockData() {
    try {
      const [stockResponse, masterStockData] = await Promise.all([
        this.sheets.spreadsheets.values.get({
          spreadsheetId: this.usersSpreadsheetId,
          range: "stock!A:J",
        }),
        this.getMasterStockData(),
      ]);

      const rows = stockResponse.data.values;
      if (!rows || rows.length === 0) {
        return [];
      }

      // Create image URL lookup map from master stock
      const imageMap = {};
      masterStockData.forEach((item) => {
        imageMap[item.SKU] = item.image_url || "";
      });

      const headers = rows[0];
      const data = rows.slice(1).map((row, index) => {
        const obj = { rowIndex: index + 2 };
        headers.forEach((header, i) => {
          obj[header] = row[i] || "";
        });
        
        // Add image_url from master stock
        obj.image_url = imageMap[obj.SKU] || "";
        
        return obj;
      });

      // Sort: Grade A-Z, then PCA descending
      return data.sort((a, b) => {
        const gradeCompare = String(a.Grade || "").localeCompare(
          String(b.Grade || ""),
        );
        if (gradeCompare !== 0) return gradeCompare;

        const pcaA = parseFloat(a.PCA) || 0;
        const pcaB = parseFloat(b.PCA) || 0;
        return pcaB - pcaA;
      });
    } catch (error) {
      console.error("Error fetching stock data:", error);
      throw error;
    }
  }

  // ============ JAVELIN DATA (RAW - NO AGGREGATION) ============
  async getJavelinData() {
    try {
      console.log("📊 Fetching Javelin data...");

      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.usersSpreadsheetId,
        range: "javelin!A:AA", // 27 columns
      });

      const rows = response.data.values;
      if (!rows || rows.length === 0) {
        console.log("⚠️  No data found in javelin sheet");
        return [];
      }

      const headers = rows[0];
      const data = rows.slice(1).map((row, index) => {
        const obj = { rowIndex: index + 2 };
        headers.forEach((header, i) => {
          obj[header] = row[i] || "";
        });
        return obj;
      });

      console.log(`✅ Found ${data.length} rows in javelin`);

      return data;
    } catch (error) {
      console.error("❌ Error fetching javelin data:", error);
      throw error;
    }
  }

  // ============ JAVELIN YESTERDAY DATA (RAW) ============
  async getJavelinYesterdayData() {
    try {
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.usersSpreadsheetId,
        range: "javelin_yesterday!A:AA", // 27 columns
      });

      const rows = response.data.values;
      if (!rows || rows.length === 0) {
        return [];
      }

      const headers = rows[0];
      const data = rows.slice(1).map((row, index) => {
        const obj = { rowIndex: index + 2 };
        headers.forEach((header, i) => {
          obj[header] = row[i] || "";
        });
        return obj;
      });

      return data;
    } catch (error) {
      console.error("Error fetching javelin yesterday data:", error);
      throw error;
    }
  }

  // ============ MOVE JAVELIN TO YESTERDAY (FULL COPY) ============
  async moveJavelinToYesterday() {
    try {
      console.log("📦 Moving javelin to javelin_yesterday (full copy)...");

      // Get ALL data from javelin sheet (including headers)
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.usersSpreadsheetId,
        range: "javelin!A:AA",
      });

      const allRows = response.data.values;
      
      if (!allRows || allRows.length === 0) {
        console.log("⚠️  No javelin data to move");
        return {
          success: true,
          rowsMoved: 0,
        };
      }

      // Clear javelin_yesterday completely
      await this.sheets.spreadsheets.values.clear({
        spreadsheetId: this.usersSpreadsheetId,
        range: "javelin_yesterday!A:ZZ",
      });

      // Copy ALL rows (including header) to javelin_yesterday
      await this.sheets.spreadsheets.values.update({
        spreadsheetId: this.usersSpreadsheetId,
        range: "javelin_yesterday!A1",
        valueInputOption: "USER_ENTERED",
        resource: { values: allRows },
      });

      console.log(`✅ Moved ${allRows.length} rows (including header) to javelin_yesterday`);

      return {
        success: true,
        rowsMoved: allRows.length - 1, // Exclude header from count
      };
    } catch (error) {
      console.error("❌ Error moving javelin to yesterday:", error);
      throw error;
    }
  }

  // ============ STOCK YESTERDAY DATA (READ ONLY - EXCEL FORMULAS) ============
  async getStockYesterdayData() {
    try {
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.usersSpreadsheetId,
        range: "stock_yesterday!A:Z", // Flexible range for Excel formulas
      });

      const rows = response.data.values;
      if (!rows || rows.length === 0) {
        return [];
      }

      const headers = rows[0];
      const data = rows.slice(1).map((row, index) => {
        const obj = { rowIndex: index + 2 };
        headers.forEach((header, i) => {
          obj[header] = row[i] || "";
        });
        return obj;
      });

      return data;
    } catch (error) {
      console.error("Error fetching stock yesterday data:", error);
      throw error;
    }
  }

  // ============ STOCK INFO (READ FROM STOCK_YESTERDAY SHEET) ============
  async getStockInfoData() {
    try {
      console.log("📊 Reading stock info from stock_yesterday sheet...");

      const [stockYesterdayData, masterStockData] = await Promise.all([
        this.getStockYesterdayData(),
        this.getMasterStockData(),
      ]);

      // Create master stock map for image URLs
      const masterStockMap = {};
      masterStockData.forEach((item) => {
        masterStockMap[item.SKU] = {
          image_url: item.image_url || "",
          Product_name: item.Product_name || "",
        };
      });

      // Map stock_yesterday data to info format
      const infoData = stockYesterdayData.map((item) => {
        const productId = item.Product_ID || item.product_id || "";
        const pcaToday = parseFloat(item.PCA_Today || item.pca_today || item.Stock_Today || 0);
        const pcaYesterday = parseFloat(item.PCA_Yesterday || item.pca_yesterday || item.Stock_Yesterday || 0);
        const difference = pcaToday - pcaYesterday;

        // Try to find matching master stock item
        let masterItem = masterStockMap[productId];
        
        // If not found, try to match by product name (fallback)
        if (!masterItem) {
          const description = item.Description || item.description || "";
          const matchingMaster = Object.values(masterStockMap).find(
            (m) => m.Product_name === description
          );
          masterItem = matchingMaster || { image_url: "", Product_name: "" };
        }

        let label = "";
        
        // Check if Label exists in sheet (from Excel formula)
        if (item.Label) {
          label = item.Label;
        } else {
          // Fallback: Calculate label in code
          if (pcaToday === 0) {
            label = "OOS";
          } else if (pcaToday < 3 && pcaYesterday < 3) {
            label = "LOW STOCK";
          } else if (difference >= 50) {
            label = "RESTOCK";
          }
        }

        return {
          SKU: productId,
          Product_ID: productId,
          Description: item.Description || item.description || "",
          PCA: pcaToday,
          PCA_Yesterday: pcaYesterday,
          Difference: difference,
          Label: label,
          image_url: masterItem.image_url,
        };
      });

      console.log(`✅ Built ${infoData.length} stock info records`);

      return infoData;
    } catch (error) {
      console.error("❌ Error fetching stock info data:", error);
      throw error;
    }
  }

  // ============ IMPORT TO SHEET (WITH AUTO-MOVE FOR JAVELIN) ============
  async importToSheet(sheetName, data) {
    try {
      // CRITICAL: Protect critical sheets from accidental import
      const protectedSheets = [
        'users', 
        process.env.USERS_SHEET, 
        'registrations', 
        'notes', 
        'stock', 
        'stock_yesterday', // PROTECTED - Excel formulas only
        'javelin_yesterday', // PROTECTED - Auto-managed
        'master-stock'
      ];
      
      if (protectedSheets.includes(sheetName)) {
        throw new Error(`❌ Cannot import to protected sheet: ${sheetName}`);
      }

      console.log(`📥 Importing ${data.length} rows to sheet "${sheetName}"`);

      // CRITICAL: Auto-move javelin data to yesterday BEFORE import
      if (sheetName === 'javelin') {
        console.log("🔄 Auto-moving current javelin to javelin_yesterday...");
        await this.moveJavelinToYesterday();
      }

      // Clear existing data (except header)
      await this.sheets.spreadsheets.values.clear({
        spreadsheetId: this.usersSpreadsheetId,
        range: `${sheetName}!A2:ZZ`,
      });

      // Prepare values
      const values = data.map((row) => {
        // Get all keys from first row to maintain column order
        const keys = Object.keys(data[0]);
        return keys.map((key) => row[key] || "");
      });

      // Insert new data
      const response = await this.sheets.spreadsheets.values.append({
        spreadsheetId: this.usersSpreadsheetId,
        range: `${sheetName}!A2`,
        valueInputOption: "USER_ENTERED",
        resource: { values },
      });

      console.log(`✅ Successfully imported ${values.length} rows to "${sheetName}"`);

      return {
        rowsImported: values.length,
        response: response.data,
        movedToYesterday: sheetName === 'javelin',
      };
    } catch (error) {
      console.error("❌ Error importing to sheet:", error);
      throw error;
    }
  }

  // ============ HELPER METHODS (CRITICAL VALIDATION) ============
  async deleteRow(spreadsheetId, sheetName, rowIndex) {
    try {
      // CRITICAL FIX: Validate rowIndex before deletion
      if (!rowIndex || rowIndex < 2) {
        throw new Error(`❌ Invalid rowIndex: ${rowIndex}. Must be >= 2 (cannot delete header)`);
      }

      console.log(`🗑️  Deleting row ${rowIndex} from sheet "${sheetName}"`);

      const sheetMetadata = await this.sheets.spreadsheets.get({
        spreadsheetId: spreadsheetId,
      });

      const sheet = sheetMetadata.data.sheets.find(
        (s) => s.properties.title === sheetName,
      );

      if (!sheet) {
        throw new Error(`Sheet "${sheetName}" not found`);
      }

      const sheetId = sheet.properties.sheetId;

      console.log(`🗑️  Confirmed: deleting from sheetId ${sheetId}, row ${rowIndex}`);

      const response = await this.sheets.spreadsheets.batchUpdate({
        spreadsheetId: spreadsheetId,
        resource: {
          requests: [
            {
              deleteDimension: {
                range: {
                  sheetId: sheetId,
                  dimension: "ROWS",
                  startIndex: rowIndex - 1,
                  endIndex: rowIndex,
                },
              },
            },
          ],
        },
      });

      console.log(`✅ Successfully deleted row ${rowIndex} from "${sheetName}"`);

      return response.data;
    } catch (error) {
      console.error("❌ Error deleting row:", error);
      throw error;
    }
  }
}

export default new GoogleSheetsService();