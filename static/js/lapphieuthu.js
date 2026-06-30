let currentStudent = null;
let currentMonths = [];
let selectedMonths = new Set(); // lưu index của tháng được chọn

$(document).ready(function() {
    $('#lopSelect').change(function() {
        const lopId = $(this).val();
        if (lopId) {
            $.get(`/api/sinh-vien-by-lop/${lopId}`, function(data) {
                let options = '<option value="">-- Chọn sinh viên --</option>';
                data.forEach(sv => {
                    options += `<option value="${sv.id}">${sv.ma_sv} - ${sv.ho_ten}</option>`;
                });
                $('#sinhVienSelect').html(options).prop('disabled', false);
            });
        } else {
            $('#sinhVienSelect').html('<option value="">-- Chọn sinh viên --</option>').prop('disabled', true);
            $('#studentProfile').hide();
            $('#suggestionArea').html('<p class="text-muted text-center">Chọn sinh viên để xem gợi ý</p>');
            $('#monthSelector').html('<p class="text-muted text-center">Chọn sinh viên để hiển thị các tháng</p>');
            $('#totalArea').hide();
        }
    });

    $('#sinhVienSelect').change(function() {
        const sinhVienId = $(this).val();
        if (sinhVienId) {
            loadStudentTuition(sinhVienId);
        } else {
            $('#studentProfile').hide();
            $('#suggestionArea').html('<p class="text-muted text-center">Chọn sinh viên để xem gợi ý</p>');
            $('#monthSelector').html('<p class="text-muted text-center">Chọn sinh viên để hiển thị các tháng</p>');
            $('#totalArea').hide();
        }
    });
});

function formatVND(amount) {
    if (!amount) return '0 VNĐ';
    return amount.toLocaleString('vi-VN') + ' VNĐ';
}

function loadStudentTuition(sinhVienId) {
    $.get(`/api/student-tuition/${sinhVienId}`, function(data) {
        const student = data.sinh_vien;
        const months = data.months;
        currentStudent = student;
        currentMonths = months;
        selectedMonths.clear();

        // Hiển thị thông tin sinh viên
        const tongDaDong = months.filter(m => m.da_dong === 1).reduce((sum, m) => sum + m.so_tien, 0);
        const tongPhaiDong = months.reduce((sum, m) => sum + m.so_tien, 0);
        const conNo = tongPhaiDong - tongDaDong;

        $('#studentProfile').html(`
            <h5>${student.ho_ten}</h5>
            <p><strong>Lớp:</strong> ${student.ten_lop || 'Chưa có lớp'}</p>
            <p><strong>Mã SV:</strong> ${student.ma_sv}</p>
            <p><strong>Ngày nhập học:</strong> ${student.ngay_nhap_hoc}</p>
            <p><strong>Học phí/tháng:</strong> ${formatVND(student.hoc_phi_mac_dinh)}</p>
            <p><strong>Khóa học kéo dài:</strong> ${student.so_thang || 0} tháng</p>
            <p><strong>Đã đóng:</strong> ${formatVND(tongDaDong)}</p>
            <p><strong>Còn nợ:</strong> ${formatVND(conNo)}</p>
        `).show();

        // Sinh mã phiếu thu
        let soThang = student.so_thang || 0;
        let maSV = student.ma_sv;
        let now = new Date();
        let dateStr = now.toISOString().slice(0,10).replace(/-/g,'');
        let receiptCode = `PT-${soThang}M-${maSV}-${dateStr}`;
        $('#phieuCode').text(receiptCode);

        // Render gợi ý và danh sách tháng
        renderSuggestions(months);
        renderMonthSelector(months);
        updateTotal();
        $('#totalArea').show();
    }).fail(function(err) {
        console.error(err);
        alert('Không thể tải dữ liệu học phí');
    });
}

function renderSuggestions(months) {
    const chuaDong = months.filter(m => m.da_dong === 0);
    if (chuaDong.length === 0) {
        $('#suggestionArea').html('<p class="text-muted text-center">✅ Sinh viên đã đóng đủ học phí</p>');
        return;
    }
    let html = '<div class="list-group">';
    chuaDong.forEach((m, idx) => {
        html += `
            <div class="list-group-item suggestion-item" data-month-idx="${idx}" style="cursor:pointer; border:1px solid #e5e7eb; border-radius:12px; margin-bottom:8px; padding:12px;">
                <div class="d-flex justify-content-between align-items-center">
                    <div>
                        <strong>📅 Tháng ${m.thang}/${m.nam}</strong><br>
                        <span>Số tiền: ${formatVND(m.so_tien)}</span>
                    </div>
                    <button class="btn-modern btn-modern-primary btn-sm" onclick="addSuggestionToSelection(${idx})">+ Thêm</button>
                </div>
            </div>
        `;
    });
    html += '</div>';
    $('#suggestionArea').html(html);
}

function addSuggestionToSelection(monthIdx) {
    if (!selectedMonths.has(monthIdx)) {
        selectedMonths.add(monthIdx);
        updateMonthSelectorUI();
        updateTotal();
    }
}

function renderMonthSelector(months) {
    let html = '<div class="month-list">';
    months.forEach((m, idx) => {
        const isSelected = selectedMonths.has(idx);
        const daDong = m.da_dong === 1;
        const statusText = daDong ? 'Đã đóng' : 'Chưa đóng';
        const statusClass = daDong ? 'bg-success-light' : 'bg-danger-light';
        const checkedAttr = isSelected ? 'checked' : '';
        const disabledAttr = daDong ? 'disabled' : '';
        html += `
            <div class="month-item ${isSelected ? 'selected' : ''} ${statusClass}" style="border:1px solid #e5e7eb; border-radius:12px; margin-bottom:8px; padding:12px;">
                <div class="form-check">
                    <input class="form-check-input month-checkbox" type="checkbox" data-month-idx="${idx}" ${checkedAttr} ${disabledAttr}>
                    <label class="form-check-label">
                        <strong>Tháng ${m.thang}/${m.nam}</strong> (${statusText})<br>
                        <span>Số tiền: ${formatVND(m.so_tien)}</span>
                    </label>
                </div>
            </div>
        `;
    });
    html += '</div>';
    $('#monthSelector').html(html);

    // Gắn sự kiện cho checkbox
    $('.month-checkbox').change(function() {
        const idx = parseInt($(this).data('month-idx'));
        if ($(this).is(':checked')) {
            selectedMonths.add(idx);
        } else {
            selectedMonths.delete(idx);
        }
        updateMonthSelectorUI();
        updateTotal();
    });
}

function updateMonthSelectorUI() {
    // Cập nhật class selected cho từng month-item
    $('.month-item').each(function() {
        const checkbox = $(this).find('.month-checkbox');
        if (checkbox.length) {
            const idx = parseInt(checkbox.data('month-idx'));
            if (selectedMonths.has(idx)) {
                $(this).addClass('selected');
            } else {
                $(this).removeClass('selected');
            }
        }
    });
}

function updateTotal() {
    let total = 0;
    for (let idx of selectedMonths) {
        if (currentMonths[idx] && currentMonths[idx].da_dong !== 1) {
            total += currentMonths[idx].so_tien;
        }
    }
    $('#totalAmount').text(formatVND(total));
    $('#selectedCount').text(selectedMonths.size);
}

function resetForm() {
    selectedMonths.clear();
    $('.month-checkbox').prop('checked', false);
    updateMonthSelectorUI();
    updateTotal();
    $('#ghiChu').val('');
    $('#nhanXet').val('');
    $('#paymentMethod').val('Tiền mặt');
    $('#receiptActions').hide().html('');
}

function luuPhieuThu() {
    if (!currentStudent) {
        alert('Vui lòng chọn sinh viên');
        return;
    }
    if (selectedMonths.size === 0) {
        alert('Vui lòng chọn ít nhất một tháng để thu tiền');
        return;
    }

    const ghiChu = $('#ghiChu').val().trim();
    const nhanXet = $('#nhanXet').val().trim();
    const phieuCode = $('#phieuCode').text().trim();
    const paymentMethod = $('#paymentMethod').val();

    let fullComment = '';
    if (ghiChu) {
        fullComment += ghiChu;
    }
    if (nhanXet) {
        if (fullComment) fullComment += ' | ';
        fullComment += `Nhận xét PH: ${nhanXet}`;
    }
    if (fullComment) {
        fullComment += ' | ';
    }
    fullComment += `PT: ${phieuCode}, PTTT: ${paymentMethod}`;

    const payments = [];
    for (let idx of selectedMonths) {
        const month = currentMonths[idx];
        if (month.da_dong === 1) continue; // không thu lại tháng đã đóng
        payments.push({
            thang: month.thang,
            nam: month.nam,
            so_tien: month.so_tien,
            da_dong: 1,
            ngay_dong: new Date().toISOString().slice(0,10),
            ghi_chu: fullComment
        });
    }

    if (payments.length === 0) {
        alert('Không có tháng hợp lệ để thu');
        return;
    }

    $.ajax({
        url: '/lap-phieu-thu/luu',
        method: 'POST',
        contentType: 'application/json',
        data: JSON.stringify({
            sinh_vien_id: currentStudent.id,
            receipt_code: $('#phieuCode').text().trim(),
            payment_method: $('#paymentMethod').val(),
            ghi_chu: $('#ghiChu').val().trim(),
            nhan_xet: $('#nhanXet').val().trim(),
            payments: payments
        }),
        success: function(res) {
            if (res.success) {
                alert('Đã lưu phiếu thu thành công!');
                resetForm();
                $('#receiptActions').html(`
                    <a href="/phieu-thu/${res.receipt_id}" target="_blank" class="btn-modern btn-modern-primary">Xem phiếu thu</a>
                    <a href="/phieu-thu/${res.receipt_id}/download/pdf" class="btn-modern btn-modern-primary">Tải PDF</a>
                `).show();
                // Reload lại dữ liệu
                loadStudentTuition(currentStudent.id);
            } else {
                alert('Lỗi: ' + (res.error || 'Không xác định'));
            }
        },
        error: function(err) {
            alert('Lỗi kết nối: ' + err.statusText);
        }
    });
}