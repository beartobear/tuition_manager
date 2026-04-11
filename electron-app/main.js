const { app, BrowserWindow, dialog } = require('electron');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

let flaskProcess = null;
let mainWindow = null;

function startBackend() {
    const isDev = !app.isPackaged;
    let backendPath;
    const isWindows = process.platform === 'win32';
    const backendExecutable = isWindows ? 'app.exe' : 'app';

    if (isDev) {
        backendPath = path.join(__dirname, 'backend', backendExecutable);
        if (!fs.existsSync(backendPath)) {
            const pythonPath = path.join(__dirname, 'backend', 'app.py');
            if (fs.existsSync(pythonPath)) {
                console.log('Running Python backend...');
                flaskProcess = spawn('python', [pythonPath]);
                return flaskProcess;
            }
        }
    } else {
        backendPath = path.join(process.resourcesPath, 'backend', backendExecutable);
        
        if (!fs.existsSync(backendPath)) {
            console.error(`Backend not found at: ${backendPath}`);
            dialog.showErrorBox('Lỗi khởi động', `Không tìm thấy file backend tại:\n${backendPath}`);
            return null;
        }
        
        if (!isWindows) {
            try {
                fs.chmodSync(backendPath, 0o755);
            } catch (err) {
                console.error('Failed to set executable permission:', err);
            }
        }
    }

    console.log('Starting backend from:', backendPath);
    
    try {
        flaskProcess = spawn(backendPath, [], {
            stdio: ['ignore', 'pipe', 'pipe']
        });
        
        flaskProcess.stdout.on('data', (data) => {
            const output = data.toString();
            console.log(`Backend: ${output}`);
            
            // Khi backend ready, load URL ngay
            if (output.includes('Running on') || output.includes('http://')) {
                console.log('✅ Backend is ready! Loading application...');
                setTimeout(() => {
                    if (mainWindow && !mainWindow.isDestroyed()) {
                        mainWindow.loadURL('http://localhost:5000').catch(err => {
                            console.error('Load error:', err);
                            // Thử với 127.0.0.1
                            mainWindow.loadURL('http://127.0.0.1:5000').catch(console.error);
                        });
                    }
                }, 1000);
            }
        });
        
        flaskProcess.stderr.on('data', (data) => {
            console.error(`Backend error: ${data}`);
        });
        
        flaskProcess.on('close', (code) => {
            console.log(`Backend closed with code: ${code}`);
            if (code !== 0 && mainWindow && !mainWindow.isDestroyed()) {
                mainWindow.loadURL(`data:text/html;charset=utf-8,
                <html><body style="text-align:center;padding:50px">
                    <h1>⚠️ Lỗi kết nối Backend</h1>
                    <p>Backend không thể khởi động (mã lỗi: ${code})</p>
                    <button onclick="location.reload()">Thử lại</button>
                </body></html>`);
            }
        });
        
        flaskProcess.on('error', (err) => {
            console.error('Failed to start process:', err);
            dialog.showErrorBox('Lỗi', `Không thể khởi động backend:\n${err.message}`);
        });
        
    } catch (error) {
        console.error('Exception starting backend:', error);
    }
    
    return flaskProcess;
}

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
        },
        show: false
    });
    
    // Loading screen
    mainWindow.loadURL(`data:text/html;charset=utf-8,
    <html>
    <head><meta charset="UTF-8"><style>
        body{display:flex;justify-content:center;align-items:center;height:100vh;font-family:Arial;background:#667eea;color:white;margin:0}
        .spinner{width:50px;height:50px;border:4px solid rgba(255,255,255,0.3);border-top:4px solid white;border-radius:50%;animation:spin 1s linear infinite;margin:0 auto 20px}
        @keyframes spin{0%{transform:rotate(0deg)}100%{transform:rotate(360deg)}}
    </style></head>
    <body><div style="text-align:center"><div class="spinner"></div><h2>Đang khởi động ứng dụng...</h2><p>Vui lòng chờ trong giây lát</p></div></body>
    </html>`);
    
    mainWindow.once('ready-to-show', () => {
        mainWindow.show();
    });
    
    // Fallback: nếu sau 10 giây vẫn chưa load được
    setTimeout(() => {
        if (mainWindow && !mainWindow.isDestroyed() && mainWindow.webContents.getURL().includes('data:text/html')) {
            console.log('Fallback: forcing load...');
            mainWindow.loadURL('http://localhost:5000').catch(() => {
                mainWindow.loadURL('http://127.0.0.1:5000').catch(console.error);
            });
        }
    }, 10000);
    
    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}

app.whenReady().then(() => {
    createWindow();
    startBackend();
});

app.on('window-all-closed', () => {
    if (flaskProcess && !flaskProcess.killed) {
        flaskProcess.kill();
    }
    if (process.platform !== 'darwin') {
        app.quit();
    }
});
