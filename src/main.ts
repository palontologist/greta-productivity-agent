import { app, BrowserWindow, ipcMain } from 'electron';
import * as path from 'path';
import { ActivityDatabase } from './database';
import { ActivityTracker } from './tracker';

let mainWindow: BrowserWindow | null = null;
let db: ActivityDatabase;
let tracker: ActivityTracker;

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1000,
    height: 700,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  // Load the HTML file
  mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));

  // Open DevTools in development
  if (process.env.NODE_ENV === 'development') {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Initialize app
app.whenReady().then(async () => {
  // Initialize database
  db = new ActivityDatabase();
  console.log('Database initialized');

  // Initialize tracker
  tracker = new ActivityTracker(db, 5000); // Track every 5 seconds
  await tracker.start();
  console.log('Tracker started');

  // Create window
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// Quit when all windows are closed
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    tracker.stop();
    db.close();
    app.quit();
  }
});

app.on('before-quit', () => {
  tracker.stop();
  db.close();
});

// IPC Handlers
ipcMain.handle('get-recent-activities', async (event, limit: number = 50) => {
  try {
    return db.getRecentActivities(limit);
  } catch (error) {
    console.error('Error getting recent activities:', error);
    return [];
  }
});

ipcMain.handle('get-activity-summary', async (event, startTime: number, endTime: number) => {
  try {
    return db.getActivitySummary(startTime, endTime);
  } catch (error) {
    console.error('Error getting activity summary:', error);
    return [];
  }
});

ipcMain.handle('get-activities-by-time-range', async (event, startTime: number, endTime: number) => {
  try {
    return db.getActivitiesByTimeRange(startTime, endTime);
  } catch (error) {
    console.error('Error getting activities by time range:', error);
    return [];
  }
});
