const User = require("../models/user.model");
const Transaction = require("../models/transaction.model");
const Tree = require("../models/tree.model");
const Commission = require("../models/commission.model");
const Activation = require("../models/activation.model");
const Package = require("../models/package.model");
const axios = require("axios");
const {
  thankMail,
  successMail,
  randomString,
  removeAccents,
} = require("./method");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const { Mail } = require("./mail");
const MailTemplate = require("../models/mailtemplate.model");
const fs = require("fs");

const saltRounds = 10;

exports.checkLinkController = async (req, res) => {
  const { invite_code, donate_sales_id, group } = req.body;
  if (invite_code === process.env.INVITE_CODE) {
    res.json({
      status: 200,
      message: "Link giới thiệu đúng",
      errors: [],
    });
  } else {
    if (
      invite_code.split("").length !== 24 ||
      donate_sales_id.split("").length !== 24
    ) {
      res.json({
        status: 400,
        message: "Link giới thiệu không đúng",
        errors: [],
      });
    } else if (parseInt(group) <= 0 || parseInt(group) > 3) {
      res.json({
        status: 400,
        message: "Link giới thiệu không đúng group",
        errors: [],
      });
    } else {
      const invalid_invite_code = await User.findById(invite_code).exec();
      const invalid_donate_sales_id = await User.findById(
        donate_sales_id
      ).exec();

      if (!invalid_invite_code || !invalid_donate_sales_id) {
        res.json({
          status: 400,
          message: "Link giới thiệu không đúng",
          errors: [],
        });
      } else {
        if (
          invalid_invite_code.is_delete ||
          !invalid_invite_code.is_partner ||
          !invalid_invite_code.active ||
          invalid_invite_code.expired
        ) {
          res.json({
            status: 400,
            message: "Link giới thiệu không đúng",
            errors: [],
          });
        } else {
          if (group === "1" || group === "2" || group === "3") {
            res.json({
              status: 200,
              message: "",
              errors: [],
            });
          } else {
            console.log("err here");
            res.json({
              status: 400,
              message: "Link giới thiệu không đúng",
              errors: [],
            });
          }
        }
      }
    }
  }
};

exports.getPackageList = async (req, res) => {
  const { lang } = req.body;
  const listPackage = await Package.find().exec();
  res.json({
    status: 200,
    data: {
      pricePrivate:
        lang === "vi"
          ? listPackage[0].price_vnd
              .toString()
              .replace(/(\d)(?=(\d{3})+(?!\d))/g, "$1,")
          : listPackage[0].price_usd,
      priceStartup:
        lang === "vi"
          ? listPackage[1].price_vnd
              .toString()
              .replace(/(\d)(?=(\d{3})+(?!\d))/g, "$1,")
          : listPackage[1].price_usd,
      priceBusiness:
        lang === "vi"
          ? listPackage[2].price_vnd
              .toString()
              .replace(/(\d)(?=(\d{3})+(?!\d))/g, "$1,")
          : listPackage[2].price_usd,
      priceBusinessB:
        lang === "vi"
          ? listPackage[3].price_vnd
              .toString()
              .replace(/(\d)(?=(\d{3})+(?!\d))/g, "$1,")
          : listPackage[3].price_usd,
      activePrivate: listPackage[0].active,
      activeStartup: listPackage[1].active,
      activeBusiness: listPackage[2].active,
      activeBusinessB: listPackage[3].active,
    },
    message: "",
    errors: [],
  });
};

exports.checkTransId = async (req, res) => {
  const { transId } = req.body;
  const trans = await Transaction.findById({ _id: transId }).exec();

  if (!trans || trans.status !== "pending") {
    res.json({
      status: 400,
      message: "",
      errors: [],
    });
  } else {
    res.json({
      status: 200,
      message: "",
      data: {
        trans,
      },
      errors: [],
    });
  }
};

exports.registerController = async (req, res) => {
  const {
    full_name,
    email,
    password,
    phone,
    id_code,
    issued_by,
    bank,
    bank_account,
    bank_name,
    iden_type,
    tax_code,
    birthday,
    gender,
    invite_code,
    donate_sales_id,
    group_number,
    buy_package,
    id_time,
    is_partner,
    account_type,
    state,
    ss,
    request_commission,
    drive_id,
  } = req.body;
console.log("check");
  const user_repeat_email = await User.findOne({ email: email.toLowerCase() }).exec();

  await Transaction.deleteMany({ email, status: "pending" }).exec();

  const errors = [];

  if (user_repeat_email) {
    errors.push({ label: "email", err_message: "Email này đã được sử dụng" });
  }

  const user_repeat_id_code = await User.findOne({
    $and: [{ id_code: id_code }, { id_code: { $ne: "" } }],
  }).exec();

  if (user_repeat_id_code) {
    errors.push({
      label: "id_code",
      err_message: "Số CMND đã được sử dụng",
    });
  }

  if (errors.length > 0) {
    res.json({
      status: 401,
      errors,
      message: "Có lỗi xảy ra!",
    });
  } else {
    const files = req.files;
    var cmndMT = "";
    var cmndMS = "";

    if (files && files.CMND_Front && files.CMND_Back) {
      const randomstring = randomString();

      // name of front image
      cmndMT =
        randomstring +
        "_front." +
        files.CMND_Front[0].filename.split(".").pop();
      fs.rename(
        "./" + files.CMND_Front[0].path,
        "./public/uploads/cmnd/" + cmndMT,
        (err) => {
          if (err) console.log(err);
        }
      );

      // name of back image
      cmndMS =
        randomstring + "_back." + files.CMND_Back[0].filename.split(".").pop();
      fs.rename(
        "./" + files.CMND_Back[0].path,
        "./public/uploads/cmnd/" + cmndMS,
        (err) => {
          if (err) console.log(err);
        }
      );
    }
    const datenow = new Date();

    const token = jwt.sign(
      {
        full_name,
        email: email.toLowerCase(),
        password,
        phone,
        id_code,
        issued_by,
        bank,
        bank_account,
        bank_name,
        iden_type,
        tax_code,
        birthday: new Date(birthday).setHours(0, 0, 0),
        gender,
        invite_code,
        donate_sales_id,
        group_number,
        buy_package,
        id_time: new Date(id_time).setHours(0, 0, 0),
        is_partner,
        account_type,
        cmndMT,
        cmndMS,
        state,
        ss,
        request_commission,
        drive_id,
      },
      process.env.JWT_ACCOUNT_ACTIVATION,
      { expiresIn: "48h" }
    );

    const oneYearFromNow = new Date();
    oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);

    const listPackage = await Package.find().exec();

    const amount_vnd = listPackage.find(
      (ele) => ele.sid == buy_package
    ).price_vnd;
    const amount_usd = listPackage.find(
      (ele) => ele.sid == buy_package
    ).price_usd;

    var invite_name = "Công Ty";
    if (invite_code !== process.env.INVITE_CODE) {
      let inviteUser = await User.findOne({ _id: invite_code }).exec();
      invite_name = inviteUser.full_name;
    }

    const newTransaction = new Transaction({
      status: "pending",
      payment_method: "",
      token,
      created_time: new Date(),
      created_by: full_name,
      email,
      phone,
      invite_id: invite_code,
      invite_name,
      user_id: "",
      user_name: full_name.toUpperCase(),
      user_uname: removeAccents(full_name.toUpperCase()),
      expired_time: oneYearFromNow,
      buy_package,
      amount_vnd,
      amount_usd,
      account_type,
    });

    await newTransaction.save(function (err) {
      if (err) {
        console.log("fail to save transaction!");
        res.json({
          status: 200,
          message: "fail to save transaction!",
          errors: [
            {
              label: "transaction",
              err_message: "Lỗi khi tạo giao dịch.Vui lòng thử lại sau",
            },
          ],
        });
      } else {
        console.log("save transaction done!");

        res.json({
          status: 200,
          message: "",
          data: { id: newTransaction._id },
          errors,
        });
      }
    });
  }
};

exports.loginController = async (req, res) => {
  const { acc, password } = req.body;
  await User.findOne({
    $and: [
      { email: acc.toLowerCase() },
      { is_clone: { $ne: true } },
      { is_partner: true },
      { is_delete: false },
      { expired: false },
      { active: true },
    ],
  }).exec((err, user) => {
    if (err || !user) {
      return res.json({
        status: 400,
        message: "",
        errors: [],
      });
    }

    bcrypt.compare(password, user.password, async function (err, result) {
      // result == true
      if (!result || err) {
        return res.json({
          status: 400,
          message: "",
          errors: [],
        });
      } else {
        // generate a token and send to client
        const access_token = jwt.sign(
          {
            _id: user._id,
          },
          process.env.JWT_SECRET,
          {
            expiresIn: "8h",
          }
        );
        return res.json({
          status: 200,
          data: {
            access_token,
            user: {
              id: user._id,
              avatar: user.avatar,
              full_name: user.full_name,
              amount: user.amount,
              level: user.level,
              point: user.point,
              role: user.role,
              phone: user.phone,
              email: user.email,
              buy_package: user.buy_package,
            },
          },
          message: "Đăng nhập thành công",
          errors: [],
        });
      }
    });
  });
};

const countTotalChildMemberForLevel = async (
  subTreeIdList,
  countLevel,
  level
) => {
  var count = 0;
  for (let id of subTreeIdList) {
    let branchObject = await Tree.findOne({ parent: id })
      .select("buy_package")
      .exec();
    if (branchObject.buy_package !== "1") {
      count++;
    }
  }

  if (countLevel === level) {
    return count;
  } else {
    for (let i = 0; i < subTreeIdList.length; i++) {
      let branchObject = await Tree.findOne({ parent: subTreeIdList[i]._id })
        .select("group1 group2 group3 buy_package")
        .exec();

      if (branchObject) {
        let group = [
          ...branchObject.group1,
          ...branchObject.group2,
          ...branchObject.group3,
        ];
        if (group.length !== 0 && branchObject.buy_package !== "1") {
          count += await countTotalChildMemberForLevel(
            group,
            countLevel++,
            level
          );
        } else {
          return count;
        }
      } else {
        continue;
      }
    }
  }
};

exports.forgotPasswordController = async (req, res) => {
  const { email } = req.body;

  const user = await User.findOne({
    $and: [{ email }, { is_clone: false }],
  }).exec();

  if (!user) {
    res.json({
      status: 404,
      message: "Người dùng với email này không tồn tại",
      errors: [],
      data: {},
    });
  } else {
    const token = jwt.sign(
      {
        _id: user._id,
      },
      process.env.JWT_RESET_PASSWORD,
      {
        expiresIn: "15m",
      }
    );
    var mail = await MailTemplate.findOne({
      template_name: "resetpass",
    }).exec();
    var signature = await MailTemplate.findOne({
      template_name: "signature",
    }).exec();
    var content;
    var subject;
    var linkreset = process.env.CLIENT_URL + "/users/password/reset/" + token;
    if (user.account_type == "vi") {
      content = mail.content_vn;
      content = content.replace("[CHU_KY]", signature.content_vn);
      subject = mail.subject_vn;
    }
    if (user.account_type == "en") {
      content = mail.content_en;
      content = content.replace("[CHU_KY]", signature.content_en);
      subject = mail.subject_en;
    }
    content = content.replace("[LINK_RESET_PASS]", linkreset);
    try {
      await Mail(email, content, subject);
      console.log("forgot pass sended!!!! to", email);

      await user
        .updateOne({
          reset_password_link: token,
        })
        .exec();

      return res.json({
        status: 200,
        message: `🎉 Mail đã được gửi đến ${email}`,
      });
    } catch (err) {
      console.log("error forgot pass mail!!!! to", email);
    }
  }
};

exports.resetPasswordController = async (req, res) => {
  const { newPassword, token } = req.body;
  console.log({ newPassword });

  const reset_password_link = token;

  if (reset_password_link) {
    jwt.verify(
      reset_password_link,
      process.env.JWT_RESET_PASSWORD,
      async function (err, decoded) {
        if (err) {
          return res.json({
            status: 401,
            message: "Đường link đã hết hạn.Vui lòng thử lại",
          });
        }

        const user = await User.findOne({ reset_password_link }).exec();

        if (!user) {
          return res.json({
            status: 401,
            message: "Đường link đã hết hạn.Vui lòng thử lại",
          });
        } else {
          bcrypt.hash(newPassword, saltRounds, async function (err, hash) {
            // Store hash in your password DB.
            const result = await User.findOneAndUpdate(
              { _id: user._id },
              {
                password: hash,
                reset_password_link: "",
              },
              {
                returnOriginal: false,
              }
            ).exec();

            if (!result) {
              return res.json({
                status: 401,
                message: "Lỗi khi update mật khẩu người dùng",
              });
            } else {
              return res.json({
                status: 200,
                message:
                  "🎉 Tuyệt vời! Bây giờ bạn có thể đăng nhập bằng mật khẩu mới của mình",
              });
            }
          });
        }
      }
    );
  }
};
