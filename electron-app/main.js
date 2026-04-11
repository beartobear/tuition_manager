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
    const backendExecutable = isWindows ? 'app.exe' : 'app';  // ✅ Quan trọng

    if (isDev) {
        // Môi trường phát triển
        backendPath = path.join(__dirname, 'backend', backendExecutable);
        
        // Nếu không có exe, thử chạy Python
        if (!fs.existsSync(backendPath)) {
            const pythonPath = path.join(__dirname, 'backend', 'app.py');
            if (fs.existsSync(pythonPath)) {
                console.log('Running Python backend...');
                flaskProcess = spawn('python', [pythonPath]);
                return flaskProcess;
            }
        }
    } else {
        // Môi trường production
        backendPath = path.join(process.resourcesPath, 'backend', backendExecutable);
        
        // Kiểm tra file tồn tại
        if (!fs.existsSync(backendPath)) {
            console.error(`Backend not found at: ${backendPath}`);
            
            dialog.showErrorBox(
                'Lỗi khởi động',
                `Không tìm thấy file backend tại:\n${backendPath}\n\nVui lòng cài đặt lại ứng dụng.`
            );
            return null;
        }
        
        // ✅ Thêm quyền thực thi cho macOS/Linux
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
        // ✅ Thêm options cho macOS
        const spawnOptions = {
            stdio: ['ignore', 'pipe', 'pipe']
        };
        
        // Trên macOS, cần chạy với shell nếu có vấn đề về permission
        if (!isWindows) {
            spawnOptions.shell = true;
        }
        
        flaskProcess = spawn(backendPath, [], spawnOptions);
        
        flaskProcess.stdout.on('data', (data) => {
            const output = data.toString();
            console.log(`Backend: ${output}`);
            
            if (output.includes('Running on') || output.includes('http://localhost')) {
                setTimeout(() => {
                    if (mainWindow && !mainWindow.isDestroyed()) {
                        mainWindow.loadURL('http://localhost:5000').catch(console.error);
                    }
                }, 1500);
            }
        });
        
        flaskProcess.stderr.on('data', (data) => {
            console.error(`Backend error: ${data}`);
        });
        
        flaskProcess.on('close', (code) => {
            console.log(`Backend closed with code: ${code}`);
            if (code !== 0 && mainWindow && !mainWindow.isDestroyed()) {
                mainWindow.loadURL(`data:text/html,<html>
                    <body style="display:flex;justify-content:center;align-items:center;height:100vh;font-family:Arial">
                        <div style="text-align:center">
                            <h1>⚠️ Lỗi kết nối Backend</h1>
                            <p>Backend không thể khởi động (mã lỗi: ${code})</p>
                            <button onclick="location.reload()">Thử lại</button>
                        </div>
                    </body>
                </html>`);
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
    
    mainWindow.loadURL(`data:text/html,<html>
        <body style="display:flex;justify-content:center;align-items:center;height:100vh;font-family:Arial">
            <div style="text-align:center">
                <h2>Đang khởi động ứng dụng...</h2>
                <p>Vui lòng chờ trong giây lát</p>
            </div>
        </body>
    </html>`);
    
    mainWindow.once('ready-to-show', () => {
        mainWindow.show();
    });
    
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

app.on('will-quit', () => {
    if (flaskProcess && !flaskProcess.killed) {
        flaskProcess.kill();
    }
});
