// Type definitions for the Greta API exposed to the renderer process

interface GretaAPI {
  getRecentActivities: (limit: number) => Promise<any[]>;
  getActivitySummary: (startTime: number, endTime: number) => Promise<any[]>;
  getActivitiesByTimeRange: (startTime: number, endTime: number) => Promise<any[]>;
}

declare global {
  interface Window {
    gretaAPI: GretaAPI;
  }
}

export {};
