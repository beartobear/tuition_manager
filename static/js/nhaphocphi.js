$(document).ready(function() {
    // Ẩn khu vực nội dung học phí ban đầu
    $('#hocPhiInfo').hide();
    $('#btnXemHocPhi').prop('disabled', true);

    $('#lopSelect').change(function() {
        var lop_id = $(this).val();
        if(lop_id) {
            $.get('/api/sinh-vien-by-lop/' + lop_id, function(data) {
                var $svSelect = $('#sinhVienSelect');
                $svSelect.empty().append('<option value="">-- Chọn sinh viên --</option>');
                $.each(data, function(i, sv) {
                    $svSelect.append('<option value="' + sv.id + '">' + sv.ma_sv + ' - ' + sv.ho_ten + '</option>');
                });
                $svSelect.prop('disabled', false);
                $('#btnNhapHocPhi').prop('disabled', true);
                $('#btnXemHocPhi').prop('disabled', true);
                $('#hocPhiInfo').hide();
            });
        } else {
            $('#sinhVienSelect').prop('disabled', true).empty().append('<option value="">-- Chọn sinh viên --</option>');
            $('#btnNhapHocPhi').prop('disabled', true);
            $('#btnXemHocPhi').prop('disabled', true);
            $('#hocPhiInfo').hide();
        }
    });

    $('#sinhVienSelect').change(function() {
        var sv_id = $(this).val();
        if(sv_id) {
            $('#btnNhapHocPhi').prop('disabled', false);
            $('#btnXemHocPhi').prop('disabled', false);
            $('#hp_sinh_vien_id').val(sv_id);
            // Do not show hocPhiInfo automatically
            // $('#hocPhiInfo').show();
        } else {
            $('#btnNhapHocPhi').prop('disabled', true);
            $('#btnXemHocPhi').prop('disabled', true);
            $('#hocPhiInfo').hide();
        }
    });

    $('#btnNhapHocPhi').click(function() {
        if($('#sinhVienSelect').val()) $('#nhapHocPhiModal').modal('show');
    });

    $('#btnXemHocPhi').click(function() {
        var sv_id = $('#sinhVienSelect').val();
        if(sv_id) {
            $.get('/api/hoc-phi/' + sv_id, function(data) {
                var $tbody = $('#hocPhiTableBody');
                $tbody.empty();
                if(data.length === 0) $tbody.append('<tr><td colspan="6" class="text-center">Chưa có dữ liệu</td></tr>');
                else $.each(data, function(i, hp) {
                    var trangThai = hp.da_dong == 1 ? '<span class="badge bg-success">Đã đóng</span>' : '<span class="badge bg-danger">Chưa đóng</span>';
                    $tbody.append('<tr>' +
                        '<td>' + hp.thang + '/' + hp.nam + '</td>' +
                        '<td>' + formatNumber(hp.so_tien) + ' VNĐ</td>' +
                        '<td>' + trangThai + '</td>' +
                        '<td>' + (hp.ngay_dong || '---') + '</td>' +
                        '<td>' + (hp.ghi_chu || '') + '</td>' +
                        '<td><a href="/xoa-hoc-phi/' + hp.id + '" class="btn btn-sm btn-danger" onclick="return confirm(\'Xóa khoản thu này?\')">Xóa</a></td>' +
                    '</tr>');
                });
                $('#hocPhiInfo').slideToggle();
            });
        }
    });

    function formatNumber(num) {
        return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    }
});