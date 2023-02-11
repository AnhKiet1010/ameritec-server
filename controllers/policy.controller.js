const User = require("../models/user.model");
const Policy = require("../models/policy.model");
const {
  randomString,
  removeAccents
} = require("./method");
const fs = require('fs');

exports.createPolicy = async (req, res) => {
  console.log('body', req.body);
  const io = req.app.get('io');
  const {
    title_vn,
    text_vn,
    title_en,
    text_en,
    type,
    category
  } = req.body;

  const files = req.files;

  var filename = "";
  if (files.file) {
    const randomstring = randomString();

    // name of file
    filename = randomstring + '-file.' + files.file[0].filename.split('.').pop();
    fs.rename('./' + files.file[0].path, './public/uploads/document/' + filename, (err) => {
      if (err) console.log(err);
    });
  }

  var filename_en = "";
  if (files.file_en) {
    const randomstring = randomString();

    // name of file
    filename_en = randomstring + '-file.' + files.file_en[0].filename.split('.').pop();
    fs.rename('./' + files.file_en[0].path, './public/uploads/document/' + filename_en, (err) => {
      if (err) console.log(err);
    });
  }

  const cAdmin = await User.findOne({ _id: req.id_admin }).exec();

  const policy = new Policy({
    u_title: removeAccents(title_vn),
    title_vn,
    text_vn,
    title_en,
    text_en,
    ctime: new Date(),
    cid: cAdmin.id,
    cname: cAdmin.full_name,
    mtime: "",
    mid: "",
    mname: "",
    type,
    filename,
    filename_en,
    category,
    is_delete: false
  });


  await policy.save((err) => {
    if (err) {
      console.log(err);
      res.json({
        status: 401,
        errors: [],
        message: "Có lỗi xảy ra!"
      });
    } else {
      io.emit('AdminAddNoti');
      res.json({
        status: 200,
        errors: [],
        message: "Đã lưu thành công"
      });
    }
  });
}

exports.getPolicyList = async (req, res) => {
  const keyword = req.body.keyword ? req.body.keyword : "";
  const category = req.body.currentTable;
  const page = parseInt(req.body.page);
  const searchType = parseInt(req.body.searchType);
  const perPage = parseInt(req.body.resultsPerPage);
  const currentMonth = parseInt(req.body.currentMonth);
  const currentYear = parseInt(req.body.currentYear);
  var skip = 0;

  if (page > 1) {
    skip = (page - 1) * perPage;
  }

  var listPolicy = [];
  var countAllDocument = 0;

  if (searchType === 1) {
    listPolicy = await Policy.find({ $and: [{ category }, { is_delete: false }] }).sort({ _id: -1 }).limit(perPage).skip(skip).exec();
    countAllDocument = await Policy.countDocuments({ $and: [{ category }, { is_delete: false }] }).sort({ _id: -1 }).exec();
  }

  if (searchType === 2) {
    listPolicy = await Policy.find({ $and: [{ category }, { is_delete: false }, { u_title: { $regex: '.*' + removeAccents(keyword) + '.*', $options: 'i' } }] }).limit(perPage).skip(skip).sort({ _id: -1 }).exec();
    countAllDocument = await Policy.countDocuments({ $and: [{ category }, { is_delete: false }, { u_title: { $regex: '.*' + keyword + '.*', $options: 'i' } }] }).sort({ _id: -1 }).exec();
  }

  if (searchType === 3) {
    let firstDay = new Date(currentYear, currentMonth - 1, 1);
    let lastDay = new Date(currentYear, currentMonth, 0);
    listPolicy = await Policy.find({
      $and: [{ category }, { is_delete: false },
      {
        ctime: {
          $gte: firstDay,
          $lte: lastDay
        }
      }
      ]
    }).sort({ _id: -1 }).limit(perPage).skip(skip).exec();
    countAllDocument = await Policy.countDocuments({
      $and: [{ category }, {
        ctime: {
          $gte: firstDay,
          $lte: lastDay
        }
      }]
    }).sort({ _id: -1 }).exec();
  }

  res.json({
    status: 200,
    data: {
      listPolicy,
      allPage: Math.ceil(countAllDocument / perPage),
      countAllDocument
    },
    errors: [],
    message: ""
  });
}

exports.deletePolicy = async (req, res) => {
  const {
    id
  } = req.body;

  const mAdmin = await User.findOne({ _id: req.id_admin }).exec();

  console.log('mAdmin', mAdmin);

  await Policy.findOneAndUpdate({ _id: id }, { is_delete: true, mid: mAdmin._id, mname: mAdmin.full_name }).exec();

  res.json({
    status: 200,
    message:
      "Đã xóa thành công",
    errors: [],
  });
}

exports.getPolicy = async (req, res) => {
  const {
    id
  } = req.body;

  const policy = await Policy.findOne({ _id: id }).exec();

  res.json({
    status: 200,
    message: "",
    data: {
      policy
    },
    errors: [],
  });
}

exports.editPolicy = async (req, res) => {
  console.log('body', req.body);
  const {
    id,
    title_vn,
    text_vn,
    title_en,
    text_en,
    category
  } = req.body;

  const currentPolicy = await Policy.findOne({ _id: id }).exec();

  if (currentPolicy.type === 'file') {
    const files = req.files;

    var filename = currentPolicy.filename;
    if (files.file) {
      const randomstring = randomString();

      // name of file
      filename = randomstring + '-file.' + files.file[0].filename.split('.').pop();
      fs.rename('./' + files.file[0].path, './public/uploads/document/' + filename, (err) => {
        if (err) console.log(err);
      });
    }

    var filename_en = currentPolicy.filename_en;
    if (files.file_en) {
      const randomstring = randomString();

      // name of file
      filename_en = randomstring + '-file.' + files.file_en[0].filename.split('.').pop();
      fs.rename('./' + files.file_en[0].path, './public/uploads/document/' + filename_en, (err) => {
        if (err) console.log(err);
      });
    }
  }

  const mAdmin = await User.findOne({ _id: req.id_admin }).exec();

  await Policy.findOneAndUpdate({ _id: id }, {
    u_title: removeAccents(title_vn),
    title_vn,
    text_vn,
    title_en,
    text_en,
    mtime: new Date(),
    mid: mAdmin._id,
    mname: mAdmin.full_name,
    filename,
    filename_en,
    category,
  }).exec();
  res.json({
    status: 200,
    errors: [],
    message: "Đã lưu thành công"
  });
}

