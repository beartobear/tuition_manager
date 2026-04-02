let currentSinhVienId = null;
let selectedMonths = new Map();

$(document).ready(function() {
    // Generate random receipt code
    const now = new Date();
    const phieuCode = `PT-${now.getFullYear()}${(now.getMonth()+1).toString().padStart(2,'0')}${now.getDate().toString().padStart(2,'0')}-${Math.floor(Math.random()*1000).toString().padStart(3,'0')}`;
    $('#phieuCode').text(phieuCode);
    
    $('#lopSelect').change(function() {
        const lopId = $(this).val();
        if(lopId) {
            $.get(`/api/sinh-vien-by-lop/${lopId}`, function(data) {
                const $svSelect = $('#sinhVienSelect');
                $svSelect.empty().append('<option value="">-- Chọn sinh viên --</option>');
                $.each(data, function(i, sv) {
                    $svSelect.append(`<option value="${sv.id}">${sv.ma_sv} - ${sv.ho_ten}</option>`);
                });
                $svSelect.prop('disabled', false);
            });
        } else {
            $('#sinhVienSelect').prop('disabled', true).empty().append('<option value="">-- Chọn sinh viên --</option>');
            $('#studentProfile').hide();
            $('#suggestionArea').html('<p class="text-muted text-center">Chọn sinh viên để xem gợi ý</p>');
            $('#monthSelector').html('<p class="text-muted text-center">Chọn sinh viên để hiển thị các tháng</p>');
            $('#totalArea').hide();
        }
    });
    
    $('#sinhVienSelect').change(function() {
        const svId = $(this).val();
        if(svId) {
            currentSinhVienId = svId;
            loadStudentTuitionData(svId);
        } else {
            currentSinhVienId = null;
            $('#studentProfile').hide();
            $('#suggestionArea').html('<p class="text-muted text-center">Chọn sinh viên để xem gợi ý</p>');
            $('#monthSelector').html('<p class="text-muted text-center">Chọn sinh viên để hiển thị các tháng</p>');
            $('#totalArea').hide();
            selectedMonths.clear();
        }
    });
});

function loadStudentTuitionData(svId) {
    $.get(`/api/student-tuition/${svId}`, function(data) {
        if(!data || !data.sinh_vien || !data.months) {
            $('#studentProfile').hide();
            $('#suggestionArea').html('<p class="text-muted text-center">Không tìm thấy dữ liệu</p>');
            $('#monthSelector').html('<p class="text-muted text-center">Không tìm thấy dữ liệu</p>');
            $('#totalArea').hide();
            return;
        }

        const sv = data.sinh_vien;
        const avatarLetter = (sv.ho_ten || '?').charAt(0).toUpperCase();
        const tong_da_dong = data.months.filter(m => m.da_dong == 1).reduce((sum,m)=>sum+Number(m.so_tien||0),0);
        const tong_no = data.months.filter(m => m.da_dong == 0).reduce((sum,m)=>sum+Number(m.so_tien||0),0);

        const statusHtml = `
            <div class="d-flex align-items-center">
                <div class="avatar">${avatarLetter}</div>
                <div class="student-info flex-grow-1">
                    <h3>${sv.ho_ten}</h3>
                    <div class="class-name">📚 ${sv.ten_lop || 'Chưa có lớp'} | 🆔 ${sv.ma_sv || ''}</div>
                    <div class="class-name">📅 Nhập học: ${sv.ngay_nhap_hoc || '---'}</div>
                </div>
            </div>
            <div class="financial-stats">
                <div class="stat-item">
                    <div class="stat-label">Học phí/Tháng</div>
                    <div class="stat-value">${formatNumber(sv.hoc_phi_mac_dinh || 0)} VNĐ</div>
                </div>
                <div class="stat-item">
                    <div class="stat-label">Đã đóng</div>
                    <div class="stat-value paid">${formatNumber(tong_da_dong)} VNĐ</div>
                </div>
                <div class="stat-item">
                    <div class="stat-label">Còn nợ</div>
                    <div class="stat-value debt">${formatNumber(tong_no)} VNĐ</div>
                </div>
            </div>
        `;
        $('#studentProfile').html(statusHtml).show();

        // Gợi ý khoản thu: những tháng chưa đóng
        const unPaid = data.months.filter(m => m.da_dong == 0);
        if(unPaid.length === 0) {
            $('#suggestionArea').html('<div class="alert alert-success">✅ Bạn đã đóng đầy đủ học phí!</div>');
        } else {
            let html = '';
            unPaid.forEach(m => {
                const displayLabel = `Tháng ${m.thang}/${m.nam}`;
                html += `
                    <div class="suggestion-card" onclick="addSuggestion(${m.thang}, ${m.nam}, ${m.so_tien})">
                        <div class="suggestion-title">💡 Gợi ý: ${displayLabel}</div>
                        <div class="suggestion-amount">Số tiền: ${formatNumber(m.so_tien)} VNĐ</div>
                        <small class="text-muted">Click để thêm vào danh sách</small>
                    </div>
                `;
            });
            $('#suggestionArea').html(html);
        }

        // render tháng
        const currentYear = new Date().getFullYear();
        let monthHtml = '';
        selectedMonths.clear();
        data.months.forEach(m => {
            const statusClass = m.da_dong == 1 ? 'bg-light text-muted' : 'border-warning bg-warning bg-opacity-10';
            const statusText = m.da_dong == 1 ? '(Đã đóng)' : '(Chưa đóng)';
            const amount = Number(m.so_tien || sv.hoc_phi_mac_dinh || 0);
            monthHtml += `
                <div class="month-item ${statusClass}" data-month="${m.thang}" data-nam="${m.nam}" onclick="toggleMonth(${m.thang}, ${m.nam}, ${amount})">
                    <input type="checkbox" class="month-checkbox" id="month_${m.thang}_${m.nam}" ${m.da_dong == 1 ? 'disabled' : ''} onclick="event.stopPropagation(); toggleMonth(${m.thang}, ${m.nam}, ${amount})">
                    <span class="month-name">Tháng ${m.thang}/${m.nam} <small class="text-muted">${statusText}</small></span>
                    <input type="number" class="month-amount" id="amount_${m.thang}_${m.nam}" value="${amount}" placeholder="Số tiền" ${m.da_dong == 1 ? 'disabled' : ''} onchange="updateAmount(${m.thang}, ${m.nam}, this.value)">
                </div>
            `;
        });

        $('#monthSelector').html(monthHtml);
        $('#totalArea').hide();
        updateTotal();
    }).fail(function() {
        $('#studentProfile').hide();
        $('#suggestionArea').html('<p class="text-muted text-center">Lỗi gọi API</p>');
        $('#monthSelector').html('<p class="text-muted text-center">Lỗi gọi API</p>');
        $('#totalArea').hide();
    });
}

function loadStudentInfo(svId) {
    // Không sử dụng nữa.
}

function loadSuggestions(svId) {
    // Không sử dụng nữa.
}

function loadMonths(svId) {
    // Không sử dụng nữa.
}

function toggleMonth(thang, nam, soTien) {
    const key = `${thang}-${nam}`;
    const checkbox = $(`#month_${thang}_${nam}`);
    const amountInput = $(`#amount_${thang}_${nam}`);

    if(checkbox.prop('disabled')) return;

    if(selectedMonths.has(key)) {
        selectedMonths.delete(key);
        checkbox.prop('checked', false);
        $(`.month-item[data-month="${thang}"][data-nam="${nam}"]`).removeClass('selected');
    } else {
        selectedMonths.set(key, {
            thang: thang,
            nam: nam,
            so_tien: parseInt(amountInput.val()) || soTien
        });
        checkbox.prop('checked', true);
        $(`.month-item[data-month="${thang}"][data-nam="${nam}"]`).addClass('selected');
    }

    updateTotal();
}

function updateAmount(thang, nam, value) {
    const key = `${thang}-${nam}`;
    if(selectedMonths.has(key)) {
        selectedMonths.get(key).so_tien = parseInt(value) || 0;
        updateTotal();
    }
}

function updateTotal() {
    let total = 0;
    selectedMonths.forEach(item => {
        total += item.so_tien;
    });
    $('#totalAmount').text(formatNumber(total) + ' VNĐ');
    $('#selectedCount').text(selectedMonths.size);
    
    if(selectedMonths.size > 0) {
        $('#totalArea').show();
    } else {
        $('#totalArea').hide();
    }
}

function addSuggestion(thang, nam, soTien) {
    const key = `${thang}-${nam}`;
    if(!selectedMonths.has(key)) {
        toggleMonth(thang, nam, soTien);
    }
}

function resetForm() {
    selectedMonths.clear();
    $('#sinhVienSelect').val('').trigger('change');
    $('#lopSelect').val('').trigger('change');
    $('#totalArea').hide();
    $('#ghiChu').val('');
}

function luuPhieuThu() {
    if(!currentSinhVienId) {
        alert('Vui lòng chọn sinh viên!');
        return;
    }
    
    if(selectedMonths.size === 0) {
        alert('Vui lòng chọn ít nhất một tháng để thu!');
        return;
    }
    
    const cacKhoanThu = [];
    selectedMonths.forEach(item => {
        cacKhoanThu.push({
            thang: item.thang,
            nam: item.nam,
            so_tien: item.so_tien
        });
    });
    
    const data = {
        sinh_vien_id: currentSinhVienId,
        payments: cacKhoanThu,
        phuong_thuc: $('#paymentMethod').val(),
        ghi_chu: $('#ghiChu').val(),
        ngay_thu: new Date().toISOString().split('T')[0]
    };

    $.ajax({
        url: '/lap-phieu-thu/luu',
        method: 'POST',
        contentType: 'application/json',
        data: JSON.stringify(data),
        success: function(res) {
            if(res.success) {
                alert('Lưu phiếu thu thành công!');
                resetForm();
                if(currentSinhVienId) {
                    loadStudentTuitionData(currentSinhVienId);
                }
            } else {
                alert('Lỗi: ' + JSON.stringify(res.error || res));
            }
        },
        error: function(xhr) {
            alert('Có lỗi xảy ra: ' + xhr.responseText);
        }
    });
}

function formatNumber(num) {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}