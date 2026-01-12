const path = require("path");
const fs = require("fs");

// Handle better-sqlite3 loading in packaged app
function loadDatabase() {
  const attempts = [];

  try {
    // Method 1: Try app.asar.unpacked (standard electron-builder location)
    if (process.resourcesPath) {
      const unpackedPath = path.join(
        process.resourcesPath,
        "app.asar.unpacked",
        "node_modules",
        "better-sqlite3"
      );
      attempts.push(unpackedPath);
      if (fs.existsSync(unpackedPath)) {
        console.log("Loading better-sqlite3 from unpacked:", unpackedPath);
        return require(unpackedPath);
      }

      // Method 2: Try extraResources location
      const resourcesPath = path.join(process.resourcesPath, "better-sqlite3");
      attempts.push(resourcesPath);
      if (fs.existsSync(resourcesPath)) {
        console.log("Loading better-sqlite3 from resources:", resourcesPath);
        return require(resourcesPath);
      }
    }

    // Method 3: Regular require (for dev mode)
    attempts.push("regular require");
    console.log("Loading better-sqlite3 via regular require");
    return require("better-sqlite3");
  } catch (err) {
    console.error("Error loading better-sqlite3:", err);
    console.error("Attempted paths:", attempts);
    throw new Error(
      `Failed to load better-sqlite3 module. Tried: ${attempts.join(", ")}`
    );
  }
}

const Database = loadDatabase();

class DatabaseManager {
  constructor(dbPath = null) {
    // If dbPath is provided, use it; otherwise use default local path
    let dbDir;
    if (dbPath) {
      this.dbPath = dbPath;
      dbDir = path.dirname(dbPath);
    } else {
      // Default to local database folder for development
      dbDir = path.join(__dirname, "..", "database");
      this.dbPath = path.join(dbDir, "wedding.db");
    }

    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }

    this.db = null;
    console.log("Database path:", this.dbPath);
  }

  async init() {
    try {
      this.db = new Database(this.dbPath);
      console.log("Connected to SQLite database");

      // Enable WAL mode for better performance
      this.db.pragma("journal_mode = WAL");

      await this.createTables();
      return Promise.resolve();
    } catch (err) {
      console.error("Error opening database:", err);
      return Promise.reject(err);
    }
  }

  async createTables() {
    const createGuestsTable = `
      CREATE TABLE IF NOT EXISTS guests (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        name_km TEXT,
        phone TEXT,
        note TEXT,
        amount REAL NOT NULL DEFAULT 0,
        currency TEXT NOT NULL DEFAULT 'KHR',
        amount_khr REAL NOT NULL DEFAULT 0,
        amount_usd REAL NOT NULL DEFAULT 0,
        payment_type TEXT NOT NULL DEFAULT 'CASH',
        invitation_guest_id INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (invitation_guest_id) REFERENCES invitation_guests(id) ON DELETE SET NULL
      )
    `;

    const createInvitationGuestsTable = `
      CREATE TABLE IF NOT EXISTS invitation_guests (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        name_km TEXT,
        phone TEXT,
        email TEXT,
        address TEXT,
        group_category TEXT,
        note TEXT,
        is_imported BOOLEAN DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `;

    const createWeddingFilesTable = `
      CREATE TABLE IF NOT EXISTS wedding_files (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        original_name TEXT NOT NULL,
        file_path TEXT NOT NULL,
        file_size INTEGER NOT NULL,
        mime_type TEXT NOT NULL,
        file_type TEXT NOT NULL,
        type TEXT DEFAULT 'document',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `;

    const createWeddingInfoTable = `
      CREATE TABLE IF NOT EXISTS wedding_info (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        field_name TEXT UNIQUE NOT NULL,
        field_value TEXT,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `;

    try {
      this.db.exec(createGuestsTable);
      console.log("Guests table created successfully");

      this.db.exec(createInvitationGuestsTable);
      console.log("Invitation guests table created successfully");

      this.db.exec(createWeddingFilesTable);
      console.log("Wedding files table created successfully");

      this.db.exec(createWeddingInfoTable);
      console.log("Wedding info table created successfully");

      // Add columns to existing table if they don't exist
      await this.addMissingColumns();
      await this.addInvitationGuestsColumns();

      return Promise.resolve();
    } catch (err) {
      console.error("Error creating tables:", err);
      return Promise.reject(err);
    }
  }

  async addMissingColumns() {
    try {
      // Check if new columns exist in guests table
      const columns = this.db.pragma("table_info(guests)");
      const columnNames = columns.map((col) => col.name);

      if (!columnNames.includes("amount_khr")) {
        this.db.exec(
          "ALTER TABLE guests ADD COLUMN amount_khr REAL NOT NULL DEFAULT 0"
        );
      }
      if (!columnNames.includes("amount_usd")) {
        this.db.exec(
          "ALTER TABLE guests ADD COLUMN amount_usd REAL NOT NULL DEFAULT 0"
        );
      }
      if (!columnNames.includes("invitation_guest_id")) {
        this.db.exec(
          "ALTER TABLE guests ADD COLUMN invitation_guest_id INTEGER"
        );
      }
      if (!columnNames.includes("name_km")) {
        this.db.exec("ALTER TABLE guests ADD COLUMN name_km TEXT");
      }

      // Update existing records with converted amounts
      await this.updateExistingConversions();
      await this.addWeddingFilesTypeColumn();

      return Promise.resolve();
    } catch (err) {
      console.error("Error adding missing columns:", err);
      return Promise.reject(err);
    }
  }

  async addWeddingFilesTypeColumn() {
    try {
      // Check if type column exists in wedding_files table
      const columns = this.db.pragma("table_info(wedding_files)");
      const columnNames = columns.map((col) => col.name);

      if (!columnNames.includes("type")) {
        this.db.exec(
          "ALTER TABLE wedding_files ADD COLUMN type TEXT DEFAULT 'document'"
        );
        console.log("Added type column to wedding_files table");
      }

      return Promise.resolve();
    } catch (err) {
      console.error("Error adding type column to wedding_files:", err);
      return Promise.reject(err);
    }
  }

  async addInvitationGuestsColumns() {
    try {
      // Check if name_km column exists in invitation_guests table
      const columns = this.db.pragma("table_info(invitation_guests)");
      const columnNames = columns.map((col) => col.name);

      if (!columnNames.includes("name_km")) {
        this.db.exec("ALTER TABLE invitation_guests ADD COLUMN name_km TEXT");
        console.log("Added name_km column to invitation_guests table");
      }

      return Promise.resolve();
    } catch (err) {
      console.error("Error adding name_km column to invitation_guests:", err);
      return Promise.reject(err);
    }
  }

  async updateExistingConversions() {
    const EXCHANGE_RATE = 4000;

    try {
      // Get all guests that need conversion updates
      const stmt = this.db.prepare(
        "SELECT id, amount, currency FROM guests WHERE amount_khr = 0 AND amount_usd = 0"
      );
      const rows = stmt.all();

      if (rows.length === 0) {
        return Promise.resolve();
      }

      const updateStmt = this.db.prepare(
        "UPDATE guests SET amount_khr = ?, amount_usd = ? WHERE id = ?"
      );

      const updateMany = this.db.transaction((guests) => {
        for (const guest of guests) {
          const amountKHR =
            guest.currency === "KHR"
              ? guest.amount
              : guest.amount * EXCHANGE_RATE;
          const amountUSD =
            guest.currency === "USD"
              ? guest.amount
              : guest.amount / EXCHANGE_RATE;

          updateStmt.run(amountKHR, amountUSD, guest.id);
        }
      });

      updateMany(rows);
      console.log(`Updated conversions for ${rows.length} guests`);

      return Promise.resolve();
    } catch (err) {
      console.error("Error updating conversions:", err);
      return Promise.reject(err);
    }
  }

  async getGuests() {
    try {
      const stmt = this.db.prepare(
        "SELECT * FROM guests ORDER BY created_at DESC"
      );
      const rows = stmt.all();
      return Promise.resolve(rows);
    } catch (err) {
      return Promise.reject(err);
    }
  }

  async addGuest(guest) {
    const EXCHANGE_RATE = 4000;
    const amount = parseFloat(guest.amount) || 0;

    // Calculate both currency amounts
    const amountKHR =
      guest.currency === "KHR" ? amount : amount * EXCHANGE_RATE;
    const amountUSD =
      guest.currency === "USD" ? amount : amount / EXCHANGE_RATE;

    try {
      const stmt = this.db.prepare(`
        INSERT INTO guests (name, name_km, phone, note, amount, currency, amount_khr, amount_usd, payment_type, invitation_guest_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      const info = stmt.run(
        guest.name,
        guest.name_km || null,
        guest.phone || "",
        guest.note || "",
        amount,
        guest.currency,
        amountKHR,
        amountUSD,
        guest.payment_type,
        guest.invitation_guest_id || null
      );

      return Promise.resolve(info.lastInsertRowid);
    } catch (err) {
      return Promise.reject(err);
    }
  }

  async updateGuest(id, guest) {
    const EXCHANGE_RATE = 4000;
    const amount = parseFloat(guest.amount) || 0;

    // Calculate both currency amounts
    const amountKHR =
      guest.currency === "KHR" ? amount : amount * EXCHANGE_RATE;
    const amountUSD =
      guest.currency === "USD" ? amount : amount / EXCHANGE_RATE;

    try {
      const stmt = this.db.prepare(`
        UPDATE guests 
        SET name = ?, name_km = ?, phone = ?, note = ?, amount = ?, currency = ?, amount_khr = ?, amount_usd = ?, payment_type = ?, invitation_guest_id = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `);

      const info = stmt.run(
        guest.name,
        guest.name_km || null,
        guest.phone || "",
        guest.note || "",
        amount,
        guest.currency,
        amountKHR,
        amountUSD,
        guest.payment_type,
        guest.invitation_guest_id || null,
        id
      );

      return Promise.resolve(info.changes);
    } catch (err) {
      return Promise.reject(err);
    }
  }

  async deleteGuest(id) {
    try {
      const stmt = this.db.prepare("DELETE FROM guests WHERE id = ?");
      const info = stmt.run(id);
      return Promise.resolve(info.changes);
    } catch (err) {
      return Promise.reject(err);
    }
  }

  async getTotals() {
    try {
      const stmt = this.db.prepare(`
        SELECT 
          COUNT(*) as total_guests,
          COALESCE(SUM(amount_khr), 0) as total_khr,
          COALESCE(SUM(amount_usd), 0) as total_usd,
          COALESCE(SUM(CASE WHEN payment_type = 'CASH' AND currency = 'KHR' THEN amount_khr WHEN payment_type = 'CASH' AND currency = 'USD' THEN amount_usd ELSE 0 END), 0) as cash_total
        FROM guests
      `);

      const row = stmt.get();
      return Promise.resolve(row);
    } catch (err) {
      return Promise.reject(err);
    }
  }

  close() {
    if (this.db) {
      try {
        this.db.close();
        console.log("Database connection closed");
      } catch (err) {
        console.error("Error closing database:", err);
      }
    }
  }

  // Wedding Files Operations
  async addWeddingFile(fileData) {
    try {
      const stmt = this.db.prepare(`
        INSERT INTO wedding_files (name, original_name, file_path, file_size, mime_type, file_type, type)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);

      const info = stmt.run(
        fileData.name,
        fileData.originalName,
        fileData.filePath,
        fileData.fileSize,
        fileData.mimeType,
        fileData.fileType,
        fileData.type
      );

      return Promise.resolve({ id: info.lastInsertRowid, ...fileData });
    } catch (err) {
      return Promise.reject(err);
    }
  }

  async getWeddingFiles() {
    try {
      const stmt = this.db.prepare(
        "SELECT * FROM wedding_files ORDER BY created_at DESC"
      );
      const rows = stmt.all();
      return Promise.resolve(rows);
    } catch (err) {
      return Promise.reject(err);
    }
  }

  async deleteWeddingFile(id) {
    try {
      const stmt = this.db.prepare("DELETE FROM wedding_files WHERE id = ?");
      const info = stmt.run(id);
      return Promise.resolve(info.changes);
    } catch (err) {
      return Promise.reject(err);
    }
  }

  async getWeddingFile(id) {
    try {
      const stmt = this.db.prepare("SELECT * FROM wedding_files WHERE id = ?");
      const row = stmt.get(id);
      return Promise.resolve(row);
    } catch (err) {
      return Promise.reject(err);
    }
  }

  // Wedding Info Operations
  async setWeddingInfo(fieldName, fieldValue) {
    try {
      const stmt = this.db.prepare(`
        INSERT OR REPLACE INTO wedding_info (field_name, field_value, updated_at)
        VALUES (?, ?, CURRENT_TIMESTAMP)
      `);

      const info = stmt.run(fieldName, fieldValue);
      return Promise.resolve(info.changes);
    } catch (err) {
      return Promise.reject(err);
    }
  }

  async getWeddingInfo(fieldName) {
    try {
      const stmt = this.db.prepare(
        "SELECT field_value FROM wedding_info WHERE field_name = ?"
      );
      const row = stmt.get(fieldName);
      return Promise.resolve(row ? row.field_value : null);
    } catch (err) {
      return Promise.reject(err);
    }
  }

  async getAllWeddingInfo() {
    try {
      const stmt = this.db.prepare(
        "SELECT field_name, field_value FROM wedding_info"
      );
      const rows = stmt.all();

      const weddingInfo = {};
      rows.forEach((row) => {
        weddingInfo[row.field_name] = row.field_value;
      });

      return Promise.resolve(weddingInfo);
    } catch (err) {
      return Promise.reject(err);
    }
  }

  // QR Code specific operations
  async getPaymentQRCode() {
    try {
      const stmt = this.db.prepare(
        "SELECT * FROM wedding_files WHERE type = 'qr_code' ORDER BY created_at DESC LIMIT 1"
      );
      const row = stmt.get();
      return Promise.resolve(row || null);
    } catch (err) {
      return Promise.reject(err);
    }
  }

  async addPaymentQRCode(fileData) {
    try {
      // First, delete any existing QR code
      const deleteStmt = this.db.prepare(
        "DELETE FROM wedding_files WHERE type = 'qr_code'"
      );
      deleteStmt.run();

      // Then add the new QR code
      const insertStmt = this.db.prepare(`
        INSERT INTO wedding_files (name, original_name, file_path, file_size, mime_type, file_type, type)
        VALUES (?, ?, ?, ?, ?, ?, 'qr_code')
      `);

      const info = insertStmt.run(
        fileData.name,
        fileData.originalName,
        fileData.filePath,
        fileData.fileSize,
        fileData.mimeType,
        fileData.fileType
      );

      return Promise.resolve({
        id: info.lastInsertRowid,
        ...fileData,
        type: "qr_code",
      });
    } catch (err) {
      return Promise.reject(err);
    }
  }

  // Invitation Guests Operations
  async addInvitationGuest(guest) {
    try {
      const stmt = this.db.prepare(`
        INSERT INTO invitation_guests (name, phone, email, address, group_category, note)
        VALUES (?, ?, ?, ?, ?, ?)
      `);

      const info = stmt.run(
        guest.name,
        guest.phone || null,
        guest.email || null,
        guest.address || null,
        guest.group_category || null,
        guest.note || null
      );

      return Promise.resolve(info.lastInsertRowid);
    } catch (err) {
      return Promise.reject(err);
    }
  }

  async bulkAddInvitationGuests(guests) {
    try {
      const stmt = this.db.prepare(`
        INSERT INTO invitation_guests (name, name_km, phone, email, address, group_category, note)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);

      let successCount = 0;
      let errorCount = 0;
      const errors = [];

      const insertMany = this.db.transaction((guestsToInsert) => {
        guestsToInsert.forEach((guest, index) => {
          try {
            stmt.run(
              guest.name,
              guest.name_km || null,
              guest.phone || null,
              guest.email || null,
              guest.address || null,
              guest.group_category || null,
              guest.note || null
            );
            successCount++;
          } catch (err) {
            errorCount++;
            errors.push({ row: index + 1, error: err.message });
          }
        });
      });

      insertMany(guests);

      if (errorCount > 0) {
        return Promise.reject({ successCount, errorCount, errors });
      } else {
        return Promise.resolve({ successCount, errorCount: 0 });
      }
    } catch (err) {
      return Promise.reject(err);
    }
  }

  async getInvitationGuests(filters = {}) {
    try {
      let query = "SELECT * FROM invitation_guests WHERE 1=1";
      const params = [];

      if (filters.search) {
        query +=
          " AND (name LIKE ? OR name_km LIKE ? OR phone LIKE ? OR email LIKE ?)";
        const searchTerm = `%${filters.search}%`;
        params.push(searchTerm, searchTerm, searchTerm, searchTerm);
      }

      if (filters.group_category) {
        query += " AND group_category = ?";
        params.push(filters.group_category);
      }

      if (filters.is_imported !== undefined) {
        query += " AND is_imported = ?";
        params.push(filters.is_imported ? 1 : 0);
      }

      query += " ORDER BY created_at DESC";

      const stmt = this.db.prepare(query);
      const rows = stmt.all(...params);
      return Promise.resolve(rows);
    } catch (err) {
      return Promise.reject(err);
    }
  }

  async getInvitationGuest(id) {
    try {
      const stmt = this.db.prepare(
        "SELECT * FROM invitation_guests WHERE id = ?"
      );
      const row = stmt.get(id);
      return Promise.resolve(row);
    } catch (err) {
      return Promise.reject(err);
    }
  }

  async updateInvitationGuest(id, guest) {
    try {
      const stmt = this.db.prepare(`
        UPDATE invitation_guests 
        SET name = ?, phone = ?, email = ?, address = ?, group_category = ?, note = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `);

      const info = stmt.run(
        guest.name,
        guest.phone || null,
        guest.email || null,
        guest.address || null,
        guest.group_category || null,
        guest.note || null,
        id
      );

      return Promise.resolve(info.changes);
    } catch (err) {
      return Promise.reject(err);
    }
  }

  async deleteInvitationGuest(id) {
    try {
      const stmt = this.db.prepare(
        "DELETE FROM invitation_guests WHERE id = ?"
      );
      const info = stmt.run(id);
      return Promise.resolve(info.changes);
    } catch (err) {
      return Promise.reject(err);
    }
  }

  async markInvitationGuestAsImported(id) {
    try {
      const stmt = this.db.prepare(`
        UPDATE invitation_guests 
        SET is_imported = 1, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `);

      const info = stmt.run(id);
      return Promise.resolve(info.changes);
    } catch (err) {
      return Promise.reject(err);
    }
  }

  async getInvitationGuestStats() {
    try {
      const stmt = this.db.prepare(`
        SELECT 
          COUNT(*) as total,
          COUNT(CASE WHEN is_imported = 1 THEN 1 END) as imported,
          COUNT(CASE WHEN is_imported = 0 THEN 1 END) as not_imported,
          COUNT(DISTINCT group_category) as total_groups
        FROM invitation_guests
      `);

      const row = stmt.get();
      return Promise.resolve(row);
    } catch (err) {
      return Promise.reject(err);
    }
  }

  async clearAllInvitationGuests() {
    try {
      const stmt = this.db.prepare("DELETE FROM invitation_guests");
      const info = stmt.run();
      return Promise.resolve(info.changes);
    } catch (err) {
      return Promise.reject(err);
    }
  }
}

module.exports = DatabaseManager;
