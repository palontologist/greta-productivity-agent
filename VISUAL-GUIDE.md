# 🎨 Greta MVP Visual Guide

This document provides a visual overview of the Greta Productivity Agent MVP.

## Dashboard Overview

The Greta dashboard provides a beautiful, modern interface for viewing your productivity data.

### Main Dashboard Features

**Header Section**
- Beautiful gradient background (purple/blue theme)
- Clear branding with rocket emoji 🚀
- Mission statement tagline

**Statistics Cards** (Top of Dashboard)
Three key metrics displayed in clean card format:
1. **Today's Activities** - Total number of tracked activities
2. **Tracked Apps** - Number of unique applications used
3. **Active Time** - Total time spent in tracked activities

**Activity Summary Table**
- Shows time spent per application
- Number of activities per app
- Clean, sortable table format
- Easy to scan for top time consumers

**Recent Activities Feed**
- Real-time list of your recent activities
- Each activity shows:
  - Timestamp (when it occurred)
  - Application name (bold)
  - Window title (truncated for readability)
  - Category badge (color-coded)
- Auto-scrolling list (max height with overflow)
- Color-coded category badges:
  - 🟢 Green: Deep Work (coding, writing)
  - 🔵 Blue: Communication (email, chat)
  - 🟣 Purple: Research (docs, learning)
  - 🔴 Red: Distraction (social media)

**Refresh Button**
- Manual refresh control
- Purple button matching the theme
- Updates all data on click

## Color Scheme

The MVP uses a carefully chosen color palette:
- **Primary**: Purple/Blue gradient (#667eea to #764ba2)
- **Deep Work**: Green tones (#d1e7dd)
- **Communication**: Blue tones (#cfe2ff)
- **Research**: Purple tones (#e7d6f9)
- **Distraction**: Red tones (#f8d7da)
- **Background**: White with light gray accents (#f8f9fa)

## User Experience Flow

1. **Launch Application**
   - App opens immediately with dashboard
   - Background tracking starts automatically
   - Console logs show tracking activity

2. **View Real-time Data**
   - Dashboard auto-refreshes every 10 seconds
   - New activities appear at the top of the feed
   - Statistics update automatically

3. **Understand Your Time**
   - Glance at activity cards for quick stats
   - Review summary table for time breakdown
   - Scroll through activity feed for details

4. **Category-based Insights**
   - Color-coded badges make it easy to spot patterns
   - See if you're in "Deep Work" or "Distraction" mode
   - Identify communication vs. focused work time

## Technical Details

### Window Tracking
- Captures active window every 5 seconds
- Records:
  - Application name (e.g., "Visual Studio Code")
  - Window title (e.g., "main.ts - Greta Agent")
  - Timestamp
  - Calculated duration
  - Auto-assigned category

### Data Display
- All times formatted in human-readable format:
  - Under 60 seconds: "45s"
  - Under 60 minutes: "23m"
  - Over 60 minutes: "2h 15m"
- Timestamps shown in local time (HH:MM:SS format)
- Activity titles truncated with ellipsis if too long

### Performance
- Lightweight tracking (minimal CPU/memory usage)
- Efficient SQLite queries
- Smooth UI updates without lag
- Background process doesn't interrupt work

## What Makes This MVP Special

Unlike traditional time trackers that just count minutes, this MVP:

✨ **Categorizes Intelligently**
- Automatically understands what type of work you're doing
- Distinguishes between deep work and shallow work
- Identifies distractions vs. productive research

🎯 **Mission-Focused Design**
- Beautiful, motivating interface
- Clear insights at a glance
- Helps you understand alignment (foundation for future scoring)

🔒 **Privacy-First**
- All data stored locally
- No cloud sync in MVP (by design)
- You control your data completely

⚡ **Instant Value**
- Works immediately after launch
- No configuration required
- Start seeing insights within seconds

## Future Enhancements Preview

The MVP foundation enables these planned features:

- **Mission Alignment Scoring**: Rate activities against your goals
- **Smart Nudges**: Contextual productivity suggestions
- **Deep Work Analysis**: Identify peak focus times
- **Distraction Patterns**: Heat maps and trend analysis
- **Manual Logging**: Quick-add for offline activities
- **Cloud Sync**: Optional backup to Greta dashboard
- **Team Features**: Anonymous benchmarking and accountability
- **Advanced Analytics**: Sunburst charts, Sankey diagrams
- **Privacy Controls**: Selective sync, auto-redaction

## Running the Application

```bash
# Install and build
npm install
npm run build

# Start the app
npm run dev
```

The Electron window will open showing your dashboard. The app immediately starts tracking your activities. Switch between applications and watch the dashboard update!

## Screenshots Note

In a real deployment, this section would include:
- Dashboard overview screenshot
- Activity feed detail
- Statistics cards close-up
- Category badges examples
- Dark mode variant (if implemented)

For this MVP, the visual design is implemented in HTML/CSS and can be seen by running the application.
