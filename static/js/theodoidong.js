// theodoidong.js
$(document).ready(function() {
    $('#btnXem').click(function() {
        var lop_id = $('#lopSelect').val();
        var thang = $('#thangSelect').val();
        var nam = $('#namSelect').val();
        if(!lop_id) { alert('Vui lòng chọn lớp'); return; }
        $.get('/api/danh-sach-dong-theo-lop/' + lop_id + '?thang=' + thang + '&nam=' + nam, function(data) {
            var $tbody = $('#bangKetQua');
            $tbody.empty();
            if(data.length === 0) $tbody.append('<tr><td colspan="6" class="text-center">Không có sinh viên</td></tr>');
            else {
                $.each(data, function(i, sv) {
                    var trangThai = sv.da_dong == 1 ? '<span class="badge bg-success">Đã đóng</span>' : '<span class="badge bg-danger">Chưa đóng</span>';
                    $tbody.append('<tr>' +
                        '<td>' + sv.ma_sv + '</td>' +
                        '<td>' + sv.ho_ten + '</td>' +
                        '<td>' + formatNumber(sv.so_tien) + ' VNĐ</td>' +
                        '<td>' + trangThai + '</td>' +
                        '<td>' + (sv.ngay_dong || '---') + '</td>' +
                        '<td>' + (sv.ghi_chu || '') + '</td>' +
                    '</tr>');
                });
            }
            $('#ketQua').show();
        });
    });
    function formatNumber(num) {
        return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    }
});