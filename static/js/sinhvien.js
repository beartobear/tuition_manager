$(document).ready(function() {
    // Ẩn form tạo mới ban đầu
    $('#themSinhVienForm').hide();

    // Toggle thêm sinh viên form
    $('#toggleThemSinhVien').click(function() {
        $('#themSinhVienForm').slideToggle();
    });

    $('#cancelThemSinhVien').click(function() {
        $('#themSinhVienForm').slideUp();
    });

    window.suaSinhVien = function(id, ma_sv, ho_ten, lop_id) {
        $('#sua_ma_sv').val(ma_sv);
        $('#sua_ho_ten').val(ho_ten);
        $('#sua_lop_id').val(lop_id);
        $('#suaSinhVienForm').attr('action', '/sinh-vien/sua/' + id);
        $('#suaSinhVienModal').modal('show');
    };
});