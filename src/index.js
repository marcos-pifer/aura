const { app, BrowserWindow, ipcMain, dialog, shell, session } = require('electron');
const { spawn } = require('child_process');
const path = require('node:path');
const fs = require('fs-extra');
const axios = require('axios');

let isProcessing = false;
let backendProcess = null;
let healthCheckInterval = null;

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) {
  app.quit();
}

const createWindow = () => {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 1080,
    height: 720,
    webPreferences: {
      preload: path.join(__dirname, './frontend/preload.js'),
    },
  });

  // and load the index.html of the app.
  mainWindow.loadFile(path.join(__dirname, 'index.html'));

  mainWindow.webContents.once('did-finish-load', () => {
    startBackend(mainWindow);
  });
};

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  ipcMain.handle('dialog:openFile', handleFileOpen);
  ipcMain.handle('data:saveSession', handleSaveSession);
  ipcMain.handle('data:saveSettings', handleSaveSettings);
  ipcMain.handle('data:getSettings', handleGetSettings); 
  ipcMain.handle('data:loadSessions', handleLoadSessions);
  ipcMain.handle('data:deleteSession', handleDeleteSession);
  ipcMain.handle('ai:processAudio', handleProcessAudio);
  ipcMain.handle('system:openExternal', async (event, url) => await shell.openExternal(url));
  ipcMain.handle('app:getVersion', () => app.getVersion());
  ipcMain.handle('ai:testConnection', handleTestConnection);
  ipcMain.handle('ai:chat', handleChatRequest);
  ipcMain.handle('ai:generate', handleGenerateRequest);

  createWindow();

  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and import them here.

const SHARED_HOST_PATH = path.join(__dirname, '..', 'shared_data'); 
fs.ensureDirSync(SHARED_HOST_PATH);

const DOCKER_API_URL = 'http://127.0.0.1:8000';

const handleFileOpen = async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog({
    properties: ['openFile'],
    filters: [ { name: 'Audio', extensions: ['mp3'] } ]
  });

  if (canceled) return "";
  return filePaths[0];
}

const handleSaveSession = async (event, data) => {
  const userDataPath = path.join(app.getPath('userData'), 'Sessions')
  if (!fs.existsSync(userDataPath)) {
    fs.mkdirSync(userDataPath);
  }

  const filePath = path.join(userDataPath, `${data.id}.json`);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
  return true;
}

const handleSaveSettings = async (event, settings) => {
  const userDataPath = app.getPath('userData');
  const filePath = path.join(userDataPath, 'settings.json');
  
  fs.writeFileSync(filePath, JSON.stringify(settings, null, 2));
  console.log('Settings saved to: ', filePath);
  return true;
}

const handleLoadSessions = async () => {
  const userDataPath = path.join(app.getPath('userData'), 'Sessions');

  if (!fs.existsSync(userDataPath)) return [];

  const files = fs.readdirSync(userDataPath);
  const sessionList = [];

  for (const file of files) {
    if (file.endsWith('.json')) {
      try {
        const content = fs.readFileSync(path.join(userDataPath, file), 'utf-8');
        const json = JSON.parse(content);
        
        if (Array.isArray(json)) {
          if (json.length > 0) sessionList.push(json[json.length - 1]); // Take latest
        } else {
          sessionList.push(json);
        }
      } catch (err) {
        console.error('Failed to parse session: ', file);
      }
    }
  }

  sessionList.sort((a, b) => (b.lastUsed || 0) - (a.lastUsed || 0));
  return sessionList;
};

const handleDeleteSession = async (event, sessionId) => {
  const userDataPath = path.join(app.getPath('userData'), 'Sessions');
  const filePath = path.join(userDataPath, `${sessionId}.json`);

  console.log('[AURA] Deleting: ', filePath);

  if (fs.existsSync(filePath)) {
    try {
      fs.unlinkSync(filePath);
      return true;
    } catch (e) {
      console.error('Failed to delete file:', e);
      return false;
    }
  }

  return false;
};

const getSettings = () => {
  const userDataPath = app.getPath('userData');
  const filePath = path.join(userDataPath, 'settings.json');
  if (fs.existsSync(filePath)) {
    try {
      return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    } catch (e) {
      console.error("Error reading settings", e);
    }
  }

  return {};
};

const handleGetSettings = async () => {
  return getSettings(); 
};

const handleProcessAudio = async (event, { filePath, sessionId }) => {
  if (isProcessing) return { status: 'busy', message: 'System busy.' };
  
  isProcessing = true;
  const settings = getSettings();

  try {
    const fileName = path.basename(filePath);
    const destPath = path.join(SHARED_HOST_PATH, fileName);
    await fs.copy(filePath, destPath);

    const response = await axios({
      method: 'post',
      url: `${DOCKER_API_URL}/analyze`,
      data: {
        filename: fileName,
        session_id: sessionId.toString(),
        config: {
          api_key: settings.key,
          api_url: settings.url,
          temperature: settings.temperature,
          max_tokens: settings.maxTokens
        }
      },
      responseType: 'stream'
    });

    const stream = response.data;
    const userDataPath = path.join(app.getPath('userData'), 'Sessions');
    const sessionFilePath = path.join(userDataPath, `${sessionId}.json`);

    const updateDisk = (updateFn) => {
        if (!fs.existsSync(sessionFilePath)) return;
        try {
            const content = fs.readFileSync(sessionFilePath, 'utf-8');
            let sessionData = JSON.parse(content);
            let s = Array.isArray(sessionData) ? sessionData[sessionData.length - 1] : sessionData;
            
            if (s) {
                updateFn(s);
                fs.writeFileSync(sessionFilePath, JSON.stringify(s, null, 2));
            }
        } catch(e) { console.error("Disk save error", e); }
    };

    let buffer = '';

    stream.on('data', (chunk) => {
        buffer += chunk.toString();
        const lines = buffer.split('\n');
        
        buffer = lines.pop();

        for (const line of lines) {
            if (!line.trim()) continue;
            try {
                const eventData = JSON.parse(line);
                event.sender.send('analysis-event', eventData);

                if (eventData.type === 'idea') {
                    updateDisk((s) => {
                        if (!s.ideas) s.ideas = [];
                        // Check if idea exists to prevent dupes (though stream should be seq)
                        const exists = s.ideas.find(i => i.id === eventData.data.id);
                        if (!exists) s.ideas.push(eventData.data);
                    });
                } 
                else if (eventData.type === 'meta') {
                    updateDisk((s) => {
                        s.title = eventData.data.title;
                        s.summary = eventData.data.summary;
                    });
                }
            } catch (e) {
                console.error("JSON Parse error:", e);
            }
        }
    });

    stream.on('end', () => {
        isProcessing = false;
        updateDisk(s => s.status = 'completed');
        event.sender.send('analysis-event', { type: 'complete' });
    });

    return { status: 'started' }; // Handshake successful

  } catch (error) {
    console.error(error);
    isProcessing = false;
    
    let msg = "Connection error";
    if (error.response && error.response.status === 429) {
        msg = "Local model is busy. Please wait for the current file to finish.";
    } else if (error.response) {
        msg = `Server Error: ${error.response.status}`;
    }

    return { status: 'error', message: msg };
  }
};

const startBackend = (window) => {
  const isWindows = process.platform === 'win32';
  const scriptName = isWindows ? 'setup.ps1' : 'setup.sh';
  const scriptPath = path.join(__dirname, '..', scriptName);

  window.webContents.send('server-log', `Initializing backend with ${scriptName}...`);

  backendProcess = isWindows
    ? spawn('powershell.exe', ['-ExecutionPolicy', 'Bypass', '-File', scriptPath])
    : spawn('bash', [scriptPath]);

  backendProcess.stdout.on('data', (data) => {
    window.webContents.send('server-log', data.toString().trim());
  });

  backendProcess.stderr.on('data', (data) => {
    const msg = data.toString().trim();
    const isRealError = msg.toLowerCase().includes('error:') || msg.toLowerCase().includes('exception');
    const prefix = isRealError ? '[Error]' : '[System]';
    
    window.webContents.send('server-log', `${prefix}: ${msg}`);
  });

  backendProcess.on('exit', (code) => {
    if (code !== 0 && code !== null) {
      if (healthCheckInterval) clearInterval(healthCheckInterval);
      
      window.webContents.send('server-status', 'Startup Failed. Docker might be down.');
      window.webContents.send('server-log', `[System]: Setup script exited with code ${code}.`);
    }
  });

  checkServerHealth(window);
};

const checkServerHealth = (window) => {
  let attempts = 0;

  healthCheckInterval = setInterval(async () => {
    attempts++;
    try {
      const response = await axios.get(`${DOCKER_API_URL}/health`);
      
      if (response.data && response.data.status === "Aura Backend is running") {
        clearInterval(healthCheckInterval);
        window.webContents.send('server-log', "Server is healthy! Launching...");
        window.webContents.send('server-ready');
      } else {
        window.webContents.send('server-log', `[Warning]: Port 8000 is active, but response is invalid.`);
      }
      
    } catch (e) {
      if (e.message && (e.message.includes('ECONNREFUSED') || e.message.includes('socket hang up'))) {
           const timeElapsed = Math.floor(attempts); 
           window.webContents.send('server-status', `Waiting for AI Engine... (${timeElapsed}s)`);
      } else {
           window.webContents.send('server-status', `Connecting...`);
      }
    }
  }, 1000);
};

const handleTestConnection = async (event, settings) => {
  try {
    const response = await axios.post(`${DOCKER_API_URL}/test_connection`, {
      api_key: settings.key,
      api_url: settings.url,
      temperature: settings.temperature,
      max_tokens: settings.maxTokens
    }, { timeout: 10000 });
    return response.data; // { status: 'success/error', message: '...' }
  } catch (error) {
    let msg = "Could not reach AI Backend.";
    
    if (error.code) {
        msg += ` (${error.code})`;
    }

    if (error.response) {
        // The server responded with a status code outside 2xx
        console.error("Server Error:", error.response.status, error.response.data);
        msg = `Server Error: ${error.response.status}`;
    } else if (error.request) {
        // No response received
        console.error("No response from Docker container.");
        msg = "No response from Docker. Is the container running?";
    } else {
        console.error("Request Setup Error:", error.message);
    }
    
    return { status: 'error', message: msg };
  }
};

const handleChatRequest = async (event, { query, history, config }) => {
  const settings = config || getSettings(); 

  try {
    const response = await axios.post(`${DOCKER_API_URL}/chat`, {
      query: query,
      history: history || [],
      config: {
        api_key: settings.key,
        api_url: settings.url,
        temperature: settings.temperature,
        max_tokens: settings.maxTokens
      }
    }, { timeout: 60000 }); // 60s timeout

    return { status: 'success', data: response.data.response };
  } catch (error) {
    console.error("Chat Error:", error.message);
    const msg = error.response ? `Server Error: ${error.response.status}` : "AI Service Unreachable";
    return { status: 'error', message: msg };
  }
};

const handleGenerateRequest = async (event, { query, config }) => {
  const settings = config || getSettings(); 

  try {
    const response = await axios.post(`${DOCKER_API_URL}/generate`, {
      query: query,
      config: {
        api_key: settings.key,
        api_url: settings.url,
        temperature: settings.temperature,
        max_tokens: settings.maxTokens
      }
    }, { timeout: 60000 }); // 60s timeout

    return { status: 'success', data: response.data.response };
  } catch (error) {
    console.error("Generation Error:", error.message);
    const msg = error.response ? `Server Error: ${error.response.status}` : "AI Service Unreachable";
    return { status: 'error', message: msg };
  }
};

app.on('before-quit', () => {
  if (backendProcess) {
    backendProcess.kill();
  }
});