# Claude Code Monitor

[![Download Latest Release](https://img.shields.io/github/v/release/dmiracle/claude-monitor?label=Download%20DMG&style=for-the-badge&logo=apple&logoColor=white)](https://github.com/dmiracle/claude-monitor/releases/latest/download/Claude-Monitor-macos-arm64.dmg)

An Electron app that displays a small window showing all running Claude Code instances, their working directories, session age, and whether they're running in headless mode.

## Features

- Shows all active Claude Code instances with their PIDs
- Displays working directory for each instance
- Shows session elapsed time
- Indicates whether instances are headless or interactive
- Displays which model is being used
- Auto-refreshes every 5 seconds
- Focusable window that can lose focus when needed
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

### Makefile Build System (macOS only)

The project includes a Makefile for streamlined build automation. **Note: This Makefile has only been tested on macOS** and uses macOS-specific tools like `sips` and `iconutil`.

#### Available Make Targets

```bash
make dev          # Run in development mode
make build        # Build the Electron app and create DMG
make dist         # Same as build (create distributable)
make clean        # Remove build artifacts
make rebuild      # Clean and build from scratch
make icon         # Generate icon files from PNG
make update-icon  # Update icon from source PNG and regenerate
make install      # Open DMG for installation
make info         # Show build environment info
make help         # Show all available targets
```

#### Examples

```bash
# Quick development setup
make dev

# Clean build from scratch
make rebuild

# Show build information
make info

# Get help with all targets
make help
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
- Allows window focus changes for better workflow integration
