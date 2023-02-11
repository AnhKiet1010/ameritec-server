const User = require("../models/user.model");
const Request = require("../models/request.model");
const { thankMail, successMail, randomString, getActiveLink, returnCommission, createCloneBuyPackage3, updateParent, checkLevel, checkPoint, removeAccents } = require("./method");

exports.changeStatus = async (req, res) => {
  const { id, status, denied_reason } = req.body;
  const io = req.app.get('io');
  await Request.findOneAndUpdate(
    { _id: id },
    {
      status,
      mtime: new Date(),
      mid: req.id_admin,
      denied_reason
    }
  ).exec();
  const currentRequest = await Request.findOne({_id: id}).exec();
  io.emit("AdminChangeStatusRequest", {data: currentRequest.request_id});
  res.json({
    status: 200,
    message: "Đã đổi trạng thái",
    data: {},
    errors: [],
  });
};

exports.countRequestUser = async (req, res) => {
  const count = await Request.countDocuments({$and: [{ status: "pending" }, {is_delete: false}]}).exec();
  res.json({
    count
  });
}

exports.deleteRequest = async (req, res) => {
  const id = req.body.id;
  await Request.findOneAndUpdate({ _id: id}, {is_delete: true, mid: req.id_admin, mtime: new Date}).exec();
  return res.json({
    status: 200,
    message: "Đã xóa yêu cầu",
    errors: [],
  });
}

exports.getListRequest = async (req, res) => {
  const keyword = req.body.keyword ? req.body.keyword : "";
  const status = req.body.currentTable;
  const page = parseInt(req.body.page);
  const perPage = parseInt(req.body.perPage);
  var listRequest = [];
  var countAllDocument = 0;

  if(status === 'pending') {
    listRequest = await Request.find({
      $and: [
        {status: 'pending'},
        {"request_uname": { $regex: '.*' + removeAccents(keyword) + '.*', $options: 'i' }},
        {is_delete: false}
      ]
    }).sort({ _id: -1 }).limit(perPage).skip(perPage * (page - 1)).exec();
    countAllDocument = await Request.countDocuments({
      $and: [
        {status},
        {"request_uname": { $regex: '.*' + removeAccents(keyword) + '.*', $options: 'i' }},
        {is_delete: false}
      ]
    }).exec();
  }

  if(status !== 'pending') {
    listRequest = await Request.find({
      $and: [
        { status: {$ne: 'pending'}},
        {"request_uname": { $regex: '.*' + removeAccents(keyword) + '.*', $options: 'i' }},
        {is_delete: false}
      ]
    }).sort({ _id: -1 }).limit(perPage).skip(perPage * (page - 1)).exec();
    countAllDocument = await Request.countDocuments({
      $and: [
        {status : {$ne: 'pending'}},
        {"request_uname": { $regex: '.*' + removeAccents(keyword) + '.*', $options: 'i' }},
        {is_delete: false}
      ]
    }).exec();
  }

  res.json({
    status: 200,
    data: {
      listRequest,
      allPage: Math.ceil(countAllDocument / perPage),
      countAllDocument
    },
    message: "",
    errors: [],
  });
}

exports.getListRequestByUserId = async (req, res) => {
  const { id } = req.body;
  var listRequest = [];

    listRequest = await Request.find({$and: [{request_id: id}, {is_delete: false}]}).sort({_id: -1}).exec();

  res.json({
    status: 200,
    data: {
      listRequest
    },
    message: "",
    errors: [],
  });
}
