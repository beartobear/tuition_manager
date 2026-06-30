$(document).ready(function() {

    $('#lopSelect').change(function() {
        var lop_id = $(this).val();
        $('#btnXemBaoCao, #btnXuatExcel, #btnXuatExcelThue').prop('disabled', !lop_id);
    });

    $('#btnXemBaoCao').click(function() {
        var lop_id = $('#lopSelect').val();
        if(lop_id) window.location.href = '/bao-cao/lop/' + lop_id;
    });

    $('#btnXuatExcel').click(function() {
        var lop_id = $('#lopSelect').val();
        if(lop_id) window.location.href = '/export/excel/lop/' + lop_id;
    });

    // NEW
    $('#btnXuatExcelThue').click(function() {
        var lop_id = $('#lopSelect').val();
        if(lop_id) window.location.href = '/bao-cao/lop/' + lop_id + '?mode=select';
    });

});
