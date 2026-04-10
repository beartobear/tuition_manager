const { app, BrowserWindow } = require('electron');
const { spawn } = require('child_process');
const path = require('path');

let flaskProcess = null;
let mainWindow = null;

function startBackend() {
    const isDev = !app.isPackaged;
    let backendPath;

    if (isDev) {
        // DEV: chạy file exe local (sau khi bạn build bằng PyInstaller)
        backendPath = path.join(__dirname, 'backend', 'app.exe');
    } else {
        // PROD: chạy file trong resources
        backendPath = path.join(
            process.resourcesPath,
            'backend',
            process.platform === 'darwin' ? 'app' : 'app.exe'
        );
    }

    console.log("Backend path:", backendPath);

    flaskProcess = spawn(backendPath);

    flaskProcess.stdout.on('data', (data) => {
        console.log(`Backend: ${data}`);

        if (data.toString().includes('Running on')) {
            if (mainWindow) {
                mainWindow.loadURL('http://localhost:5000');
            }
        }
    });

    flaskProcess.stderr.on('data', (data) => {
        console.error(`Backend error: ${data}`);
    });

    flaskProcess.on('close', (code) => {
        console.log(`Backend exited: ${code}`);
    });

    // fallback nếu backend load chậm
    setTimeout(() => {
        if (mainWindow && !mainWindow.webContents.getURL()) {
            mainWindow.loadURL('http://localhost:5000');
        }
    }, 5000);
}

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
        },
    });
}

app.whenReady().then(() => {
    startBackend();
    createWindow();
});

app.on('window-all-closed', () => {
    if (flaskProcess) flaskProcess.kill();
    if (process.platform !== 'darwin') app.quit();
});
