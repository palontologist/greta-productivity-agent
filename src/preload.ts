import { contextBridge, ipcRenderer } from 'electron';

// Expose protected methods that allow the renderer process to use
// ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('gretaAPI', {
  // Get recent activities
  getRecentActivities: (limit: number) => ipcRenderer.invoke('get-recent-activities', limit),
  
  // Get activity summary for a time range
  getActivitySummary: (startTime: number, endTime: number) => 
    ipcRenderer.invoke('get-activity-summary', startTime, endTime),
  
  // Get activities by time range
  getActivitiesByTimeRange: (startTime: number, endTime: number) => 
    ipcRenderer.invoke('get-activities-by-time-range', startTime, endTime)
});
