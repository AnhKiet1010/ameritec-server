const MailTemplate = require("../models/mailtemplate.model");

exports.createMailTemplate = async (req, res) => {
    const { template_name, content, params } = req.body;
    var mail = new MailTemplate({
        template_name,
        content,
        subject
    });
    await mail.save();
    res.json({
        status: 200,
        data: {
            mail
        },
        errors: [],
        message: ""
    });
}

exports.detailMailTemplate = async (req, res) => {
    const { id } = req.body;
    var mail = await MailTemplate.findOne({ _id: id }).exec();

    res.json({
        status: 200,
        data: {
            mail
        },
        errors: [],
        message: ""
    });
}

exports.getListMailTemplate = async (req, res) => {
    var mail = await MailTemplate.find({}).exec();

    res.json({
        status: 200,
        data: {
            mail
        },
        errors: [],
        message: ""
    });
}

exports.updateMailTemplate = async (req, res) => {
    const {
        id,
        content_vn,
        content_en,
        subject_vn,
        subject_en,
    } = req.body;

    await MailTemplate.findOneAndUpdate({ _id: id }, {
        content_vn,
        content_en,
        subject_vn,
        subject_en,
    }).exec();
    
    const mail = await MailTemplate.findOne({_id: id}).exec();
    res.json({
        status: 200,
        data: { mail },
        errors: [],
        message: "Cập nhật thành công"
    });
}

exports.deleteMailTemplate = async (req, res) => {
    const {
        id
    } = req.body;
    await MailTemplate.deleteMany({ _id: id }).exec();
    res.json({
        status: 200,
        errors: "",
        message: "success"
    });
}