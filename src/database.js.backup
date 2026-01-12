const sqlite3 = require("sqlite3").verbose();
const path = require("path");
const fs = require("fs");

class Database {
  constructor() {
    // Ensure database directory exists
    const dbDir = path.join(__dirname, "..", "database");
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }

    this.dbPath = path.join(dbDir, "wedding.db");
    this.db = null;
  }

  async init() {
    return new Promise((resolve, reject) => {
      this.db = new sqlite3.Database(this.dbPath, (err) => {
        if (err) {
          console.error("Error opening database:", err);
          reject(err);
        } else {
          console.log("Connected to SQLite database");
          this.createTables().then(resolve).catch(reject);
        }
      });
    });
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

    return new Promise((resolve, reject) => {
      this.db.run(createGuestsTable, (err) => {
        if (err) {
          console.error("Error creating guests table:", err);
          reject(err);
        } else {
          console.log("Guests table created successfully");

          // Create invitation guests table
          this.db.run(createInvitationGuestsTable, (err) => {
            if (err) {
              console.error("Error creating invitation_guests table:", err);
              reject(err);
            } else {
              console.log("Invitation guests table created successfully");

              // Create wedding files table
              this.db.run(createWeddingFilesTable, (err) => {
                if (err) {
                  console.error("Error creating wedding_files table:", err);
                  reject(err);
                } else {
                  console.log("Wedding files table created successfully");

                  // Create wedding info table
                  this.db.run(createWeddingInfoTable, (err) => {
                    if (err) {
                      console.error("Error creating wedding_info table:", err);
                      reject(err);
                    } else {
                      console.log("Wedding info table created successfully");
                      // Add columns to existing table if they don't exist
                      this.addMissingColumns()
                        .then(() => this.addInvitationGuestsColumns())
                        .then(resolve)
                        .catch(reject);
                    }
                  });
                }
              });
            }
          });
        }
      });
    });
  }

  async addMissingColumns() {
    return new Promise((resolve, reject) => {
      // Check if new columns exist in guests table
      this.db.all("PRAGMA table_info(guests)", [], (err, columns) => {
        if (err) {
          reject(err);
          return;
        }

        const columnNames = columns.map((col) => col.name);
        const alterQueries = [];

        if (!columnNames.includes("amount_khr")) {
          alterQueries.push(
            "ALTER TABLE guests ADD COLUMN amount_khr REAL NOT NULL DEFAULT 0"
          );
        }
        if (!columnNames.includes("amount_usd")) {
          alterQueries.push(
            "ALTER TABLE guests ADD COLUMN amount_usd REAL NOT NULL DEFAULT 0"
          );
        }
        if (!columnNames.includes("invitation_guest_id")) {
          alterQueries.push(
            "ALTER TABLE guests ADD COLUMN invitation_guest_id INTEGER"
          );
        }
        if (!columnNames.includes("name_km")) {
          alterQueries.push("ALTER TABLE guests ADD COLUMN name_km TEXT");
        }

        // Execute guest table alter queries
        if (alterQueries.length > 0) {
          let completed = 0;
          alterQueries.forEach((query) => {
            this.db.run(query, (err) => {
              if (err) {
                console.error("Error adding column:", err);
                reject(err);
                return;
              }
              completed++;
              if (completed === alterQueries.length) {
                // Update existing records with converted amounts
                this.updateExistingConversions()
                  .then(() => this.addWeddingFilesTypeColumn())
                  .then(resolve)
                  .catch(reject);
              }
            });
          });
        } else {
          // No guest table updates needed, check wedding_files
          this.updateExistingConversions()
            .then(() => this.addWeddingFilesTypeColumn())
            .then(resolve)
            .catch(reject);
        }
      });
    });
  }

  async addWeddingFilesTypeColumn() {
    return new Promise((resolve, reject) => {
      // Check if type column exists in wedding_files table
      this.db.all("PRAGMA table_info(wedding_files)", [], (err, columns) => {
        if (err) {
          reject(err);
          return;
        }

        const columnNames = columns.map((col) => col.name);

        if (!columnNames.includes("type")) {
          this.db.run(
            "ALTER TABLE wedding_files ADD COLUMN type TEXT DEFAULT 'document'",
            (err) => {
              if (err) {
                console.error(
                  "Error adding type column to wedding_files:",
                  err
                );
                reject(err);
              } else {
                console.log("Added type column to wedding_files table");
                resolve();
              }
            }
          );
        } else {
          resolve();
        }
      });
    });
  }

  async addInvitationGuestsColumns() {
    return new Promise((resolve, reject) => {
      // Check if name_km column exists in invitation_guests table
      this.db.all(
        "PRAGMA table_info(invitation_guests)",
        [],
        (err, columns) => {
          if (err) {
            reject(err);
            return;
          }

          const columnNames = columns.map((col) => col.name);

          if (!columnNames.includes("name_km")) {
            this.db.run(
              "ALTER TABLE invitation_guests ADD COLUMN name_km TEXT",
              (err) => {
                if (err) {
                  console.error(
                    "Error adding name_km column to invitation_guests:",
                    err
                  );
                  reject(err);
                } else {
                  console.log(
                    "Added name_km column to invitation_guests table"
                  );
                  resolve();
                }
              }
            );
          } else {
            resolve();
          }
        }
      );
    });
  }

  async updateExistingConversions() {
    const EXCHANGE_RATE = 4000;

    return new Promise((resolve, reject) => {
      // Get all guests that need conversion updates
      this.db.all(
        "SELECT id, amount, currency FROM guests WHERE amount_khr = 0 AND amount_usd = 0",
        [],
        (err, rows) => {
          if (err) {
            reject(err);
            return;
          }

          if (rows.length === 0) {
            resolve();
            return;
          }

          let completed = 0;
          rows.forEach((guest) => {
            const amountKHR =
              guest.currency === "KHR"
                ? guest.amount
                : guest.amount * EXCHANGE_RATE;
            const amountUSD =
              guest.currency === "USD"
                ? guest.amount
                : guest.amount / EXCHANGE_RATE;

            this.db.run(
              "UPDATE guests SET amount_khr = ?, amount_usd = ? WHERE id = ?",
              [amountKHR, amountUSD, guest.id],
              (err) => {
                if (err) {
                  console.error(
                    "Error updating conversion for guest:",
                    guest.id,
                    err
                  );
                  reject(err);
                  return;
                }
                completed++;
                if (completed === rows.length) {
                  console.log(`Updated conversions for ${completed} guests`);
                  resolve();
                }
              }
            );
          });
        }
      );
    });
  }

  async getGuests() {
    return new Promise((resolve, reject) => {
      const query = "SELECT * FROM guests ORDER BY created_at DESC";
      this.db.all(query, [], (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  }

  async addGuest(guest) {
    const EXCHANGE_RATE = 4000;
    const amount = parseFloat(guest.amount) || 0;

    // Calculate both currency amounts
    const amountKHR =
      guest.currency === "KHR" ? amount : amount * EXCHANGE_RATE;
    const amountUSD =
      guest.currency === "USD" ? amount : amount / EXCHANGE_RATE;

    return new Promise((resolve, reject) => {
      const query = `
        INSERT INTO guests (name, name_km, phone, note, amount, currency, amount_khr, amount_usd, payment_type, invitation_guest_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      this.db.run(
        query,
        [
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
        ],
        function (err) {
          if (err) {
            reject(err);
          } else {
            resolve(this.lastID);
          }
        }
      );
    });
  }

  async updateGuest(id, guest) {
    const EXCHANGE_RATE = 4000;
    const amount = parseFloat(guest.amount) || 0;

    // Calculate both currency amounts
    const amountKHR =
      guest.currency === "KHR" ? amount : amount * EXCHANGE_RATE;
    const amountUSD =
      guest.currency === "USD" ? amount : amount / EXCHANGE_RATE;

    return new Promise((resolve, reject) => {
      const query = `
        UPDATE guests 
        SET name = ?, name_km = ?, phone = ?, note = ?, amount = ?, currency = ?, amount_khr = ?, amount_usd = ?, payment_type = ?, invitation_guest_id = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `;

      this.db.run(
        query,
        [
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
          id,
        ],
        function (err) {
          if (err) {
            reject(err);
          } else {
            resolve(this.changes);
          }
        }
      );
    });
  }

  async deleteGuest(id) {
    return new Promise((resolve, reject) => {
      const query = "DELETE FROM guests WHERE id = ?";

      this.db.run(query, [id], function (err) {
        if (err) {
          reject(err);
        } else {
          resolve(this.changes);
        }
      });
    });
  }

  async getTotals() {
    return new Promise((resolve, reject) => {
      const query = `
        SELECT 
          COUNT(*) as total_guests,
          COALESCE(SUM(amount_khr), 0) as total_khr,
          COALESCE(SUM(amount_usd), 0) as total_usd,
          COALESCE(SUM(CASE WHEN payment_type = 'CASH' AND currency = 'KHR' THEN amount_khr WHEN payment_type = 'CASH' AND currency = 'USD' THEN amount_usd ELSE 0 END), 0) as cash_total
        FROM guests
      `;

      this.db.get(query, [], (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row);
        }
      });
    });
  }

  close() {
    if (this.db) {
      this.db.close((err) => {
        if (err) {
          console.error("Error closing database:", err);
        } else {
          console.log("Database connection closed");
        }
      });
    }
  }

  // Wedding Files Operations
  async addWeddingFile(fileData) {
    return new Promise((resolve, reject) => {
      const query = `
        INSERT INTO wedding_files (name, original_name, file_path, file_size, mime_type, file_type, type)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `;

      const params = [
        fileData.name,
        fileData.originalName,
        fileData.filePath,
        fileData.fileSize,
        fileData.mimeType,
        fileData.fileType,
        fileData.type,
      ];

      this.db.run(query, params, function (err) {
        if (err) {
          reject(err);
        } else {
          resolve({ id: this.lastID, ...fileData });
        }
      });
    });
  }

  async getWeddingFiles() {
    return new Promise((resolve, reject) => {
      const query = "SELECT * FROM wedding_files ORDER BY created_at DESC";

      this.db.all(query, [], (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  }

  async deleteWeddingFile(id) {
    return new Promise((resolve, reject) => {
      const query = "DELETE FROM wedding_files WHERE id = ?";

      this.db.run(query, [id], function (err) {
        if (err) {
          reject(err);
        } else {
          resolve(this.changes);
        }
      });
    });
  }

  async getWeddingFile(id) {
    return new Promise((resolve, reject) => {
      const query = "SELECT * FROM wedding_files WHERE id = ?";

      this.db.get(query, [id], (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row);
        }
      });
    });
  }

  // Wedding Info Operations
  async setWeddingInfo(fieldName, fieldValue) {
    return new Promise((resolve, reject) => {
      const query = `
        INSERT OR REPLACE INTO wedding_info (field_name, field_value, updated_at)
        VALUES (?, ?, CURRENT_TIMESTAMP)
      `;

      this.db.run(query, [fieldName, fieldValue], function (err) {
        if (err) {
          reject(err);
        } else {
          resolve(this.changes);
        }
      });
    });
  }

  async getWeddingInfo(fieldName) {
    return new Promise((resolve, reject) => {
      const query = "SELECT field_value FROM wedding_info WHERE field_name = ?";

      this.db.get(query, [fieldName], (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row ? row.field_value : null);
        }
      });
    });
  }

  async getAllWeddingInfo() {
    return new Promise((resolve, reject) => {
      const query = "SELECT field_name, field_value FROM wedding_info";

      this.db.all(query, [], (err, rows) => {
        if (err) {
          reject(err);
        } else {
          const weddingInfo = {};
          rows.forEach((row) => {
            weddingInfo[row.field_name] = row.field_value;
          });
          resolve(weddingInfo);
        }
      });
    });
  }

  // QR Code specific operations
  async getPaymentQRCode() {
    return new Promise((resolve, reject) => {
      const query =
        "SELECT * FROM wedding_files WHERE type = 'qr_code' ORDER BY created_at DESC LIMIT 1";

      this.db.get(query, [], (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row || null);
        }
      });
    });
  }

  async addPaymentQRCode(fileData) {
    return new Promise((resolve, reject) => {
      // First, delete any existing QR code
      this.db.run("DELETE FROM wedding_files WHERE type = 'qr_code'", (err) => {
        if (err) {
          reject(err);
          return;
        }

        // Then add the new QR code
        const query = `
          INSERT INTO wedding_files (name, original_name, file_path, file_size, mime_type, file_type, type)
          VALUES (?, ?, ?, ?, ?, ?, 'qr_code')
        `;

        const params = [
          fileData.name,
          fileData.originalName,
          fileData.filePath,
          fileData.fileSize,
          fileData.mimeType,
          fileData.fileType,
        ];

        this.db.run(query, params, function (err) {
          if (err) {
            reject(err);
          } else {
            resolve({ id: this.lastID, ...fileData, type: "qr_code" });
          }
        });
      });
    });
  }

  // Invitation Guests Operations
  async addInvitationGuest(guest) {
    return new Promise((resolve, reject) => {
      const query = `
        INSERT INTO invitation_guests (name, phone, email, address, group_category, note)
        VALUES (?, ?, ?, ?, ?, ?)
      `;

      this.db.run(
        query,
        [
          guest.name,
          guest.phone || null,
          guest.email || null,
          guest.address || null,
          guest.group_category || null,
          guest.note || null,
        ],
        function (err) {
          if (err) {
            reject(err);
          } else {
            resolve(this.lastID);
          }
        }
      );
    });
  }

  async bulkAddInvitationGuests(guests) {
    return new Promise((resolve, reject) => {
      const stmt = this.db.prepare(`
        INSERT INTO invitation_guests (name, name_km, phone, email, address, group_category, note)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);

      let successCount = 0;
      let errorCount = 0;
      const errors = [];

      this.db.run("BEGIN TRANSACTION");

      guests.forEach((guest, index) => {
        stmt.run(
          [
            guest.name,
            guest.name_km || null,
            guest.phone || null,
            guest.email || null,
            guest.address || null,
            guest.group_category || null,
            guest.note || null,
          ],
          (err) => {
            if (err) {
              errorCount++;
              errors.push({ row: index + 1, error: err.message });
            } else {
              successCount++;
            }

            if (successCount + errorCount === guests.length) {
              stmt.finalize();
              if (errorCount > 0) {
                this.db.run("ROLLBACK");
                reject({ successCount, errorCount, errors });
              } else {
                this.db.run("COMMIT");
                resolve({ successCount, errorCount: 0 });
              }
            }
          }
        );
      });
    });
  }

  async getInvitationGuests(filters = {}) {
    return new Promise((resolve, reject) => {
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

      this.db.all(query, params, (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  }

  async getInvitationGuest(id) {
    return new Promise((resolve, reject) => {
      const query = "SELECT * FROM invitation_guests WHERE id = ?";

      this.db.get(query, [id], (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row);
        }
      });
    });
  }

  async updateInvitationGuest(id, guest) {
    return new Promise((resolve, reject) => {
      const query = `
        UPDATE invitation_guests 
        SET name = ?, phone = ?, email = ?, address = ?, group_category = ?, note = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `;

      this.db.run(
        query,
        [
          guest.name,
          guest.phone || null,
          guest.email || null,
          guest.address || null,
          guest.group_category || null,
          guest.note || null,
          id,
        ],
        function (err) {
          if (err) {
            reject(err);
          } else {
            resolve(this.changes);
          }
        }
      );
    });
  }

  async deleteInvitationGuest(id) {
    return new Promise((resolve, reject) => {
      const query = "DELETE FROM invitation_guests WHERE id = ?";

      this.db.run(query, [id], function (err) {
        if (err) {
          reject(err);
        } else {
          resolve(this.changes);
        }
      });
    });
  }

  async markInvitationGuestAsImported(id) {
    return new Promise((resolve, reject) => {
      const query = `
        UPDATE invitation_guests 
        SET is_imported = 1, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `;

      this.db.run(query, [id], function (err) {
        if (err) {
          reject(err);
        } else {
          resolve(this.changes);
        }
      });
    });
  }

  async getInvitationGuestStats() {
    return new Promise((resolve, reject) => {
      const query = `
        SELECT 
          COUNT(*) as total,
          COUNT(CASE WHEN is_imported = 1 THEN 1 END) as imported,
          COUNT(CASE WHEN is_imported = 0 THEN 1 END) as not_imported,
          COUNT(DISTINCT group_category) as total_groups
        FROM invitation_guests
      `;

      this.db.get(query, [], (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row);
        }
      });
    });
  }

  async clearAllInvitationGuests() {
    return new Promise((resolve, reject) => {
      const query = "DELETE FROM invitation_guests";

      this.db.run(query, [], function (err) {
        if (err) {
          reject(err);
        } else {
          resolve(this.changes);
        }
      });
    });
  }
}

module.exports = Database;
