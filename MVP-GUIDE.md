# Greta MVP - Getting Started

This is a minimal viable product (MVP) implementation of the Greta Productivity Agent. It demonstrates the core functionality of tracking your screen activities and displaying them in a dashboard.

## What's Included in This MVP

✅ **Electron Desktop Application** - Cross-platform desktop app  
✅ **Active Window Tracking** - Monitors which application and window you're using  
✅ **SQLite Database** - Local storage for all activity data  
✅ **Activity Categorization** - Automatically categorizes activities (Deep Work, Communication, Research, Distraction)  
✅ **Dashboard UI** - Beautiful interface showing your activities and statistics  
✅ **Real-time Updates** - Dashboard refreshes automatically every 10 seconds  

## Prerequisites

- Node.js 18 or higher
- npm or yarn

## Installation

```bash
# Install dependencies
npm install

# Build the TypeScript code
npm run build
```

## Running the Application

```bash
# Start the Electron app
npm run dev
```

The application will:
1. Start tracking your active window every 5 seconds
2. Store activity data in a local SQLite database
3. Display a dashboard showing:
   - Recent activities
   - Activity summary by application
   - Statistics (total activities, tracked apps, active time)

## How It Works

### Activity Tracking
- Every 5 seconds, the app checks which window is currently active
- It records the application name and window title
- Activities are automatically categorized based on the application

### Categorization Rules
- **Deep Work - Coding**: VS Code, Visual Studio, Sublime Text
- **Deep Work - Development**: Terminal, iTerm
- **Deep Work - Writing**: Notion, Obsidian, Notes
- **Communication**: Slack, Discord, Teams, Email
- **Research - Development**: GitHub, Stack Overflow, Documentation sites
- **Distraction - Social Media**: YouTube, Reddit, Twitter
- **Research - Web**: Other browser activities

### Data Storage
All data is stored locally in a SQLite database at:
- macOS: `~/Library/Application Support/greta-productivity-agent/greta-activities.db`
- Linux: `~/.config/greta-productivity-agent/greta-activities.db`
- Windows: `%APPDATA%/greta-productivity-agent/greta-activities.db`

## Features Demonstrated

### 1. Real-time Activity Tracking
The agent runs in the background and continuously monitors your activity without interrupting your workflow.

### 2. Local-First Architecture
All data is stored locally on your machine. No data is sent to external servers in this MVP.

### 3. Beautiful Dashboard
A clean, modern interface shows your productivity metrics at a glance.

### 4. Activity Categorization
Intelligent categorization helps you understand how you spend your time.

## Development

### Project Structure
```
greta-productivity-agent/
├── src/
│   ├── main.ts          # Electron main process
│   ├── database.ts      # SQLite database layer
│   └── tracker.ts       # Activity tracking logic
├── renderer/
│   ├── index.html       # Dashboard UI
│   └── renderer.js      # Dashboard logic
├── dist/                # Compiled JavaScript (generated)
├── package.json
└── tsconfig.json
```

### Building
```bash
npm run build
```

### Running in Development
```bash
npm run dev
```

## Known Limitations

This is an MVP with some limitations:
- No API sync to cloud dashboard yet
- No manual log entry interface yet
- No advanced analytics or mission alignment scoring
- Limited categorization rules
- No idle detection
- No data export functionality

These features are planned for future releases as outlined in the main README.

## Next Steps

To evolve this MVP into a full product:
1. Add API client for cloud sync
2. Implement mission alignment scoring
3. Add manual logging interface
4. Build more sophisticated categorization using ML
5. Add idle detection and smart batching
6. Create notification/nudge system
7. Implement data export and privacy controls

## Troubleshooting

### "No active window detected"
This is normal on some systems. The app requires permissions to access window information:
- **macOS**: Grant accessibility permissions in System Preferences > Security & Privacy > Privacy > Accessibility
- **Linux**: May require X11 or Wayland configuration
- **Windows**: Should work out of the box

### Database errors
If you encounter database errors, delete the database file and restart the app. It will create a fresh database.

## License

MIT License - see LICENSE file for details.
