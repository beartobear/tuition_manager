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
        
        // Thêm quyền thực thi cho macOS/Linux
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
        const spawnOptions = {
            stdio: ['ignore', 'pipe', 'pipe']
        };
        
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
                showErrorPage(code);
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

function showErrorPage(code) {
    if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.loadURL(`data:text/html;charset=utf-8,<html>
<head>
    <meta charset="UTF-8">
    <title>Lỗi khởi động</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        body {
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
            font-family: 'Segoe UI', 'Arial', 'Noto Sans', sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            margin: 0;
        }
        .error-container {
            text-align: center;
            background: rgba(255,255,255,0.1);
            padding: 40px;
            border-radius: 20px;
            backdrop-filter: blur(10px);
            max-width: 500px;
            margin: 20px;
        }
        h1 {
            font-size: 48px;
            margin-bottom: 20px;
        }
        p {
            font-size: 18px;
            margin-bottom: 30px;
            line-height: 1.6;
        }
        button {
            background: white;
            color: #764ba2;
            border: none;
            padding: 12px 30px;
            font-size: 16px;
            font-weight: bold;
            border-radius: 30px;
            cursor: pointer;
            transition: transform 0.2s, box-shadow 0.2s;
        }
        button:hover {
            transform: scale(1.05);
            box-shadow: 0 10px 20px rgba(0,0,0,0.2);
        }
        .error-code {
            font-size: 14px;
            opacity: 0.7;
            margin-top: 20px;
        }
    </style>
</head>
<body>
    <div class="error-container">
        <h1>⚠️ Lỗi kết nối</h1>
        <p>Không thể kết nối đến backend server.<br>Vui lòng thử lại hoặc liên hệ hỗ trợ.</p>
        <button onclick="location.reload()">Thử lại</button>
        <div class="error-code">Mã lỗi: ${code}</div>
    </div>
</body>
</html>`);
    }
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
    
    // Loading screen với font chữ đúng
    mainWindow.loadURL(`data:text/html;charset=utf-8,<html>
<head>
    <meta charset="UTF-8">
    <title>Đang khởi động</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        body {
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
            font-family: 'Segoe UI', 'Arial', 'Noto Sans', sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            margin: 0;
        }
        .loading-container {
            text-align: center;
        }
        .spinner {
            width: 50px;
            height: 50px;
            border: 4px solid rgba(255,255,255,0.3);
            border-top: 4px solid white;
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin: 0 auto 20px auto;
        }
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
        h2 {
            font-size: 24px;
            margin-bottom: 10px;
            font-weight: normal;
        }
        p {
            font-size: 14px;
            opacity: 0.8;
        }
        .status {
            margin-top: 20px;
            font-size: 12px;
            opacity: 0.6;
        }
    </style>
</head>
<body>
    <div class="loading-container">
        <div class="spinner"></div>
        <h2>Đang khởi động ứng dụng...</h2>
        <p>Vui lòng chờ trong giây lát</p>
        <div class="status">Đang khởi động backend server...</div>
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
