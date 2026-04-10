const { app, BrowserWindow } = require('electron');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

let flaskProcess = null;
let mainWindow = null;

function startFlask() {
    const isDev = !app.isPackaged;
    let flaskPath;

    if (isDev) {
        // Đường dẫn đến file app.exe vừa build
        flaskPath = path.join(__dirname, '..', 'dist', 'app.exe');
        
        // Kiểm tra file tồn tại
        if (!fs.existsSync(flaskPath)) {
            console.error(`Không tìm thấy backend tại: ${flaskPath}`);
            console.log(' Hãy chạy: python -m PyInstaller --onefile --add-data "templates;templates" --add-data "static;static" app.py');
            return;
        }
        
        console.log(` Đang khởi động backend từ: ${flaskPath}`);
        flaskProcess = spawn(flaskPath, [], { 
            stdio: 'pipe',
            windowsHide: true  // Ẩn cửa sổ console
        });
    } else {
        // Production: file backend nằm trong resources
        flaskPath = path.join(process.resourcesPath, 'flask_backend.exe');
        
        if (!fs.existsSync(flaskPath)) {
            console.error(` Không tìm thấy backend tại: ${flaskPath}`);
            return;
        }
        
        console.log(` Đang khởi động backend từ: ${flaskPath}`);
        flaskProcess = spawn(flaskPath, [], { 
            cwd: process.resourcesPath,
            stdio: 'pipe',
            windowsHide: true
        });
    }

    flaskProcess.stdout.on('data', (data) => {
        console.log(` Backend: ${data}`);
        // Khi backend sẵn sàng, load trang ngay
        if (data.toString().includes('Running on')) {
            console.log(' Backend đã sẵn sàng!');
            if (mainWindow) {
                console.log(' Loading http://localhost:5000');
                mainWindow.loadURL('http://localhost:5000');
            }
        }
    });
    
    // Fallback: load URL sau 5 giây nếu backend chưa load
    setTimeout(() => {
        if (mainWindow && !mainWindow.webContents.getURL()) {
            console.log(' Timeout - Loading URL by force');
            mainWindow.loadURL('http://localhost:5000');
        }
    }, 5000);
    
    flaskProcess.stderr.on('data', (data) => {
        console.error(` Lỗi backend: ${data}`);
    });
    
    flaskProcess.on('close', (code) => {
        console.log(`Backend thoát với mã: ${code}`);
    });
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
    
    // Mở DevTools để debug (comment này để close)
    // mainWindow.webContents.openDevTools();
}

app.whenReady().then(() => {
    console.log(' Electron sẵn sàng, khởi động backend...');
    startFlask();
    createWindow();
});

app.on('window-all-closed', () => {
    console.log(' Đóng ứng dụng...');
    if (flaskProcess) {
        flaskProcess.kill();
    }
    if (process.platform !== 'darwin') app.quit();
});