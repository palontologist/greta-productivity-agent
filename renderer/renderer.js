const { ipcRenderer } = require('electron');

// Format milliseconds to readable time
function formatTime(ms) {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  } else if (minutes > 0) {
    return `${minutes}m`;
  } else {
    return `${seconds}s`;
  }
}

// Format timestamp to readable time
function formatTimestamp(timestamp) {
  const date = new Date(timestamp);
  return date.toLocaleTimeString();
}

// Get category class for badge
function getCategoryClass(category) {
  if (category.includes('Deep Work')) {
    return 'deep-work';
  } else if (category.includes('Communication')) {
    return 'communication';
  } else if (category.includes('Research')) {
    return 'research';
  } else if (category.includes('Distraction')) {
    return 'distraction';
  }
  return '';
}

// Load and display recent activities
async function loadRecentActivities() {
  try {
    const activities = await ipcRenderer.invoke('get-recent-activities', 30);
    const activityList = document.getElementById('activity-list');

    if (activities.length === 0) {
      activityList.innerHTML = '<div class="loading">No activities tracked yet. The agent is running...</div>';
      return;
    }

    activityList.innerHTML = activities.map(activity => {
      const categoryClass = getCategoryClass(activity.category || '');
      return `
        <div class="activity-item">
          <div class="time">${formatTimestamp(activity.timestamp)}</div>
          <div class="app">${activity.appName}</div>
          <div class="title">${activity.windowTitle}</div>
          <span class="category-badge ${categoryClass}">${activity.category || 'Uncategorized'}</span>
        </div>
      `;
    }).join('');

    // Update total activities stat
    document.getElementById('total-activities').textContent = activities.length;
  } catch (error) {
    console.error('Error loading activities:', error);
    document.getElementById('activity-list').innerHTML = '<div class="loading">Error loading activities</div>';
  }
}

// Load and display activity summary
async function loadActivitySummary() {
  try {
    // Get today's start and end timestamps
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const endOfDay = startOfDay + 24 * 60 * 60 * 1000;

    const summary = await ipcRenderer.invoke('get-activity-summary', startOfDay, endOfDay);
    const summaryBody = document.getElementById('summary-body');

    if (summary.length === 0) {
      summaryBody.innerHTML = '<tr><td colspan="3" class="loading">No data for today yet</td></tr>';
      return;
    }

    summaryBody.innerHTML = summary.map(item => `
      <tr>
        <td><strong>${item.appName}</strong></td>
        <td>${formatTime(item.totalTime)}</td>
        <td>${item.count}</td>
      </tr>
    `).join('');

    // Update stats
    document.getElementById('tracked-apps').textContent = summary.length;
    
    const totalTime = summary.reduce((sum, item) => sum + item.totalTime, 0);
    document.getElementById('active-time').textContent = formatTime(totalTime);
  } catch (error) {
    console.error('Error loading summary:', error);
    document.getElementById('summary-body').innerHTML = '<tr><td colspan="3" class="loading">Error loading summary</td></tr>';
  }
}

// Refresh all data
async function refreshData() {
  await Promise.all([
    loadRecentActivities(),
    loadActivitySummary()
  ]);
}

// Initial load
refreshData();

// Auto-refresh every 10 seconds
setInterval(refreshData, 10000);
