const User = require("../models/user.model");
const Transaction = require("../models/transaction.model");
const Commission = require("../models/commission.model");
const Tree = require("../models/tree.model");
const Package = require("../models/package.model");
const {
  levelUpMail,
  thankMail,
  successMail,
  randomString,
  getActiveLink,
  returnCommission,
  createCloneBuyPackage3,
  updateParent,
  checkLevel,
  checkPoint,
  removeAccents,
  remindRenew1Mail,
  remindRenew2Mail,
  renewSuccess,
  reciveCommissonMail,
  createCloneBuyPackage4,
  paymentSuccessMail,
  checkChildPoint
} = require("./method");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const saltRounds = 10;

async function processDataActivation(data, token, trans_id, orderId) {
  var datenow = new Date();
  const {
    full_name,
    email,
    password,
    phone,
    id_code,
    issued_by,
    bank_account,
    bank,
    bank_name,
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
    cmndMT,
    cmndMS,
    state,
    ss,
    request_commission,
    drive_id,
  } = data;
  var user_check = await User.findOne({ email }).exec();
  if (user_check) {
    return "Đã tồn tại user";
  }
  const unSavedErr = [];

  bcrypt.genSalt(saltRounds, function (err, salt) {
    bcrypt.hash(password, salt, async function (err, hash) {
      // --------------- CREATE AVATAR -------------------
      const listCharacterOfName = full_name.split(" ");
      const avatarKey = `${
        listCharacterOfName[listCharacterOfName.length - 2]
      }+${listCharacterOfName[listCharacterOfName.length - 1]}`;

      // --------------- SAVE USER -------------------
      var level = 0;
      var point = 0;
      switch (buy_package) {
        case "1":
          point = 0.25;
          break;
        case "2":
          point = 1;
          break;
        case "3":
          point = 10;
          level = 1;
          break;
        case "4":
          point = 4;
          break;
      }
      let now = new Date();
      let datenow = new Date().setHours(0, 0, 0, 0);
      let expired = new Date(
        now.getFullYear() + 1,
        now.getMonth(),
        now.getDate()
      ).setHours(0, 0, 0, 0);

      const user = new User({
        full_name: full_name.toUpperCase(),
        email,
        password: hash,
        avatar: `https://ui-avatars.com/api/?name=${avatarKey}&background=596D79&color=fff`,
        phone,
        buy_package,
        group_number,
        parent_id: donate_sales_id,
        created_time: new Date(datenow).toISOString(),
        expire_time: new Date(expired).toISOString(),
        id_code,
        issued_by,
        bank,
        bank_account,
        point: point,
        level: level,
        level_up_time: level === 1 ? new Date() : "",
        bank_name,
        tax_code,
        birthday: new Date(birthday).toISOString(),
        gender,
        id_time: new Date(id_time).toISOString(),
        expired: false,
        is_clone: false,
        uname: removeAccents(full_name.toUpperCase()),
        is_partner,
        account_type,
        cmndMT,
        cmndMS,
        state,
        ss,
        request_commission,
        drive_id,
        invite_user_id: invite_code,
      });

      await user.save();
      if (user.level !== 0) {
        await levelUpMail(user._id);
      }

      // --------------- FIND DONATE USER -------------------
      if (invite_code !== process.env.INVITE_CODE) {
        const userOfDonateSales = await User.findOne({
          _id: donate_sales_id,
        }).exec();

        if (group_number === "1") {
          await Tree.findOneAndUpdate(
            {
              parent: userOfDonateSales._id,
            },
            {
              $push: { group1: user._id },
            }
          ).exec();
        } else if (group_number === "2") {
          await Tree.findOneAndUpdate(
            { parent: userOfDonateSales._id },
            {
              $push: { group2: user._id },
            }
          ).exec();
        } else if (group_number === "3") {
          await Tree.findOneAndUpdate(
            { parent: userOfDonateSales._id },
            {
              $push: { group3: user._id },
            }
          ).exec();
        } else {
          console.log("thêm id vào cha thất bại");
        }
      }

      // --------------- SAVE TREE -------------------
      const newTree = new Tree({
        parent: user._id,
        buy_package,
      });

      await newTree.save();

      const oneYearFromNow = new Date();
      oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);

      // --------------- SAVE COMMISSTIONS -------------------
      if (invite_code !== process.env.INVITE_CODE) {
        const userOfDonateSales = await User.findOne({
          _id: invite_code,
        }).exec();
        await returnCommission(
          trans_id,
          userOfDonateSales._id,
          buy_package,
          user._id,
          full_name.toUpperCase(),
          user.account_type,
          email
        );
      }

      // --------------- CREATE CLONE ACC -------------------
      if (buy_package === "3") {
        await createCloneBuyPackage3(user);
      }
      if (buy_package === "4") {
        await createCloneBuyPackage4(user);
      }

      // --------------- UPDATE LEVEL PARENT -------------------
      if (invite_code !== process.env.INVITE_CODE) {
        // updateParent(invite_code, buy_package);
        await checkPoint(donate_sales_id);
        await checkLevel(donate_sales_id);
        await checkChildPoint(donate_sales_id);
      }

      // --------------- GET APP ACTIVATIONS LINKS -------------------
      const links = await getActiveLink(email, full_name, phone, buy_package);

      if (links.length === 0) {
        console.log(`Lấy link active thất bại! Vui lòng thử lại sau`);
        unSavedErr.push({ field: "links" });
      }

      // --------------- SEND SUCCESS MAIL -------------------
      await paymentSuccessMail(user._id, links);

      // --------------- SEND THANKS MAIL -------------------
      if (invite_code !== process.env.INVITE_CODE) {
        const userOfInvite = await User.findOne({
          _id: invite_code,
        }).exec();
        await reciveCommissonMail(user._id);
      }
      await checkChildPoint(user._id);
      // --------------- RESET TOKEN TO EMPTY -------------------
      await Transaction.findOneAndUpdate(
        { token },
        {
          token: "",
          user_id: user._id,
          status: "success",
          orderId,
          approved_by: "ADMIN",
          approved_time: new Date(),
        }
      );

      // --------------- CONSOLE.LOG ERROR FIELD -------------------
      console.log("error field", unSavedErr);
    });
  });
}

exports.activeTrans = async (req, res) => {
  const admin_id = req.admin_id;
  const id = req.params.id;

  const trans = await Transaction.findOne({
    $and: [{ _id: id }, { status: "pending" }],
  }).exec();

  const { token } = trans;

  if (trans) {
    if (trans.is_renew) {
      await changeStatus(id);
    } else {
      jwt.verify(
        token,
        process.env.JWT_ACCOUNT_ACTIVATION,
        async (err, decoded) => {
          if (err) {
            return res.json({
              status: 401,
              message: "Token hết hạn",
              errors: [],
            });
          } else {
            await processDataActivation(jwt.decode(token), token, trans._id);
          }
        }
      );
      await Transaction.findOneAndUpdate(
        { _id: id },
        { status: "processing" }
      ).exec();
    }
    const count = await Transaction.countDocuments({ status: "pending" })
      .sort()
      .exec();
    res.json({
      status: 200,
      message: "Kích hoạt thành công",
      data: {
        count: count - 1,
      },
      errors: [],
    });
  } else {
    res.json({
      status: 401,
      message: "Tài khoản đã được kích hoạt",
      errors: [],
    });
  }
};

exports.changePaymentMethod = async (req, res) => {
  const id = req.body.id;
  const { payment_method, note } = req.body;
  const trans = await Transaction.findOne({ _id: id }).exec();
  if (trans) {
    Transaction.findOneAndUpdate({ _id: id }, { payment_method, note }).exec();
    return res.json({
      status: 200,
      message: "Thay đổi thành công",
      data: {},
      errors: [],
    });
  } else {
    return res.json({
      status: 404,
      message: "Không tìm thấy giao dịch",
      errors: [],
    });
  }
};

exports.deleteTrans = async (req, res) => {
  const id = req.body.id;
  const trans = await Transaction.findOne({ _id: id }).exec();
  Transaction.deleteOne({
    $and: [
      {
        _id: id,
        status: "pending",
      },
    ],
  }).exec();
  return res.json({
    status: 200,
    message: "Đã xóa giao dịch",
    errors: [],
  });
};

exports.getTransList = async (req, res) => {
  const keyword = req.body.keyword ? req.body.keyword : "";
  const status = req.body.currentTable;
  const page = parseInt(req.body.page);
  const searchLevel = req.body.searchLevel;
  const perPage = parseInt(req.body.resultsPerPage);
  const searchType = parseInt(req.body.searchType);
  const changeListExport = req.body.changeListExport;
  var listTrans = [];
  var exportData = [];
  var countAllDocument = 0;
  switch (searchType) {
    case 1:
      listTrans = await Transaction.find({
        $and: [
          {
            status,
            user_uname: {
              $regex: ".*" + removeAccents(keyword.toUpperCase()) + ".*",
              $options: "i",
            },
          },
          { is_delete: false },
        ],
      })
        .sort({ _id: -1 })
        .limit(perPage)
        .skip(perPage * (page - 1))
        .exec();
      countAllDocument = await Transaction.countDocuments({
        $and: [
          {
            status,
            user_name: { $regex: ".*" + keyword + ".*", $options: "i" },
          },
          { is_delete: false },
        ],
      }).exec();
      break;
    case 2:
      listTrans = await Transaction.find({
        $and: [{ status }, { buy_package: searchLevel }, { is_delete: false }],
      })
        .sort({ _id: -1 })
        .limit(perPage)
        .skip(perPage * (page - 1))
        .exec();
      countAllDocument = await Transaction.countDocuments({
        $and: [{ status }, { buy_package: searchLevel }, { is_delete: false }],
      }).exec();
      break;
  }

  if (changeListExport) {
    switch (searchType) {
      case 1:
        exportData = await Transaction.find({
          $and: [
            {
              status,
              user_name: { $regex: ".*" + keyword + ".*", $options: "i" },
            },
            { is_delete: false },
          ],
        })
          .sort({ _id: -1 })
          .exec();
        break;
      case 2:
        exportData = await Transaction.find({
          $and: [
            { status },
            { buy_package: searchLevel },
            { is_delete: false },
          ],
        })
          .sort({ _id: -1 })
          .exec();
        break;
    }
  }
  res.json({
    status: 200,
    data: {
      listTrans,
      allPage: Math.ceil(countAllDocument / perPage),
      countAllDocument,
      exportData,
    },
    message: "",
    errors: [],
  });
};

const changeStatus = async (id) => {
  var trans = await Transaction.findOne({ _id: id }).exec();
  var commissOld = await Commission.findOne({ join_mem_id: trans.user_id })
    .sort({ _id: -1 })
    .exec();
  var user = await User.findOne({ _id: trans.user_id }).exec();
  var date = new Date(user.expire_time);
  await User.findOneAndUpdate(
    { _id: trans.user_id },
    {
      expire_time: new Date(
        date.getFullYear() + 1,
        date.getMonth(),
        date.getDate()
      ),
      renew_date: new Date(),
      count_renew: user.count_renew + 1,
      active: true,
    }
  ).exec();
  if (user.buy_package === "3" || user.buy_package === "4") {
    await User.updateMany(
      { $and: [{ parent_id: user._id }, { is_clone: true }] },
      {
        expire_time: new Date(
          date.getFullYear() + 1,
          date.getMonth(),
          date.getDate()
        ),
        renew_date: new Date(),
        count_renew: user.count_renew + 1,
        expired: false,
        active: true,
      }
    ).exec();
  }
  const listPackage = await Package.find().exec();
  const package = listPackage.find((ele) => ele.sid == user.buy_package);
  if (!commissOld) {
    if (user.parent_id !== process.env.INVITE_CODE) {
      var parent = await User.findOne({ _id: user.parent_id }).exec();
      if (parent) {
        let amount_vnd = 0;
        let amount_usd = 0;
        if (parent.buy_package == 1) {
          amount_vnd = package.commission.package1.price_vnd;
          amount_usd = package.commission.package1.price_usd;
        }
        if (parent.buy_package == 2) {
          amount_vnd = package.commission.package2.price_vnd;
          amount_usd = package.commission.package2.price_usd;
        }
        if (parent.buy_package == 3) {
          amount_vnd = package.commission.package3.price_vnd;
          amount_usd = package.commission.package3.price_usd;
        }
        if (parent.buy_package == 4) {
          amount_vnd = package.commission.package4.price_vnd;
          amount_usd = package.commission.package4.price_usd;
        }
        var commissNew = new Commission({
          trans_id: trans._id,
          join_mem_id: trans.join_mem_id,
          receive_mem_id: parent._id,
          join_mem_name: user.full_name,
          receive_mem_uname:
            user.parent_id === process.env.INVITE_CODE
              ? process.env.INVITE_CODE
              : removeAccents(parent.full_name),
          join_mem_uname: removeAccents(user.full_name),
          receive_mem_name:
            user.parent_id === process.env.INVITE_CODE
              ? process.env.INVITE_CODE
              : parent.full_name,
          status: "pending",
          created_time: new Date(),
          amount_vnd,
          amount_usd,
          bank_account:
            user.parent_id === process.env.INVITE_CODE
              ? ""
              : parent.bank_account,
          bank: user.parent_id === process.env.INVITE_CODE ? "" : parent.bank,
          bank_name:
            user.parent_id === process.env.INVITE_CODE ? "" : parent.bank_name,
          buy_package: user.buy_package,
          is_renew: true,
        });
        await commissNew.save();
      }
    }
  } else {
    var parent = await User.findOne({ _id: commissOld.receive_mem_id }).exec();
    if (parent) {
      let amount_vnd = 0;
      let amount_usd = 0;
      if (parent.buy_package == 1) {
        amount_vnd = package.commission.package1.price_vnd;
        amount_usd = package.commission.package1.price_usd;
      }
      if (parent.buy_package == 2) {
        amount_vnd = package.commission.package2.price_vnd;
        amount_usd = package.commission.package2.price_usd;
      }
      if (parent.buy_package == 3) {
        amount_vnd = package.commission.package3.price_vnd;
        amount_usd = package.commission.package3.price_usd;
      }
      if (parent.buy_package == 4) {
        amount_vnd = package.commission.package4.price_vnd;
        amount_usd = package.commission.package4.price_usd;
      }
      var commissNew = new Commission({
        trans_id: trans._id,
        join_mem_id: commissOld.join_mem_id,
        receive_mem_id: commissOld.receive_mem_id,
        join_mem_name: commissOld.join_mem_name,
        receive_mem_name: parent.full_name,
        receive_mem_uname: removeAccents(parent.full_name),
        join_mem_uname: removeAccents(commissOld.receive_mem_name),
        status: "pending",
        created_time: new Date(),
        amount_vnd,
        amount_usd,
        bank_account: parent.bank_account,
        bank: parent.bank,
        bank_name: parent.bank_name,
        buy_package: commissOld.buy_package,
        is_renew: true,
      });
      await commissNew.save();
    }
  }
  await checkPoint(user._id);
  await checkPoint(user.parent_id);
  await Transaction.findOneAndUpdate(
    { _id: trans._id },
    { status: "success", approved_time: new Date(), approved_by: "ADMIN" }
  ).exec();
  await renewSuccess(user._id);
};
