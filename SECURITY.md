# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.0.x   | :white_check_mark: |

## Reporting a Vulnerability

If you discover a security vulnerability, please report it by:

1. **Do NOT** open a public GitHub issue
2. Email security concerns to: dylanmiracle@proton.me
3. Include detailed steps to reproduce the issue
4. Provide information about potential impact

## Privacy Notice

Claude Monitor accesses the following data on your system:

- **Process Information**: Reads system process list to identify Claude Code instances
- **File System Access**: Reads working directories and Git repository information
- **Claude Configuration**: Accesses `~/.claude/` directory to read:
  - Project session files (`.jsonl`) for model and usage information
  - MCP configuration files for tool detection
- **Terminal Integration**: Uses AppleScript to interact with iTerm2/Terminal

### Data Handling

- **No Data Collection**: No data is transmitted to external servers
- **Local Processing**: All information stays on your local machine
- **Read-Only Access**: Only reads files, never modifies user data
- **No Persistence**: Does not store or cache personal information

## Security Measures

- Context isolation enabled for Electron renderer process
- Node.js integration disabled in renderer
- Secure IPC communication via preload script
- Input validation for system commands
- Minimal required permissions

## Known Limitations

- Requires macOS for full functionality (Makefile and terminal integration)
- Accesses private Claude session data (necessary for functionality)
- Uses system commands (`ps`, `lsof`, `git`) with proper sanitization
