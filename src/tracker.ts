import activeWin from 'active-win';
import { ActivityDatabase, ActivityLog } from './database';

export class ActivityTracker {
  private static readonly LOG_TITLE_MAX_LENGTH = 50;
  
  private db: ActivityDatabase;
  private trackingInterval: NodeJS.Timeout | null = null;
  private lastActivity: { appName: string; windowTitle: string; timestamp: number } | null = null;
  private intervalMs: number;

  constructor(db: ActivityDatabase, intervalMs: number = 5000) {
    this.db = db;
    this.intervalMs = intervalMs;
  }

  async start(): Promise<void> {
    console.log('Starting activity tracker...');
    
    // Track immediately
    await this.trackCurrentActivity();

    // Then track periodically
    this.trackingInterval = setInterval(async () => {
      await this.trackCurrentActivity();
    }, this.intervalMs);
  }

  stop(): void {
    if (this.trackingInterval) {
      clearInterval(this.trackingInterval);
      this.trackingInterval = null;
      console.log('Activity tracker stopped');
    }
  }

  private async trackCurrentActivity(): Promise<void> {
    try {
      const window = await activeWin();
      
      if (!window) {
        console.log('No active window detected');
        return;
      }

      const currentTime = Date.now();
      const appName = window.owner.name;
      const windowTitle = window.title;

      // Calculate duration if we have a previous activity
      let duration = 0;
      if (this.lastActivity && 
          this.lastActivity.appName === appName && 
          this.lastActivity.windowTitle === windowTitle) {
        duration = currentTime - this.lastActivity.timestamp;
      }

      // Log the activity
      const activity: ActivityLog = {
        timestamp: currentTime,
        appName,
        windowTitle,
        category: this.categorizeActivity(appName, windowTitle),
        duration
      };

      this.db.logActivity(activity);

      // Update last activity
      this.lastActivity = {
        appName,
        windowTitle,
        timestamp: currentTime
      };

      console.log(`Tracked: ${appName} - ${windowTitle.substring(0, ActivityTracker.LOG_TITLE_MAX_LENGTH)}...`);
    } catch (error) {
      console.error('Error tracking activity:', error);
    }
  }

  private categorizeActivity(appName: string, windowTitle: string): string {
    const app = appName.toLowerCase();
    const title = windowTitle.toLowerCase();

    // Simple categorization rules
    if (app.includes('code') || app.includes('visual studio') || app.includes('sublime')) {
      return 'Deep Work - Coding';
    } else if (app.includes('terminal') || app.includes('iterm')) {
      return 'Deep Work - Development';
    } else if (app.includes('chrome') || app.includes('firefox') || app.includes('safari')) {
      if (title.includes('github') || title.includes('stackoverflow') || title.includes('docs')) {
        return 'Research - Development';
      } else if (title.includes('youtube') || title.includes('reddit') || title.includes('twitter')) {
        return 'Distraction - Social Media';
      } else {
        return 'Research - Web';
      }
    } else if (app.includes('slack') || app.includes('discord') || app.includes('teams')) {
      return 'Communication';
    } else if (app.includes('mail') || app.includes('outlook')) {
      return 'Communication - Email';
    } else if (app.includes('notion') || app.includes('obsidian') || app.includes('notes')) {
      return 'Deep Work - Writing';
    } else {
      return 'Uncategorized';
    }
  }
}
