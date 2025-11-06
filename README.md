# 🚀 Greta Productivity Agent

> **Mission-aligned productivity tracking that helps you work on what truly matters.**

**✨ MVP is now live!** A fully functional desktop app is ready to use. [Jump to Getting Started →](#-getting-started)

---

Greta Productivity Agent is an Electron-based desktop companion that bridges the gap between passive activity monitoring and intentional, mission-driven work. Unlike traditional time trackers that just count minutes, Greta helps you understand *how well* your daily activities align with your personal mission and long-term goals.

## 🎉 MVP Features (Available Now!)

The current MVP includes:

- ✅ **Real-time Activity Tracking** - Automatically monitors your active window every 5 seconds
- ✅ **Smart Categorization** - Intelligently classifies activities (Deep Work, Communication, Research, Distraction)
- ✅ **Beautiful Dashboard** - Modern UI showing statistics, activity timeline, and time breakdown
- ✅ **Local SQLite Database** - All your data stored securely on your machine
- ✅ **Privacy-First** - Zero external calls, complete data privacy
- ✅ **Cross-Platform** - Works on macOS, Windows, and Linux
- ✅ **Production-Ready** - Secure architecture with Electron best practices

📖 See [MVP-GUIDE.md](MVP-GUIDE.md) for detailed usage instructions and [VISUAL-GUIDE.md](VISUAL-GUIDE.md) for UI details.

## 🎯 The Vision

We're building a productivity agent that:

- **Tracks with purpose**: Monitors your screen and app usage, but filters everything through the lens of your mission alignment
- **Learns passively, guides actively**: Understands your work patterns without interruption, then provides timely, actionable nudges
- **Syncs seamlessly**: Integrates with the [Greta dashboard](https://greta-v2.vercel.app/dashboard) via API for unified insights
- **Respects privacy**: All tracking happens locally first, with full control over what gets synced
- **Empowers reflection**: Combines automatic logging with manual journaling for deeper self-awareness

## ✨ Core Features

### 📊 Structured Screen & App Tracking

- **Window title monitoring**: Captures active application and document/tab titles
- **Idle detection**: Distinguishes between active work and away-from-keyboard time
- **Category classification**: Automatically tags activities (Deep Work, Communication, Research, Distraction, etc.)
- **Smart batching**: Groups similar activities into meaningful work blocks

### 🔄 Passive & Active Logging

**Passive Layer:**
- Background monitoring with minimal resource footprint
- Activity snapshots every 5-30 seconds (configurable)
- Smart detection of context switches and multitasking patterns

**Active Layer:**
- Quick manual log entries for offline work, meetings, or creative sessions
- Voice-to-text reflection capture (optional)
- Mission alignment self-rating for completed work blocks
- Quick task annotations ("What was this for?")

### 🌐 API Sync & Dashboard Integration

- Real-time or batched sync to Greta cloud dashboard
- Conflict-free replicated data types (CRDTs) for offline-first architecture
- Webhook support for third-party integrations (Slack, Discord, etc.)
- Export capabilities (JSON, CSV) for data portability

### 🔒 Privacy-First Design

- **Local-first**: All raw data stored encrypted on your machine
- **Selective sync**: Choose which data categories to upload
- **Redaction tools**: Automatically filter sensitive window titles or URLs
- **Data retention policies**: Configurable auto-deletion of granular logs
- **No keystroke logging**: We track *what* you work on, not *how* you type it

## 📈 Dashboard Metrics & Sections

Inspired by ActivityWatch and FrontForumFocus, but reimagined for mission-driven productivity:

### 1. 🎯 Mission Alignment Score

**What it shows:**
- Daily/weekly/monthly alignment percentage
- Color-coded breakdown of time spent on mission-critical vs. off-mission activities
- Trend line showing improvement over time

**Why it matters:**
Knowing you spent 8 hours "working" isn't enough. Did those hours move you toward your goals?

### 2. 🧠 Deep Work Blocks

**What it shows:**
- Number and duration of uninterrupted focus sessions
- Peak performance time of day
- Deep work quality score (based on context switches, app diversity, idle time)
- "Personal best" tracking and streaks

**Why it matters:**
Deep work is where real progress happens. This metric helps you protect and expand your focus time.

### 3. 🌀 Distraction Trends

**What it shows:**
- Most common distraction sources (apps, websites, times of day)
- Distraction frequency heat map
- Average time to return to focused work after interruption
- Week-over-week distraction reduction

**Why it matters:**
You can't fix what you don't measure. Identify your kryptonite and build defenses.

### 4. 📝 Reflection Journal

**What it shows:**
- Timeline of manual journal entries paired with activity data
- Sentiment analysis of reflections
- Correlation between subjective experience and objective metrics
- Searchable archive with tags and filters

**Why it matters:**
Numbers tell part of the story. Your lived experience completes it.

### 5. 💡 Actionable Nudges

**What it shows:**
- Real-time suggestions based on current behavior patterns
- "You've been in shallow work for 2 hours—ready for deep work?"
- "This week's lowest-alignment time block was Wednesday afternoon. What happened?"
- Personalized recommendations for schedule optimization

**Why it matters:**
Insights are only valuable if they drive action. Nudges close the loop.

### 6. ✍️ Manual Log Entry

**What it shows:**
- Quick-add interface for logging offline activities
- Pre-filled templates for common tasks (meetings, commute, exercise, learning)
- Retroactive editing of auto-logged blocks
- Integration with calendar imports

**Why it matters:**
Your productivity doesn't stop when you're away from your computer. Capture the full picture.

### 7. 👥 Team Comparison (Optional)

**What it shows:**
- Anonymous, aggregate benchmarks from opt-in Greta community
- Percentile ranking for deep work hours, alignment score, distraction resistance
- Team leaderboards for accountability groups

**Why it matters:**
Healthy competition and social accountability can supercharge your progress.

### 8. 📊 Visual Analytics

**What it shows:**
- Interactive timelines and heatmaps
- Sunburst charts for activity breakdown
- Sankey diagrams for attention flow
- Customizable dashboard widgets
- Export-ready charts for presentations or reports

**Why it matters:**
Beautiful visualizations make patterns obvious and sharing your progress effortless.

## 🏗️ Technical Architecture

### Tech Stack

- **Frontend**: Electron + React + TypeScript
- **State Management**: Zustand or Redux Toolkit
- **Local Storage**: SQLite with better-sqlite3
- **API Client**: Axios with retry logic and offline queue
- **System APIs**: 
  - macOS: Accessibility API + CGWindowListCopyWindowInfo
  - Windows: Win32 API (GetForegroundWindow)
  - Linux: X11/Wayland session info

### Data Flow

```
[System APIs] → [Activity Collector] → [Local SQLite] → [Sync Engine] → [Greta API]
                                            ↓
                                    [Local Dashboard]
                                            ↓
                                  [Electron App UI]
```

### Key Design Principles

1. **Offline-first**: Agent works fully without internet connection
2. **Minimal performance impact**: <1% CPU, <100MB RAM typical usage
3. **Respectful notifications**: Nudges are helpful, never nagging
4. **Extensible**: Plugin architecture for custom trackers and integrations

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ and npm/yarn

### Quick Start

The fastest way to get started:

```bash
# Clone the repository
git clone https://github.com/palontologist/greta-productivity-agent.git
cd greta-productivity-agent

# Run the quick start script
./start.sh
```

### Manual Installation

```bash
# Install dependencies
npm install

# Build the TypeScript code
npm run build

# Start the application
npm run dev
```

The app will open and immediately start tracking your activities!

### What Happens Next

1. The Electron window opens with your dashboard
2. Background tracking starts automatically (every 5 seconds)
3. Your activities are logged to a local SQLite database
4. The dashboard updates every 10 seconds with new data
5. All data stays on your machine - completely private

### Building

```bash
# Build for your platform
npm run build

# Package as distributable
npm run package
```

## 🤝 Contributing

We're in early stages and would love your help! Areas we're particularly excited about:

- **Platform support**: Improving Linux/Windows tracking reliability
- **Privacy features**: More granular redaction and filtering options
- **ML models**: Better automatic categorization of activities
- **Integrations**: Connectors for Notion, Todoist, Linear, etc.
- **UI/UX**: Dashboard design improvements

Check out [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## 📝 Roadmap

**Phase 1: Foundation** ✅ **COMPLETE**
- [x] Basic window tracking for macOS/Windows/Linux
- [x] SQLite storage layer
- [x] Electron app shell
- [x] Dashboard with real-time metrics
- [x] Activity categorization
- [x] Security best practices (context isolation)

**Phase 2: Intelligence**
- [ ] Automatic activity categorization
- [ ] Idle detection and smart batching
- [ ] Mission alignment scoring algorithm
- [ ] Distraction pattern analysis

**Phase 3: Engagement**
- [ ] In-app dashboard with core metrics
- [ ] Actionable nudge system
- [ ] Manual logging interface
- [ ] Reflection journal

**Phase 4: Community**
- [ ] Team comparison features
- [ ] Plugin system for custom trackers
- [ ] Public API for third-party integrations
- [ ] Mobile companion app (iOS/Android)

## 🔐 Privacy & Security

Your data is yours. Period.

- All tracking data is encrypted at rest (AES-256)
- Network transmission uses TLS 1.3+
- No third-party analytics or tracking in the agent itself
- Open source for full transparency
- Optional self-hosted sync server support

Read our full [Privacy Policy](PRIVACY.md) for details.

## 📄 License

MIT License - see [LICENSE](LICENSE) for details.

## 💬 Community & Support

- 💬 [Discord Server](https://discord.gg/greta) - Chat with the community
- 🐛 [Issue Tracker](https://github.com/palontologist/greta-productivity-agent/issues) - Report bugs or request features
- 📧 [Email](mailto:hello@greta.com) - Reach the team directly
- 🐦 [Twitter](https://twitter.com/greta_app) - Follow for updates

## 🌟 Inspiration & Credits

This project draws inspiration from:

- **[ActivityWatch](https://activitywatch.net/)**: For pioneering open-source, privacy-first activity tracking
- **[RescueTime](https://www.rescuetime.com/)**: For demonstrating the value of automatic time tracking
- **[FrontForumFocus](https://frontforumfocus.com/)**: For thoughtful dashboard design and metrics visualization
- **[Toggl Track](https://toggl.com/)**: For showing that productivity tools can be beautiful

But where those tools focus on time spent, Greta focuses on **mission alignment**. We're not just tracking what you do—we're helping you do what matters.

---

**Built with ❤️ by mission-driven builders, for mission-driven builders.**

Ready to align your time with your mission? [Download Greta Agent](https://github.com/palontologist/greta-productivity-agent/releases) or [contribute to the vision](CONTRIBUTING.md)! 🚀
