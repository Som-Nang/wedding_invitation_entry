const { app, BrowserWindow, Menu, ipcMain, dialog } = require("electron");
const path = require("path");
const os = require("os");
const fs = require("fs");

// Log app info for debugging
console.log("App is packaged:", app.isPackaged);
console.log("App path:", app.getAppPath());
console.log("User data path:", app.getPath("userData"));

const Database = require("./src/database");

// Determine database path based on environment
function getDatabasePath() {
  let dbDir;
  if (app.isPackaged) {
    // For packaged app, use userData directory
    dbDir = path.join(app.getPath("userData"), "database");
  } else {
    // For development, use local database folder
    dbDir = path.join(__dirname, "database");
  }
  return path.join(dbDir, "wedding.db");
}

// Determine uploads path based on environment
function getUploadsPath() {
  let uploadsDir;
  if (app.isPackaged) {
    // For packaged app, use userData directory
    uploadsDir = path.join(app.getPath("userData"), "database", "uploads");
  } else {
    // For development, use local database/uploads folder
    uploadsDir = path.join(__dirname, "database", "uploads");
  }
  // Ensure directory exists
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
  return uploadsDir;
}

// Create custom temp directory in user home to avoid /tmp issues
const customTempDir = path.join(os.homedir(), ".wedding-book-temp");
if (!fs.existsSync(customTempDir)) {
  fs.mkdirSync(customTempDir, { recursive: true });
}

// Comprehensive Linux compatibility fixes for SIGSEGV and shared memory errors
app.disableHardwareAcceleration();
app.commandLine.appendSwitch("disable-gpu");
app.commandLine.appendSwitch("disable-gpu-compositing");
app.commandLine.appendSwitch("disable-software-rasterizer");
app.commandLine.appendSwitch("no-sandbox");
app.commandLine.appendSwitch("disable-dev-shm-usage");
app.commandLine.appendSwitch("disable-setuid-sandbox");

// Set custom temp directory
process.env.TMPDIR = customTempDir;
app.setPath("temp", customTempDir);

let mainWindow;
let database;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1200,
    minHeight: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: true,
      sandbox: false,
    },
    icon: path.join(__dirname, "assets/icon.png"),
    show: false,
    titleBarStyle: "default",
  });

  mainWindow.loadFile("src/index.html");

  // Show window when ready to prevent visual flash
  mainWindow.once("ready-to-show", () => {
    mainWindow.show();
  });

  // Open DevTools in development (disabled for stability)
  // mainWindow.webContents.openDevTools();

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

// Determine database path based on environment
function getDatabasePath() {
  let dbDir;
  if (app.isPackaged) {
    // For packaged app, use userData directory
    dbDir = path.join(app.getPath("userData"), "database");
  } else {
    // For development, use local database folder
    dbDir = path.join(__dirname, "database");
  }
  return path.join(dbDir, "wedding.db");
}

// Initialize database
function initDatabase() {
  const dbPath = getDatabasePath();
  console.log("Initializing database at:", dbPath);
  database = new Database(dbPath);
  return database.init();
}

// App event handlers
app.whenReady().then(async () => {
  try {
    await initDatabase();
    createWindow();

    // Create application menu
    const template = [
      {
        label: "File",
        submenu: [
          {
            label: "New Guest",
            accelerator: "CmdOrCtrl+N",
            click: () => {
              mainWindow.webContents.send("new-guest");
            },
          },
          { type: "separator" },
          {
            label: "Export to Excel",
            accelerator: "CmdOrCtrl+E",
            click: () => {
              mainWindow.webContents.send("export-excel");
            },
          },
          {
            label: "Export to PDF",
            accelerator: "CmdOrCtrl+P",
            click: () => {
              mainWindow.webContents.send("export-pdf");
            },
          },
          { type: "separator" },
          {
            label: "Exit",
            accelerator: process.platform === "darwin" ? "Cmd+Q" : "Ctrl+Q",
            click: () => {
              app.quit();
            },
          },
        ],
      },
      {
        label: "Edit",
        submenu: [
          { label: "Undo", accelerator: "CmdOrCtrl+Z", role: "undo" },
          { label: "Redo", accelerator: "Shift+CmdOrCtrl+Z", role: "redo" },
          { type: "separator" },
          { label: "Cut", accelerator: "CmdOrCtrl+X", role: "cut" },
          { label: "Copy", accelerator: "CmdOrCtrl+C", role: "copy" },
          { label: "Paste", accelerator: "CmdOrCtrl+V", role: "paste" },
        ],
      },
      {
        label: "View",
        submenu: [
          { label: "Reload", accelerator: "CmdOrCtrl+R", role: "reload" },
          {
            label: "Force Reload",
            accelerator: "CmdOrCtrl+Shift+R",
            role: "forceReload",
          },
          {
            label: "Toggle Developer Tools",
            accelerator: "F12",
            role: "toggleDevTools",
          },
          { type: "separator" },
          {
            label: "Actual Size",
            accelerator: "CmdOrCtrl+0",
            role: "resetZoom",
          },
          { label: "Zoom In", accelerator: "CmdOrCtrl+Plus", role: "zoomIn" },
          { label: "Zoom Out", accelerator: "CmdOrCtrl+-", role: "zoomOut" },
          { type: "separator" },
          {
            label: "Toggle Fullscreen",
            accelerator: "F11",
            role: "togglefullscreen",
          },
        ],
      },
    ];

    const menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);
  } catch (error) {
    console.error("Failed to initialize application:", error);
    console.error("Error stack:", error.stack);

    // Show error dialog to user
    dialog.showErrorBox(
      "Application Error",
      `Failed to start the application:\n\n${error.message}\n\nPlease check the console for more details.`
    );

    // Don't quit immediately in development
    if (app.isPackaged) {
      app.quit();
    }
  }
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", async () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    await initDatabase();
    createWindow();
  }
});

// IPC handlers for database operations
ipcMain.handle("get-guests", async () => {
  return await database.getGuests();
});

ipcMain.handle("add-guest", async (event, guest) => {
  return await database.addGuest(guest);
});

ipcMain.handle("update-guest", async (event, id, guest) => {
  return await database.updateGuest(id, guest);
});

ipcMain.handle("delete-guest", async (event, id) => {
  return await database.deleteGuest(id);
});

ipcMain.handle("get-totals", async () => {
  return await database.getTotals();
});

// Wedding file operations
ipcMain.handle("add-wedding-file", async (event, fileData) => {
  return await database.addWeddingFile(fileData);
});

ipcMain.handle("get-wedding-files", async () => {
  return await database.getWeddingFiles();
});

ipcMain.handle("get-wedding-file", async (event, id) => {
  return await database.getWeddingFile(id);
});

ipcMain.handle("delete-wedding-file", async (event, id) => {
  return await database.deleteWeddingFile(id);
});

// Wedding info operations
ipcMain.handle("set-wedding-info", async (event, fieldName, fieldValue) => {
  return await database.setWeddingInfo(fieldName, fieldValue);
});

ipcMain.handle("get-wedding-info", async (event, fieldName) => {
  return await database.getWeddingInfo(fieldName);
});

ipcMain.handle("get-all-wedding-info", async () => {
  return await database.getAllWeddingInfo();
});

// QR code operations
ipcMain.handle("get-payment-qr-code", async () => {
  return await database.getPaymentQRCode();
});

ipcMain.handle("add-payment-qr-code", async (event, fileData) => {
  return await database.addPaymentQRCode(fileData);
});

// Get uploads path for renderer process
ipcMain.handle("get-uploads-path", async () => {
  return getUploadsPath();
});

// Get user data path for renderer process
ipcMain.handle("get-user-data-path", async () => {
  return app.getPath("userData");
});

// Invitation guests operations
ipcMain.handle("add-invitation-guest", async (event, guest) => {
  return await database.addInvitationGuest(guest);
});

ipcMain.handle("bulk-add-invitation-guests", async (event, guests) => {
  return await database.bulkAddInvitationGuests(guests);
});

ipcMain.handle("get-invitation-guests", async (event, filters) => {
  return await database.getInvitationGuests(filters);
});

ipcMain.handle("get-invitation-guest", async (event, id) => {
  return await database.getInvitationGuest(id);
});

ipcMain.handle("update-invitation-guest", async (event, id, guest) => {
  return await database.updateInvitationGuest(id, guest);
});

ipcMain.handle("delete-invitation-guest", async (event, id) => {
  return await database.deleteInvitationGuest(id);
});

ipcMain.handle("mark-invitation-guest-imported", async (event, id) => {
  return await database.markInvitationGuestAsImported(id);
});

ipcMain.handle("get-invitation-guests-stats", async () => {
  return await database.getInvitationGuestStats();
});

ipcMain.handle("clear-all-invitation-guests", async () => {
  return await database.clearAllInvitationGuests();
});

// File dialog for export operations
ipcMain.handle("show-save-dialog", async (event, options) => {
  const downloadsPath = app.getPath("downloads");
  const defaultPath = options.defaultPath
    ? path.join(downloadsPath, options.defaultPath)
    : downloadsPath;

  const result = await dialog.showSaveDialog(mainWindow, {
    title: options.title || "Save File",
    defaultPath: defaultPath,
    filters: options.filters || [{ name: "All Files", extensions: ["*"] }],
    properties: ["createDirectory", "showOverwriteConfirmation"],
  });

  return result;
});
