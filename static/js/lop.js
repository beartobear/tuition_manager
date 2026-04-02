// lop.js - quản lý lớp
$(document).ready(function() {
    // Ẩn form tạo mới ban đầu
    $('#themLopForm').hide();

    // Toggle thêm lớp form
    $('#toggleThemLop').click(function() {
        $('#themLopForm').slideToggle();
    });

    $('#cancelThemLop').click(function() {
        $('#themLopForm').slideUp();
    });

    // Add event handlers for modals etc.
    window.suaLop = function(id, ten, khoa_hoc, hoc_phi) {
        $('#sua_ten_lop').val(ten);
        $('#sua_khoa_hoc').val(khoa_hoc);
        $('#sua_hoc_phi').val(hoc_phi);
        $('#suaLopForm').attr('action', '/lop/sua/' + id);
        $('#suaLopModal').modal('show');
    };
});