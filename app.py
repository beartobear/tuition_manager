from flask import Flask, render_template, request, redirect, url_for, flash, send_file, jsonify
from database import get_db_connection, init_db
import sqlite3
from datetime import datetime
import pandas as pd
import os
import json
import sys
from pathlib import Path

import os
app = Flask(__name__)
app.secret_key = os.environ.get('SECRET_KEY', 'your_secret_key_change_this_12345')

def get_exports_dir():
    if getattr(sys, 'frozen', False):
        if sys.platform == 'darwin':
            exports_dir = Path.home() / 'Library' / 'Application Support' / 'QuanLyHocPhi' / 'exports'
        elif sys.platform == 'win32':
            exports_dir = Path(os.getenv('APPDATA')) / 'QuanLyHocPhi' / 'exports'
        else:
            exports_dir = Path(sys.executable).parent / 'exports'
    else:
        exports_dir = Path.cwd() / 'exports'
    exports_dir.mkdir(parents=True, exist_ok=True)
    return exports_dir

EXPORTS_DIR = get_exports_dir()

# Khởi tạo database
init_db()

# Context processor để có hàm now() trong template
@app.context_processor
def utility_processor():
    return {'now': datetime.now}

# Filter định dạng tiền VN
@app.template_filter('format_vnd')
def format_vnd(value):
    try:
        value_float = float(value)
    except (TypeError, ValueError):
        return value

    if value_float.is_integer():
        value_int = int(value_float)
        return f"{value_int:,}".replace(',', '.')
    else:
        value_int = int(value_float)
        decimal = int(round(abs(value_float - value_int) * 100))
        return f"{value_int:,}".replace(',', '.') + ',' + f"{decimal:02d}"

# TRANG CHỦ 
@app.route('/')
def index():
    """Trang chủ"""
    return render_template('index.html')

# QUẢN LÝ LỚP 
@app.route('/lop')
def quan_ly_lop():
    """Quản lý lớp học"""
    conn = get_db_connection()
    lop_list = conn.execute('SELECT * FROM lop ORDER BY id DESC').fetchall()
    conn.close()
    return render_template('quan_ly_lop.html', lop_list=lop_list)

@app.route('/lop/them', methods=['POST'])
def them_lop():
    """Thêm lớp mới"""
    ten_lop = request.form.get('ten_lop', '').strip()
    khoa_hoc = request.form.get('khoa_hoc', '').strip()
    hoc_phi_mac_dinh = request.form.get('hoc_phi_mac_dinh', 0)
    so_thang = request.form.get('so_thang', 0)
    
    conn = get_db_connection()
    try:
        if not ten_lop:
            flash('Tên lớp không được để trống!', 'danger')
            return redirect(url_for('quan_ly_lop'))
        
        conn.execute('INSERT INTO lop (ten_lop, khoa_hoc, hoc_phi_mac_dinh, so_thang) VALUES (?, ?, ?, ?)',
                     (ten_lop, khoa_hoc, hoc_phi_mac_dinh, so_thang))
        conn.commit()
        flash('Thêm lớp thành công!', 'success')
    except Exception as e:
        flash(f'Lỗi: {str(e)}', 'danger')
    finally:
        conn.close()
    
    return redirect(url_for('quan_ly_lop'))

@app.route('/lop/sua/<int:id>', methods=['POST'])
def sua_lop(id):
    """Sửa thông tin lớp"""
    ten_lop = request.form.get('ten_lop', '').strip()
    khoa_hoc = request.form.get('khoa_hoc', '').strip()
    hoc_phi_mac_dinh = request.form.get('hoc_phi_mac_dinh', 0)
    so_thang = request.form.get('so_thang', 0)
    
    if not ten_lop:
        flash('Tên lớp không được để trống!', 'danger')
        return redirect(url_for('quan_ly_lop'))
    
    conn = get_db_connection()
    try:
        conn.execute('UPDATE lop SET ten_lop=?, khoa_hoc=?, hoc_phi_mac_dinh=?, so_thang=? WHERE id=?',
                     (ten_lop, khoa_hoc, hoc_phi_mac_dinh, so_thang, id))
        conn.commit()
        flash('Cập nhật lớp thành công!', 'success')
    except Exception as e:
        flash(f'Lỗi: {str(e)}', 'danger')
    finally:
        conn.close()
    
    return redirect(url_for('quan_ly_lop'))

@app.route('/lop/xoa/<int:id>')
def xoa_lop(id):
    """Xóa lớp"""
    conn = get_db_connection()
    try:
        # Kiểm tra xem lớp có sinh viên không
        count = conn.execute('SELECT COUNT(*) as count FROM sinh_vien WHERE lop_id=?', (id,)).fetchone()['count']
        if count > 0:
            flash(f'Không thể xóa lớp vì còn {count} sinh viên trong lớp!', 'danger')
        else:
            conn.execute('DELETE FROM lop WHERE id=?', (id,))
            conn.commit()
            flash('Xóa lớp thành công!', 'success')
    except Exception as e:
        flash(f'Lỗi: {str(e)}', 'danger')
    finally:
        conn.close()
    
    return redirect(url_for('quan_ly_lop'))

# QUẢN LÝ SINH VIÊN 
@app.route('/sinh-vien')
def quan_ly_sinh_vien():
    """Quản lý sinh viên"""
    conn = get_db_connection()
    sinh_vien_list = conn.execute('''
        SELECT sv.*, l.ten_lop 
        FROM sinh_vien sv 
        LEFT JOIN lop l ON sv.lop_id = l.id 
        ORDER BY sv.id DESC
    ''').fetchall()
    lop_list = conn.execute('SELECT * FROM lop ORDER BY ten_lop').fetchall()
    conn.close()
    return render_template('quan_ly_sinh_vien.html', sinh_vien_list=sinh_vien_list, lop_list=lop_list)

@app.route('/sinh-vien/them', methods=['POST'])
def them_sinh_vien():
    """Thêm sinh viên mới"""
    ma_sv = request.form.get('ma_sv', '').strip()
    ho_ten = request.form.get('ho_ten', '').strip()
    lop_id = request.form.get('lop_id')
    ngay_nhap_hoc = request.form.get('ngay_nhap_hoc', datetime.now().strftime('%Y-%m-%d'))
    
    if not ma_sv or not ho_ten:
        flash('Mã SV và họ tên không được để trống!', 'danger')
        return redirect(url_for('quan_ly_sinh_vien'))
    
    conn = get_db_connection()
    try:
        conn.execute('INSERT INTO sinh_vien (ma_sv, ho_ten, lop_id, ngay_nhap_hoc) VALUES (?, ?, ?, ?)',
                     (ma_sv, ho_ten, lop_id, ngay_nhap_hoc))
        conn.commit()
        flash('Thêm sinh viên thành công!', 'success')
    except sqlite3.IntegrityError:
        flash('Mã sinh viên đã tồn tại!', 'danger')
    except Exception as e:
        flash(f'Lỗi: {str(e)}', 'danger')
    finally:
        conn.close()
    
    return redirect(url_for('quan_ly_sinh_vien'))

@app.route('/sinh-vien/sua/<int:id>', methods=['POST'])
def sua_sinh_vien(id):
    """Sửa thông tin sinh viên"""
    ma_sv = request.form.get('ma_sv', '').strip()
    ho_ten = request.form.get('ho_ten', '').strip()
    lop_id = request.form.get('lop_id')
    
    if not ma_sv or not ho_ten:
        flash('Mã SV và họ tên không được để trống!', 'danger')
        return redirect(url_for('quan_ly_sinh_vien'))
    
    conn = get_db_connection()
    try:
        conn.execute('UPDATE sinh_vien SET ma_sv=?, ho_ten=?, lop_id=? WHERE id=?',
                     (ma_sv, ho_ten, lop_id, id))
        conn.commit()
        flash('Cập nhật sinh viên thành công!', 'success')
    except sqlite3.IntegrityError:
        flash('Mã sinh viên đã tồn tại!', 'danger')
    except Exception as e:
        flash(f'Lỗi: {str(e)}', 'danger')
    finally:
        conn.close()
    
    return redirect(url_for('quan_ly_sinh_vien'))

@app.route('/sinh-vien/xoa/<int:id>')
def xoa_sinh_vien(id):
    """Xóa sinh viên"""
    conn = get_db_connection()
    try:
        conn.execute('DELETE FROM sinh_vien WHERE id=?', (id,))
        conn.commit()
        flash('Xóa sinh viên thành công!', 'success')
    except Exception as e:
        flash(f'Lỗi: {str(e)}', 'danger')
    finally:
        conn.close()
    
    return redirect(url_for('quan_ly_sinh_vien'))

# NHẬP HỌC PHÍ 
@app.route('/nhap-hoc-phi')
def nhap_hoc_phi():
    """Trang nhập học phí"""
    conn = get_db_connection()
    lop_list = conn.execute('SELECT * FROM lop ORDER BY ten_lop').fetchall()
    conn.close()
    return render_template('nhap_hoc_phi.html', lop_list=lop_list)

@app.route('/api/sinh-vien-by-lop/<int:lop_id>')
def api_sinh_vien_by_lop(lop_id):
    """API lấy danh sách sinh viên theo lớp"""
    conn = get_db_connection()
    sinh_vien_list = conn.execute('''
        SELECT id, ma_sv, ho_ten 
        FROM sinh_vien 
        WHERE lop_id=? 
        ORDER BY ho_ten
    ''', (lop_id,)).fetchall()
    conn.close()
    return jsonify([dict(sv) for sv in sinh_vien_list])

@app.route('/api/hoc-phi/<int:sinh_vien_id>')
def api_hoc_phi(sinh_vien_id):
    """API lấy danh sách học phí của sinh viên"""
    conn = get_db_connection()
    hoc_phi_list = conn.execute('''
        SELECT * FROM hoc_phi 
        WHERE sinh_vien_id=? 
        ORDER BY nam DESC, thang DESC
    ''', (sinh_vien_id,)).fetchall()
    conn.close()
    return jsonify([dict(hp) for hp in hoc_phi_list])

@app.route('/nhap-hoc-phi/luu', methods=['POST'])
def luu_hoc_phi():
    """Lưu thông tin học phí"""
    sinh_vien_id = request.form.get('sinh_vien_id')
    thang = request.form.get('thang')
    nam = request.form.get('nam')
    so_tien = request.form.get('so_tien', 0)
    da_dong = request.form.get('da_dong', 0)
    ngay_dong = request.form.get('ngay_dong', datetime.now().strftime('%Y-%m-%d'))
    ghi_chu = request.form.get('ghi_chu', '')
    
    if not sinh_vien_id or not thang or not nam:
        flash('Thiếu thông tin cần thiết!', 'danger')
        return redirect(url_for('nhap_hoc_phi'))
    
    conn = get_db_connection()
    try:
        # Kiểm tra xem đã tồn tại chưa
        existing = conn.execute('''
            SELECT id FROM hoc_phi 
            WHERE sinh_vien_id=? AND thang=? AND nam=?
        ''', (sinh_vien_id, thang, nam)).fetchone()
        
        if existing:
            # Cập nhật
            conn.execute('''
                UPDATE hoc_phi 
                SET so_tien=?, da_dong=?, ngay_dong=?, ghi_chu=?
                WHERE sinh_vien_id=? AND thang=? AND nam=?
            ''', (so_tien, da_dong, ngay_dong, ghi_chu, sinh_vien_id, thang, nam))
            flash('Cập nhật học phí thành công!', 'success')
        else:
            # Thêm mới
            conn.execute('''
                INSERT INTO hoc_phi (sinh_vien_id, thang, nam, so_tien, da_dong, ngay_dong, ghi_chu)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            ''', (sinh_vien_id, thang, nam, so_tien, da_dong, ngay_dong, ghi_chu))
            flash('Thêm học phí thành công!', 'success')
        
        conn.commit()
    except Exception as e:
        flash(f'Lỗi: {str(e)}', 'danger')
    finally:
        conn.close()
    
    return redirect(url_for('nhap_hoc_phi'))

@app.route('/xoa-hoc-phi/<int:id>')
def xoa_hoc_phi(id):
    """Xóa khoản học phí"""
    conn = get_db_connection()
    try:
        conn.execute('DELETE FROM hoc_phi WHERE id=?', (id,))
        conn.commit()
        flash('Xóa khoản thu thành công!', 'success')
    except Exception as e:
        flash(f'Lỗi: {str(e)}', 'danger')
    finally:
        conn.close()
    
    return redirect(url_for('nhap_hoc_phi'))

# BÁO CÁO 
@app.route('/bao-cao')
def bao_cao():
    """Trang báo cáo"""
    conn = get_db_connection()
    lop_list = conn.execute('SELECT * FROM lop ORDER BY ten_lop').fetchall()
    conn.close()
    return render_template('bao_cao.html', lop_list=lop_list)

@app.route('/bao-cao/lop/<int:lop_id>')
def bao_cao_lop(lop_id):
    """Báo cáo chi tiết theo lớp"""
    conn = get_db_connection()
    
    # Lấy thông tin lớp
    lop = conn.execute('SELECT * FROM lop WHERE id=?', (lop_id,)).fetchone()
    
    # Lấy danh sách sinh viên trong lớp
    sinh_vien_list = conn.execute('''
        SELECT sv.*, 
               COALESCE(SUM(CASE WHEN hp.da_dong = 1 THEN hp.so_tien ELSE 0 END), 0) as tong_da_nop
        FROM sinh_vien sv
        LEFT JOIN hoc_phi hp ON sv.id = hp.sinh_vien_id
        WHERE sv.lop_id = ?
        GROUP BY sv.id
        ORDER BY sv.ho_ten
    ''', (lop_id,)).fetchall()
    
    # Lấy tất cả học phí
    hoc_phi_data = conn.execute('''
        SELECT sv.id as sinh_vien_id, sv.ho_ten, sv.ma_sv,
               hp.thang, hp.nam, hp.so_tien, hp.da_dong, hp.ngay_dong
        FROM hoc_phi hp
        JOIN sinh_vien sv ON hp.sinh_vien_id = sv.id
        WHERE sv.lop_id = ?
        ORDER BY hp.nam, hp.thang, sv.ho_ten
    ''', (lop_id,)).fetchall()
    
    conn.close()
    
    # Tạo danh sách các tháng có dữ liệu
    thang_list = []
    thang_dict = {}
    for hp in hoc_phi_data:
        key = f"{hp['nam']}-{hp['thang']:02d}"
        if key not in thang_dict:
            thang_dict[key] = {'nam': hp['nam'], 'thang': hp['thang']}
            thang_list.append(key)
    thang_list.sort()
    
    return render_template('bao_cao_lop.html', lop=lop, sinh_vien_list=sinh_vien_list, 
                          hoc_phi_data=hoc_phi_data, thang_list=thang_list, thang_dict=thang_dict)

@app.route('/chi-tiet-sinh-vien/<int:sinh_vien_id>')
def chi_tiet_sinh_vien(sinh_vien_id):
    """Chi tiết học phí của sinh viên"""
    conn = get_db_connection()
    sinh_vien = conn.execute('''
        SELECT sv.*, l.ten_lop 
        FROM sinh_vien sv 
        LEFT JOIN lop l ON sv.lop_id = l.id 
        WHERE sv.id=?
    ''', (sinh_vien_id,)).fetchone()
    
    hoc_phi_list = conn.execute('''
        SELECT * FROM hoc_phi 
        WHERE sinh_vien_id=? 
        ORDER BY nam DESC, thang DESC
    ''', (sinh_vien_id,)).fetchall()
    
    tong_da_nop = conn.execute('''
        SELECT COALESCE(SUM(so_tien), 0) as tong 
        FROM hoc_phi 
        WHERE sinh_vien_id=? AND da_dong=1
    ''', (sinh_vien_id,)).fetchone()['tong']
    
    conn.close()
    return render_template('chi_tiet_sinh_vien.html', sinh_vien=sinh_vien, 
                          hoc_phi_list=hoc_phi_list, tong_da_nop=tong_da_nop)

# XUẤT EXCEL 
@app.route('/export/excel/lop/<int:lop_id>')
def export_excel_lop(lop_id):
    """Xuất báo cáo lớp ra Excel"""
    conn = get_db_connection()
    
    # Lấy thông tin lớp
    lop = conn.execute('SELECT * FROM lop WHERE id=?', (lop_id,)).fetchone()
    
    # Lấy dữ liệu học phí
    query = '''
        SELECT sv.ma_sv, sv.ho_ten, sv.ngay_nhap_hoc,
               hp.thang, hp.nam, hp.so_tien, 
               CASE WHEN hp.da_dong = 1 THEN 'Đã đóng' ELSE 'Chưa đóng' END as trang_thai,
               hp.ngay_dong, hp.ghi_chu
        FROM sinh_vien sv
        LEFT JOIN hoc_phi hp ON sv.id = hp.sinh_vien_id
        WHERE sv.lop_id = ?
        ORDER BY sv.ho_ten, hp.nam, hp.thang
    '''
    data = conn.execute(query, (lop_id,)).fetchall()
    conn.close()
    
    if not data:
        flash('Không có dữ liệu để xuất!', 'warning')
        return redirect(url_for('bao_cao'))
    
    # Chuyển thành DataFrame
    df = pd.DataFrame([dict(row) for row in data])
    
    # Tạo file Excel
    filename = EXPORTS_DIR / f"bao_cao_lop_{lop['ten_lop']}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.xlsx"
    
    with pd.ExcelWriter(filename, engine='openpyxl') as writer:
        # Sheet chi tiết
        df.to_excel(writer, sheet_name='Chi tiết học phí', index=False)
        
        # Sheet tổng hợp theo sinh viên
        tong_hop = df.groupby(['ma_sv', 'ho_ten']).agg({
            'so_tien': 'sum'
        }).reset_index()
        tong_hop.columns = ['Mã SV', 'Họ tên', 'Tổng đã nộp']
        tong_hop['Tổng đã nộp'] = tong_hop['Tổng đã nộp'].fillna(0)
        tong_hop.to_excel(writer, sheet_name='Tổng hợp theo SV', index=False)
        
        # Sheet thống kê theo tháng
        if 'thang' in df.columns and 'nam' in df.columns:
            thong_ke_thang = df.groupby(['nam', 'thang']).agg({
                'so_tien': 'sum'
            }).reset_index()
            thong_ke_thang.columns = ['Năm', 'Tháng', 'Tổng thu']
            thong_ke_thang.to_excel(writer, sheet_name='Thống kê theo tháng', index=False)
    
    return send_file(str(filename), as_attachment=True, download_name=f"Bao_cao_lop_{lop['ten_lop']}.xlsx")

@app.route('/export/excel/sinh-vien/<int:sinh_vien_id>')
def export_excel_sinh_vien(sinh_vien_id):
    """Xuất chi tiết học phí của sinh viên ra Excel"""
    conn = get_db_connection()
    sinh_vien = conn.execute('SELECT * FROM sinh_vien WHERE id=?', (sinh_vien_id,)).fetchone()
    
    query = '''
        SELECT thang, nam, so_tien, 
               CASE WHEN da_dong = 1 THEN 'Đã đóng' ELSE 'Chưa đóng' END as trang_thai,
               ngay_dong, ghi_chu
        FROM hoc_phi
        WHERE sinh_vien_id=?
        ORDER BY nam DESC, thang DESC
    '''
    data = conn.execute(query, (sinh_vien_id,)).fetchall()
    conn.close()
    
    if not data:
        flash('Không có dữ liệu để xuất!', 'warning')
        return redirect(url_for('chi_tiet_sinh_vien', sinh_vien_id=sinh_vien_id))
    
    df = pd.DataFrame([dict(row) for row in data])
    
    filename = EXPORTS_DIR / f"hoc_phi_{sinh_vien['ma_sv']}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.xlsx"
    df.to_excel(str(filename), index=False, sheet_name='Học phí')
    
    return send_file(str(filename), as_attachment=True, download_name=f"Hoc_phi_{sinh_vien['ma_sv']}.xlsx")

# API THỐNG KÊ 
@app.route('/api/thong-ke')
def api_thong_ke():
    """API thống kê tổng quan"""
    conn = get_db_connection()
    
    tong_sv = conn.execute('SELECT COUNT(*) as count FROM sinh_vien').fetchone()['count']
    tong_lop = conn.execute('SELECT COUNT(*) as count FROM lop').fetchone()['count']
    tong_thu = conn.execute('SELECT COALESCE(SUM(so_tien), 0) as total FROM hoc_phi WHERE da_dong=1').fetchone()['total']
    
    conn.close()
    
    return jsonify({
        'tong_sinh_vien': tong_sv,
        'tong_lop': tong_lop,
        'tong_thu': tong_thu
    })

# LẬP PHIẾU THU 
@app.route('/lap-phieu-thu')
def lap_phieu_thu():
    """Trang lập phiếu thu (giao diện Z-Pattern)"""
    conn = get_db_connection()
    lop_list = conn.execute('SELECT * FROM lop ORDER BY ten_lop').fetchall()
    conn.close()
    return render_template('lap_phieu_thu.html', lop_list=lop_list)

# Hàm cộng tháng thủ công (không cần thư viện ngoài)
def add_months(dt, months):
    new_month = dt.month - 1 + months
    new_year = dt.year + new_month // 12
    new_month = new_month % 12 + 1
    return dt.replace(year=new_year, month=new_month, day=1)

@app.route('/api/student-tuition/<int:sinh_vien_id>')
def api_student_tuition(sinh_vien_id):
    """Lấy danh sách các tháng học phí của sinh viên dựa trên ngày nhập học và số tháng khóa học"""
    conn = get_db_connection()

    # Lấy thông tin sinh viên (kèm học phí mặc định và số tháng của lớp)
    sv = conn.execute('''
        SELECT sv.*, l.ten_lop as ten_lop, l.hoc_phi_mac_dinh, l.so_thang
        FROM sinh_vien sv
        LEFT JOIN lop l ON sv.lop_id = l.id
        WHERE sv.id = ?
    ''', (sinh_vien_id,)).fetchone()
    if not sv:
        return jsonify({'error': 'Sinh viên không tồn tại'}), 404

    # Lấy các khoản học phí đã có
    existing = conn.execute('''
        SELECT thang, nam, so_tien, da_dong, ngay_dong, ghi_chu
        FROM hoc_phi
        WHERE sinh_vien_id = ?
    ''', (sinh_vien_id,)).fetchall()
    existing_map = {(row['thang'], row['nam']): row for row in existing}

    # Xác định phạm vi tháng dựa trên ngày nhập học và số tháng của khóa học
    ngay_nhap = datetime.strptime(sv['ngay_nhap_hoc'], '%Y-%m-%d')
    so_thang_khoa = sv['so_thang'] or 0
    if so_thang_khoa <= 0:
        so_thang_khoa = 12  # fallback nếu chưa nhập số tháng

    months = []
    for i in range(so_thang_khoa):
        target = add_months(ngay_nhap, i)
        thang = target.month
        nam = target.year
        key = (thang, nam)
        if key in existing_map:
            record = existing_map[key]
            months.append({
                'thang': thang,
                'nam': nam,
                'so_tien': record['so_tien'],
                'da_dong': record['da_dong'],
                'ngay_dong': record['ngay_dong'],
                'ghi_chu': record['ghi_chu'] or ''
            })
        else:
            # Gợi ý số tiền từ học phí mặc định của lớp (nếu có)
            so_tien = sv['hoc_phi_mac_dinh'] or 0
            months.append({
                'thang': thang,
                'nam': nam,
                'so_tien': so_tien,
                'da_dong': 0,
                'ngay_dong': None,
                'ghi_chu': ''
            })
    conn.close()
    return jsonify({
        'sinh_vien': dict(sv),
        'months': months
    })

@app.route('/lap-phieu-thu/luu', methods=['POST'])
def luu_phieu_thu():
    """Lưu phiếu thu: cập nhật nhiều tháng cùng lúc"""
    data = request.get_json()
    sinh_vien_id = data.get('sinh_vien_id')
    payments = data.get('payments', [])  # list of {thang, nam, so_tien, da_dong, ngay_dong, ghi_chu}

    if not sinh_vien_id or not payments:
        return jsonify({'error': 'Thiếu thông tin'}), 400

    conn = get_db_connection()
    try:
        for p in payments:
            # Kiểm tra đã tồn tại chưa
            existing = conn.execute('''
                SELECT id FROM hoc_phi
                WHERE sinh_vien_id = ? AND thang = ? AND nam = ?
            ''', (sinh_vien_id, p['thang'], p['nam'])).fetchone()

            if existing:
                # Cập nhật
                conn.execute('''
                    UPDATE hoc_phi
                    SET so_tien = ?, da_dong = ?, ngay_dong = ?, ghi_chu = ?
                    WHERE id = ?
                ''', (p['so_tien'], p.get('da_dong', 0), p.get('ngay_dong'), p.get('ghi_chu', ''), existing['id']))
            else:
                # Thêm mới
                conn.execute('''
                    INSERT INTO hoc_phi (sinh_vien_id, thang, nam, so_tien, da_dong, ngay_dong, ghi_chu)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                ''', (sinh_vien_id, p['thang'], p['nam'], p['so_tien'], p.get('da_dong', 0), p.get('ngay_dong'), p.get('ghi_chu', '')))
        conn.commit()
        return jsonify({'success': True})
    except Exception as e:
        conn.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        conn.close()

# Theo dõi đóng học phí
@app.route('/theo-doi-dong-hoc-phi')
def theo_doi_dong_hoc_phi():
    """Trang theo dõi đóng học phí theo tháng"""
    conn = get_db_connection()
    # Lấy danh sách lớp để lọc
    lop_list = conn.execute('SELECT * FROM lop ORDER BY ten_lop').fetchall()
    conn.close()
    return render_template('theo_doi_dong_hoc_phi.html', lop_list=lop_list)

@app.route('/api/thong-ke-dong-theo-thang')
def api_thong_ke_dong_theo_thang():
    """API lấy danh sách sinh viên đã đóng/chưa đóng theo tháng/năm và lớp (tùy chọn)"""
    thang = request.args.get('thang', type=int)
    nam = request.args.get('nam', type=int)
    lop_id = request.args.get('lop_id', type=int)

    if not thang or not nam:
        return jsonify({'error': 'Thiếu tháng hoặc năm'}), 400

    conn = get_db_connection()

    # Câu truy vấn lấy sinh viên và trạng thái đóng học phí của tháng được chọn
    query = '''
        SELECT sv.id, sv.ma_sv, sv.ho_ten, l.ten_lop,
               COALESCE(hp.da_dong, 0) as da_dong,
               hp.ngay_dong, hp.so_tien, hp.ghi_chu
        FROM sinh_vien sv
        LEFT JOIN lop l ON sv.lop_id = l.id
        LEFT JOIN hoc_phi hp ON sv.id = hp.sinh_vien_id AND hp.thang = ? AND hp.nam = ?
        WHERE 1=1
    '''
    params = [thang, nam]

    if lop_id:
        query += ' AND sv.lop_id = ?'
        params.append(lop_id)

    query += ' ORDER BY l.ten_lop, sv.ho_ten'

    data = conn.execute(query, params).fetchall()
    conn.close()

    return jsonify([dict(row) for row in data])

@app.route('/api/danh-sach-dong-theo-lop/<int:lop_id>')
def api_danh_sach_dong_theo_lop(lop_id):
    """Định danh API cũ cho theodoidong.js (không đổi mã JS ngay)."""
    thang = request.args.get('thang', type=int)
    nam = request.args.get('nam', type=int)

    if not thang or not nam:
        return jsonify({'error': 'Thiếu tháng hoặc năm'}), 400

    conn = get_db_connection()
    query = '''
        SELECT sv.id, sv.ma_sv, sv.ho_ten, l.ten_lop,
               COALESCE(hp.da_dong, 0) as da_dong,
               hp.ngay_dong, hp.so_tien, hp.ghi_chu
        FROM sinh_vien sv
        LEFT JOIN lop l ON sv.lop_id = l.id
        LEFT JOIN hoc_phi hp ON sv.id = hp.sinh_vien_id AND hp.thang = ? AND hp.nam = ?
        WHERE sv.lop_id = ?
        ORDER BY l.ten_lop, sv.ho_ten
    '''
    data = conn.execute(query, (thang, nam, lop_id)).fetchall()
    conn.close()

    return jsonify([dict(row) for row in data])

import sys
import webbrowser
import threading

if __name__ == '__main__':
    app.run(debug=False, host='127.0.0.1', port=5000)