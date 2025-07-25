const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { spawn } = require('child_process');

let mainWindow;
let isMinimizedMode = false;

const EXPANDED_SIZE = { width: 700, height: 450 };
const MINIMIZED_SIZE = { width: 200, minHeight: 100 };

function createWindow() {
  mainWindow = new BrowserWindow({
    width: EXPANDED_SIZE.width,
    height: EXPANDED_SIZE.height,
    frame: true,
    resizable: true,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  mainWindow.loadFile('src/index.html');

  if (process.argv.includes('--dev')) {
    mainWindow.webContents.openDevTools();
  }
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// IPC handler to get Claude Code instances
ipcMain.handle('get-claude-instances', async () => {
  return new Promise((resolve, reject) => {
    // Get Claude processes with TTY, CPU, state, and full args
    const ps = spawn('ps', ['-eo', 'pid,ppid,tty,state,pcpu,args,etime,lstart']);
    let psOutput = '';
    
    ps.stdout.on('data', (data) => {
      psOutput += data.toString();
    });
    
    ps.on('close', (code) => {
      if (code !== 0) {
        reject(new Error('Failed to get process list'));
        return;
      }
      
      // Filter for Claude Code CLI processes (not desktop app helpers)
      const lines = psOutput.split('\n');
      const claudeProcesses = lines.filter(line => {
        return line.includes('claude') && 
               !line.includes('grep') && 
               !line.includes('Claude Helper') &&
               !line.includes('/Applications/Claude.app/') &&
               !line.includes('ShipIt') &&
               !line.includes('crashpad') &&
               // Only include actual 'claude' command processes
               (line.includes(' claude ') || line.endsWith(' claude'));
      });
      
      // Get working directories for each process
      Promise.all(claudeProcesses.map(processLine => {
        const parts = processLine.trim().split(/\s+/);
        const pid = parts[0];
        const ppid = parts[1];
        const tty = parts[2];
        const state = parts[3];
        const cpuPercent = parseFloat(parts[4]) || 0;
        const args = parts.slice(5).join(' ');
        
        return new Promise((resolve) => {
          const lsof = spawn('lsof', ['-p', pid]);
          let lsofOutput = '';
          
          lsof.stdout.on('data', (data) => {
            lsofOutput += data.toString();
          });
          
          lsof.on('close', () => {
            const cwdLine = lsofOutput.split('\n').find(line => line.includes('cwd'));
            let workingDir = 'Unknown';
            
            if (cwdLine) {
              const cwdParts = cwdLine.split(/\s+/);
              workingDir = cwdParts[cwdParts.length - 1];
            }
            
            // Get Git information for this working directory
            const getGitInfo = (workingDir) => {
              return new Promise((gitResolve) => {
                if (workingDir === 'Unknown' || workingDir === 'Permission denied') {
                  gitResolve({ hasGit: false });
                  return;
                }
                
                // Check if it's a git repository and get branch info
                const gitStatus = spawn('git', ['-C', workingDir, 'status', '--porcelain=v1', '--branch'], {
                  stdio: ['ignore', 'pipe', 'ignore']
                });
                
                let gitOutput = '';
                gitStatus.stdout.on('data', (data) => {
                  gitOutput += data.toString();
                });
                
                gitStatus.on('close', (code) => {
                  if (code !== 0) {
                    gitResolve({ hasGit: false });
                    return;
                  }
                  
                  // Parse git status output
                  const lines = gitOutput.split('\n');
                  const branchLine = lines.find(line => line.startsWith('##'));
                  
                  if (!branchLine) {
                    gitResolve({ hasGit: false });
                    return;
                  }
                  
                  // Extract branch name and tracking info
                  const branchMatch = branchLine.match(/^##\s+([^.\s]+)/);
                  const trackingMatch = branchLine.match(/\[([^\]]+)\]/);
                  
                  const branchName = branchMatch ? branchMatch[1] : 'unknown';
                  const tracking = trackingMatch ? trackingMatch[1] : null;
                  
                  // Get remote URL for repo info
                  const gitRemote = spawn('git', ['-C', workingDir, 'remote', 'get-url', 'origin'], {
                    stdio: ['ignore', 'pipe', 'ignore']
                  });
                  
                  let remoteOutput = '';
                  gitRemote.stdout.on('data', (data) => {
                    remoteOutput += data.toString();
                  });
                  
                  gitRemote.on('close', (remoteCode) => {
                    let repoOwner = '';
                    let repoName = '';
                    
                    if (remoteCode === 0 && remoteOutput.trim()) {
                      const remoteUrl = remoteOutput.trim();
                      // Parse GitHub URLs (both SSH and HTTPS)
                      const githubMatch = remoteUrl.match(/github\.com[:/]([^/]+)\/([^/]+?)(?:\.git)?$/);
                      if (githubMatch) {
                        repoOwner = githubMatch[1];
                        repoName = githubMatch[2];
                      }
                    }
                    
                    gitResolve({
                      hasGit: true,
                      branchName,
                      tracking,
                      repoOwner,
                      repoName,
                      remoteUrl: remoteOutput.trim()
                    });
                  });
                });
              });
            };
            
            // Get Claude model information from session files
            const getClaudeModel = (workingDir) => {
              return new Promise((modelResolve) => {
                if (workingDir === 'Unknown' || workingDir === 'Permission denied') {
                  modelResolve({ model: null });
                  return;
                }
                
                // Convert working directory to Claude project directory format
                const claudeProjectDir = workingDir.replace(/\//g, '-');
                
                // Look for the Claude project directory
                const fs = require('fs');
                const path = require('path');
                const os = require('os');
                
                const claudeProjectsPath = path.join(os.homedir(), '.claude', 'projects', claudeProjectDir);
                
                fs.readdir(claudeProjectsPath, (err, files) => {
                  if (err) {
                    modelResolve({ model: null });
                    return;
                  }
                  
                  // Filter for .jsonl session files and sort by modification time
                  const sessionFiles = files.filter(f => f.endsWith('.jsonl'));
                  
                  if (sessionFiles.length === 0) {
                    modelResolve({ model: null });
                    return;
                  }
                  
                  // Get the most recently modified session file
                  let mostRecent = null;
                  let mostRecentTime = 0;
                  
                  const checkFiles = sessionFiles.map(file => {
                    return new Promise((resolve) => {
                      const filePath = path.join(claudeProjectsPath, file);
                      fs.stat(filePath, (err, stats) => {
                        if (err) {
                          resolve(null);
                          return;
                        }
                        
                        if (stats.mtime.getTime() > mostRecentTime) {
                          mostRecentTime = stats.mtime.getTime();
                          mostRecent = filePath;
                        }
                        resolve(null);
                      });
                    });
                  });
                  
                  Promise.all(checkFiles).then(() => {
                    if (!mostRecent) {
                      modelResolve({ model: null });
                      return;
                    }
                    
                    // Read the most recent session file and extract model info
                    fs.readFile(mostRecent, 'utf8', (err, data) => {
                      if (err) {
                        modelResolve({ model: null });
                        return;
                      }
                      
                      try {
                        const lines = data.trim().split('\n');
                        let model = null;
                        let messageCount = 0;
                        let assistantCount = 0;
                        let userCount = 0;
                        let totalTokens = 0;
                        
                        // Parse all lines to gather stats and find most recent model
                        for (let i = 0; i < lines.length; i++) {
                          const line = lines[i];
                          if (!line.trim()) continue;
                          
                          try {
                            const json = JSON.parse(line);
                            
                            if (json.type === 'assistant' && json.message) {
                              // Always update model to get the most recent one
                              if (json.message.model) {
                                model = json.message.model;
                              }
                              assistantCount++;
                              if (json.message.usage && json.message.usage.output_tokens) {
                                totalTokens += json.message.usage.output_tokens;
                              }
                            } else if (json.type === 'user') {
                              userCount++;
                            }
                            
                            if (json.type === 'assistant' || json.type === 'user') {
                              messageCount++;
                            }
                          } catch (parseErr) {
                            // Skip invalid JSON lines
                          }
                        }
                        
                        // Parse model name for display
                        let modelName = model;
                        let modelAlias = 'Unknown';
                        
                        if (model) {
                          if (model.includes('opus')) {
                            modelAlias = 'Opus';
                          } else if (model.includes('sonnet')) {
                            modelAlias = 'Sonnet';
                          } else if (model.includes('haiku')) {
                            modelAlias = 'Haiku';
                          }
                          
                          // Extract version if available
                          const versionMatch = model.match(/(\d{4}\d{2}\d{2})/);
                          if (versionMatch) {
                            const dateStr = versionMatch[1];
                            const year = dateStr.substring(0, 4);
                            const month = dateStr.substring(4, 6);
                            const day = dateStr.substring(6, 8);
                            modelAlias += ` (${year}-${month}-${day})`;
                          }
                        }
                        
                        modelResolve({
                          model: modelName,
                          modelAlias: modelAlias,
                          hasModel: !!model,
                          sessionStats: {
                            messageCount,
                            assistantCount,
                            userCount,
                            totalTokens,
                            conversationLength: Math.floor(messageCount / 2) // Rough estimate of back-and-forth exchanges
                          }
                        });
                        
                      } catch (parseErr) {
                        modelResolve({ model: null });
                      }
                    });
                  });
                });
              });
            };
            
            Promise.all([getGitInfo(workingDir), getClaudeModel(workingDir)]).then(([gitInfo, modelInfo]) => {
              // Determine if process is headless
              let isHeadless = false;
            
            // Check TTY: ?? means no controlling terminal (headless)
            if (tty === '??') {
              isHeadless = true;
            }
            
            // Check for headless flags in arguments
            if (args.includes('--headless') || args.includes('--no-window') || args.includes('--background') || args.includes('--print')) {
              isHeadless = true;
            }
            
            // Determine activity level
            let activityState = 'idle';
            let activityIndicator = '💤'; // sleeping/idle
            
            if (state.includes('R') || state.includes('D')) {
              // Running or uninterruptible sleep (actively working)
              activityState = 'working';
              activityIndicator = '⚡';
            } else if (cpuPercent > 1.0) {
              // High CPU usage indicates activity
              activityState = 'working';
              activityIndicator = '⚡';
            } else if (cpuPercent > 0.1) {
              // Low but non-zero CPU usage
              activityState = 'thinking';
              activityIndicator = '🤔';
            } else if (state.includes('S+')) {
              // Sleeping but ready for input (interactive)
              activityState = 'waiting';
              activityIndicator = '⏳';
            }
            
            // Parse elapsed time and start time from the end of the original line
            // Format: PID PPID TTY STAT %CPU ARGS... ELAPSED STARTED
            // Example: "45064 43438 ttys033 R+ 41.4 claude 01:48:07 Tue Jul 22 23:57:48 2025"
            const lineEndParts = processLine.trim().split(/\s+/);
            const elapsedTime = lineEndParts[lineEndParts.length - 6] || 'Unknown';
            const startTimeStr = lineEndParts.slice(-5).join(' ') || 'Unknown';
            
            // Parse start time to get timestamp for duration calculation
            let startTimestamp = null;
            if (startTimeStr !== 'Unknown' && startTimeStr.length > 10) {
              try {
                // Parse format like "Tue Jul 22 23:57:48 2025"
                const startDate = new Date(startTimeStr);
                if (!isNaN(startDate.getTime())) {
                  startTimestamp = startDate.getTime();
                }
              } catch (e) {
                console.log('Failed to parse start time:', startTimeStr, e);
              }
            }
            
              resolve({
                pid: parseInt(pid),
                ppid: parseInt(ppid),
                tty: tty,
                state: state,
                cpuPercent: cpuPercent,
                args: args,
                workingDirectory: workingDir,
                elapsedTime,
                startTime: startTimeStr,
                startTimestamp,
                isHeadless,
                activityState,
                activityIndicator,
                gitInfo,
                modelInfo
              });
            });
          });
          
          lsof.on('error', () => {
            // Fallback when lsof fails
            const lineEndParts = processLine.trim().split(/\s+/);
            const elapsedTime = lineEndParts[lineEndParts.length - 6] || 'Unknown';
            const startTimeStr = lineEndParts.slice(-5).join(' ') || 'Unknown';
            
            // Parse start time for fallback case
            let startTimestamp = null;
            if (startTimeStr !== 'Unknown' && startTimeStr.length > 10) {
              try {
                const startDate = new Date(startTimeStr);
                if (!isNaN(startDate.getTime())) {
                  startTimestamp = startDate.getTime();
                }
              } catch (e) {
                console.log('Failed to parse start time in fallback:', startTimeStr, e);
              }
            }
            
            let isHeadless = false;
            if (tty === '??') {
              isHeadless = true;
            }
            if (args.includes('--headless') || args.includes('--no-window') || args.includes('--background') || args.includes('--print')) {
              isHeadless = true;
            }
            
            // Determine activity level (fallback logic)
            let activityState = 'idle';
            let activityIndicator = '💤';
            
            if (state.includes('R') || state.includes('D')) {
              activityState = 'working';
              activityIndicator = '⚡';
            } else if (cpuPercent > 1.0) {
              activityState = 'working';
              activityIndicator = '⚡';
            } else if (cpuPercent > 0.1) {
              activityState = 'thinking';
              activityIndicator = '🤔';
            } else if (state.includes('S+')) {
              activityState = 'waiting';
              activityIndicator = '⏳';
            }
            
            resolve({
              pid: parseInt(pid),
              ppid: parseInt(ppid),
              tty: tty,
              state: state,
              cpuPercent: cpuPercent,
              args: args,
              workingDirectory: 'Permission denied',
              elapsedTime,
              startTime: startTimeStr,
              startTimestamp,
              isHeadless,
              activityState,
              activityIndicator,
              gitInfo: { hasGit: false },
              modelInfo: { model: null }
            });
          });
        });
      })).then(instances => {
        resolve(instances.filter(Boolean));
      }).catch(reject);
    });
    
    ps.on('error', reject);
  });
});

// IPC handler to activate window for a process
ipcMain.handle('activate-window', async (event, pid, tty, workingDirectory) => {
  return new Promise((resolve, reject) => {
    // Handle headless processes by spawning new iTerm2 window
    if (!tty || tty === '??') {
      const spawnScript = `
        tell application "iTerm2"
          activate
          create window with default profile
          tell current session of current window
            write text "cd '${workingDirectory || '~'}'"
            write text "echo 'Spawned iTerm2 window for headless Claude process (PID: ${pid})'"
          end tell
        end tell
      `;
      
      const osascript = spawn('osascript', ['-e', spawnScript]);
      
      osascript.on('close', (code) => {
        if (code === 0) {
          resolve({ success: true, terminal: 'iTerm2', spawned: true, pid: pid });
        } else {
          reject(new Error('Failed to spawn new iTerm2 window'));
        }
      });
      
      osascript.on('error', (error) => {
        reject(new Error(`AppleScript error: ${error.message}`));
      });
      
      return;
    }
    
    // Strategy: Prefer iTerm2, fallback to Terminal
    const checkTerminals = spawn('sh', ['-c', `
      # Always prefer iTerm2 if it's running
      if pgrep -f "iTerm" > /dev/null; then
        echo "iTerm2"
        exit 0
      fi
      
      # Fallback to Terminal if iTerm2 isn't running
      if pgrep -f "Terminal" > /dev/null; then
        echo "Terminal"
        exit 0
      fi
      
      # Default to iTerm2 even if not detected
      echo "iTerm2"
    `]);
    
    let terminalApp = '';
    
    checkTerminals.stdout.on('data', (data) => {
      terminalApp = data.toString().trim();
    });
    
    checkTerminals.on('close', (code) => {
      if (!terminalApp) {
        terminalApp = 'iTerm2'; // Default to iTerm2
      }
      
      // Activate the terminal application
      let activateScript;
      
      if (terminalApp === 'iTerm2') {
        // For iTerm2, try to find the correct window and make it visible
        activateScript = `
          tell application "iTerm2"
            activate
            set foundSession to false
            set targetTTY to "/dev/${tty}"
            
            -- Search through all windows and tabs
            repeat with theWindow in windows
              repeat with theTab in tabs of theWindow
                repeat with theSession in sessions of theTab
                  try
                    if tty of theSession is targetTTY then
                      -- Found the matching session, bring its window to front
                      set index of theWindow to 1
                      select theTab
                      set foundSession to true
                      exit repeat
                    end if
                  end try
                end repeat
                if foundSession then exit repeat
              end repeat  
              if foundSession then exit repeat
            end repeat
            
            -- Fallback: just make sure iTerm2 is visible
            if not foundSession then
              tell application "System Events"
                tell process "iTerm2"
                  set frontmost to true
                  if (count of windows) > 0 then
                    perform action "AXRaise" of first window
                  end if
                end tell
              end tell
            end if
          end tell
        `;
      } else {
        // For Terminal, simpler activation
        activateScript = `
          tell application "Terminal"
            activate
            -- Try to bring the window with this TTY to front
            repeat with theWindow in windows
              try
                if name of theWindow contains "${tty}" then
                  set index of theWindow to 1
                  exit repeat
                end if
              end try
            end repeat
          end tell
        `;
      }
      
      const osascript = spawn('osascript', ['-e', activateScript]);
      let scriptOutput = '';
      let scriptError = '';
      
      osascript.stdout.on('data', (data) => {
        scriptOutput += data.toString();
      });
      
      osascript.stderr.on('data', (data) => {
        scriptError += data.toString();
      });
      
      osascript.on('close', (code) => {
        if (code === 0) {
          resolve({ 
            success: true, 
            terminal: terminalApp, 
            tty: tty,
            output: scriptOutput.trim(),
            targetTTY: `/dev/${tty}`
          });
        } else {
          console.log(`AppleScript failed (code ${code}):`, scriptError);
          // Fallback: just activate the terminal app
          const fallbackScript = `
            tell application "${terminalApp}"
              activate
              if (count of windows) > 0 then
                set index of first window to 1
              end if
            end tell
          `;
          const fallback = spawn('osascript', ['-e', fallbackScript]);
          
          fallback.on('close', (fallbackCode) => {
            resolve({ 
              success: fallbackCode === 0, 
              terminal: terminalApp, 
              tty: tty,
              fallback: true,
              error: scriptError.trim()
            });
          });
          
          fallback.on('error', () => {
            reject(new Error(`Failed to activate ${terminalApp}: ${scriptError}`));
          });
        }
      });
      
      osascript.on('error', (error) => {
        reject(new Error(`AppleScript error: ${error.message}`));
      });
    });
    
    checkTerminals.on('error', (error) => {
      reject(new Error(`Failed to detect terminal: ${error.message}`));
    });
  });
});

// IPC handler to toggle window size
ipcMain.handle('toggle-window-size', async (event, minimize) => {
  if (!mainWindow) return { success: false, error: 'No window available' };
  
  try {
    isMinimizedMode = minimize;
    
    if (minimize) {
      mainWindow.setSize(MINIMIZED_SIZE.width, MINIMIZED_SIZE.minHeight);
      mainWindow.setResizable(false);
      mainWindow.setMinimumSize(MINIMIZED_SIZE.width, MINIMIZED_SIZE.minHeight);
      mainWindow.setMaximumSize(MINIMIZED_SIZE.width, 600); // Allow vertical growth
    } else {
      mainWindow.setSize(EXPANDED_SIZE.width, EXPANDED_SIZE.height);
      mainWindow.setResizable(true);
      mainWindow.setMinimumSize(400, 200);
      // Remove size constraints by setting very large maximum size
      mainWindow.setMaximumSize(2000, 1200);
    }
    
    return { success: true, minimized: minimize };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// IPC handler to update window height based on content
ipcMain.handle('update-window-height', async (event, instanceCount) => {
  if (!mainWindow || !isMinimizedMode) return { success: false };
  
  try {
    const tileHeight = 80; // Height per tile
    const padding = 20; // Top and bottom padding
    const newHeight = Math.max(MINIMIZED_SIZE.minHeight, (instanceCount * tileHeight) + padding);
    
    mainWindow.setSize(MINIMIZED_SIZE.width, newHeight);
    return { success: true, height: newHeight };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// IPC handler to get detailed instance information
ipcMain.handle('get-instance-details', async (event, pid, workingDirectory) => {
  try {
    const details = {
      mcpTools: []
    };
    
    // Try to find MCP configuration file
    const fs = require('fs');
    const path = require('path');
    
    // Look for Claude configuration
    const possibleConfigPaths = [
      path.join(workingDirectory, '.claude', 'claude_desktop_config.json'),
      path.join(workingDirectory, 'claude_desktop_config.json'),
      path.join(require('os').homedir(), '.claude', 'claude_desktop_config.json')
    ];
    
    for (const configPath of possibleConfigPaths) {
      try {
        if (fs.existsSync(configPath)) {
          const configContent = fs.readFileSync(configPath, 'utf8');
          const config = JSON.parse(configContent);
          
          // Extract MCP tools from config
          if (config.mcpServers) {
            for (const [serverName, serverConfig] of Object.entries(config.mcpServers)) {
              details.mcpTools.push({
                name: serverName,
                type: serverConfig.command ? 'Local Server' : 'Remote Server',
                command: serverConfig.command,
                args: serverConfig.args
              });
            }
          }
          
          break; // Found config, stop searching
        }
      } catch (error) {
        console.error(`Error reading config from ${configPath}:`, error);
      }
    }
    
    // Get additional process info
    const psInfo = spawn('ps', ['-p', pid.toString(), '-o', 'rss,vsz,comm']);
    let psOutput = '';
    
    psInfo.stdout.on('data', (data) => {
      psOutput += data.toString();
    });
    
    await new Promise((resolve) => {
      psInfo.on('close', () => {
        const lines = psOutput.split('\n');
        if (lines.length > 1) {
          const parts = lines[1].trim().split(/\s+/);
          if (parts.length >= 3) {
            details.memoryInfo = {
              rss: parseInt(parts[0]) * 1024, // Convert KB to bytes
              vsz: parseInt(parts[1]) * 1024
            };
          }
        }
        resolve();
      });
    });
    
    return details;
  } catch (error) {
    console.error('Error getting instance details:', error);
    return { mcpTools: [] };
  }
});