const Package = require("../models/package.model");

exports.getListPackage = async (req, res) => {
  var listPackage = await Package.find().exec();
  res.json({
    status: 200,
    data: {
      listPackage
    },
    message: "",
    errors: [],
  });
}

exports.getDetailPackage = async (req, res) => {
  const { id } = req.body;
  var package = await Package.findOne({ _id: id }).exec();
  console.log('package', package);
  res.json({
    status: 200,
    data: { package },
    message: "",
    errors: [],
  });
}

exports.updatePackage = async (req, res) => {
  const {
    id,
    price_vnd,
    price_usd,
    commission_package1_vnd,
    commission_package1_usd,
    commission_package2_vnd,
    commission_package2_usd,
    commission_package3_vnd,
    commission_package3_usd,
    commission_package4_vnd,
    commission_package4_usd,
    active
  } = req.body;
  const idadmin = req.id_admin;
  await Package.findOneAndUpdate({ _id: id },
    {
      price_vnd,
      price_usd,
      commission: {
        package1: {
          price_vnd: commission_package1_vnd,
          price_usd: commission_package1_usd
        },
        package2: {
          price_vnd: commission_package2_vnd,
          price_usd: commission_package2_usd
        },
        package3: {
          price_vnd: commission_package3_vnd,
          price_usd: commission_package3_usd
        },
        package4: {
          price_vnd: commission_package4_vnd,
          price_usd: commission_package4_usd
        }
      },
      mid: idadmin,
      mtime: new Date(),
      active: active
    }).exec();
  res.json({
    status: 200,
    data: {},
    message: "Cập nhật gói thành công",
    errors: [],
  });
}

exports.createPackage = async (req, res) => {
  const {
    sid,
    name,
    name_en,
    price_vnd,
    price_usd,
    commission
  } = req.body;
  const idadmin = req.id_admin;
  var package = new Package({
    sid,
    name,
    name_en,
    price_vnd,
    price_usd,
    commission,
    cid: idadmin,
    ctime: new Date()
  });
  await package.save();
  res.json({
    status: 200,
    data: package,
    message: "Tạo gói mới thành công",
    errors: [],
  });
}

exports.deletePackage = async (req, res) => {
  const {
    id
  } = req.body;
  await Package.deleteOne({
    _id: id
  }).exec();
  res.json({
    status: 200,
    data: "",
    message: "Xóa gói thành công",
    errors: [],
  });
}