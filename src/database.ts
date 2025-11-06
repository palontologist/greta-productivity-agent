import Database from 'better-sqlite3';
import { app } from 'electron';
import * as path from 'path';
import * as fs from 'fs';

export interface ActivityLog {
  id?: number;
  timestamp: number;
  appName: string;
  windowTitle: string;
  category?: string;
  duration?: number;
}

export class ActivityDatabase {
  private db: Database.Database;

  constructor(dbPath?: string) {
    // Use user data directory by default
    const defaultPath = path.join(app.getPath('userData'), 'greta-activities.db');
    const finalPath = dbPath || defaultPath;
    
    // Ensure directory exists
    const dir = path.dirname(finalPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    this.db = new Database(finalPath);
    this.initializeSchema();
  }

  private initializeSchema(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS activities (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp INTEGER NOT NULL,
        appName TEXT NOT NULL,
        windowTitle TEXT NOT NULL,
        category TEXT,
        duration INTEGER DEFAULT 0
      );

      CREATE INDEX IF NOT EXISTS idx_timestamp ON activities(timestamp);
      CREATE INDEX IF NOT EXISTS idx_appName ON activities(appName);
    `);
  }

  logActivity(activity: ActivityLog): number {
    const stmt = this.db.prepare(`
      INSERT INTO activities (timestamp, appName, windowTitle, category, duration)
      VALUES (?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      activity.timestamp,
      activity.appName,
      activity.windowTitle,
      activity.category || 'Uncategorized',
      activity.duration || 0
    );

    return result.lastInsertRowid as number;
  }

  getRecentActivities(limit: number = 50): ActivityLog[] {
    const stmt = this.db.prepare(`
      SELECT * FROM activities
      ORDER BY timestamp DESC
      LIMIT ?
    `);

    return stmt.all(limit) as ActivityLog[];
  }

  getActivitiesByTimeRange(startTime: number, endTime: number): ActivityLog[] {
    const stmt = this.db.prepare(`
      SELECT * FROM activities
      WHERE timestamp >= ? AND timestamp <= ?
      ORDER BY timestamp DESC
    `);

    return stmt.all(startTime, endTime) as ActivityLog[];
  }

  getActivitySummary(startTime: number, endTime: number): { appName: string; totalTime: number; count: number }[] {
    const stmt = this.db.prepare(`
      SELECT 
        appName,
        SUM(duration) as totalTime,
        COUNT(*) as count
      FROM activities
      WHERE timestamp >= ? AND timestamp <= ?
      GROUP BY appName
      ORDER BY totalTime DESC
    `);

    return stmt.all(startTime, endTime) as { appName: string; totalTime: number; count: number }[];
  }

  close(): void {
    this.db.close();
  }
}
