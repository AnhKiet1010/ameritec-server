const Commission = require("../models/commission.model");
const Transaction = require("../models/transaction.model");
const User = require("../models/user.model");
const { removeAccents, randomString } = require("./method");
const axios = require("axios");
const FormData = require('form-data');

exports.getListCommission = async (req, res) => {
    const keyword = req.body.keyword ? req.body.keyword : "";
    const page = parseInt(req.body.page);
    const perPage = parseInt(req.body.resultsPerPage);
    const searchType = parseInt(req.body.searchType);
    const currentMonth = parseInt(req.body.currentMonth);
    const currentYear = parseInt(req.body.currentYear);
    const searchLevel = parseInt(req.body.searchLevel);
    const status = req.body.currentTable;
    const changeListExport = req.body.changeListExport;
    var listCommissionView = [];
    var listExportDataView = [];
    var listComms = [];
    var exportData = [];
    var countAllDocument = 0;

    if (searchType === 1) {
        listComms = await Commission.find({ $and: [{ status }, { is_delete: false }] }).sort({ _id: -1 }).limit(perPage).skip(perPage * (page - 1)).exec();
        countAllDocument = await Commission.countDocuments({ $and: [{ status }, { is_delete: false }] }).exec();
    }

    if (searchType === 2) {
        listComms = await Commission.find({
            $and: [
                { status },
                { is_delete: false },
                { "join_mem_uname": { $regex: '.*' + removeAccents(keyword) + '.*', $options: 'i' } }
            ]
        }).sort({ _id: -1 }).limit(perPage).skip(perPage * (page - 1)).exec();
        countAllDocument = await Commission.countDocuments({
            $and: [
                { status },
                { is_delete: false },
                {
                    "join_mem_uname": { $regex: '.*' + removeAccents(keyword) + '.*', $options: 'i' }
                }]
        }).exec();
    }

    if (searchType === 3) {
        listComms = await Commission.find({
            $and: [
                { status },
                { is_delete: false },
                { "buy_package": searchLevel }
            ]
        }).sort({ _id: -1 }).limit(perPage).skip(perPage * (page - 1)).exec();
        countAllDocument = await Commission.countDocuments({
            $and: [
                { status },
                { is_delete: false }, {
                    "buy_package": searchLevel
                }]
        }).exec();
    }

    if (searchType === 4) {
        let firstDay = new Date(currentYear, currentMonth - 1, 1);
        let lastDay = new Date(currentYear, currentMonth, 0);
        listComms = await Commission.find({
            $and: [{ status }, { is_delete: false }, {
                created_time: {
                    $gte: firstDay,
                    $lte: lastDay
                }
            }]
        }).sort({ _id: -1 }).limit(perPage).skip(perPage * (page - 1)).exec();
        countAllDocument = await Commission.countDocuments({
            $and: [{ status }, { is_delete: false }, {
                created_time: {
                    $gte: firstDay,
                    $lte: lastDay
                }
            }]
        }).exec();
    }

    for (const comm of listComms) {
        var obj = await convertCommissionView(comm);
        listCommissionView.push(obj);
    }

    if (changeListExport) {
        if (searchType === 1) {
            exportData = await Commission.find({ $and: [{ status }, { is_delete: false }] }).sort({ _id: -1 }).exec();
        }

        if (searchType === 2) {
            exportData = await Commission.find({
                $and: [
                    { status }, { is_delete: false }, {
                        "receive_mem_uname": { $regex: '.*' + removeAccents(keyword) + '.*', $options: 'i' }
                    }]
            }).sort({ _id: -1 }).exec();
        }

        if (searchType === 3) {
            let firstDay = new Date(currentYear, currentMonth - 1, 1);
            let lastDay = new Date(currentYear, currentMonth, 0);
            exportData = await Commission.find({
                $and: [{ status }, { is_delete: false }, {
                    created_time: {
                        $gte: firstDay,
                        $lte: lastDay
                    }
                }]
            }).sort({ _id: -1 }).exec();
        }
    }

    for (const comm of exportData) {
        var obj = await convertCommissionView(comm);
        listExportDataView.push(obj);
    }

    res.json({
        status: 200,
        data: {
            listCommissionView,
            allPage: Math.ceil(countAllDocument / perPage),
            countAllDocument,
            exportData: listExportDataView,
        },
        message: "",
        errors: [],
    });
}

exports.getDetailCommission = async (req, res) => {
    const { id } = req.body;
    console.log("commission", req.body);
    var com = await Commission.findOne({ _id: id }).exec();
    if (com != null) {
        var trans = await Transaction.findOne({ _id: com.trans_id }).exec();
        var convertedCom = await convertCommissionView(com);
        res.json({
            status: 200,
            data: {
                com: convertedCom,
                trans
            },
            message: "",
            errors: [],
        });
    }
    else {
        res.json({
            status: 204,
            data: "",
            message: "Không tìm thấy id: " + id,
            errors: [],
        });
    }
}

exports.updateReceiveMemId = async (req, res) => {
    console.log(req.body);
    const { id, note } = req.body;
    const receive_mem_id = req.body.receive_mem_id;
    var comm = await Commission.findOne({ _id: id }).exec();
    if (comm != null) {
        var user = await User.findOne({ _id: receive_mem_id }).exec();
        if (user != null) {
            await Commission.findOneAndUpdate({ _id: id },
                {
                    receive_mem_id: receive_mem_id,
                    receive_mem_name: user.full_name,
                    bank_account: user.bank_account,
                    bank: user.bank,
                    bank_name: user.bank_name,
                    mtime: new Date(),
                    mid: req.id_admin,
                    account_type: user.account_type,
                    note
                }).exec();
            var kq = await convertCommissionView(await Commission.findOne({ _id: id }).exec());
            res.json({
                status: 200,
                data: {
                    kq
                },
                message: "Cập nhật thành công",
                errors: [],
            });
        }
        else {
            res.json({
                status: 204,
                data: "",
                message: "Không tìm thấy mã giới thiệu " + receive_mem_id,
                errors: [],
            });
        }
    }
    else {
        res.json({
            status: 204,
            data: "",
            message: "Không tìm thấy hoa hồng có ID: " + id,
            errors: [],
        });
    }

}

exports.changeStatus = async (req, res) => {
    const { id } = req.body;
    const io = req.app.get('io');
    const status = "success";
    var comm = await Commission.findOne({ _id: id }).exec();
    if (comm) {
        var user = await User.findOne({ _id: req.id_admin }).exec();
        await Commission.findOneAndUpdate({ _id: id },
            {
                status: status,
                approved_by: user.full_name,
                approved_time: new Date(),
                payment_method: "thucong"
            }).exec();
        var pig = comm.buy_package === '1' ? process.env.PIG_PACKAGE1 :
            comm.buy_package === '2' ? process.env.PIG_PACKAGE2 :
                comm.buy_package === '3' ? process.env.PIG_PACKAGE3 :
                    process.env.PIG_PACKAGE4;
        io.emit("AdminApproveCommission", { data: pig });
        res.json({
            status: 200,
            data: "",
            message: "Thay đổi thành công",
            errors: [],
        });
    } else {
        res.json({
            status: 204,
            data: "",
            message: "Có lỗi xảy ra vui lòng thử lại",
            errors: [],
        });
    }
}

const convertCommissionView = async (comm) => {
    var tran = await Transaction.findOne({ _id: comm.trans_id }).exec();
    var user = await User.findOne({ _id: comm.receive_mem_id, is_delete: false }).exec();
    var kq = {
        _id: comm._id,
        join_mem_name: comm.join_mem_name,
        receive_mem_name: comm.receive_mem_name,
        status: comm.status,
        created_time: comm.created_time,
        amount_vnd: comm.amount_vnd,
        amount_usd: comm.amount_usd,
        payment_method: comm.payment_method,
        join_mem_id: comm.join_mem_id,
        receive_mem_id: comm.receive_mem_id,
        approved_by: comm.approved_by,
        approved_time: comm.approved_time,
        qualified: comm.qualified,
        bank_account: comm.bank_account,
        bank: comm.bank,
        bank_name: comm.bank_name,
        mtime: comm.mtime,
        mid: comm.mid,
        trans_id: comm.trans_id,
        trans_info: tran,
        is_active: user === null ? false : user.active,
        buy_package: user.buy_package,
        note: comm.note ? comm.note : "",
        is_renew: comm.is_renew,
        account_type: user.account_type,
        request_commission: (user.request_commission && user.request_commission !== "undefined") ? user.request_commission : "",
        email: comm.email
    }
    return kq;
}


exports.returnCommissionNL = async (req, res) => {
    const { id } = req.body;
    console.log('body', req.body);
    const io = req.app.get('io');
    var comm = await Commission.findOne({ _id: id }).exec();
    var user = await User.findOne({ _id: req.id_admin }).exec();

    const request = {
        merchant_id: process.env.MERCHANT_ID_NL,
        merchant_password: process.env.PASSWORD_NL,
        receiver_email: process.env.EMAIL_NL,
        func: "SetCashoutRequest",
        ref_code: id + "_AMERITEC_" + randomString(6),
        total_amount: req.body.total_amount,
        account_type: 3,
        bank_code: req.body.bank_code,
        card_fullname: req.body.card_fullname,
        card_number: req.body.card_number,
    }

    console.log('request', request);

    var formData = new FormData();
    formData.append("merchant_id", process.env.MERCHANT_ID_NL);
    formData.append("merchant_password", process.env.PASSWORD_NL);
    formData.append("receiver_email", process.env.EMAIL_NL);
    formData.append("func", "SetCashoutRequest");
    formData.append("ref_code", id + "_AMERITEC_" + randomString(6));
    formData.append("total_amount", req.body.total_amount);
    // formData.append("total_amount", 10000000);
    formData.append("account_type", 3);
    formData.append("bank_code", req.body.bank_code);
    formData.append("card_fullname", req.body.card_fullname);
    formData.append("card_number", req.body.card_number);

    axios
    .create({headers: formData.getHeaders()})
    .post("https://www.nganluong.vn/withdraw.api.post.php", formData)
        .then(async response => {
            console.log("result", response.data);
            const { error_code, ref_code, transaction_status } = response.data;
            var error = false;
            var message = "";
            if (error_code === "00") {
                if (transaction_status === "00") {
                    message = "Thanh toán thành công";
                    const status = "success";
                    await Commission.findOneAndUpdate({ _id: id },
                        {
                            status: status,
                            approved_by: user.full_name,
                            approved_time: new Date(),
                            payment_method: "nganluong",
                            ref_code
                        }).exec();
                    let pig = comm.buy_package === '1' ? process.env.PIG_PACKAGE1 :
                        comm.buy_package === '2' ? process.env.PIG_PACKAGE2 :
                            comm.buy_package === '3' ? process.env.PIG_PACKAGE3 :
                                process.env.PIG_PACKAGE4;
                    io.emit("AdminApproveCommission", { data: pig });
                }
                if (transaction_status === "01") {
                    message = "Yêu cầu đang được xử lí";
                    const status = "processing";
                    await Commission.findOneAndUpdate({ _id: id },
                        {
                            status: status,
                            payment_method: "nganluong",
                            ref_code
                        }).exec();
                }
                if (transaction_status === "02") {
                    error = true;
                    message = "Không thành công";
                }
            }

            if (error_code === "99") {
                error = true;
                message = "Lỗi không xác định";
            }

            if (error_code === "01") {
                error = true;
                message = "Merchant không được phép sử dụng phương thức này";
            }

            if (error_code === "02") {
                error = true;
                message = "Thông tin thẻ sai định dạng";
            }

            if (error_code === "03") {
                error = true;
                message = "Thông tin merchant không chính xác";
            }

            if (error_code === "04") {
                error = true;
                message = "Có lỗi trong quá trình kết nối. Cần liên hệ lại với Ngân Lượng để kiểm tra trạng thái cuối cùng của giao dịch.";
            }

            if (error_code === "05") {
                error = true;
                message = "Số tiền không hợp lệ";
            }

            if (error_code === "06") {
                error = true;
                message = "Tên chủ thẻ không hợp lệ";
            }

            if (error_code === "07") {
                error = true;
                message = "Số tài khoản không hợp lệ";
            }

            if (error_code === "08") {
                error = true;
                message = "Lỗi kết nối tới ngân hàng. Lỗi xảy ra khi ngân hàng đang bảo trì, nâng cấp mà không xuất phát từ merchant";
            }

            if (error_code === "09") {
                error = true;
                message = "bank code không hợp lệ";
            }

            if (error_code === "10") {
                error = true;
                message = "Số dư tài khoản không đủ để thực hiện giao dịch";
            }

            if (error_code === "11") {
                error = true;
                message = "Mã tham chiếu ( ref_code ) không hợp lệ";
            }

            if (error_code === "12") {
                error = true;
                message = "Mã tham chiếu ( ref_code ) đã tồn tại";
            }

            if (error_code === "16") {
                error = true;
                message = "receiver_email đang bị khóa hoặc phong tỏa không thể giao dịch";
            }

            if (error_code === "18") {
                error = true;
                message = "Ngân hàng đang bảo trì";
            }

            if (error) {
                res.json({
                    status: 401,
                    data: "",
                    message,
                    errors: [],
                });
            } else {
                res.json({
                    status: 200,
                    data: "",
                    message,
                    errors: [],
                });
            }

        })
        .catch(err => {
            setSubmitting(false);
            console.log("Đã xảy ra lỗi vui lòng thử lại sau");
        })
}

exports.checkCashOutStatusNL = async (req, res) => {
    const { id } = req.body;
    console.log('body', req.body);
    const io = req.app.get('io');
    var comm = await Commission.findOne({ _id: id }).exec();

    var formData = new FormData();

    formData.append("merchant_id", process.env.MERCHANT_ID_NL);
    formData.append("merchant_password", process.env.PASSWORD_NL);
    formData.append("receiver_email", process.env.EMAIL_NL);
    formData.append("func", "CheckCashout");
    formData.append("ref_code", comm.ref_code);

    axios.create({
        headers: formData.getHeaders()
    }).post("https://www.nganluong.vn/withdraw.api.post.php", formData)
        .then(async response => {
            console.log("result", response.data);
            const { error_code, ref_code, transaction_status } = response.data;
            var error = false;
            var message = "";
            if (error_code === "00") {
                if (transaction_status === "00") {
                    message = "Thanh toán thành công";
                    const status = "success";
                    await Commission.findOneAndUpdate({ _id: id },
                        {
                            status: status,
                            approved_by: user.full_name,
                            approved_time: new Date(),
                            payment_method: "nganluong",
                            ref_code
                        }).exec();
                    var pig = comm.buy_package === '1' ? process.env.PIG_PACKAGE1 :
                        comm.buy_package === '2' ? process.env.PIG_PACKAGE2 :
                            comm.buy_package === '3' ? process.env.PIG_PACKAGE3 :
                                process.env.PIG_PACKAGE4;
                    io.emit("AdminApproveCommission", { data: pig });
                }
                if (transaction_status === "01") {
                    error = true;
                    message = "Yêu cầu đang được xử lí";
                }
                if (transaction_status === "02") {
                    error = true;
                    message = "Không thành công";
                }
                if (transaction_status === "03") {
                    error = true;
                    message = "Giao dịch đã hoàn trả";
                }
            }

            if (error) {
                res.json({
                    status: 401,
                    data: "",
                    message,
                    errors: [],
                });
            } else {
                res.json({
                    status: 200,
                    data: "",
                    message,
                    errors: [],
                });
            }

        })
        .catch(err => {
            setSubmitting(false);
            console.log("Đã xảy ra lỗi vui lòng thử lại sau");
        })
}