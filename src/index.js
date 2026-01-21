const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const { PythonShell } = require('python-shell');
const path = require('node:path');
const fs = require('fs');

// Stores if there is currently an audio file being processed.
let isProcessing = false;

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) {
  app.quit();
}

const createWindow = () => {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, './frontend/preload.js'),
    },
  });

  // and load the index.html of the app.
  mainWindow.loadFile(path.join(__dirname, 'index.html'));

  // Open the DevTools.
  mainWindow.webContents.openDevTools();
};

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  ipcMain.handle('dialog:openFile', handleFileOpen);
  ipcMain.handle('data:saveSession', handleSaveSession);
  ipcMain.handle('data:saveSettings', handleSaveSettings);
  ipcMain.handle('data:loadSessions', handleLoadSessions);
  ipcMain.handle('data:deleteSession', handleDeleteSession);
  ipcMain.handle('ai:processAudio', handleProcessAudio);

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

  console.log('[AURA] Saving to: ', filePath);

  let sessions = [];
  if (fs.existsSync(filePath)) {
    try {
      const fileContent = fs.readFileSync(filePath, 'utf-8');
      sessions = JSON.parse(fileContent);
    } catch (e) {
      console.error('Error reading JSON.');
    }
  }

  sessions.push(data);
  fs.writeFileSync(filePath, JSON.stringify(sessions, null, 2));
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
        
        if (Array.isArray(json) && json.length > 0) {
          sessionList.push(json[json.length - 1]);
        }
      } catch (err) {
        console.error('Failed to parse session: ', file);
      }
    }
  }

  sessionList.sort((a, b) => {
    const timeA = a.lastUsed || 0;
    const timeB = b.lastUsed || 0;
    return timeB - timeA;
  });

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

const handleProcessAudio = async (event, { filePath, sessionId }) => {
  if (isProcessing) {
    return { status: 'busy', message: 'Another file is currently being processed.' };
  }

  isProcessing = true;
  const userDataPath = app.getPath('userData');
  const sessionFilePath = path.join(userDataPath, 'Sessions', `${sessionId}.json`);

  let options = {
    mode: 'text',
    pythonPath: 'python',
    scriptPath: path.join(__dirname, 'backend'),
    args: [filePath]
  };

  console.log(`[Aura] Starting Python script for session ${sessionId}...`);

  return new Promise((resolve) => {
    PythonShell.run('bridge.py', options).then(messages => {
      let result = [];
      try {
        const lastMessage = messages[messages.length - 1];
        result = JSON.parse(lastMessage);
      } catch (e) {
        console.error("Failed to parse Python output:", messages);
        resolve({ status: 'error', message: 'Failed to parse AI output.' });
        return;
      }

      if (result.error) {
        resolve({ status: 'error', message: result.error });
        return;
      }

      if (fs.existsSync(sessionFilePath)) {
        try {
          const fileContent = fs.readFileSync(sessionFilePath, 'utf-8');
          let sessionData = JSON.parse(fileContent);
          
          let sessionToUpdate = Array.isArray(sessionData) 
            ? sessionData.find(s => s.id === sessionId) 
            : sessionData;

          if (sessionToUpdate) {
            sessionToUpdate.ideas = result;
            sessionToUpdate.status = 'completed';
            sessionToUpdate.filePath = filePath;

            fs.writeFileSync(sessionFilePath, JSON.stringify(sessionData, null, 2));
          }
        } catch (err) {
          console.error("Error updating session file:", err);
        }
      }

      console.log("[Aura] Processing complete.");
      resolve({ status: 'success', ideas: result });

    }).catch(err => {
      console.error("[Aura] Python Error:", err);
      isProcessing = false;
      resolve({ status: 'error', message: err.message });
    });
  });
};