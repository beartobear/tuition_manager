import sqlite3
import os
import sys
from pathlib import Path

def get_data_dir():
    """Trả về đường dẫn thư mục chứa dữ liệu (có quyền ghi)"""
    if getattr(sys, 'frozen', False):
        # Đang chạy dưới dạng file đóng gói (PyInstaller)
        if sys.platform == 'darwin':
            # macOS: dùng Application Support
            data_dir = Path.home() / 'Library' / 'Application Support' / 'QuanLyHocPhi'
        elif sys.platform == 'win32':
            # Windows: dùng thư mục AppData
            data_dir = Path(os.getenv('APPDATA')) / 'QuanLyHocPhi'
        else:
            data_dir = Path(sys.executable).parent / 'data'
    else:
        # Đang chạy từ script (development)
        data_dir = Path.cwd()
    data_dir.mkdir(parents=True, exist_ok=True)
    return data_dir

DB_PATH = get_data_dir() / 'tuition_manager.db'

def init_db():
    conn = sqlite3.connect(str(DB_PATH))
    c = conn.cursor()
    c.execute('''CREATE TABLE IF NOT EXISTS lop (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        ten_lop TEXT NOT NULL,
        khoa_hoc TEXT,
        hoc_phi_mac_dinh REAL DEFAULT 0,
        so_thang INTEGER DEFAULT 0,
        create_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )''')
    c.execute('''CREATE TABLE IF NOT EXISTS sinh_vien (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        ma_sv TEXT UNIQUE NOT NULL,
        ho_ten TEXT NOT NULL,
        lop_id INTEGER,
        ngay_nhap_hoc DATE,
        create_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (lop_id) REFERENCES lop (id) ON DELETE CASCADE
    )''')
    c.execute('''CREATE TABLE IF NOT EXISTS hoc_phi (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        sinh_vien_id INTEGER,
        thang INTEGER,
        nam INTEGER,
        so_tien INTEGER DEFAULT 0,
        da_dong INTEGER DEFAULT 0,
        ngay_dong DATE,
        ghi_chu TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(sinh_vien_id) REFERENCES sinh_vien(id) ON DELETE CASCADE,
        UNIQUE(sinh_vien_id, thang, nam)
    )''')
    # Tạo indexes để tối ưu queries
    c.execute('''CREATE INDEX IF NOT EXISTS idx_lop_ten_lop ON lop (ten_lop)''')
    c.execute('''CREATE INDEX IF NOT EXISTS idx_sinh_vien_lop_id ON sinh_vien (lop_id)''')
    c.execute('''CREATE INDEX IF NOT EXISTS idx_sinh_vien_ma_sv ON sinh_vien (ma_sv)''')
    c.execute('''CREATE INDEX IF NOT EXISTS idx_hoc_phi_sinh_vien_id ON hoc_phi (sinh_vien_id)''')
    c.execute('''CREATE INDEX IF NOT EXISTS idx_hoc_phi_thang_nam ON hoc_phi (thang, nam)''')
    c.execute('''CREATE INDEX IF NOT EXISTS idx_hoc_phi_da_dong ON hoc_phi (da_dong)''')
    conn.commit()
    conn.close()

def get_db_connection():
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    return conn

# Khởi tạo database nếu chưa có
if not DB_PATH.exists():
    init_db()
else:
    # Nếu DB đã tồn tại, kiểm tra và thêm cột so_thang nếu chưa có
    conn = sqlite3.connect(str(DB_PATH))
    c = conn.cursor()
    c.execute("PRAGMA table_info(lop)")
    columns = [col[1] for col in c.fetchall()]
    if 'so_thang' not in columns:
        c.execute("ALTER TABLE lop ADD COLUMN so_thang INTEGER DEFAULT 0")
        conn.commit()
    conn.close()