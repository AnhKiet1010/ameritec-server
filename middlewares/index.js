const jwt = require('jsonwebtoken');
const User = require('../models/user.model');

exports.checkAdmin = async (req, res, next) => {
  const headersToken = req.get('authorization');
  if (!headersToken) {
    return res.json({
      status: 401,
      message: "Permission denied!",
      errors: [],
    });
  }
  const token = headersToken.split(' ')[1];

  jwt.verify(
    token,
    process.env.JWT_SECRET,
    async (err, decoded) => {
      if (err) {
        return res.json({
          status: 401,
          message: "Phiên đăng nhập đã hết hạn.Vui lòng đăng nhập lại!",
          errors: [],
        });
      } else {
        const { _id } = jwt.decode(token);
        User.findOne({ _id }, function (err, user) {
          if (err || !user || user.role !== 'admin') {
            console.log('err', err);
            return res.json({
              status: 403,
              message: "Not permission",
              errors: [],
            });
          }
          req.id_admin = _id;
          next();
        });
      }
    });
}

exports.checkSystem = async (req, res, next) => {
  console.log("checking system");
  const headersToken = req.get('authorization');
  if (!headersToken) {
    return res.json({
      status: 401,
      message: "Permission denied!",
      errors: [],
    });
  }
  const token = headersToken.split(' ')[1];

  jwt.verify(
    token,
    process.env.JWT_SECRET,
    async (err, decoded) => {
      if (err) {
        return res.json({
          status: 401,
          message: "Phiên đăng nhập đã hết hạn.Vui lòng đăng nhập lại!",
          errors: [],
        });
      } else {
        const { _id } = jwt.decode(token);
        User.findOne({ _id }, function (err, user) {
          if ((!err && user) && (user.role === 'admin' || user.role === 'accountant1' || user.role === 'accountant2' || user.role === 'system')) {
            req.id_admin = _id;
            next();
          } else {
            return res.json({
              status: 403,
              message: "Not permission",
              errors: [],
            });
          }
        });
      }
    });
}

exports.checkAccountant1 = async (req, res, next) => {
  const headersToken = req.get('authorization');
  if (!headersToken) {
    return res.json({
      status: 401,
      message: "Permission denied!",
      errors: [],
    });
  }
  const token = headersToken.split(' ')[1];

  jwt.verify(
    token,
    process.env.JWT_SECRET,
    async (err, decoded) => {
      if (err) {
        return res.json({
          status: 401,
          message: "Phiên đăng nhập đã hết hạn.Vui lòng đăng nhập lại!",
          errors: [],
        });
      } else {
        const { _id } = jwt.decode(token);
        User.findOne({ _id }, function (err, user) {
          if ((!err && user) && (user.role === 'admin' || user.role === 'accountant1')) {
            req.id_admin = _id;
            next();
          } else {
            return res.json({
              status: 403,
              message: "Not permission",
              errors: [],
            });
          }
        });
      }
    });
}

exports.checkAccountant2 = async (req, res, next) => {
  const headersToken = req.get('authorization');
  if (!headersToken) {
    return res.json({
      status: 401,
      message: "Permission denied!",
      errors: [],
    });
  }
  const token = headersToken.split(' ')[1];

  jwt.verify(
    token,
    process.env.JWT_SECRET,
    async (err, decoded) => {
      if (err) {
        return res.json({
          status: 401,
          message: "Phiên đăng nhập đã hết hạn.Vui lòng đăng nhập lại!",
          errors: [],
        });
      } else {
        const { _id } = jwt.decode(token);
        User.findOne({ _id }, function (err, user) {
          if ((!err && user) && (user.role === 'admin' || user.role === 'accountant1' || user.role === 'accountant2')) {
            req.id_admin = _id;
            next();
          } else {
            return res.json({
              status: 403,
              message: "Not permission",
              errors: [],
            });
          }
        });
      }
    });
}

exports.checkClient = async (req, res, next) => {
  const headersToken = req.get('authorization');
  const token = headersToken.split(' ')[1];

  jwt.verify(
    token,
    process.env.JWT_SECRET,
    async (err, decoded) => {
      if (err) {
        return res.json({
          status: 401,
          message: "Phiên đăng nhập đã hết hạn.Vui lòng đăng nhập lại!",
          errors: [],
        });
      } else {
        const { _id } = jwt.decode(token);

        const user = await User.findOne({ _id }).exec();
        if (user.role !== 'normal') {
          return res.json({
            status: 403,
            message: "Not permission",
            errors: [],
          })
        }
        req.user_id = _id;
        next();
      }
    });
}

exports.check = async (req, res, next) => {
  const headersToken = req.get('authorization');
  const token = headersToken.split(' ')[1];

  jwt.verify(
    token,
    process.env.JWT_SECRET,
    async (err, decoded) => {
      if (err) {
        return res.json({
          status: 401,
          message: "Phiên đăng nhập đã hết hạn.Vui lòng đăng nhập lại!",
          errors: [],
        });
      } else {
        const { _id } = jwt.decode(token);

        const user = await User.findOne({ _id }).exec();
        if (!user) {
          return res.json({
            status: 403,
            message: "Not permission",
            errors: [],
          })
        }
        req.user_id = _id;
        next();
      }
    });
}

