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
            message: "Kh??ng t??m th???y id: " + id,
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
                message: "C???p nh???t th??nh c??ng",
                errors: [],
            });
        }
        else {
            res.json({
                status: 204,
                data: "",
                message: "Kh??ng t??m th???y m?? gi???i thi???u " + receive_mem_id,
                errors: [],
            });
        }
    }
    else {
        res.json({
            status: 204,
            data: "",
            message: "Kh??ng t??m th???y hoa h???ng c?? ID: " + id,
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
            message: "Thay ?????i th??nh c??ng",
            errors: [],
        });
    } else {
        res.json({
            status: 204,
            data: "",
            message: "C?? l???i x???y ra vui l??ng th??? l???i",
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
                    message = "Thanh to??n th??nh c??ng";
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
                    message = "Y??u c???u ??ang ???????c x??? l??";
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
                    message = "Kh??ng th??nh c??ng";
                }
            }

            if (error_code === "99") {
                error = true;
                message = "L???i kh??ng x??c ?????nh";
            }

            if (error_code === "01") {
                error = true;
                message = "Merchant kh??ng ???????c ph??p s??? d???ng ph????ng th???c n??y";
            }

            if (error_code === "02") {
                error = true;
                message = "Th??ng tin th??? sai ?????nh d???ng";
            }

            if (error_code === "03") {
                error = true;
                message = "Th??ng tin merchant kh??ng ch??nh x??c";
            }

            if (error_code === "04") {
                error = true;
                message = "C?? l???i trong qu?? tr??nh k???t n???i. C???n li??n h??? l???i v???i Ng??n L?????ng ????? ki???m tra tr???ng th??i cu???i c??ng c???a giao d???ch.";
            }

            if (error_code === "05") {
                error = true;
                message = "S??? ti???n kh??ng h???p l???";
            }

            if (error_code === "06") {
                error = true;
                message = "T??n ch??? th??? kh??ng h???p l???";
            }

            if (error_code === "07") {
                error = true;
                message = "S??? t??i kho???n kh??ng h???p l???";
            }

            if (error_code === "08") {
                error = true;
                message = "L???i k???t n???i t???i ng??n h??ng. L???i x???y ra khi ng??n h??ng ??ang b???o tr??, n??ng c???p m?? kh??ng xu???t ph??t t??? merchant";
            }

            if (error_code === "09") {
                error = true;
                message = "bank code kh??ng h???p l???";
            }

            if (error_code === "10") {
                error = true;
                message = "S??? d?? t??i kho???n kh??ng ????? ????? th???c hi???n giao d???ch";
            }

            if (error_code === "11") {
                error = true;
                message = "M?? tham chi???u ( ref_code ) kh??ng h???p l???";
            }

            if (error_code === "12") {
                error = true;
                message = "M?? tham chi???u ( ref_code ) ???? t???n t???i";
            }

            if (error_code === "16") {
                error = true;
                message = "receiver_email ??ang b??? kh??a ho???c phong t???a kh??ng th??? giao d???ch";
            }

            if (error_code === "18") {
                error = true;
                message = "Ng??n h??ng ??ang b???o tr??";
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
            console.log("???? x???y ra l???i vui l??ng th??? l???i sau");
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
                    message = "Thanh to??n th??nh c??ng";
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
                    message = "Y??u c???u ??ang ???????c x??? l??";
                }
                if (transaction_status === "02") {
                    error = true;
                    message = "Kh??ng th??nh c??ng";
                }
                if (transaction_status === "03") {
                    error = true;
                    message = "Giao d???ch ???? ho??n tr???";
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
            console.log("???? x???y ra l???i vui l??ng th??? l???i sau");
        })
}