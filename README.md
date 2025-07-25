# Claude Code Monitor

An Electron app that displays a small window showing all running Claude Code instances, their working directories, session age, and whether they're running in headless mode.

## Features

- Shows all active Claude Code instances with their PIDs
- Displays working directory for each instance
- Shows session elapsed time
- Indicates whether instances are headless or interactive
- Auto-refreshes every 5 seconds
- Always-on-top window for easy monitoring
- Clean, dark UI optimized for development

## Installation

```bash
cd projects/claude-monitor
npm install
```

## Usage

### Development
```bash
npm run dev
```

### Production
```bash
npm start
```

### Build Distribution
```bash
npm run build
```

## Architecture

The app uses Electron's main process to execute system commands (`ps` and `lsof`) to discover Claude Code processes and their working directories. The renderer process displays this information in a clean, auto-updating interface.

### Process Detection
- Uses `ps -eo pid,ppid,comm,args,etime,lstart` to find Claude processes
- Filters out Claude desktop app helper processes
- Uses `lsof -p <pid>` to get working directory for each process
- Detects headless mode based on environment variables

### UI Design
- Dark theme optimized for development
- Color-coded instances (blue for interactive, orange for headless)
- Monospace font for directory paths
- Compact layout showing essential information
- Always-on-top for easy monitoring during development