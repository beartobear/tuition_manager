// Hiển thị/ẩn form thêm lớp
document.getElementById('toggleThemLop').addEventListener('click', function() {
    const form = document.getElementById('themLopForm');
    if (form.style.display === 'none') {
        form.style.display = 'block';
    } else {
        form.style.display = 'none';
    }
});

document.getElementById('cancelThemLop').addEventListener('click', function() {
    document.getElementById('themLopForm').style.display = 'none';
});

// Hàm sửa lớp (nhận thêm tham số soThang)
function suaLop(id, ten, khoaHoc, hocPhi, soThang) {
    document.getElementById('sua_ten_lop').value = ten;
    document.getElementById('sua_khoa_hoc').value = khoaHoc;
    document.getElementById('sua_hoc_phi').value = hocPhi;
    document.getElementById('sua_so_thang').value = soThang;
    document.getElementById('suaLopForm').action = `/lop/sua/${id}`;
}