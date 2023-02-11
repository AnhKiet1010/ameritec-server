const User = require("../models/user.model");
const Activation = require("../models/activation.model");
const Tree = require("../models/tree.model");
const Transaction = require("../models/transaction.model");
const Request = require("../models/request.model");
const Commission = require("../models/commission.model");
const Package = require("../models/package.model");
const Bonus = require("../models/bonus.model");
const MailTemplate = require("../models/mailtemplate.model");
const jwt = require("jsonwebtoken");
const Policy = require("../models/policy.model");
const { countTotalChildMember, removeAccents } = require("./method");
const bcrypt = require("bcrypt");
const mongoose = require("mongoose");
const {
  getActiveLink,
  returnCommission,
  randomString,
  createCloneBuyPackage3,
  successMail,
  thankMail,
  updateParent,
  getFullChildren,
  checkLevel,
  checkPoint,
  remindRenew1Mail,
  remindRenew2Mail,
  reciveCommissonMail,
  paymentSuccessMail,
  getMoreActiveLink,
  replenishActiveKey,
  renewSuccess,
  levelUpMail,
  createCloneBuyPackage4,
  checkChildPoint,
} = require("./method");
const { Mail } = require("./mail.js");
const fs = require("fs");
const moment = require("moment");
const { PACKAGE } = require("../constants/package");
const https = require("https");
const querystring = require("querystring");

const saltRounds = 10;

exports.countPendingTransList = async (req, res) => {
  const count = await Transaction.countDocuments({ status: "pending" }).exec();
  res.json({
    count,
  });
};

exports.checkChildPoint = async (req, res) => {
  const { id } = req.params;
  await checkChildPoint(id);
  res.json({
    id,
  });
};

const sumPoint = async (array_user_id) => {
  var kq = 0;
  let binus_point = 0;
  for (var ele of array_user_id) {
    var user = await User.findOne({ _id: ele._id ,active:1}).exec();
    if (user) {
      if (user.expired) {
        binus_point += user.buy_package === "1" ? 0.25 : 1;
      }
      kq += user.point;
    }
  }
  // if(array_user_id.length > 0) {
  //   let records = await User.find().where('_id').in(array_user_id).select("point").exec();
  //   let sumPoint = records.reduce((a, b) => a.point + b.point);
  //   kq += sumPoint;
  // }
  return kq - binus_point;
};

const getTreeChild = async (idcha) => {
  var userCha = await User.findOne({ _id: idcha }).exec();
  var listCon = await Tree.findOne({ parent: idcha })
    .select("group1 group2 group3")
    .exec();
  console.log("listCon", listCon);
  var child1 = [];
  var child2 = [];
  var child3 = [];
  if (listCon) {
    for (const element of listCon.group1) {
      await child1.push(await getInfoChild(element));
    }
    for (const element of listCon.group2) {
      await child2.push(await getInfoChild(element));
    }
    for (const element of listCon.group3) {
      await child3.push(await getInfoChild(element));
    }
  }
  // const total1 = await countTotalChildMember(child1);
  // const total2 = await countTotalChildMember(child2);
  // const total3 = await countTotalChildMember(child3);
  const total1 = userCha.child1.countChild;
  const total2 = userCha.child2.countChild;
  const total3 = userCha.child3.countChild;
  var Cha = {
    _id: userCha._id,
    full_name: userCha.full_name,
    // countChild: await countTotalChildMember(await getListChildId(idcha)),
    countChild: total1 + total2 + total3,
    level: userCha.level,
    buy_package: userCha.buy_package,
    avatar: userCha.avatar,
    point: userCha.point,
    child1: {
      arr: child1,
      countChild: total1,
      sumPoint: userCha.child1.countPoint,
    },
    child2: {
      arr: child2,
      countChild: total2,
      sumPoint: userCha.child2.countPoint,
    },
    child3: {
      arr: child3,
      countChild: total3,
      sumPoint: userCha.child3.countPoint,
    },
    expired: userCha.expired,
  };
  return Cha;
};

exports.getTreeChildById = async (req, res) => {
  const { id } = req.body;
  const result = [];
  const group = await getTreeChild(id);
  result.push(group);

  res.json({
    status: 200,
    data: {
      group: result,
    },
    errors: [],
    message: "",
  });
};

const getInfoChild = async (id) => {
  var userCha = await User.findOne({ _id: id }).exec();
  var child1 = [];
  var child2 = [];
  var child3 = [];

  var Cha = {
    _id: userCha._id,
    full_name: userCha.full_name,
    level: userCha.level,
    buy_package: userCha.buy_package,
    avatar: userCha.avatar,
    point: userCha.point,
    //countChild: await countTotalChildMember(await getListChildId(id)),
    countChild:
      userCha.child1.countChild +
      userCha.child2.countChild +
      userCha.child3.countChild,
    child1: {
      arr: child1,
      //sumPoint: await sumPoint(child1),
      //countChild: await countTotalChildMember(child1),
      sumPoint: userCha.child1.countPoint,
      countChild: userCha.child1.countChild,
    },
    child2: {
      arr: child2,
      // sumPoint: await sumPoint(child2),
      // countChild: await countTotalChildMember(child2),
      sumPoint: userCha.child2.countPoint,
      countChild: userCha.child2.countChild,
    },
    child3: {
      arr: child3,
      // sumPoint: await sumPoint(child3),
      // countChild: await countTotalChildMember(child3),
      sumPoint: userCha.child3.countPoint,
      countChild: userCha.child3.countChild,
    },
    expired: userCha.expired,
  };
  return Cha;
};

exports.getDashboard = async (req, res) => {
  const countPersonPackages = await User.countDocuments({
    buy_package: "1",
  }).exec();
  const countStartupPackages = await User.countDocuments({
    buy_package: "2",
  }).exec();
  const countBusinessPackages = await User.countDocuments({
    $and: [{ buy_package: "3" }, { is_clone: { $ne: true } }],
  }).exec();
  const countBusinessPackagesB = await User.countDocuments({
    $and: [{ buy_package: "4" }, { is_clone: { $ne: true } }],
  }).exec();
  const countUserLevel0 = await User.countDocuments({ level: 0 }).exec();
  const countUserLevel1 = await User.countDocuments({ level: 1 }).exec();
  const countUserLevel2 = await User.countDocuments({ level: 2 }).exec();
  const countUserLevel3 = await User.countDocuments({ level: 3 }).exec();
  const countUserLevel4 = await User.countDocuments({ level: 4 }).exec();
  const countUserLevel5 = await User.countDocuments({ level: 5 }).exec();
  const countUserLevel6 = await User.countDocuments({ level: 6 }).exec();
  const countUserLevelArr = [
    countUserLevel0,
    countUserLevel1,
    countUserLevel2,
    countUserLevel3,
    countUserLevel4,
    countUserLevel5,
    countUserLevel6,
  ];

  var today = new Date();
  var listLevelUpToday = await User.find({
    $and: [
      { level_up_time: { $ne: "" } },
      {
        level_up_time: {
          $gte: new Date(
            today.getFullYear(),
            today.getMonth(),
            today.getDate(),
            0,
            0,
            0
          ),
          $lte: new Date(
            today.getFullYear(),
            today.getMonth(),
            today.getDate() + 1,
            0,
            0,
            0
          ),
        },
      },
    ],
  }).exec();

  res.json({
    status: 200,
    data: {
      countPersonPackages,
      countStartupPackages,
      countBusinessPackages,
      countBusinessPackagesB,
      countUserLevelArr,
      listLevelUpToday,
    },
    errors: [],
    message: "",
  });
};

exports.getRank = async (req, res) => {
  const listUser = await User.find({
    role: "normal",
    is_delete: false,
    active: true,
    expired: false,
  })
    .limit(500)
    .sort({ level: -1, point: -1, _id: -1 })
    .exec();
  res.json({
    status: 200,
    data: {
      listUser,
    },
    errors: [],
    message: "",
  });
};

exports.getUsers = async (req, res) => {
  const keyword = req.body.keyword ? req.body.keyword : "";
  const searchType = parseInt(req.body.searchType);
  const page = parseInt(req.body.page);
  const perPage = parseInt(req.body.resultsPerPage);
  const searchLevel = parseInt(req.body.searchLevel);
  const currentMonth = parseInt(req.body.currentMonth);
  const currentYear =
    req.body.currentYear === "all" ? "all" : parseInt(req.body.currentYear);
  const getExportData = req.body.getExportData;
  var skip = 0;

  if (page > 1) {
    skip = (page - 1) * perPage;
  }

  var listUser = [];
  var countAllDocument = 0;
  var exportData = [];

  if (!getExportData) {
    if (searchType === 1) {
      listUser = await User.find({
        $and: [{ role: "normal" }, { is_delete: false }],
      })
        .sort({ created_time: -1, _id: -1 })
        .limit(perPage)
        .skip(skip)
        .exec();
      countAllDocument = await User.countDocuments({
        $and: [{ role: "normal" }, { is_delete: false }],
      })
        .sort({ created_time: -1, _id: -1 })
        .exec();
    }

    if (searchType === 2) {
      listUser = await User.find({
        $and: [
          { role: "normal" },
          {
            uname: {
              $regex: ".*" + removeAccents(keyword) + ".*",
              $options: "i",
            },
          },
          { is_delete: false },
        ],
      })
        .limit(perPage)
        .skip(skip)
        .sort({ created_time: -1, _id: -1 })
        .exec();
      countAllDocument = await User.countDocuments({
        $and: [
          { role: "normal" },
          { uname: { $regex: ".*" + keyword + ".*", $options: "i" } },
          { is_delete: false },
        ],
      })
        .sort({ created_time: -1, _id: -1 })
        .exec();
    }

    if (searchType === 3) {
      listUser = await User.find({
        $and: [
          { role: "normal" },
          { email: { $regex: ".*" + keyword + ".*", $options: "i" } },
          { is_delete: false },
        ],
      })
        .limit(perPage)
        .skip(skip)
        .sort({ created_time: -1, _id: -1 })
        .exec();
      countAllDocument = await User.countDocuments({
        $and: [
          { role: "normal" },
          { email: { $regex: ".*" + keyword + ".*", $options: "i" } },
          { is_delete: false },
        ],
      })
        .sort({ created_time: -1, _id: -1 })
        .exec();
    }

    if (searchType === 4) {
      if (keyword.length === 24) {
        listUser = await User.find({
          $and: [{ role: "normal" }, { _id: keyword }, { is_delete: false }],
        })
          .sort({ created_time: -1, _id: -1 })
          .limit(perPage)
          .skip(skip)
          .exec();
        countAllDocument = await User.countDocuments({
          $and: [{ role: "normal" }, { _id: keyword }, { is_delete: false }],
        })
          .sort({ created_time: -1, _id: -1 })
          .exec();
      } else {
        listUser = [];
        countAllDocument = 0;
      }
    }

    if (searchType === 5) {
      listUser = await User.find({
        $and: [
          { role: "normal" },
          { level: searchLevel },
          { is_delete: false },
        ],
      })
        .sort({ created_time: -1, _id: -1 })
        .limit(perPage)
        .skip(skip)
        .exec();
      countAllDocument = await User.countDocuments({
        $and: [
          { role: "normal" },
          { level: searchLevel },
          { is_delete: false },
        ],
      })
        .sort({ created_time: -1, _id: -1 })
        .exec();
    }

    if (searchType === 6) {
      let firstDay = new Date(currentYear, currentMonth - 1, 1).toISOString();
      let lastDay = new Date(currentYear, currentMonth, 0).toISOString();
      listUser = await User.find({
        $and: [
          { role: "normal" },
          {
            created_time: {
              $gte: firstDay,
              $lte: lastDay,
            },
          },
          { is_delete: false },
        ],
      })
        .sort({ created_time: -1, _id: -1 })
        .limit(perPage)
        .skip(skip)
        .exec();
      countAllDocument = await User.countDocuments({
        $and: [
          { role: "normal" },
          {
            created_time: {
              $gte: firstDay,
              $lte: lastDay,
            },
          },
          { is_delete: false },
        ],
      })
        .sort({ created_time: -1, _id: -1 })
        .exec();
    }

    if (searchType === 7) {
      if (currentYear === "all") {
        listUser = await User.find({
          $and: [{ role: "normal" }, { is_delete: false }, { expired: true }],
        })
          .sort({ created_time: -1, _id: -1 })
          .limit(perPage)
          .skip(skip)
          .exec();
        countAllDocument = await User.countDocuments({
          $and: [{ role: "normal" }, { is_delete: false }, { expired: true }],
        })
          .sort({ created_time: -1, _id: -1 })
          .exec();
      } else {
        let firstDay = new Date(
          currentYear - 1,
          currentMonth - 1,
          1
        ).toISOString();
        let lastDay = new Date(currentYear - 1, currentMonth, 0).toISOString();
        listUser = await User.find({
          $and: [
            { role: "normal" },
            { expired: true },
            {
              created_time: {
                $gte: firstDay,
                $lte: lastDay,
              },
            },
            { is_delete: false },
          ],
        })
          .sort({ created_time: -1, _id: -1 })
          .limit(perPage)
          .skip(skip)
          .exec();
        countAllDocument = await User.countDocuments({
          $and: [
            { role: "normal" },
            { expired: true },
            {
              created_time: {
                $gte: firstDay,
                $lte: lastDay,
              },
            },
            { is_delete: false },
          ],
        })
          .sort({ created_time: -1, _id: -1 })
          .exec();
      }
    }
    //filter tạm khóa
    if (searchType === 8) {
      listUser = await User.find({
        $and: [{ role: "normal" }, { active: false }, { is_delete: false }],
      })
        .sort({ created_time: -1, _id: -1 })
        .limit(perPage)
        .skip(skip)
        .exec();
      countAllDocument = await User.countDocuments({
        $and: [{ role: "normal" }, { active: false }, { is_delete: false }],
      })
        .sort({ created_time: -1, _id: -1 })
        .exec();
    }
    for (let user of listUser) {
      let parent_name = "";
      if (
        user.parent_id &&
        user.parent_id !== "" &&
        user.parent_id !== process.env.INVITE_CODE
      ) {
        let parent = await User.findOne({
          _id: user.parent_id,
          is_delete: false,
        }).exec();
        if (parent) {
          parent_name = parent.full_name;
        }
      }
      user.parent_name = parent_name;
    }

    res.json({
      status: 200,
      data: {
        listUserFilter: listUser,
        allPage: Math.ceil(countAllDocument / perPage),
        countAllDocument,
      },
      errors: [],
      message: "",
    });
  }

  if (getExportData) {
    if (searchType === 1) {
      exportData = await User.find({
        $and: [{ role: "normal" }, { is_delete: false }],
      })
        .sort({ created_time: -1, _id: -1 })
        .exec();
    }

    if (searchType === 2) {
      exportData = await User.find({
        $and: [
          { role: "normal" },
          { uname: { $regex: ".*" + keyword + ".*", $options: "i" } },
          { is_delete: false },
        ],
      })
        .sort({ created_time: -1, _id: -1 })
        .exec();
    }

    if (searchType === 3) {
      exportData = await User.find({
        $and: [
          { role: "normal" },
          { email: { $regex: ".*" + keyword + ".*", $options: "i" } },
          { is_delete: false },
        ],
      })
        .sort({ created_time: -1, _id: -1 })
        .exec();
    }

    if (searchType === 4) {
      exportData = await User.find({
        $and: [{ role: "normal" }, { old_id: keyword }, { is_delete: false }],
      })
        .sort({ created_time: -1, _id: -1 })
        .exec();
    }

    if (searchType === 5) {
      exportData = await User.find({
        $and: [
          { role: "normal" },
          { level: searchLevel },
          { is_delete: false },
        ],
      })
        .sort({ created_time: -1, _id: -1 })
        .exec();
    }

    if (searchType === 6) {
      let firstDay = new Date(currentYear, currentMonth - 1, 1);
      let lastDay = new Date(currentYear, currentMonth, 0);
      exportData = await User.find({
        $and: [
          { role: "normal" },
          {
            created_time: {
              $gte: firstDay,
              $lte: lastDay,
            },
          },
          { is_delete: false },
        ],
      })
        .sort({ created_time: -1, _id: -1 })
        .exec();
    }

    if (searchType === 7) {
      if (currentYear === "all") {
        exportData = await User.find({
          $and: [{ role: "normal" }, { expired: true }, { is_delete: false }],
        })
          .sort({ created_time: -1, _id: -1 })
          .exec();
      } else {
        let firstDay = new Date(currentYear - 1, currentMonth - 1, 1);
        let lastDay = new Date(currentYear - 1, currentMonth, 0);
        exportData = await User.find({
          $and: [
            { role: "normal" },
            { expired: true },
            {
              created_time: {
                $gte: firstDay,
                $lte: lastDay,
              },
            },
            { is_delete: false },
          ],
        })
          .sort({ created_time: -1, _id: -1 })
          .exec();
      }
    }
    if (searchType === 8) {
      exportData = await User.find({
        $and: [{ role: "normal" }, { active: false }, { is_delete: false }],
      })
        .sort({ created_time: -1, _id: -1 })
        .exec();
    }
    res.json({
      status: 200,
      data: {
        exportData,
      },
      errors: [],
      message: "",
    });
  }
};

exports.createUser = async (req, res) => {
  const {
    full_name,
    email,
    birthday,
    password,
    phone,
    parent_id,
    group_number,
    id_code,
    id_time,
    issued_by,
    bank_account,
    bank,
    bank_name,
    tax_code,
    cmndMT,
    cmndMS,
    buy_package,
    gender,
    state,
    ss,
    request_commission,
    drive_id,
    account_type,
  } = req.body;
  console.log("body", req.body);
  const errors = [];

  const repeatEmail = await User.find({ email, is_delete: false }).exec();
  if (repeatEmail.length > 0) {
    errors.push({ label: "email", err_message: "Email này đã được sử dụng" });
  }
  if (buy_package === "" || buy_package === null) {
    errors.push({
      label: "buy_package",
      err_message: "Gói tham gia không được để trống",
    });
  }
  if (parent_id !== process.env.INVITE_CODE) {
    const repeat_parent_id = await User.find({
      _id: parent_id,
      is_delete: false,
    }).exec();
    if (repeat_parent_id.length < 0) {
      errors.push({
        label: "parent_id",
        err_message: "Mã giới thiệu không đúng",
      });
    }
  }

  const user_repeat_id_code = await User.findOne({
    $and: [
      { id_code: id_code },
      { id_code: { $ne: "" } },
      { is_delete: false },
    ],
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
    bcrypt.genSalt(saltRounds, async function (err, salt) {
      bcrypt.hash(password, salt, async function (err, hash) {
        // --------------- CREATE AVATAR -------------------
        const listCharacterOfName = full_name.split(" ");
        const avatarKey = `${
          listCharacterOfName[listCharacterOfName.length - 2]
        }+${listCharacterOfName[listCharacterOfName.length - 1]}`;
        var datenow = new Date();
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
        const user = new User({
          full_name: full_name.toUpperCase(),
          email,
          password: hash,
          avatar: `https://ui-avatars.com/api/?name=${avatarKey}&background=random`,
          birthday,
          parent_id,
          created_time: new Date(),
          expire_time: new Date(
            datenow.getFullYear() + 1,
            datenow.getMonth(),
            datenow.getDate()
          ),
          phone,
          group_number,
          id_code,
          id_time,
          issued_by,
          bank_account,
          point: point,
          level: level,
          level_up_time: level === 1 ? new Date() : "",
          bank,
          bank_name,
          tax_code,
          cmndMT,
          cmndMS,
          buy_package,
          gender,
          is_clone: false,
          is_partner: true,
          expired: false,
          state,
          ss,
          request_commission,
          drive_id,
          account_type,
          uname: removeAccents(full_name.toUpperCase()),
        });
        await user.save();
        const tree = new Tree({
          parent: user._id,
          group1: [],
          group2: [],
          group3: [],
          buy_package,
        });
        await tree.save();

        // --------------- CREATE TRANSACTION -------------------
        const oneYearFromNow = new Date();
        oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);
        const listPackage = await Package.find().exec();
        console.log(listPackage.find((ele) => ele.sid == buy_package));
        const amount_vnd = listPackage.find(
          (ele) => ele.sid == buy_package
        ).price_vnd;
        const amount_usd = listPackage.find(
          (ele) => ele.sid == buy_package
        ).price_usd;
        var newTransaction = new Transaction({
          status: "success",
          payment_method: "tienmat",
          token: "",
          created_time: new Date(),
          user_id: user._id,
          user_name: full_name,
          user_uname: removeAccents(full_name),
          email,
          phone,
          expired_time: oneYearFromNow,
          buy_package,
          approved_time: new Date(),
          approved_by: "admin",
          amount_vnd,
          amount_usd,
        });
        if (parent_id !== "" && parent_id !== process.env.INVITE_CODE) {
          var parent = await User.findOne({ _id: parent_id }).exec();
          newTransaction.invite_id = parent_id;
          newTransaction.invite_name = parent.full_name;
          newTransaction.invite_uname = parent.uname;
        } else {
        }
        await newTransaction.save();

        // --------------- SAVE COMMISSTIONS -------------------
        if (parent_id !== "" && parent_id !== process.env.INVITE_CODE) {
          returnCommission(
            newTransaction._id,
            parent_id,
            buy_package,
            user._id,
            full_name.toUpperCase(),
            email
          );
          var parent_tree = await Tree.findOne({ parent: parent_id }).exec();
          var tree_group = [];
          switch (group_number) {
            case "1":
              tree_group = [...parent_tree.group1];
              tree_group.push(user._id);
              parent_tree.group1 = tree_group;
              break;
            case "2":
              tree_group = [...parent_tree.group2];
              tree_group.push(user._id);
              parent_tree.group2 = tree_group;
              break;
            case "3":
              tree_group = [...parent_tree.group3];
              tree_group.push(user._id);
              parent_tree.group3 = tree_group;
              break;
          }
          await parent_tree.save();
        }

        // --------------- CLONE 9 ACC -------------------
        if (user.buy_package == "3") {
          await createCloneBuyPackage3(user);
        }
        if (user.buy_package == "4") {
          await createCloneBuyPackage4(user);
        }

        // --------------- UPDATE LEVEL PARENT -------------------
        if (parent_id !== process.env.INVITE_CODE) {
          updateParent(parent_id, buy_package);
        }

        // --------------- SEND SUCCESS MAIL ------------------
        // await successMail(
        //   full_name,
        //   email,
        //   phone,
        //   links
        // );
        await paymentSuccessMail(user._id, []);
        // --------------- SEND THANKS MAIL -------------------
        if (parent_id !== process.env.INVITE_CODE) {
          // const userOfInvite = await User.findOne({
          //   _id: parent_id,
          //   is_delete: false
          // }).exec();
          // thankMail(
          //   userOfInvite.full_name,
          //   userOfInvite.email,
          //   full_name
          // );
          await reciveCommissonMail(user._id);
        }

        res.json({
          status: 200,
          errors,
          message: "Tạo User thành công!",
        });
      });
    });
  }
};

exports.getUser = async (req, res) => {
  const { id } = req.params;

  var user = await User.findOne({ _id: id, is_delete: false }).exec();
  let invite_id = user.parent_id;
  if (user.invite_user_id && user.invite_user_id !== "") {
    invite_id = user.invite_user_id;
  }
  if (user == null) {
    return res.json({
      status: 404,
      errors: ["Not Found The User"],
    });
  }

  var listOldEmail = user.old_email;
  var oldEmailObj = [];
  if (listOldEmail.length > 0) {
    oldEmailObj = listOldEmail.map((ele, index) => {
      return {
        label: `Email cũ ${index + 1}`,
        value: `${ele.email} - ${new Date(ele.time_change).toLocaleString(
          "vi",
          { timeZone: "Asia/Ho_Chi_Minh" }
        )}`,
      };
    });
  }
  var listLink = [];
  listLink = [
    {
      label: "Link giới thiệu nhóm 1",
      value: `${process.env.CLIENT_URL}/referral/${user._id}/1`,
    },
    {
      label: "Link giới thiệu nhóm 2",
      value: `${process.env.CLIENT_URL}/referral/${user._id}/2`,
    },
    {
      label: "Link giới thiệu nhóm 3",
      value: `${process.env.CLIENT_URL}/referral/${user._id}/3`,
    },
  ];

  var listInfo = [];
  if (user.account_type === "vi") {
    listInfo = [
      { label: "Số chứng minh thư", value: user.id_code },
      {
        label: "Ngày cấp",
        value: user.id_code
          ? new Date(user.id_time).toLocaleDateString("vi").split(",")[0]
          : "",
      },
      { label: "Nơi cấp", value: user.issued_by },
      { label: "Số tài khoản", value: user.bank_account },
      { label: "Mã số Thuế", value: user.tax_code ? user.tax_code : "" },
      { label: "Ngân hàng", value: user.bank },
      { label: "Tên tài khoản", value: user.bank_name },
      { label: "cmndMT", value: user.cmndMT },
      { label: "cmndMS", value: user.cmndMS },
    ];
  } else {
    listInfo = [
      { label: "SS# or TAX ID", value: user.ss },
      { label: "State", value: user.state },
      { label: "Driver's License", value: user.drive_id },
      {
        label: "Froms of receiving commissions",
        value: user.request_commission,
      },
    ];
  }

  res.json({
    status: 200,
    data: {
      user,
      result: [
        { label: "Họ và tên", value: user.full_name },
        { label: "Mã giới thiệu", value: user._id },
        {
          label: "Giới tính",
          value: user.gender === 2 ? "Nam" : user.gender === 3 ? "Nữ" : "N/A",
        },
        { label: "Điểm", value: user.point },
        { label: "Level", value: user.level },
        {
          label: "Gói mua",
          value:
            user.account_type === "en"
              ? PACKAGE.find((ele) => ele.value === user.buy_package).label_en
              : PACKAGE.find((ele) => ele.value === user.buy_package).label,
        },
        {
          label: "Trạng thái",
          value: user.expired === true ? "Đã hết hạn" : "Đang hoạt động",
        },
        {
          label: "Ngày tháng năm sinh",
          value: user.birthday
            ? new Date(user.birthday).toLocaleDateString("vi").split(",")[0]
            : "",
        },
        {
          label: "Ngày tạo tài khoản",
          value: user.created_time
            ? new Date(user.created_time).toLocaleDateString("vi").split(",")[0]
            : "",
        },
        {
          label: "Ngày hết hạn tài khoản",
          value: user.expire_time
            ? new Date(user.expire_time).toLocaleDateString("vi").split(",")[0]
            : "",
        },
        { label: "Email", value: user.email },
        {
          label: "Người giới thiệu",
          value:
            invite_id !== process.env.INVITE_CODE
              ? (
                  await User.findOne({
                    _id: invite_id,
                    is_delete: false,
                  }).exec()
                ) ? (
                  await User.findOne({
                    _id: invite_id,
                    is_delete: false,
                  }).exec()
                ).full_name : "Công ty"
              : "Công Ty",
        },
        { label: "Số điện thoại", value: user.phone },
        ...listInfo,
        ...listLink,
        {
          label: "Phân loại tài khoản",
          value: `${user.is_partner ? "Cộng Tác Viên" : "Mua để dùng"} / ${
            user.account_type === "en" ? "Nước ngoài" : "Trong nước"
          }`,
        },
        { label: "Ghi chú", value: user.note },
        ...oldEmailObj,
      ],
    },
    errors: [],
    message: "",
  });
};

exports.getExportListChildData = async (req, res) => {
  const { id } = req.body;
  const listChildId = await getListChildId(id);
  const listChildExport = await getFullChildren(listChildId, []);
  res.json({
    status: 200,
    data: {
      listChildExport,
    },
    errors: [],
    message: "",
  });
};

exports.uploadImageCK = async (req, res) => {
  const files = req.file;
  var filename = "";
  console.log("files", files);
  if (files) {
    const randomstring = randomString();

    filename = randomstring + "_ck." + files.filename.split(".").pop();
    fs.rename("./" + files.path, "./public/uploads/ck/" + filename, (err) => {
      if (err) console.log(err);
    });
  }

  res.json({
    s3Url: process.env.API_URL + "/uploads/ck/" + filename,
  });
};

exports.editUser = async (req, res) => {
  const {
    full_name,
    phone,
    birthday,
    gender,
    id_code,
    id_time,
    issued_by,
    tax_code,
    email,
    bank,
    bank_account,
    bank_name,
    id,
    password,
    note,
    is_partner,
    buy_package,
    expire_time,
    state,
    ss,
    request_commission,
    drive_id,
  } = req.body;

  console.log("body", req.body);
  console.log("file", req.files);

  const errors = [];

  const user = await User.findOne({ _id: mongoose.Types.ObjectId(id) }).exec();
  const list_id_clone = await User.find({ parent_id: id, is_clone: true })
    .select("_id")
    .exec();
  var arr_id_clone = [];
  list_id_clone.map((p) => arr_id_clone.push(p._id));
  // console.log(arr_id_clone);
  // return;
  var old_email = user.email;

  if (email !== old_email) {
    const valid_email = await User.findOne({
      $and: [
        { email },
        { _id: { $ne: id } },
        { is_clone: false },
        { is_delete: false },
      ],
    }).exec();
    if (valid_email) {
      if (JSON.stringify(valid_email) !== JSON.stringify(user)) {
        errors.push({
          label: "email",
          err_message: "Email đã được sử dụng",
        });
      }
    }
  }
  if (errors.length > 0) {
    res.json({
      status: 400,
      errors,
      message: "Có thông tin bị trùng.Vui lòng thử lại!",
    });
  } else {
    let change = false;
    if (user.full_name !== full_name) {
      for (var a of arr_id_clone) {
        var clone_acc = await User.findOne({
          _id: mongoose.Types.ObjectId(a),
        }).exec();
        var arr_name = clone_acc.full_name.split(" ");
        clone_acc.full_name = full_name + " " + arr_name[arr_name.length - 1];
        clone_acc.uname = await removeAccents(clone_acc.full_name);
        await clone_acc.save();
        await Transaction.updateMany(
          { user_id: a },
          { user_name: clone_acc.full_name, user_uname: clone_acc.uname }
        ).exec();
        await Transaction.updateMany(
          { invite_id: a },
          { invite_name: clone_acc.full_name, invite_uname: clone_acc.uname }
        ).exec();
        await Commission.updateMany(
          { join_mem_id: a },
          {
            join_mem_name: clone_acc.full_name,
            join_mem_uname: clone_acc.uname,
          }
        ).exec();
        await Commission.updateMany(
          { receive_mem_id: a },
          {
            receive_mem_name: clone_acc.full_name,
            receive_mem_uname: clone_acc.uname,
          }
        ).exec();
        await Bonus.updateMany(
          { receive_mem_id: a },
          { receive_mem_name: clone_acc.full_name }
        ).exec();
      }
      await User.findOneAndUpdate(
        { _id: id },
        {
          full_name,
          uname: await removeAccents(full_name),
        }
      ).exec();
      // await User.updateMany(
      //   { parent_id: id, is_clone: true },
      //   {
      //     full_name,
      //     uname: await removeAccents(full_name)
      //   }
      // ).exec();
      await Transaction.updateMany(
        { user_id: id },
        { user_name: full_name, user_uname: await removeAccents(full_name) }
      ).exec();
      await Transaction.updateMany(
        { invite_id: id },
        { invite_name: full_name, invite_uname: await removeAccents(full_name) }
      ).exec();
      await Commission.updateMany(
        { join_mem_id: id },
        {
          join_mem_name: full_name,
          join_mem_uname: await removeAccents(full_name),
        }
      ).exec();
      await Commission.updateMany(
        { receive_mem_id: id },
        {
          receive_mem_name: full_name,
          receive_mem_uname: await removeAccents(full_name),
        }
      ).exec();
      await Bonus.updateMany(
        { receive_mem_id: id },
        { receive_mem_name: full_name }
      ).exec();
      change = true;
    }

    const files = req.files;

    if (files.CMND_Front && files.CMND_Back) {
      var cmndMT = "";
      var cmndMS = "";
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
      await User.findOneAndUpdate(
        { _id: id },
        {
          cmndMT,
          cmndMS,
        }
      ).exec();
      await User.updateMany(
        { parent_id: id, is_clone: true },
        {
          cmndMT,
          cmndMS,
        }
      ).exec();
      change = true;
    }
    //return;
    if (user.note !== note) {
      await User.findOneAndUpdate(
        { _id: id },
        {
          note,
        }
      ).exec();
      await User.updateMany(
        { parent_id: id, is_clone: true },
        {
          note,
        }
      ).exec();
      change = true;
    }
    if (user.state !== state) {
      await User.findOneAndUpdate(
        { _id: id },
        {
          state,
        }
      ).exec();
      await User.updateMany(
        { parent_id: id, is_clone: true },
        {
          state,
        }
      ).exec();
      change = true;
    }
    if (user.ss !== ss) {
      await User.findOneAndUpdate(
        { _id: id },
        {
          ss,
        }
      ).exec();
      await User.updateMany(
        { parent_id: id, is_clone: true },
        {
          ss,
        }
      ).exec();
      change = true;
    }
    if (user.drive_id !== drive_id) {
      await User.findOneAndUpdate(
        { _id: id },
        {
          drive_id,
        }
      ).exec();
      await User.updateMany(
        { parent_id: id, is_clone: true },
        {
          drive_id,
        }
      ).exec();
      change = true;
    }
    if (user.request_commission !== request_commission) {
      await User.findOneAndUpdate(
        { _id: id },
        {
          request_commission,
        }
      ).exec();
      await User.updateMany(
        { parent_id: id, is_clone: true },
        {
          request_commission,
        }
      ).exec();
      change = true;
    }
    if (user.phone !== phone) {
      await User.findOneAndUpdate(
        { _id: id },
        {
          phone,
        }
      ).exec();
      await User.updateMany(
        { parent_id: id, is_clone: true },
        {
          phone,
        }
      ).exec();
      change = true;
    }
    if (user.birthday !== birthday) {
      await User.updateMany(
        { email: user.email },
        {
          $set: { birthday: new Date(birthday) },
        }
      ).exec();
      await User.updateMany(
        { parent_id: id, is_clone: true },
        {
          $set: { birthday: new Date(birthday) },
        }
      ).exec();
      change = true;
    }
    if (user.is_partner !== is_partner) {
      await User.updateMany(
        { email: user.email },
        {
          $set: { is_partner },
        }
      ).exec();
      await User.updateMany(
        { parent_id: id, is_clone: true },
        {
          $set: { is_partner },
        }
      ).exec();
      change = true;
    }
    if (user.gender !== gender) {
      await User.findOneAndUpdate(
        { _id: id },
        {
          gender: gender ? gender : "",
        }
      ).exec();
      await User.updateMany(
        { parent_id: id, is_clone: true },
        {
          gender: gender ? gender : "",
        }
      ).exec();
      change = true;
    }
    if (user.id_code !== id_code) {
      await User.findOneAndUpdate(
        { _id: id },
        {
          id_code,
        }
      ).exec();
      await User.updateMany(
        { parent_id: id, is_clone: true },
        {
          id_code,
        }
      ).exec();
      change = true;
    }
    if (user.id_time !== id_time) {
      await User.updateMany(
        { email: user.email },
        {
          $set: { id_time: new Date(id_time) },
        }
      ).exec();
      await User.updateMany(
        { parent_id: id, is_clone: true },
        {
          $set: { id_time: new Date(id_time) },
        }
      ).exec();
      change = true;
    }
    if (user.issued_by !== issued_by) {
      await User.findOneAndUpdate(
        { _id: id },
        {
          issued_by,
        }
      ).exec();
      await User.updateMany(
        { parent_id: id, is_clone: true },
        {
          issued_by,
        }
      ).exec();
      change = true;
    }
    if (user.tax_code !== tax_code) {
      await User.findOneAndUpdate(
        { _id: id },
        {
          tax_code,
        }
      ).exec();
      await User.updateMany(
        { parent_id: id, is_clone: true },
        {
          tax_code,
        }
      ).exec();
      change = true;
    }
    if (user.bank !== bank) {
      await User.findOneAndUpdate(
        { _id: id },
        {
          bank,
        }
      ).exec();
      await User.updateMany(
        { parent_id: id, is_clone: true },
        {
          bank,
        }
      ).exec();
      //await Commission.findOneAndUpdate({ receive_mem_id: id, status: "pending" }, { bank }).exec();
      await Commission.updateMany({ receive_mem_id: id }, { bank }).exec();
      await Commission.updateMany(
        { receive_mem_id: { $in: arr_id_clone } },
        { bank }
      ).exec();
      change = true;
    }
    if (user.bank_account !== bank_account) {
      await User.findOneAndUpdate(
        { _id: id },
        {
          bank_account,
        }
      ).exec();
      await User.updateMany(
        { parent_id: id, is_clone: true },
        {
          bank_account,
        }
      ).exec();
      //await Commission.findOneAndUpdate({ receive_mem_id: id, status: "pending" }, { bank_account }).exec();
      await Commission.updateMany(
        { receive_mem_id: id },
        { bank_account }
      ).exec();
      await Commission.updateMany(
        { receive_mem_id: { $in: arr_id_clone } },
        { bank_account }
      ).exec();
      change = true;
    }
    if (user.bank_name !== bank_name) {
      await User.findOneAndUpdate(
        { _id: id },
        {
          bank_name,
        }
      ).exec();
      await User.updateMany(
        { parent_id: id, is_clone: true },
        {
          bank_name,
        }
      ).exec();
      //await Commission.findOneAndUpdate({ receive_mem_id: id, status: "pending" }, { bank_name }).exec();
      await Commission.updateMany({ receive_mem_id: id }, { bank_name }).exec();
      await Commission.updateMany(
        { receive_mem_id: { $in: arr_id_clone } },
        { bank_name }
      ).exec();
      change = true;
    }
    if (user.email !== email) {
      var array = [];
      array = [
        ...user.old_email,
        { email: old_email, time_change: new Date() },
      ];
      await User.findOneAndUpdate(
        { _id: id },
        {
          email,
          old_email: array,
        }
      ).exec();
      await Transaction.findOneAndUpdate(
        { user_id: id },
        {
          email,
        }
      ).exec();
      await User.updateMany(
        { parent_id: id, is_clone: true },
        {
          email,
        }
      ).exec();
      change = true;
    }
    if (user.expire_time !== expire_time) {
      await User.updateMany(
        { email: user.email },
        {
          $set: { expire_time: new Date(expire_time).toISOString() },
        }
      ).exec();
      await User.updateMany(
        { parent_id: id, is_clone: true },
        {
          $set: { expire_time: new Date(expire_time).toISOString() },
        }
      ).exec();
      await Transaction.findOneAndUpdate(
        { user_id: id },
        { expired_time: expire_time }
      ).exec();
      change = true;
    }
    if (user.buy_package !== buy_package) {
      await User.findOneAndUpdate(
        { _id: id },
        {
          buy_package,
        }
      ).exec();
      await User.updateMany(
        { parent_id: id, is_clone: true },
        {
          buy_package,
        }
      ).exec();
      await Transaction.findOneAndUpdate(
        { user_id: id },
        { buy_package }
      ).exec();
      change = true;
    }
    //check password
    if (password) {
      bcrypt.compare(password, user.password, function (err, result) {
        if (!result) {
          bcrypt.genSalt(saltRounds, async function (err, salt) {
            bcrypt.hash(password, salt, async function (err, hash) {
              await User.findOneAndUpdate(
                { _id: id },
                {
                  password: hash,
                }
              ).exec();
              change = true;
            });
          });
        }
      });
    }

    if (change) {
      await User.findOneAndUpdate(
        { _id: id },
        {
          change_data_by: "ADMIN",
        }
      ).exec();

      res.json({
        status: 200,
        message: "Cập nhật thông tin thành công 🎉",
        errors: [],
        data: {
          // newUser: await User.findOne({ _id: id }).exec(),
          // change
        },
      });
    } else {
      res.json({
        status: 200,
        message: "Thông tin không thay đổi",
        errors: [],
      });
    }
  }
};

exports.getStorage = async (req, res) => {
  const keyword = req.body.keyword ? req.body.keyword : "";
  const changeExportList = req.body.changeExportList;
  const searchType = parseInt(req.body.searchType);
  const page = parseInt(req.body.page);
  const perPage = parseInt(req.body.resultsPerPage);
  const currentMonth = parseInt(req.body.currentMonth);
  const currentYear = parseInt(req.body.currentYear);
  var skip = 0;

  if (page > 1) {
    skip = (page - 1) * perPage;
  }

  var listLinkFilter = [];
  var countAllDocument = 0;
  var exportData = [];

  if (searchType === 1) {
    listLinkFilter = await Activation.find({})
      .sort({ _id: -1 })
      .limit(perPage)
      .skip(skip)
      .exec();
    countAllDocument = await Activation.countDocuments({})
      .sort({ _id: -1 })
      .exec();
  }

  if (searchType === 2) {
    listLinkFilter = await Activation.find({
      firstName: { $regex: ".*" + keyword + ".*", $options: "i" },
    })
      .limit(perPage)
      .skip(skip)
      .sort({ _id: -1 })
      .exec();
    countAllDocument = await Activation.countDocuments({
      firstName: { $regex: ".*" + keyword + ".*", $options: "i" },
    })
      .sort({ _id: -1 })
      .exec();
  }

  if (searchType === 3) {
    let firstDay = new Date(currentYear, currentMonth - 1, 1);
    let lastDay = new Date(currentYear, currentMonth, 0);
    listLinkFilter = await Activation.find({
      created: {
        $gte: firstDay,
        $lte: lastDay,
      },
    })
      .sort({ _id: -1 })
      .limit(perPage)
      .skip(skip)
      .exec();
    countAllDocument = await Activation.countDocuments({
      created_time: {
        $gte: firstDay,
        $lte: lastDay,
      },
    })
      .sort({ _id: -1 })
      .exec();
  }

  if (changeExportList) {
    if (searchType === 1) {
      exportData = await Activation.find({}).sort({ _id: -1 }).exec();
    }

    if (searchType === 2) {
      exportData = await Activation.find({
        firstName: { $regex: ".*" + keyword + ".*", $options: "i" },
      })
        .sort({ _id: -1 })
        .exec();
    }

    if (searchType === 4) {
      let firstDay = new Date(currentYear, currentMonth - 1, 1);
      let lastDay = new Date(currentYear, currentMonth, 0);
      exportData = await Activation.find({
        created_time: {
          $gte: firstDay,
          $lte: lastDay,
        },
      })
        .sort({ _id: -1 })
        .exec();
    }
  }

  res.json({
    status: 200,
    data: {
      listLinkFilter,
      allPage: Math.ceil(countAllDocument / perPage),
      countAllDocument,
      exportData,
    },
    errors: [],
    message: "",
  });
};

exports.deleteStorage = async (req, res) => {
  const { id } = req.body;
  await Activation.deleteMany({ _id: id }).exec();

  res.json({
    status: 200,
    data: {},
    errors: [],
    message: "Đã xóa thành công",
  });
};

const getListChildId = async (id) => {
  const objBranch = await Tree.findOne({ parent: id })
    .select("group1 group2 group3")
    .exec();

  const { group1, group2, group3 } = objBranch;

  return [...group1, ...group2, ...group3];
};

exports.getTree = async (req, res) => {
  console.log(req.body);
  const keyword = req.body.keyword ? req.body.keyword : "";
  const page = parseInt(req.body.page);
  const perPage = parseInt(req.body.resultsPerPage);
  const searchType = parseInt(req.body.searchType);
  var skip = 0;

  if (page > 1) {
    skip = (page - 1) * perPage;
  }

  var listAgency = [];

  if (searchType === 1) {
    countAllDocument = await User.countDocuments({
      $and: [
        { role: "normal" },
        { parent_id: process.env.INVITE_CODE },
        { is_delete: false },
      ],
    }).exec();
    listAgency = [
      ...(await User.find({
        $and: [
          { role: "normal" },
          { parent_id: process.env.INVITE_CODE },
          { is_delete: false },
        ],
      })
        .skip(skip)
        .limit(perPage)
        .sort({
          _id: -1,
        })
        .exec()),
    ];
  }

  if (searchType === 2) {
    countAllDocument = await User.countDocuments({
      $and: [
        { role: "normal" },
        {
          uname: {
            $regex: ".*" + removeAccents(keyword) + ".*",
            $options: "i",
          },
        },
        { is_delete: false },
      ],
    }).exec();
    listAgency = [
      ...(await User.find({
        $and: [
          { role: "normal" },
          {
            uname: {
              $regex: ".*" + removeAccents(keyword) + ".*",
              $options: "i",
            },
          },
          { is_delete: false },
        ],
      })
        .skip(skip)
        .limit(perPage)
        .sort({
          _id: -1,
        })
        .exec()),
    ];
  }

  if (searchType === 3) {
    if (keyword.length === 24) {
      countAllDocument = await User.countDocuments({
        $and: [{ role: "normal" }, { _id: keyword }, { is_delete: false }],
      }).exec();
      listAgency = [
        ...(await User.find({
          $and: [{ role: "normal" }, { _id: keyword }, { is_delete: false }],
        })
          .skip(skip)
          .limit(perPage)
          .sort({
            _id: -1,
          })
          .exec()),
      ];
    } else {
      countAllDocument = 0;
      listAgency = [];
    }
  }

  const root = [];

  for (let agency of listAgency) {
    const result = await getTreeChild(agency._id);
    const tree = [];
    tree.push(result);
    if (tree.length === 0) {
      root.push([agency]);
    } else {
      root.push(tree);
    }
  }
  res.json({
    status: 200,
    data: {
      group: root,
      allPage: Math.ceil(countAllDocument / perPage),
      countAllDocument,
    },
    errors: [],
    message: "",
  });
};

exports.createAdmin = async (req, res) => {
  var errors = [];
  const { email, role, password, full_name } = req.body;
  var validUserEmail = await User.findOne({ email }).exec();

  if (validUserEmail) {
    errors.push({ label: "email", err_message: "Email đã được sử dụng" });
  }

  if (errors.length === 0) {
    const listCharacterOfName = full_name.split(" ");
    const avatarKey = `${listCharacterOfName[listCharacterOfName.length - 2]}+${
      listCharacterOfName[listCharacterOfName.length - 1]
    }`;

    bcrypt.genSalt(saltRounds, function (err, salt) {
      bcrypt.hash(password, salt, async function (err, hash) {
        if (err) {
          console.log(err);
          return res.json(err);
        } else {
          const user = new User({
            full_name,
            email,
            password: hash,
            avatar: `https://ui-avatars.com/api/?name=${avatarKey}&background=random`,
            role,
            created_time: new Date(),
            uname: removeAccents(full_name.toUpperCase()),
            is_partner: true,
            active: true,
            is_clone: false,
            is_delete: false,
          });

          user.save((err) => {
            if (err) {
              console.log(err);
            } else {
              res.json({
                status: 200,
                errors: [],
                data: {},
                message: "Đã Admin thành công",
              });
            }
          });
        }
      });
    });
  } else {
    res.json({
      status: 401,
      errors,
      message: "Có lỗi xảy ra!",
    });
  }
};

exports.getListAdmin = async (req, res) => {
  const listAdmin = await User.find({
    $and: [{ role: { $ne: "normal" } }, { _id: { $ne: req.id_admin } }],
  }).exec();

  res.json({
    status: 200,
    errors: [],
    data: {
      listAdmin,
    },
    message: "",
  });
};

exports.deleteAdmin = async (req, res) => {
  const { id } = req.body;
  await User.deleteOne({ _id: id }).exec();

  res.json({
    status: 200,
    errors: [],
    data: {},
    message: "Đã xóa thành công",
  });
};

//chuyển tree
exports.editTree = async (req, res) => {
  // chua handle root la admin
  const { move_acc, root_acc, group } = req.body;
  console.log(req.body);
  const rootItem = await User.findOne({ _id: root_acc }).exec();

  const moveItem = await User.findOne({ _id: move_acc }).exec();

  if (!rootItem || !moveItem) {
    return res.json({
      status: 401,
      message: "Có mã giới thiệu không hợp lệ",
      errors: [
        {
          label: "move_acc",
          err_message: "Mã giới thiệu không hợp lệ",
        },
        {
          label: "root_acc",
          err_message: "Mã giới thiệu không hợp lệ",
        },
      ],
    });
  }

  const rootTree = await Tree.findOne({ parent: rootItem._id }).exec();

  if (moveItem.parent_id !== process.env.INVITE_CODE) {
    const moveFatherTree = await Tree.findOne({
      parent: moveItem.parent_id,
    }).exec();

    var newGroup = [];
    if (moveFatherTree.group1.includes(moveItem._id)) {
      let index = moveFatherTree.group1.indexOf(moveItem._id);
      console.log("index1", index);
      if (index !== -1) {
        newGroup = [
          ...moveFatherTree.group1.slice(0, index),
          ...moveFatherTree.group1.slice(index + 1),
        ];
        await Tree.findOneAndUpdate(
          { _id: moveFatherTree._id },
          { group1: newGroup }
        ).exec();
      }
    }
    if (moveFatherTree.group2.includes(moveItem._id)) {
      let index = moveFatherTree.group2.indexOf(moveItem._id);
      console.log("index2", index);
      if (index !== -1) {
        newGroup = [
          ...moveFatherTree.group2.slice(0, index),
          ...moveFatherTree.group2.slice(index + 1),
        ];
        await Tree.findOneAndUpdate(
          { _id: moveFatherTree._id },
          { group2: newGroup }
        ).exec();
      }
    }
    if (moveFatherTree.group3.includes(moveItem._id)) {
      let index = moveFatherTree.group3.indexOf(moveItem._id);
      console.log("index3", index);
      if (index !== -1) {
        newGroup = [
          ...moveFatherTree.group3.slice(0, index),
          ...moveFatherTree.group3.slice(index + 1),
        ];
        await Tree.findOneAndUpdate(
          { _id: moveFatherTree._id },
          { group3: newGroup }
        ).exec();
      }
    }
  }

  switch (group) {
    case 1:
      console.log("rootTree.group1", rootTree.group1);
      let newRootGroup1 = [...rootTree.group1, moveItem._id];
      console.log("newRootGroup1", newRootGroup1);
      await Tree.findOneAndUpdate(
        { _id: rootTree._id },
        { group1: newRootGroup1 }
      ).exec();
      break;
    case 2:
      console.log("rootTree.group2", rootTree.group2);
      let newRootGroup2 = [...rootTree.group2, moveItem._id];
      console.log("newRootGroup2", newRootGroup2);
      await Tree.findOneAndUpdate(
        { _id: rootTree._id },
        { group2: newRootGroup2 }
      ).exec();
      break;
    case 3:
      console.log("rootTree.group3", rootTree.group3);
      let newRootGroup3 = [...rootTree.group3, moveItem._id];
      console.log("newRootGroup3", newRootGroup3);
      await Tree.findOneAndUpdate(
        { _id: rootTree._id },
        { group3: newRootGroup3 }
      ).exec();
      break;
  }

  if (moveItem.parent_id !== rootItem._id) {
    await User.findOneAndUpdate(
      { _id: moveItem._id },
      { parent_id: rootItem._id }
    );
    // Update amout / point Root
    // if (moveItem.buy_package === "2") {
    //   await User.findOneAndUpdate({ _id: rootItem._id }, {
    //     point: rootItem.point + moveItem.point + 1
    //   }).exec();
    // } else if (moveItem.buy_package === "1") {
    //   await User.findOneAndUpdate({ _id: rootItem._id }, {
    //     point: rootItem.point + moveItem.point + 0.25
    //   }).exec();
    // } else if (moveItem.buy_package === "3") {
    //   await User.findOneAndUpdate({ _id: rootItem._id }, {
    //     point: rootItem.point + moveItem.point + 10
    //   }).exec();
    // }
    // // Update amout / point Move Acc
    // if (moveItem.parent_id !== process.env.INVITE_CODE) {
    //   const moveFather = await User.findOne({ _id: moveItem.parent_id, is_delete: false }).exec();
    //   if (moveItem.buy_package === "2") {
    //     await User.findOneAndUpdate({ _id: moveItem.parent_id }, {
    //       point: moveFather.point - moveItem.point - 1
    //     }).exec();
    //   } else if (moveItem.buy_package === "1") {
    //     await User.findOneAndUpdate({ _id: moveItem.parent_id }, {
    //       point: moveFather.point - moveItem.point - 0.25
    //     }).exec();
    //   } else if (moveItem.buy_package === "3") {
    //     await User.findOneAndUpdate({ _id: moveItem.parent_id }, {
    //       point: moveFather.point - moveItem.point - 10
    //     }).exec();
    //   }

    await checkLevel(moveItem.parent_id);

    await checkLevel(rootItem._id);

    await checkChildPoint(moveItem.parent_id);

    await checkChildPoint(rootItem._id);

    await checkPoint(moveItem.parent_id);

    await checkPoint(rootItem._id);
    //}
  }

  return res.json({
    status: 200,
    message: "Đã cập nhật hệ thống",
    errors: [],
  });
};

exports.deleteUser = async (req, res) => {
  const { id } = req.body;
  var user = await User.findOne({ _id: id, is_delete: false }).exec();

  if (user.parent_id !== process.env.INVITE_CODE) {
    var treeParent = await Tree.findOne({ parent: user.parent_id }).exec();
    var newGroup = [];
    if (user.group_number === "1") {
      const index = treeParent.group1.indexOf(id);
      if (index > -1) {
        newGroup = [
          ...treeParent.group1.slice(0, index),
          ...treeParent.group1.slice(index + 1),
        ];
        await Tree.findOneAndUpdate(
          { _id: treeParent._id },
          { group1: newGroup }
        ).exec();
      }
    }
    if (user.group_number === "2") {
      const index = treeParent.group2.indexOf(id);
      if (index > -1) {
        newGroup = [
          ...treeParent.group2.slice(0, index),
          ...treeParent.group2.slice(index + 1),
        ];
        await Tree.findOneAndUpdate(
          { _id: treeParent._id },
          { group2: newGroup }
        ).exec();
      }
    }
    if (user.group_number === "3") {
      const index = treeParent.group3.indexOf(id);
      if (index > -1) {
        newGroup = [
          ...treeParent.group3.slice(0, index),
          ...treeParent.group3.slice(index + 1),
        ];
        await Tree.findOneAndUpdate(
          { _id: treeParent._id },
          { group3: newGroup }
        ).exec();
      }
    }
  }
  await deleteUserAndTree(user._id);
  if (user.parent_id !== process.env.INVITE_CODE) {
    await checkPoint(user.parent_id);
    await checkLevel(user.parent_id);
  }

  await User.updateMany(
    { parent_id: id },
    { parent_id: process.env.INVITE_CODE }
  ).exec();
  res.json({
    status: 200,
    message: "Đã xóa thành công",
    errors: [],
  });
  return res;
};

const deleteUserAndTree = async (id) => {
  //await User.deleteOne({ _id: id }).exec();
  var user = await User.findOne({ _id: id }).exec();
  if (user.buy_package === "3" || user.buy_package === "4") {
    await User.updateMany(
      { email: user.email },
      { is_delete: true, delete_time: new Date(), active: false }
    ).exec();
  } else {
    await User.findOneAndUpdate(
      { _id: id },
      { is_delete: true, delete_time: new Date(), active: false }
    ).exec();
  }
  // await Tree.deleteOne({ parent: id }).exec();
  await Tree.findOneAndUpdate(
    { parent: id },
    { is_delete: true, delete_time: new Date() }
  ).exec();
  await Bonus.findOneAndUpdate(
    { receive_mem_id: id },
    { is_delete: true, delete_time: new Date() }
  ).exec();
  var list = await Transaction.find({ user_id: id }).exec();
  for (var element of list) {
    //await Commission.deleteMany({ trans_id: element._id }).exec();
    await Commission.updateMany(
      { trans_id: element._id },
      { is_delete: true, delete_time: new Date() }
    ).exec();
  }
  //await Transaction.deleteMany({ user_id: id }).exec();
  await Transaction.updateMany(
    { user_id: id },
    { is_delete: true, delete_time: new Date() }
  ).exec();
  //await Commission.deleteMany({ receive_mem_id: id }).exec();
  await Commission.updateMany(
    { join_mem_id: id },
    { is_delete: true, delete_time: new Date() }
  ).exec();
};

exports.renderTree = async (req, res) => {
  const list = await User.find().select("_id buy_package").exec();

  for (let user of list) {
    let treeUser = await Tree.findOne({ parent: user._id }).exec();
    if (!treeUser) {
      let tree = new Tree({
        parent: user._id,
        group1: [],
        group2: [],
        group3: [],
        buy_package: user.buy_package,
      });

      await tree.save(async (err) => {
        if (err) {
          console.log("err", err);
        }
      });
    }
  }
  res.send("saved tree");
};

exports.changeDate = async (req, res) => {
  const listUser = await User.find({}).exec();

  for (let user of listUser) {
    let created_time = user.created_time;
    let birthday = user.birthday;
    let id_time = user.id_time;
    let expire_time = user.expire_time;
    if (created_time) {
      let arr = created_time.split("/");
      let newTime = arr[2] + "-" + arr[1] + "-" + arr[0];
      await User.findOneAndUpdate(
        { _id: user._id },
        { created_time: newTime }
      ).exec();
    }
    if (birthday) {
      let arr1 = birthday.split("/");
      let newTime1 = arr1[2] + "-" + arr1[1] + "-" + arr1[0];
      await User.findOneAndUpdate(
        { _id: user._id },
        { birthday: newTime1 }
      ).exec();
    }
    if (id_time) {
      let arr2 = id_time.split("/");
      let newTime2 = arr2[2] + "-" + arr2[1] + "-" + arr2[0];
      await User.findOneAndUpdate(
        { _id: user._id },
        { id_time: newTime2 }
      ).exec();
    }
    if (expire_time) {
      let arr3 = expire_time.split("/");
      let newTime3 = arr3[2] + "-" + arr3[1] + "-" + arr3[0];
      await User.findOneAndUpdate(
        { _id: user._id },
        { expire_time: newTime3 }
      ).exec();
    }
  }
};

exports.renderAvatar = async (req, res) => {
  const listUser = await User.find({}).exec();
  for (let user of listUser) {
    // --------------- CREATE AVATAR -------------------
    var avatar = "";
    if (user.full_name) {
      var listCharacterOfName = user.full_name.split(" ");
      var avatarKey = `${listCharacterOfName[listCharacterOfName.length - 2]}+${
        listCharacterOfName[listCharacterOfName.length - 1]
      }`;
      avatar = `https://ui-avatars.com/api/?name=${avatarKey}&background=random`;
    } else {
      avatar =
        "https://robohash.org/maximeteneturdignissimos.jpg?size=100x100&set=set1";
    }
    await User.findOneAndUpdate({ _id: user._id }, { avatar }).exec();
  }
};

exports.renderUser = async (req, res) => {
  const listUser = await User.find({ role: { $ne: "admin" } }).exec();

  for (let user of listUser) {
    // --------------- CREATE AVATAR -------------------
    // var avatar = "";
    // if (user.full_name) {
    //   var listCharacterOfName = user.full_name.split(" ");
    //   var avatarKey = `${listCharacterOfName[listCharacterOfName.length - 2]}+${listCharacterOfName[listCharacterOfName.length - 1]}`;
    //   avatar = `https://ui-avatars.com/api/?name=${avatarKey}&background=random`;
    // } else {
    //   avatar = "https://robohash.org/maximeteneturdignissimos.jpg?size=100x100&set=set1";
    // }

    // var birthday = "";
    // var id_time = "";
    // var full_name = "";
    // var uname = "";
    // var created_time = "";
    // var expire_time = "";

    // if (user.birthday) {
    //   var birthdayArr = user.birthday.split('-');
    //   birthday = new Date(birthdayArr[2], birthdayArr[1] - 1, birthdayArr[0]);
    // }
    // if (user.id_time && user.id_time !== "") {
    //   var idTimeArr = user.id_time.split('-');
    //   id_time = new Date(idTimeArr[2], idTimeArr[1] - 1, idTimeArr[0]);
    // }

    // if (user.created_time) {
    //   var createdTimeArr = user.created_time.split('-');
    //   created_time = new Date(createdTimeArr[2], createdTimeArr[1] - 1, createdTimeArr[0]);
    // }

    // if (user.created_time) {
    //   expire_time = new Date(new Date(created_time).getFullYear() + 1, new Date(created_time).getMonth(), new Date(created_time).getDate());
    // }

    // if (user.full_name) {
    //   full_name = user.full_name.toUpperCase();
    //   uname = removeAccents(user.full_name);
    // }

    if (!user.old_parent_id || user.old_parent_id == "") {
      // update parent_id
      await User.findOneAndUpdate(
        { _id: user._id },
        {
          parent_id: process.env.INVITE_CODE,
          // , avatar, birthday, id_time, created_time, full_name, is_clone: false, expired: false, role: 'normal', expire_time, uname, is_partner: true, is_delete: false, active: true
        }
      ).exec();
    } else {
      await renderUserFromExcel(
        user
        // avatar, birthday, id_time, created_time, full_name, expire_time, uname
      );
    }
  }

  res.send("rendered!!!");
};

const renderUserFromExcel = async (
  user
  // , avatar, birthday, id_time, created_time, full_name, expire_time, uname
) => {
  const { _id, old_parent_id, group_number } = user;

  const parent = await User.findOne({ old_id: old_parent_id })
    .select("_id")
    .exec();
  if (!parent) {
    console.log("PARENT NOT FOUND!!!");
    // update parent_id
    await User.findOneAndUpdate(
      { _id },
      {
        parent_id: process.env.INVITE_CODE,
        // , avatar, birthday, id_time, created_time, full_name, is_clone: false, expired: false, role: 'normal', expire_time, uname, is_partner: true, is_delete: false, active: true
      }
    ).exec();
    return;
  }
  const parentTree = await Tree.findOne({ parent: parent._id })
    .select("_id group1 group2 group3")
    .exec();
  if (!parentTree) {
    console.log("PARENT TREE NOT FOUND!!!");
    return;
  }

  // update parent_id
  await User.findOneAndUpdate(
    { _id },
    {
      parent_id: parent._id,
      // , avatar, birthday, id_time, created_time, full_name, is_clone: false, expired: false, role: 'normal', expire_time, uname, is_partner: true, is_delete: false, active: true
    }
  ).exec();

  // push child id to parent tree
  await updateTree(group_number, _id, parentTree);
};

exports.deleteOutUser = async (req, res) => {
  const listUser = await User.find({
    $and: [{ parent_id: "AMERITECAIPS1109" }, { full_name: "" }],
  }).exec();
  for (let user of listUser) {
    //await User.deleteOne({ _id: user._id }).exec();
    await User.findOneAndUpdate(
      { _id: user._id },
      { is_delete: true, delete_time: new Date() }
    ).exec();
    //await Tree.deleteOne({ parent: user._id }).exec();
    await Tree.findOneAndUpdate(
      { parent: user._id },
      { is_delete: true, delete_time: new Date() }
    ).exec();
  }
  res.send("deleted");
};

exports.updateCreateTime = async (req, res) => {
  const listUser = await User.find({ role: "normal" }).exec();

  for (let user of listUser) {
    if (user.created_time && user.created_time !== "") {
      let createdTimeArr = user.created_time.split("-");
      created_time = new Date(
        createdTimeArr[2],
        createdTimeArr[1] - 1,
        createdTimeArr[0]
      );
      console.log(created_time);
      await User.findOneAndUpdate(
        { _id: user._id },
        { created_time: created_time }
      ).exec();
      return;
    }
  }
  res.send("updated");
};

const updateTree = async (group, id, parentTree) => {
  if (group === "1") {
    if (!parentTree.group1.includes(id)) {
      var newArr1 = [...parentTree.group1, id];
      await Tree.findOneAndUpdate(
        { _id: parentTree._id },
        { group1: [...newArr1] }
      ).exec();
    }
  }

  if (group === "2") {
    if (!parentTree.group2.includes(id)) {
      var newArr2 = [...parentTree.group2, id];
      await Tree.findOneAndUpdate(
        { _id: parentTree._id },
        { group2: [...newArr2] }
      ).exec();
    }
  }

  if (group === "3") {
    if (!parentTree.group3.includes(id)) {
      var newArr3 = [...parentTree.group3, id];
      await Tree.findOneAndUpdate(
        { _id: parentTree._id },
        { group3: [...newArr3] }
      ).exec();
    }
  }
};

exports.updateTree = async (req, res) => {
  const listUser = await User.find({ role: { $ne: "admin" } }).exec();
  for (let user of listUser) {
    var tree = await Tree.findOne({ parent: user._id }).exec();
    const groupcon1 = [];
    const groupcon2 = [];
    const groupcon3 = [];
    var listChild = await User.find({
      parent_id: user._id,
      is_delete: false,
    }).exec();
    for (let child of listChild) {
      if (
        !groupcon1.includes(mongoose.Types.ObjectId(child._id)) ||
        !groupcon2.includes(mongoose.Types.ObjectId(child._id)) ||
        !groupcon3.includes(mongoose.Types.ObjectId(child._id))
      ) {
        switch (child.group_number) {
          default:
          case "1":
            groupcon1.push(child._id);
            break;
          case "2":
            groupcon2.push(child._id);
            break;
          case "3":
            groupcon3.push(child._id);
            break;
        }
      }
    }
    await Tree.findOneAndUpdate(
      { _id: tree._id },
      {
        group1: groupcon1,
        group2: groupcon2,
        group3: groupcon3,
      }
    ).exec();
  }
  res.json({
    status: 200,
    errors: ["hi"],
  });
};

const createClone = async (user) => {
  var tree_parent = await Tree.findOne({ parent: user._id }).exec();
  var group1 = [...tree_parent.group1];
  var group2 = [...tree_parent.group2];
  var group3 = [...tree_parent.group3];
  for (var i = 1; i <= 9; i++) {
    let group_number = "";
    switch (i) {
      case 1:
      case 2:
      case 3:
        group_number = "1";
        break;
      case 4:
      case 5:
      case 6:
        group_number = "2";
        break;
      case 7:
      case 8:
      case 9:
        group_number = "3";
        break;
    }
    const user_new = new User({
      full_name: user.full_name + " " + i,
      email: user.email,
      password: user.password,
      avatar: user.avatar,
      birthday: user.birthday,
      parent_id: user._id,
      phone: user.phone,
      point: 1,
      level: 0,
      group_number,
      created_time: user.created_time,
      expire_time: user.expire_time,
      id_code: user.id_code,
      id_time: user.id_time,
      issued_by: user.issued_by,
      bank_account: user.bank_account,
      bank: user.bank,
      bank_name: user.bank_name,
      tax_code: user.tax_code,
      buy_package: "3",
      gender: user.gender,
      is_clone: true,
      managed_by: user._id,
      expired: false,
      uname: removeAccents(user.full_name.toUpperCase()),
      account_type: user.account_type,
      is_delete: user.is_delete,
      is_partner: user.is_partner,
      role: user.role,
    });
    await user_new.save();
    const tree = new Tree({
      parent: user_new._id,
      buy_package: "3",
      group1: [],
      group2: [],
      group3: [],
    });
    await tree.save();
    switch (i) {
      case 1:
      case 2:
      case 3:
        group1.push(user_new._id);
        break;
      case 4:
      case 5:
      case 6:
        group2.push(user_new._id);
        break;
      case 7:
      case 8:
      case 9:
        group3.push(user_new._id);
        break;
    }
  }
  tree_parent.group1 = group1;
  tree_parent.group2 = group2;
  tree_parent.group3 = group3;
  await tree_parent.save();
  console.log("clone user done!!!");
};

const createClone4 = async (user) => {
  var tree_parent = await Tree.findOne({ parent: user._id }).exec();
  var group1 = [...tree_parent.group1];
  var group2 = [...tree_parent.group2];
  var group3 = [...tree_parent.group3];
  for (var i = 1; i <= 3; i++) {
    let group_number = "";
    switch (i) {
      case 1:
        group_number = "1";
        break;
      case 2:
        group_number = "2";
        break;
      case 3:
        group_number = "3";
        break;
    }
    const user_new = new User({
      full_name: user.full_name + " " + i,
      email: user.email,
      password: user.password,
      avatar: user.avatar,
      birthday: user.birthday,
      parent_id: user._id,
      phone: user.phone,
      point: 1,
      level: 0,
      group_number,
      created_time: user.created_time,
      expire_time: user.expire_time,
      id_code: user.id_code,
      id_time: user.id_time,
      issued_by: user.issued_by,
      bank_account: user.bank_account,
      bank: user.bank,
      bank_name: user.bank_name,
      tax_code: user.tax_code,
      buy_package: "4",
      gender: user.gender,
      is_clone: true,
      managed_by: user._id,
      expired: false,
      uname: removeAccents(user.full_name.toUpperCase()),
      account_type: user.account_type,
      is_delete: user.is_delete,
      is_partner: user.is_partner,
      role: user.role,
    });
    await user_new.save();
    const tree = new Tree({
      parent: user_new._id,
      buy_package: "4",
      group1: [],
      group2: [],
      group3: [],
    });
    await tree.save();
    switch (i) {
      case 1:
        group1.push(user_new._id);
        break;
      case 2:
        group2.push(user_new._id);
        break;
      case 3:
        group3.push(user_new._id);
        break;
    }
  }
  tree_parent.group1 = group1;
  tree_parent.group2 = group2;
  tree_parent.group3 = group3;
  await tree_parent.save();
  console.log("clone user done!!!");
};

exports.helperInsertCallLevel = async (req, res) => {
  var list = await User.find({ role: "normal" }).exec();
  for (const element of list) {
    let point = element.buy_package === "1" ? 0.25 : 1;
    let level = 0;

    await User.countDocuments(
      { parent_id: element._id, buy_package: "2" },
      function (err, c) {
        point += c * 1;
      }
    );
    await User.countDocuments(
      { parent_id: element._id, buy_package: "1" },
      function (err, c) {
        point += c * 0.25;
      }
    );
    await User.countDocuments(
      { parent_id: element._id, buy_package: "3" },
      function (err, c) {
        point += c * 9;
      }
    );
    element.point = point;
    if (element.buy_package === "2" || element.buy_package === "3") {
      await User.countDocuments({ parent_id: element._id }, function (err, c) {
        if (c >= 9) {
          level = 1;
        }
      });
    }
    element.level = level;
    await element.save(function (err) {
      if (err) {
        console.log("fail to update user: " + element._id);
      }
    });
    await checkLevel(element._id);
  }

  res.json({
    status: 200,
    errors: ["hi"],
  });
};

exports.updateGroupNumber = async (req, res) => {
  const listUser = await User.find().exec();
  for (let user of listUser) {
    if (user.group_number && user.group_number !== "") {
      let group_number = user.group_number.trim();
      await User.findOneAndUpdate({ _id: user._id }, { group_number }).exec();
    } else {
      await User.findOneAndUpdate(
        { _id: user._id },
        { group_number: "1" }
      ).exec();
    }
  }
};

exports.setIsCloneAcc = async (req, res) => {
  const listUser = await User.find({ is_clone: { $ne: false } })
    .sort({ _id: -1 })
    .exec();
  for (let user of listUser) {
    const mapUser = await User.find({
      $and: [{ email: user.email }, { _id: { $ne: user._id } }],
    }).exec();
    if (mapUser) {
      const splitUserName = user.full_name.split(" ");
      if (
        splitUserName[splitUserName.length - 1] === "1" ||
        splitUserName[splitUserName.length - 1] === "2" ||
        splitUserName[splitUserName.length - 1] === "3"
      ) {
        await User.findOneAndUpdate(
          { _id: user._id },
          { is_clone: true, group_number: "1" }
        ).exec();
      } else if (
        splitUserName[splitUserName.length - 1] === "4" ||
        splitUserName[splitUserName.length - 1] === "5" ||
        splitUserName[splitUserName.length - 1] === "6"
      ) {
        await User.findOneAndUpdate(
          { _id: user._id },
          { is_clone: true, group_number: "2" }
        ).exec();
      } else if (
        splitUserName[splitUserName.length - 1] === "7" ||
        splitUserName[splitUserName.length - 1] === "8" ||
        splitUserName[splitUserName.length - 1] === "9"
      ) {
        await User.findOneAndUpdate(
          { _id: user._id },
          { is_clone: true, group_number: "3" }
        ).exec();
      } else {
        await User.findOneAndUpdate(
          { _id: user._id },
          { is_clone: false, group_number: "1" }
        ).exec();
      }
    } else {
      await User.findOneAndUpdate(
        { _id: user._id },
        { is_clone: false, group_number: "1" }
      ).exec();
    }
  }
};

exports.updatePassword = async (req, res) => {
  const listUser = await User.find().exec();
  for (let user of listUser) {
    await User.findOneAndUpdate(
      { _id: user._id },
      {
        password:
          "$2b$10$Gq3FDe6JPJN30GQ/R6qfdeYsUg7TY0.ZMsyBjHLJgYTFxcV7d7wra",
      }
    ).exec();
  }
};

exports.updateRole = async (req, res) => {
  const listUser = await User.find().exec();
  for (let user of listUser) {
    await User.findOneAndUpdate(
      { _id: user._id },
      { is_partner: true, is_delete: false, expired: false, active: true }
    ).exec();
  }
  res.send("ok");
};

exports.createCloneAcc = async (req, res) => {
  console.log("creating");
  const listUser = await User.find({
    $or: [{ buy_package: "4" }, { buy_package: "3" }],
  }).exec();
  for (let user of listUser) {
    if (user.buy_package === "3") {
      await createClone(user);
    } else if (user.buy_package === "4") {
      await createClone4(user);
    }
  }
};
exports.moveToChildOfParent = async (req, res) => {
  const list = await User.find({ role: { $ne: "admin" } }).exec();
  for (let user of list) {
    if (user.child_id && user.child_id !== "") {
      const parentId = user.parent_id;
      if (parentId !== process.env.INVITE_CODE) {
        const parent = await User.findOne({ _id: parentId }).exec();
        const parentTree = await Tree.findOne({ parent: parentId }).exec();

        if (user.group_number === "1") {
          if (parentTree.group1.includes(user._id)) {
            let index = parentTree.group1.indexOf(user._id);
            let newArr1 = [...parentTree.group1];
            newArr1.splice(index, 1);
            await Tree.findOneAndUpdate(
              { _id: parentTree._id },
              { group1: newArr1 }
            ).exec();
          }
        }

        if (user.group_number === "2") {
          if (parentTree.group2.includes(user._id)) {
            let index = parentTree.group2.indexOf(user._id);
            let newArr2 = [...parentTree.group2];
            newArr2.splice(index, 1);
            await Tree.findOneAndUpdate(
              { _id: parentTree._id },
              { group2: newArr2 }
            ).exec();
          }
        }

        if (user.group_number === "3") {
          if (parentTree.group3.includes(user._id)) {
            let index = parentTree.group3.indexOf(user._id);
            let newArr3 = [...parentTree.group3];
            newArr3.splice(index, 1);
            await Tree.findOneAndUpdate(
              { _id: parentTree._id },
              { group3: newArr3 }
            ).exec();
          }
        }

        const newParent = await User.findOne({
          $and: [
            { full_name: parent.full_name + " " + user.child_id },
            { parent_id: parentId },
          ],
        }).exec();
        if (newParent) {
          const newParentTree = await Tree.findOne({
            parent: newParent._id,
          }).exec();

          if (user.group_number === "1") {
            if (!newParentTree.group1.includes(user._id)) {
              var newArr1 = [...newParentTree.group1, user._id];
              await Tree.findOneAndUpdate(
                { _id: newParentTree._id },
                { group1: [...newArr1] }
              ).exec();
            }
          }

          if (user.group_number === "2") {
            if (!newParentTree.group2.includes(user._id)) {
              var newArr2 = [...newParentTree.group2, user._id];
              await Tree.findOneAndUpdate(
                { _id: newParentTree._id },
                { group2: [...newArr2] }
              ).exec();
            }
          }

          if (user.group_number === "3") {
            if (!newParentTree.group3.includes(user._id)) {
              var newArr3 = [...newParentTree.group3, user._id];
              await Tree.findOneAndUpdate(
                { _id: newParentTree._id },
                { group3: [...newArr3] }
              ).exec();
            }
          }

          await User.findOneAndUpdate(
            { _id: user._id },
            { parent_id: newParent._id }
          ).exec();
        }
      }
    }
  }

  res.send("done");
};
exports.updateCloneToBuyPackage3 = async (req, res) => {
  const list = await User.find({ is_clone: true }).exec();
  for (let user of list) {
    await User.findOneAndUpdate({ _id: user._id }, { buy_package: "3" }).exec();
    await Tree.findOneAndUpdate(
      { parent: user._id },
      { buy_package: "3" }
    ).exec();
  }

  res.json({
    mess: "ok",
  });
};

exports.calPointLevelAllUser = async (req, res) => {
  const listUser = await User.find({
    $and: [
      { role: { $ne: "admin" } },
      { role: { $ne: "system" } },
      { role: { $ne: "accountant" } },
      { role: { $ne: "accountant1" } },
    ],
  })
    .sort("created_time")
    .exec();
  for (let user of listUser) {
    await checkPoint(user._id);
   await checkLevel(user._id);
    //await checkChildPoint(user._id,false);
  }
  res.json({
    status: 200,
    errors: ["hi"],
  });

};

exports.calChildPointAll =async (req,res)=>{
  const listUser = await User.find({ $and: [{ role: { $ne: 'admin' } }, { role: { $ne: 'system' } }, { role: { $ne: 'accountant' } },{ role: { $ne: 'accountant1' } }] }).sort('created_time').exec();
  for (let user of listUser) {
    await checkChildPoint(user._id,false);
  }
  res.json({
    status: 200,
    errors: [listUser.length],
  });
}
//tinh lại điểm,lv 1 thằng
exports.calPointLevel = async (req, res) => {
  const { id } = req.params;
  await checkPoint(id);
  await checkLevel(id);
  res.json({
    status: 200,
    errors: ["hi"],
  });
};

const calPointLevel = async (id) => {
  await checkPoint(id);
  await checkLevel(id);
};

exports.deleteUserIsClone = async (req, res) => {
  const listUser = await User.find({ is_clone: true }).exec();

  for (let user of listUser) {
    let groupNumber =
      user.full_name.split(" ")[user.full_name.split(" ").length - 1];
    var treeParent = await Tree.findOne({ parent: user.parent_id }).exec();

    if (groupNumber === "1") {
      var group1 = [...treeParent.group1];
      const index = group1.indexOf(user._id);
      if (index > -1) {
        group1.splice(index, 1);
      }
      treeParent.group1 = group1;
    }
    if (groupNumber === "2") {
      var group2 = [...treeParent.group2];
      const index = group2.indexOf(user._id);
      if (index > -1) {
        group1.splice(index, 1);
      }
      treeParent.group2 = group2;
    }
    if (groupNumber === "3") {
      var group3 = [...treeParent.group3];
      const index = group3.indexOf(user._id);
      if (index > -1) {
        group3.splice(index, 1);
      }
      treeParent.group3 = group3;
    }

    await treeParent.save();

    // await User.deleteOne({ _id: user._id }).exec();
    await User.findOneAndUpdate(
      { _id: user._id },
      { is_delete: true, delete_time: new Date() }
    ).exec();
    // await Tree.deleteOne({ parent: user._id }).exec();
    await Tree.findOneAndUpdate(
      { parent: user._id },
      { is_delete: true, delete_time: new Date() }
    ).exec();
  }
  res.json({
    status: 200,
    message: "Đã xóa thành công",
    errors: [],
  });
  return res;
};

exports.updateLevelUpdateEmpty = async (req, res) => {
  const list = await User.find({ role: { $ne: "admin" } }).exec();
  for (let user of list) {
    await User.findOneAndUpdate(
      { _id: user._id },
      { level_up_time: "" }
    ).exec();
  }
};

exports.updateAccountType = async (req, res) => {
  const list = await User.find({ role: { $ne: "admin" } }).exec();
  for (let user of list) {
    if (!user.ss) {
      await User.findOneAndUpdate(
        { _id: user._id },
        { account_type: "vi" }
      ).exec();
    } else {
      await User.findOneAndUpdate(
        { _id: user._id },
        { account_type: "en" }
      ).exec();
    }
  }
};

exports.convertDateToISO = async (req, res) => {
  const list = await User.find({ role: { $ne: "admin" } }).exec();
  for (let user of list) {
    if (user.created_time) {
      await User.findOneAndUpdate(
        { _id: user._id },
        { created_time: new Date(user.created_time).toISOString() }
      ).exec();
    }
    if (user.birthday) {
      await User.findOneAndUpdate(
        { _id: user._id },
        { birthday: new Date(user.birthday).toISOString() }
      ).exec();
    }
    if (user.id_time) {
      await User.findOneAndUpdate(
        { _id: user._id },
        { id_time: new Date(user.id_time).toISOString() }
      ).exec();
    }
    if (user.expire_time) {
      await User.findOneAndUpdate(
        { _id: user._id },
        { expire_time: new Date(user.expire_time).toISOString() }
      ).exec();
    }
    if (user.level_up_time) {
      await User.findOneAndUpdate(
        { _id: user._id },
        { level_up_time: new Date(user.level_up_time).toISOString() }
      ).exec();
    }
  }
  res.send("ok");
};

exports.testSendMail = async (req, res) => {
  // const subject = "[AMERITEC]";
  // const html = `
  // test
  //     `;

  // try {
  //   await Mail("letrananhkiet1010@gmail.com", html, subject);
  //   console.log("success mail sended!!!! to");
  //   return true;

  // } catch (err) {
  //   console.log("error send success mail!!!! to");
  //   console.log(err);
  //   return false;
  // }
  try {
    var id = "61e821b4326f3b8f4039a963";
    var mail = await MailTemplate.findOne({
      template_name: "remindRenew2Mail",
    }).exec();
    var signature = await MailTemplate.findOne({
      template_name: "signature",
    }).exec();
    var user = await User.findOne({ _id: id }).exec();
    var subject_vn = mail.subject_vn;
    var content_vn = mail.content_vn;
    var subject_en = mail.subject_en;
    var content_en = mail.content_en;
    var thang = user.expire_time.getMonth() + 1;
    var ngayhethan =
      user.expire_time.getDate() +
      "/" +
      thang +
      "/" +
      user.expire_time.getFullYear();
    content_vn = content_vn.replace("[CHU_KY]", signature.content_vn);
    content_en = content_en.replace("[CHU_KY]", signature.content_en);
    content_vn = content_vn.replace("[NGAY_HET_HAN]", ngayhethan);
    content_en = content_en.replace("[NGAY_HET_HAN]", ngayhethan);
    content_vn = content_vn.replace("[FULL_NAME]", user.full_name);
    content_en = content_en.replace("[FULL_NAME]", user.full_name);

    if (user.account_type === "vi") {
      await Mail("nhatnam2405@gmail.com", content_vn, "Nam Test Mail");
    } else {
      await Mail("nhatnam2405@gmail.com", content_en, "Nam Test Mail");
    }
    console.log("success mail sended!!!! to", "nhatnam2405@gmail.com");
    res.json({
      data: "ok",
    });
    return true;
  } catch (err) {
    console.log("error send success mail!!!! to", "nhatnam2405@gmail.com");
    console.log(err);
    res.json({
      data: "err",
    });
    return false;
  }
};

exports.convertsFullToUName = async (req, res) => {
  const list = await User.find().exec();
  for (let user of list) {
    let uname = removeAccents(user.full_name);
    await User.findOneAndUpdate({ _id: user._id }, { uname }).exec();
  }
  res.send("ok");
};

exports.test = async (req, res) => {
  // const { date } = req.body;
  // var date_current = new Date(date);
  // date_current.setHours("00");
  // date_current.setMinutes("00");
  // date_current.setSeconds("00");
  // date_current.setMilliseconds("00");
  // const listUser = await User.find({ expired: false, role: "normal" })
  //   .sort({ _id: -1 })
  //   .exec();
  // const listExpiredUser = listUser.filter((user) => {
  //   const nowDate = new Date(user.expire_time);
  //   nowDate.setHours("00");
  //   nowDate.setMinutes("00");
  //   nowDate.setSeconds("00");
  //   nowDate.setMilliseconds("00");
  //   //nowDate.setDate(nowDate.getDate() + 7);
  //   return moment(nowDate).diff(moment(date_current), "days") <= -6;
  // });
  // const listRemind1User = listUser.filter((user) => {
  //   return (
  //     moment(user.expire_time).diff(moment(date_current), "days") == 15 &&
  //     user.is_clone == false
  //   );
  // });
  // const listRemind2User = listUser.filter((user) => {
  //   return (
  //     moment(user.expire_time).diff(moment(date_current), "days") == 0 &&
  //     user.is_clone == false
  //   );
  // });
  // res.json({
  //   date: new Date(date),
  //   listRemind1User,
  //   listRemind2User,
  //   listExpiredUser,
  // });
  res.json({
    message: "test ok"
  })
};

exports.updateIsDelete = async (req, res) => {
  await User.updateMany({ _id: { $ne: null } }, { is_delete: false }).exec();
  return false;
};

exports.deleteTrashUser = async (req, res) => {
  await User.deleteMany({ is_delete: true }).exec();
  await Tree.deleteMany({ is_delete: true }).exec();
  await Transaction.deleteMany({ is_delete: true }).exec();
  await Bonus.deleteMany({ is_delete: true }).exec();
  await Commission.deleteMany({ is_delete: true }).exec();
  res.json({
    status: 200,
    message: "Đã xóa thành công",
    errors: [],
  });
};

exports.getListDeleteUser = async (req, res) => {
  const keyword = req.body.keyword ? req.body.keyword : "";
  const page = parseInt(req.body.page);
  const perPage = parseInt(req.body.resultsPerPage);
  var skip = 0;
  if (page > 1) {
    skip = (page - 1) * perPage;
  }
  var list = await User.find({
    $and: [
      { is_delete: true },
      {
        uname: { $regex: ".*" + removeAccents(keyword) + ".*", $options: "i" },
      },
    ],
  })
    .limit(perPage)
    .skip(skip)
    .sort({ _id: -1 })
    .exec();
  res.json({
    status: 200,
    data: {
      list,
      allPage: Math.ceil(list.length / perPage),
      countAllDocument: list.length,
    },
    message: "",
    errors: [],
  });
};

exports.blockUser = async (req, res) => {
  const { id } = req.body;
  await User.findOneAndUpdate({ _id: id }, { active: false }).exec();
  res.json({
    status: 200,
    message: "Tạm khóa tài khoản thành công",
    errors: [],
  });
};

exports.unBlockUser = async (req, res) => {
  const { id } = req.body;
  await User.findOneAndUpdate({ _id: id }, { active: true }).exec();
  res.json({
    status: 200,
    message: "Mở tạm khóa tài khoản thành công",
    errors: [],
  });
};

exports.testMail = async (req, res) => {
  const { id, links } = req.body;
  //await reciveCommissonMail(id);
  await paymentSuccessMail(id, links);
  // await remindRenew1Mail(id);
  // await remindRenew2Mail(id);
  // await renewSuccess(id);
  // await levelUpMail(id);
  res.json({
    status: 200,
    data: "",
    message: "",
    errors: [],
  });
};

exports.getNewActiveLink = async (req, res) => {
  const { id, count } = req.body;
  var links = await getMoreActiveLink(id, count);
  await replenishActiveKey(id, links);
  res.json({
    status: 200,
    data: links,
    message: "Đã gửi thành công đến mail khách hàng",
    errors: [],
  });
};

exports.renewLicense = async (req, res) => {
  const { id } = req.body;
  console.log(req.body);
  var user = await User.findOne({ _id: id }).exec();
  var trans_check = await Transaction.findOne({
    user_id: id,
    status: "pending",
    is_renew: true,
  })
    .sort({ created_time: -1 })
    .exec();
  if (trans_check) {
    return res.json({
      status: 404,
      data: "",
      message: "Đã có lệnh gia hạn, vui lòng liên hệ với admin",
      errors: [],
    });
  }
  if (!user) {
    return res.json({
      status: 404,
      data: "",
      message: "Không tìm thấy user",
      errors: [],
    });
  }
  const package = await Package.findOne({ sid: user.buy_package }).exec();
  var oldTrans = await Transaction.findOne({ user_id: id })
    .sort({ created_time: -1 })
    .exec();
  var oldComm = await Commission.findOne({
    $and: [{ join_mem_id: id }, { is_delete: false }],
  })
    .sort({ created_time: -1 })
    .exec();

  var date = new Date(user.expire_time);
  var expire_date = new Date(
    date.getFullYear() + 1,
    date.getMonth(),
    date.getDate(),
    0,
    0,
    0
  ).toISOString();

  if (oldComm) {
    let trans = new Transaction({
      status: "success",
      created_time: new Date(),
      approved_by: "ADMIN",
      approved_time: new Date(),
      user_id: id,
      user_name: user.full_name,
      user_uname: user.uname,
      invite_id: oldTrans.invite_id,
      invite_name: oldTrans.invite_name,
      invite_uname: oldTrans.invite_uname,
      email: user.email,
      payment_method: "tienmat",
      phone: user.phone,
      buy_package: user.buy_package,
      expired_time: expire_date,
      orderId: "",
      amount_vnd: package.price_vnd,
      amount_usd: package.price_usd,
      is_delete: false,
      is_renew: true,
      account_type: user.account_type,
    });
    await trans.save();
    let receive_mem = await User.findOne({
      _id: oldComm.receive_mem_id,
    }).exec();

    let amount_vnd = 0;
    let amount_usd = 0;
    if (receive_mem && !receive_mem.is_delete) {
      if (receive_mem.buy_package == 1) {
        amount_vnd = package.commission.package1.price_vnd;
        amount_usd = package.commission.package1.price_usd;
      }
      if (receive_mem.buy_package == 2) {
        amount_vnd = package.commission.package2.price_vnd;
        amount_usd = package.commission.package2.price_usd;
      }
      if (receive_mem.buy_package == 3) {
        amount_vnd = package.commission.package3.price_vnd;
        amount_usd = package.commission.package3.price_usd;
      }
      if (receive_mem.buy_package == 4) {
        amount_vnd = package.commission.package4.price_vnd;
        amount_usd = package.commission.package4.price_usd;
      }
      var comm = new Commission({
        trans_id: trans._id,
        join_mem_id: user._id,
        receive_mem_id: oldComm.receive_mem_id,
        join_mem_name: user.full_name,
        join_mem_uname: user.uname,
        receive_mem_name: receive_mem.full_name,
        receive_mem_uname: receive_mem.uname,
        status: "pending",
        created_time: new Date(),
        amount_vnd,
        amount_usd,
        bank_account: receive_mem.bank_account,
        bank: receive_mem.bank,
        bank_name: receive_mem.bank_name,
        buy_package: user.buy_package,
        is_renew: true,
        account_type: user.account_type,
      });
      await comm.save();
    }
  } else if (!oldComm && user.parent_id !== process.env.INVITE_CODE) {
    let parent = await User.findOne({
      $and: [{ _id: user.parent_id }, { is_delete: false }],
    }).exec();
    if (parent) {
      let trans = new Transaction({
        status: "success",
        created_time: new Date(),
        approved_by: "ADMIN",
        approved_time: new Date(),
        user_id: id,
        user_name: user.full_name,
        user_uname: user.uname,
        invite_id: parent._id,
        invite_name: parent.full_name,
        invite_uname: parent.uname,
        email: user.email,
        payment_method: "tienmat",
        phone: user.phone,
        buy_package: user.buy_package,
        expired_time: expire_date,
        orderId: "",
        amount_vnd: package.price_vnd,
        amount_usd: package.price_usd,
        is_delete: false,
        is_renew: true,
        account_type: user.account_type,
      });
      await trans.save();

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
      var comm = new Commission({
        trans_id: trans._id,
        join_mem_id: user._id,
        receive_mem_id: parent._id,
        join_mem_name: user.full_name,
        join_mem_uname: user.uname,
        receive_mem_name: parent.full_name,
        receive_mem_uname: parent.uname,
        status: "pending",
        created_time: new Date(),
        amount_vnd,
        amount_usd,
        bank_account: parent.bank_account,
        bank: parent.bank,
        bank_name: parent.bank_name,
        buy_package: user.buy_package,
        is_renew: true,
        account_type: user.account_type,
      });
      await comm.save();
    }
  } else {
    let trans = new Transaction({
      status: "success",
      created_time: new Date(),
      approved_by: "ADMIN",
      approved_time: new Date(),
      user_id: id,
      user_name: user.full_name,
      user_uname: user.uname,
      invite_id: process.env.INVITE_CODE,
      invite_name: "Công Ty",
      invite_uname: "cong ty",
      email: user.email,
      payment_method: "tienmat",
      phone: user.phone,
      buy_package: user.buy_package,
      expired_time: expire_date,
      orderId: "",
      amount_vnd: package.price_vnd,
      amount_usd: package.price_usd,
      is_delete: false,
      is_renew: true,
      account_type: user.account_type,
    });
    await trans.save();
  }

  user.renew_date = date;
  user.count_renew = user.count_renew + 1;
  user.active = true;
  user.expired = false;
  user.expire_time = expire_date;
  await user.save();
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
  await checkPoint(user.parent_id);
  await checkPoint(user._id);
  await renewSuccess(id);
  res.json({
    status: 200,
    data: "",
    message: "Gia hạn thành công",
    errors: [],
  });
};

exports.checkExpired = async (req, res) => {
  const listUser = await User.find({ expired: false, role: "normal" })
    .sort({ _id: -1 })
    .exec();
  var date_current = new Date();
  date_current.setHours("00");
  date_current.setMinutes("00");
  date_current.setSeconds("00");
  date_current.setMilliseconds("00");
  const listExpiredUser = listUser.filter((user) => {
    const nowDate = new Date(user.expire_time);
    nowDate.setHours("00");
    nowDate.setMinutes("00");
    nowDate.setSeconds("00");
    nowDate.setMilliseconds("00");
    //nowDate.setDate(nowDate.getDate() + 7);
    return moment(nowDate).diff(moment(date_current), "days") <= -6;
  });
  if (listExpiredUser.length > 0) {
    for (user of listExpiredUser) {
      await User.findOneAndUpdate({ _id: user._id }, { expired: true });
      await checkLevel(user.parent_id);
      await checkPoint(user.parent_id);
    }
  }

  const listRemind1User = listUser.filter((user) => {
    return (
      moment(user.expire_time).diff(moment(date_current), "days") == 15 &&
      user.is_clone == false
    );
  });
  const listRemind2User = listUser.filter((user) => {
    return (
      moment(user.expire_time).diff(moment(date_current), "days") == 0 &&
      user.is_clone == false
    );
  });
  for (user of listRemind1User) {
    await remindRenew1Mail(user._id);
  }
  for (user of listRemind2User) {
    await remindRenew2Mail(user._id);
  }
  res.json({
    status: 200,
    data: [date_current],
    message:
      "listRemind1User " +
      listRemind1User.length +
      " | listRemind2User " +
      listRemind2User.length +
      " | Expired " +
      listExpiredUser.length,
    errors: [],
  });
};

exports.moveToChildOfParent = async (req, res) => {
  const list = await User.find({ role: { $ne: "admin" } }).exec();
  for (let user of list) {
    if (user.child_id && user.child_id !== "") {
      const parentId = user.old_parent_id;
      const parent = await User.findOne({ old_id: parentId }).exec();
      console.log("parent", parent);
      const parentTree = await Tree.findOne({ parent: parent._id }).exec();

      if (user.group_number === "1") {
        if (parentTree.group1.includes(user._id)) {
          let index = parentTree.group1.indexOf(user._id);
          let newArr1 = [...parentTree.group1];
          newArr1.splice(index, 1);
          await Tree.findOneAndUpdate(
            { _id: parentTree._id },
            { group1: newArr1 }
          ).exec();
        }
      }

      if (user.group_number === "2") {
        if (parentTree.group2.includes(user._id)) {
          let index = parentTree.group2.indexOf(user._id);
          let newArr2 = [...parentTree.group2];
          newArr2.splice(index, 1);
          await Tree.findOneAndUpdate(
            { _id: parentTree._id },
            { group2: newArr2 }
          ).exec();
        }
      }

      if (user.group_number === "3") {
        if (parentTree.group3.includes(user._id)) {
          let index = parentTree.group3.indexOf(user._id);
          let newArr3 = [...parentTree.group3];
          newArr3.splice(index, 1);
          await Tree.findOneAndUpdate(
            { _id: parentTree._id },
            { group3: newArr3 }
          ).exec();
        }
      }

      const newParent = await User.findOne({
        full_name: parent.full_name + " " + user.child_id,
      }).exec();
      console.log("newParent", newParent);
      if (newParent) {
        const newParentTree = await Tree.findOne({
          parent: newParent._id,
        }).exec();

        if (user.group_number === "1") {
          if (!newParentTree.group1.includes(user._id)) {
            var newArr1 = [...newParentTree.group1, user._id];
            await Tree.findOneAndUpdate(
              { _id: newParentTree._id },
              { group1: [...newArr1] }
            ).exec();
          }
        }

        if (user.group_number === "2") {
          if (!newParentTree.group2.includes(user._id)) {
            var newArr2 = [...newParentTree.group2, user._id];
            await Tree.findOneAndUpdate(
              { _id: newParentTree._id },
              { group2: [...newArr2] }
            ).exec();
          }
        }

        if (user.group_number === "3") {
          if (!newParentTree.group3.includes(user._id)) {
            var newArr3 = [...newParentTree.group3, user._id];
            await Tree.findOneAndUpdate(
              { _id: newParentTree._id },
              { group3: [...newArr3] }
            ).exec();
          }
        }

        await User.findOneAndUpdate(
          { _id: user._id },
          { parent_id: newParent._id }
        ).exec();
      }
    }
  }
};

exports.changeAvatar = async (req, res) => {
  const list = await User.find({ role: { $ne: "admin" } }).exec();
  for (let user of list) {
    let avatar = user.avatar;
    let newAvatar = avatar.replace("random", "596D79&color=fff");
    await User.findOneAndUpdate(
      { _id: user._id },
      { avatar: newAvatar }
    ).exec();
  }

  res.send("ok change");
};

exports.updateCommissionToSuccess = async (req, res) => {
  const listCom = await Commission.find({ status: "pending" }).exec();

  console.log("listCom", listCom.length);
  for (let com of listCom) {
    await Commission.findOneAndUpdate(
      { _id: com._id },
      {
        status: "success",
        approved_by: "TRẦN THỊ KIM NGÂN",
        approved_time: new Date(),
        payment_method: "thucong",
      }
    ).exec();
  }
};

exports.testN = async (req, res) => {
  console.log("listCom");
};
