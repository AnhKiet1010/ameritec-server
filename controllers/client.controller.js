const User = require("../models/user.model");
const Tree = require("../models/tree.model");
const Transaction = require("../models/transaction.model");
const Commission = require("../models/commission.model");
const Activation = require("../models/activation.model");
const Package = require("../models/package.model");
const Bonus = require("../models/bonus.model");
const Policy = require("../models/policy.model");
const Request = require("../models/request.model");
const { BANK } = require("../constants/bank");
const { PACKAGE } = require("../constants/package");
const axios = require("axios");
const {
  countTotalPersonPackage,
  countTotalChildMember,
  randomString,
  upgradeMail,
  removeAccents,
} = require("./method");
const fs = require("fs");
const moment = require("moment");
const bcrypt = require("bcrypt");
const saltRounds = 10;

exports.dashboard = async (req, res) => {
  const { id } = req.params;
  const user = await User.findOne({ _id: id }).exec();
  var targetNumber;
  var countLevel;
  switch (user.level) {
    case 0:
      targetNumber = process.env.STEP1_NUMBER;
      countLevel = 0;
      break;
    case 1:
      targetNumber = process.env.STEP2_NUMBER;
      countLevel = 1;
      break;
    case 2:
      targetNumber = process.env.STEP3_NUMBER;
      countLevel = 2;
      break;
    case 3:
      targetNumber = process.env.STEP4_NUMBER;
      countLevel = 3;
      break;
    case 4:
      targetNumber = process.env.STEP5_NUMBER;
      countLevel = 4;
      break;
    case 5:
      targetNumber = process.env.STEP6_NUMBER;
      countLevel = 5;
      break;
    default:
      targetNumber = 0;
      countLevel = 0;
  }
  const treeOfUser = await Tree.findOne({ parent: id })
    .select("group1 group2 group3")
    .exec();
  const totalChildMemberGroup1 = await countTotalChildMemberForLevel(
    [...treeOfUser.group1],
    user.level + 1,
    countLevel
  );
  const totalChildMemberGroup2 = await countTotalChildMemberForLevel(
    [...treeOfUser.group2],
    user.level + 1,
    countLevel
  );
  const totalChildMemberGroup3 = await countTotalChildMemberForLevel(
    [...treeOfUser.group3],
    user.level + 1,
    countLevel
  );
  const totalPersonPackage = await countTotalPersonPackage(
    [...treeOfUser.group1, ...treeOfUser.group2, ...treeOfUser.group3],
    user.level,
    countLevel
  );
  const countTotalChildWithPackage = await countTotalChildWithBuypackage(id);

  var amount_usd = 0;
  var amount_vnd = 0;
  var commission = await Commission.find({
    $and: [
      { receive_mem_id: id },
      { status: "success" },
      { status: "success" },
    ],
  }).exec();
  for (var ele of commission) {
    amount_usd = amount_usd + ele.amount_usd;
    amount_vnd = amount_vnd + ele.amount_vnd;
  }
  var countPackage1 = await countPackage(id, "1");
  var countPackage2 = await countPackage(id, "2");
  var countPackage3 = await countPackage(id, "3");
  var sumPointGroup1 = await sumPoint(treeOfUser.group1);
  var sumPointGroup2 = await sumPoint(treeOfUser.group2);
  var sumPointGroup3 = await sumPoint(treeOfUser.group3);
  var date1 = moment(new Date());
  var date2 = moment(user.expire_time);
  var diff = date2.diff(date1, "day");

  switch (user.buy_package) {
    case "1":
      return res.json({
        status: 200,
        data: {
          user,
          targetNumber: parseInt(targetNumber),
          countPackage: {
            countPackage1,
            countPackage2,
            countPackage3,
          },
          dayToExpired: diff,
          created_time: user.created_time,
          expired_time: user.expire_time,
          revenue: {
            amount_usd,
            amount_vnd,
          },
        },
        errors: [],
      });
      break;
    case "2":
    case "3":
      return res.json({
        status: 200,
        data: {
          user,
          targetNumber: parseInt(targetNumber),
          countPackage: {
            countPackage1,
            countPackage2,
            countPackage3,
          },
          sumPoint: {
            sumPointGroup1,
            sumPointGroup2,
            sumPointGroup3,
          },
          dayToExpired: diff,
          created_time: user.created_time,
          expired_time: user.expire_time,
          revenue: {
            amount_usd,
            amount_vnd,
          },
        },
        errors: [],
      });
      break;
  }
  res.json({
    status: 200,
    data: {
      user,
      // totalGroup1: totalChildMemberGroup1,
      // totalGroup2: totalChildMemberGroup2,
      // totalGroup3: totalChildMemberGroup3,
      // totalPersonPackage,
      targetNumber: parseInt(targetNumber),
      // countTotalChildWithPackage
      countPackage: {
        countPackage1,
        countPackage2,
        countPackage3,
      },
      sumPoint: {
        sumPointGroup1,
        sumPointGroup2,
        sumPointGroup3,
      },
      dayToExpired: diff,
    },
    errors: [],
  });
};

exports.getHeaderDashBoard = async (req, res) => {
  const { id } = req.body;
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
  var listComission = await Commission.find({ status: "success" }).exec();
  var pk1 = listComission.filter((comm) => comm.buy_package == "1").length;
  var pk2 = listComission.filter((comm) => comm.buy_package == "2").length;
  var pk3 = listComission.filter((comm) => comm.buy_package == "3").length;
  var pk4 = listComission.filter((comm) => comm.buy_package == "4").length;
  var pig =
    -7462 +
    pk1 * process.env.PIG_PACKAGE1 +
    pk2 * process.env.PIG_PACKAGE2 +
    pk3 * process.env.PIG_PACKAGE3 +
    pk4 * process.env.PIG_PACKAGE4;
  // var pig = 0;
  var countNoti = 0;
  if (id) {
    countNoti = await Policy.countDocuments({ read_id: { $nin: id } }).exec();
  }

  res.json({
    status: 200,
    data: {
      listLevelUpToday,
      piggy: pig,
      countNoti,
    },
    errors: [],
  });
};

exports.dashboardTotalPoint = async (req, res) => {
  const { id } = req.params;
  const user = await User.findOne({ _id: id }).exec();
  var targetNumber;
  var countLevel;
  switch (user.level) {
    case 0:
      targetNumber = process.env.STEP1_NUMBER;
      countLevel = 0;
      break;
    case 1:
      targetNumber = process.env.STEP2_NUMBER;
      countLevel = 1;
      break;
    case 2:
      targetNumber = process.env.STEP3_NUMBER;
      countLevel = 2;
      break;
    case 3:
      targetNumber = process.env.STEP4_NUMBER;
      countLevel = 3;
      break;
    case 4:
      targetNumber = process.env.STEP5_NUMBER;
      countLevel = 4;
      break;
    case 5:
      targetNumber = process.env.STEP6_NUMBER;
      countLevel = 5;
      break;
    default:
      targetNumber = 0;
      countLevel = 0;
  }
  const treeOfUser = await Tree.findOne({ parent: id })
    .select("group1 group2 group3")
    .exec();
    if(user.buy_package==1)
    {
      targetNumber=parseInt(targetNumber)+0.75;
      console.log("targetNumber", targetNumber);
    }
  var sumPointGroup1 = await sumPoint([...treeOfUser.group1]);
  var sumPointGroup2 = await sumPoint([...treeOfUser.group2]);
  var sumPointGroup3 = await sumPoint([...treeOfUser.group3]);
  var perGroup1 = (sumPointGroup1 / targetNumber) * 100;
  var perGroup2 = (sumPointGroup2 / targetNumber) * 100;
  var perGroup3 = (sumPointGroup3 / targetNumber) * 100;
  console.log("1", sumPointGroup1);
  console.log("2", sumPointGroup2);
  console.log("3", sumPointGroup3);
  console.log("1", perGroup1);
  console.log("2", perGroup2);
  console.log("3", perGroup3);

  if (perGroup1 > 40) {
    perGroup1 = 40;
    sumPointGroup1 = Math.round(targetNumber * 0.4);
    if (perGroup2 > 35) {
      perGroup2 = 35;
      sumPointGroup2 = Math.round(targetNumber * 0.35);
      if (perGroup3 > 25) {
        perGroup3 = 25;
        sumPointGroup3 = Math.round(targetNumber * 0.25);
      }
    }
    if (perGroup3 > 35) {
      perGroup3 = 35;
      sumPointGroup3 = Math.round(targetNumber * 0.35);
      if (perGroup2 > 25) {
        perGroup2 = 25;
        sumPointGroup2 = Math.round(targetNumber * 0.25);
      }
    }
  }
  if (perGroup2 > 40) {
    perGroup2 = 40;
    sumPointGroup2 = Math.round(targetNumber * 0.4);
    if (perGroup1 > 35) {
      perGroup1 = 35;
      sumPointGroup1 = Math.round(targetNumber * 0.35);
      if (perGroup3 > 25) {
        perGroup3 = 25;
        sumPointGroup3 = Math.round(targetNumber * 0.25);
      }
    }
    if (perGroup3 > 35) {
      perGroup3 = 35;
      sumPointGroup3 = Math.round(targetNumber * 0.35);
      if (perGroup1 > 25) {
        perGroup1 = 25;
        sumPointGroup1 = Math.round(targetNumber * 0.25);
      }
    }
  }
  if (perGroup3 > 40) {
    perGroup3 = 40;
    sumPointGroup3 = Math.round(targetNumber * 0.4);
    if (perGroup1 > 35) {
      perGroup1 = 35;
      sumPointGroup1 = Math.round(targetNumber * 0.35);
      if (perGroup2 > 25) {
        perGroup2 = 25;
        sumPointGroup2 = Math.round(targetNumber * 0.25);
      }
    }
    if (perGroup2 > 35) {
      perGroup2 = 35;
      sumPointGroup2 = Math.round(targetNumber * 0.35);
      if (perGroup1 > 25) {
        perGroup1 = 25;
        sumPointGroup1 = Math.round(targetNumber * 0.25);
      }
    }
  }
  res.json({
    status: 200,
    data: {
      targetNumber: targetNumber,
      sumPoint: {
        sumPointGroup1,
        sumPointGroup2,
        sumPointGroup3,
      },
      perGroup: {
        perGroup1,
        perGroup2,
        perGroup3,
      },
    },
    errors: [],
  });
};

exports.dashboardCountPackage = async (req, res) => {
  const { id } = req.params;
  var countPackage1 = 0;
  var countPackage2 = 0;
  var countPackage3 = 0;
  var countPackage4 = 0;

  var kq = {
    countPackage1,
    countPackage2,
    countPackage3,
    countPackage4,
  };

  const results = await countPackageV2(id, kq);

  res.json({
    status: 200,
    data: {
      countPackage: results,
    },
    errors: [],
  });
};

exports.dashboardUserInfo = async (req, res) => {
  const { id } = req.params;
  const user = await User.findOne({ _id: id }).exec();

  var amount_usd = 0;
  var amount_vnd = 0;
  var commission = await Commission.find({
    $and: [{ receive_mem_id: id }, { status: "success" }],
  }).exec();
  for (var ele of commission) {
    const package = await Package.findOne({ sid: ele.buy_package }).exec();
    amount_usd = amount_usd + package.price_usd;
    amount_vnd = amount_vnd + package.price_vnd;
  }
  var date1 = moment(new Date());
  var date2 = moment(user.expire_time);
  var diff = date2.diff(date1, "day");

  switch (user.buy_package) {
    case "1":
      return res.json({
        status: 200,
        data: {
          user,
          dayToExpired: diff,
          created_time: user.created_time,
          expired_time: user.expire_time,
          revenue: {
            amount_usd,
            amount_vnd,
          },
        },
        errors: [],
      });
      break;
    case "2":
    case "3":
    case "4":
      return res.json({
        status: 200,
        data: {
          user,
          dayToExpired: diff,
          created_time: user.created_time,
          expired_time: user.expire_time,
          revenue: {
            amount_usd,
            amount_vnd,
          },
        },
        errors: [],
      });
      break;
  }
};

exports.getRank500 = async (req, res) => {
  const page = parseInt(req.body.page);
  const perPage = parseInt(req.body.resultsPerPage);
  var skip = 0;
  if (perPage * page > 500) {
    page = 1;
    perPage = 10;
  }
  if (page > 1) {
    skip = (page - 1) * perPage;
  }
  const listUser = await User.find({
    role: "normal",
    is_delete: false,
    active: true,
    expired: false,
  })
    .sort({ level: -1, point: -1, _id: -1 })
    .limit(perPage)
    .skip(skip)
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

const countPackage = async (id, buy_package) => {
  var kq = 0;
  var listChild = await User.find({ parent_id: id }).exec();
  var listChildFilter = listChild.filter(
    (p) => p.buy_package == buy_package && !p.is_clone
  );
  kq = kq + listChildFilter.length;
  for (var ele of listChild) {
    kq = kq + (await countPackage(ele._id, buy_package));
  }
  return kq;
};

const countPackageV2 = async (id, kq) => {
  let listChild = await User.find({ parent_id: id }).exec();

  for (let ele of listChild) {
    if (ele.buy_package == "1" && !ele.is_clone) {
      kq.countPackage1 = kq.countPackage1 + 1;
    }
    if (ele.buy_package == "2" && !ele.is_clone) {
      kq.countPackage2 = kq.countPackage2 + 1;
    }
    if (ele.buy_package == "3" && !ele.is_clone) {
      kq.countPackage3 = kq.countPackage3 + 1;
    }
    if (ele.buy_package == "4" && !ele.is_clone) {
      kq.countPackage4 = kq.countPackage4 + 1;
    }
    await countPackageV2(ele._id, kq);
  }
  return kq;
};

const countLevel = async (id, level) => {
  if (level == null) {
    level = 0;
  }
  var tree = await Tree.findOne({ parent: id }).exec();
  var countGroup1 = 0;
  var countGroup2 = 0;
  var countGroup3 = 0;
  if (tree.group1.length > 2) {
    for (var i of tree.group1) {
      var temp = await countLevel(i);
      if (temp >= level) {
        countGroup1 = countGroup1 + 1;
      }
    }
  }
  if (tree.group2.length > 2) {
    for (var i of tree.group2) {
      var temp = await countLevel(i);
      if (temp >= level) {
        countGroup2 = countGroup2 + 1;
      }
    }
  }
  if (tree.group3.length > 2) {
    for (var i of tree.group3) {
      var temp = await countLevel(i);
      if (temp >= level) {
        countGroup3 = countGroup3 + 1;
      }
    }
  }
  if (countGroup1 + countGroup2 + countGroup3 > 8) {
    if (countGroup1 > 2 && countGroup2 > 2 && countGroup3 > 2) {
      level = countLevel(id, level + 1);
    }
  }
  var kq = level;
  return kq;
};

const countTotalChildWithBuypackage = async (id) => {
  var countBuypackage1 = 0;
  var countBuypackage2 = 0;
  var countBuypackage3 = 0;
  var array_child1 = await User.find({
    parent_id: id,
    buy_package: "1",
  }).exec();
  var array_child2 = await User.find({
    parent_id: id,
    buy_package: "2",
  }).exec();
  var array_child3 = await User.find({
    parent_id: id,
    buy_package: "3",
  }).exec();
  countBuypackage1 = array_child1.length;
  countBuypackage2 = array_child2.length;
  countBuypackage3 = array_child3.length;
  for (var child of array_child1) {
    var countTotalChildWithBuypackageChild =
      await countTotalChildWithBuypackage(child._id);
    countBuypackage1 =
      countBuypackage1 + countTotalChildWithBuypackageChild.countBuypackage1;
    countBuypackage2 =
      countBuypackage2 + countTotalChildWithBuypackageChild.countBuypackage2;
    countBuypackage3 =
      countBuypackage3 + countTotalChildWithBuypackageChild.countBuypackage3;
  }
  for (var child of array_child2) {
    var countTotalChildWithBuypackageChild =
      await countTotalChildWithBuypackage(child._id);
    countBuypackage1 =
      countBuypackage1 + countTotalChildWithBuypackageChild.countBuypackage1;
    countBuypackage2 =
      countBuypackage2 + countTotalChildWithBuypackageChild.countBuypackage2;
    countBuypackage3 =
      countBuypackage3 + countTotalChildWithBuypackageChild.countBuypackage3;
  }
  for (var child of array_child3) {
    var countTotalChildWithBuypackageChild =
      await countTotalChildWithBuypackage(child._id);
    countBuypackage1 =
      countBuypackage1 + countTotalChildWithBuypackageChild.countBuypackage1;
    countBuypackage2 =
      countBuypackage2 + countTotalChildWithBuypackageChild.countBuypackage2;
    countBuypackage3 =
      countBuypackage3 + countTotalChildWithBuypackageChild.countBuypackage3;
  }
  return (data = {
    countBuypackage1: countBuypackage1,
    countBuypackage2: countBuypackage2,
    countBuypackage3: countBuypackage3,
  });
};

const countTotalChildMemberForLevel = async (
  subTreeIdList,
  countLevel,
  level
) => {
  var count = 0;
  if (subTreeIdList.length == 0) {
    return 0;
  }
  for (let id of subTreeIdList) {
    let branchObject = await Tree.findOne({ parent: id })
      .select("group1 group2 group3 buy_package")
      .exec();
    if (branchObject.buy_package !== "1") {
      count++;
    }
    if (countLevel !== 1) {
      let group = [
        ...branchObject.group1,
        ...branchObject.group2,
        ...branchObject.group3,
      ];
      count += await countTotalChildMemberForLevel(
        group,
        countLevel - 1,
        level
      );
    }
  }
  return count;
};

const countTotalPointInGroupForLevel = async (
  subTreeIdList,
  countLevel,
  level
) => {
  var count = 0;
  if (subTreeIdList.length == 0) {
    return count;
  }
  for (let id of subTreeIdList) {
    let child = await User.findOne({ _id: id }).exec();
    if (!child.expired) {
      if (child.buy_package === "1") {
        count += 0.25;
      }
      if (child.buy_package === "2") {
        count += 1;
      }
      if (child.buy_package === "3") {
        count += 1;
      }
      let branchObject = await Tree.findOne({ parent: id })
        .select("group1 group2 group3 buy_package")
        .exec();
      if (countLevel !== 1) {
        let group = [
          ...branchObject.group1,
          ...branchObject.group2,
          ...branchObject.group3,
        ];
        count += await countTotalPointInGroupForLevel(
          group,
          countLevel - 1,
          level
        );
      }
    }
  }
  return count;
};

const getListChildId = async (id) => {
  const objBranch = await Tree.findOne({ parent: id })
    .select("group1 group2 group3")
    .exec();

  const { group1, group2, group3 } = objBranch;

  return [...group1, ...group2, ...group3];
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
  var Cha = {
    _id: userCha._id,
    full_name: userCha.full_name,
    // countChild: await countTotalChildMember(await getListChildId(idcha)),
    level: userCha.level,
    buy_package: userCha.buy_package,
    avatar: userCha.avatar,
    point: userCha.point,
    child1: {
      arr: child1,
      // countChild: await countTotalChildMember(child1),9
      sumPoint: await sumPoint(child1),
    },
    child2: {
      arr: child2,
      // countChild: await countTotalChildMember(child2),
      sumPoint: await sumPoint(child2),
    },
    child3: {
      arr: child3,
      // countChild: await countTotalChildMember(child3),
      sumPoint: await sumPoint(child3),
    },
    expired: userCha.expired,
  };
  return Cha;
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
    child1: {
      arr: child1,
      sumPoint: await sumPoint(child1),
    },
    child2: {
      arr: child2,
      sumPoint: await sumPoint(child2),
    },
    child3: {
      arr: child3,
      sumPoint: await sumPoint(child3),
    },
    expired: userCha.expired,
  };
  return Cha;
};
const sumPoint = async (array_user_id) => {
  var kq = 0;
  let binus_point = 0;
  for (var ele of array_user_id) {
    var user = await User.findOne({ _id: ele._id }).exec();
    if (user) {
      if (user.expired) {
        binus_point += user.buy_package === "1" ? 0.25 : 1;
      }
      kq += user.point;
    }
  }
  return kq - binus_point;
};

exports.getChildInTree = async (req, res) => {
  const { id, keyword, user_id } = req.body;
  const page = parseInt(req.body.page);
  const perPage = parseInt(req.body.resultsPerPage);

  var user = await User.findOne({ _id: id }).exec();
  if (user.buy_package === "1") {
    let listChildArr = await getInfoFullChildren(id, keyword);
    return res.json({
      status: 200,
      data: {
        listChild: listChildArr.slice((page - 1) * perPage, page * perPage),
        totalResults: listChildArr.length,
        allPage: Math.ceil(listChildArr.length / perPage),
      },
      errors: [],
      message: "",
    });
  }
  if (
    user.buy_package === "2" ||
    user.buy_package === "3" ||
    user.buy_package === "4"
  ) {
    const listChildArr = await getInfoFullChildren(user_id, keyword);
    res.json({
      status: 200,
      data: {
        listChild: listChildArr.slice((page - 1) * perPage, page * perPage),
        totalResults: listChildArr.length,
        allPage: Math.ceil(listChildArr.length / perPage),
      },
      errors: [],
      message: "",
    });
  }
};

exports.tree = async (req, res) => {
  console.log("body", req.body);
  const { id, user_id } = req.body;
  const loadTree = req.body.loadTree;

  var user = await User.findOne({ _id: id }).exec();

  const root = [];
  if (loadTree) {
    const result = await getTreeChild(id);
    root.push(result);
  }

  res.json({
    status: 200,
    data: {
      group: root,
      loadTree,
    },
    errors: [],
    message: "",
  });
};

const updateParent = async (id, buy_package) => {
  const parent = await User.findOne({ _id: id }).exec();
  const checkUp = await checkUpLevel(id, buy_package);

  await User.findOneAndUpdate(
    { _id: parent._id },
    {
      point: parent.point + 0.75,
      level: checkUp ? parent.level + 1 : parent.level,
    }
  );

  if (
    parent.parent_id === "AMERITEC" ||
    parent.parent_id === "AMERITECAIPS1109"
  ) {
    return;
  } else {
    await updateParent(parent.parent_id, buy_package);
  }
};

const checkUpLevel = async (id, buy_package) => {
  const user = await User.findOne({ _id: id }).exec();
  if (buy_package === 1) {
    return;
  } else {
    var targetNumber;
    var countLevel;
    switch (user.level) {
      case 0:
        targetNumber = process.env.STEP1_NUMBER;
        countLevel = 0;
        break;
      case 1:
        targetNumber = process.env.STEP2_NUMBER;
        countLevel = 1;
        break;
      case 2:
        targetNumber = process.env.STEP3_NUMBER;
        countLevel = 2;
        break;
      case 3:
        targetNumber = process.env.STEP4_NUMBER;
        countLevel = 3;
        break;
      case 4:
        targetNumber = process.env.STEP5_NUMBER;
        countLevel = 4;
        break;
      case 5:
        targetNumber = process.env.STEP6_NUMBER;
        countLevel = 5;
        break;
      default:
        targetNumber = 0;
        countLevel = 0;
    }

    const treeOfUser = await Tree.findOne({ parent: user._id })
      .select("group1 group2 group3")
      .exec();
    const listChildAllGroupOfUser = [
      ...treeOfUser.group1,
      ...treeOfUser.group2,
      ...treeOfUser.group3,
    ];
    const totalChildMember =
      (await countTotalChildMemberForLevel(listChildAllGroupOfUser)) + 1;
    const totalChildMemberGroup1 = await countTotalChildMemberForLevel(
      [...treeOfUser.group1],
      0,
      countLevel
    );
    const totalChildMemberGroup2 = await countTotalChildMemberForLevel(
      [...treeOfUser.group2],
      0,
      countLevel
    );
    const totalChildMemberGroup3 = await countTotalChildMemberForLevel(
      [...treeOfUser.group3],
      0,
      countLevel
    );

    if (totalChildMember < targetNumber) {
      return false;
    } else if (
      totalChildMemberGroup1 >= Math.floor(parseInt(targetNumber) / 4) &&
      totalChildMemberGroup2 >= Math.floor(parseInt(targetNumber) / 4) &&
      totalChildMemberGroup3 >= Math.floor(parseInt(targetNumber) / 4)
    ) {
      return true;
    }
  }
};

exports.profile = async (req, res) => {
  const { id } = req.params;
  const user = await User.findOne({ _id: id }).exec();
  let invite_id = user.parent_id;
  if (user.invite_user_id && user.invite_user_id !== "") {
    invite_id = user.invite_user_id;
  }

  var listInfo = [];
  if (user.account_type === "vi") {
    listInfo = [
      { label: "Số chứng minh thư", value: user.id_code },
      {
        label: "Ngày cấp",
        value: user.id_time
          ? new Date(user.id_time).toLocaleDateString("vi")
          : "",
      },
      { label: "Nơi cấp", value: user.issued_by },
      { label: "Số tài khoản", value: user.bank_account },
      { label: "Ngân hàng", value: user.bank },
      { label: "Tên tài khoản", value: user.bank_name },
      { label: "Mã số Thuế", value: user.tax_code ? user.tax_code : "" },
      { label: "cmndMT", value: user.cmndMT },
      { label: "cmndMS", value: user.cmndMS },
    ];
  } else {
    listInfo = [
      { label: "SS# or TAX ID", value: user.ss },
      { label: "State", value: user.state },
      { label: "Driver's License", value: user.drive_id },
      {
        label: "State, Froms of receiving commissions",
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
        { label: "Email", value: user.email },
        { label: "Số điện thoại", value: user.phone },
        {
          label: "Gói mua",
          value:
            user.account_type === "en"
              ? PACKAGE.find((ele) => ele.value === user.buy_package).label_en
              : PACKAGE.find((ele) => ele.value === user.buy_package).label,
        },
        {
          label: "Ngày tháng năm sinh",
          value: user.birthday
            ? new Date(user.birthday).toLocaleDateString("vi")
            : "",
        },
        {
          label: "Giới tính",
          value: user.gender === 2 ? "Nam" : user.gender === 3 ? "Nữ" : "N/A",
        },
        {
          label: "Người giới thiệu",
          value:
            invite_id !== process.env.INVITE_CODE
              ? (
                  await User.findOne({
                    _id: invite_id,
                    is_delete: false,
                  }).exec()
                ).full_name
              : "Công Ty",
        },
        ...listInfo,
      ],
    },
    errors: [],
    message: "",
  });
};

exports.editProfile = async (req, res) => {
  const {
    phone,
    bank,
    bank_account,
    bank_name,
    password,
    request_commission,
    newPassword,
    id,
  } = req.body;

  const errors = [];
  const list_id_clone = await User.find({ parent_id: id, is_clone: true })
    .select("_id")
    .exec();
  var arr_id_clone = [];
  list_id_clone.map((p) => arr_id_clone.push(p._id));
  const user = await User.findOne({ _id: id }).exec();

  bcrypt.compare(password, user.password, async function (err, result) {
    // result == true
    if (!result || err) {
      return res.json({
        status: 400,
        errors: [{ label: "password" }],
        message: "Mật khẩu không đúng. Vui lòng thử lại",
      });
    } else {
      // const valid_phone = await User.findOne({ $and: [{ phone }, { _id: { $ne: id } }, { is_clone: false }] }).exec();

      // if (valid_phone) {
      //   if (JSON.stringify(valid_phone) !== JSON.stringify(user)) {
      //     errors.push({
      //       label: "phone",
      //       err_message: "Số điện thoại đã được sử dụng.Vui lòng chọn số khác",
      //     });
      //   }
      // }

      if (errors.length > 0) {
        res.json({
          status: 400,
          errors,
          message: "Có thông tin bị trùng.Vui lòng thử lại!",
        });
      } else {
        let change = false;
        if (newPassword) {
          bcrypt.genSalt(saltRounds, function (err, salt) {
            bcrypt.hash(newPassword, salt, async function (err, hash) {
              await User.findOneAndUpdate(
                { _id: id },
                {
                  password: hash,
                }
              ).exec();
              await User.updateMany(
                { parent_id: id, is_clone: true },
                {
                  password: hash,
                }
              ).exec();
              change = true;
            });
          });
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
          await Commission.updateMany(
            { receive_mem_id: id },
            { bank_name }
          ).exec();
          await Commission.updateMany(
            { receive_mem_id: { $in: arr_id_clone } },
            { bank_name }
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
            randomstring +
            "_back." +
            files.CMND_Back[0].filename.split(".").pop();
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

        if (change) {
          await User.findOneAndUpdate(
            { _id: id },
            {
              change_data_by: "USER",
            }
          ).exec();

          res.json({
            status: 200,
            message: "Cập nhật thông tin thành công 🎉",
            errors: [],
            data: {
              newUser: await User.findOne({ _id: id }).exec(),
              change,
            },
          });
        } else {
          res.json({
            status: 200,
            message: "Cập nhật thông tin thành công 🎉",
            errors: [],
          });
        }
      }
    }
  });
};

exports.getPolicyList = async (req, res) => {
  const { currentTable } = req.body;
  const listPolicy = await Policy.find({
    $and: [{ is_delete: false }, { category: currentTable }],
  })
    .sort({ _id: -1 })
    .exec();
  const result = [];

  for (let policy of listPolicy) {
    policy.is_read = policy.read_id.includes(req.user_id);
    result.push(policy);
  }

  res.json({
    status: 200,
    data: {
      listPolicy: result,
    },
    errors: [],
    message: "",
  });
};

exports.getPolicy = async (req, res) => {
  const { id } = req.body;

  const policy = await Policy.findOne({ _id: id }).exec();
  const newReadArr = [...policy.read_id];
  if (!newReadArr.includes(req.user_id)) {
    newReadArr.push(req.user_id);

    await Policy.findOneAndUpdate(
      { _id: id },
      { read_id: [...newReadArr] }
    ).exec();
  }

  res.json({
    status: 200,
    message: "",
    data: {
      policy,
    },
    errors: [],
  });
};

exports.receipts = async (req, res) => {
  const { id } = req.params;
  const user = await User.findOne({ _id: id }).exec();
  const transaction = await Transaction.find({
    user_id: user._id,
    status: "success",
  }).exec();
  const commission = await Commission.find({ receive_mem_id: user._id })
    .sort({ _id: -1 })
    .exec();
  const listBonus = await Bonus.find({
    $and: [{ receive_mem_id: req.user_id }, { is_delete: false }],
  }).exec();

  res.json({
    status: 200,
    data: {
      transaction,
      commission,
      listBonus,
    },
    message: "",
    errors: [],
  });
};

exports.createRequest = async (req, res) => {
  console.log("body", req.body);
  console.log("file", req.file);
  const io = req.app.get("io");
  const user_id = req.user_id;
  const { content, reason } = req.body;
  const user = await User.findOne({ _id: user_id }).exec();

  const file = req.file;
  let filename = "";

  if (file) {
    const randomstring = randomString();

    filename = randomstring + "_request." + file.filename.split(".").pop();
    fs.rename(
      "./" + file.path,
      "./public/uploads/request/" + filename,
      (err) => {
        if (err) console.log(err);
      }
    );
  }
  const request = new Request({
    request_id: user_id,
    request_time: new Date(),
    request_name: user.full_name,
    request_uname: removeAccents(user.full_name.toUpperCase()),
    content,
    reason,
    filename,
    status: "pending",
    mid: "",
    mtime: "",
    is_delete: false,
  });

  request.save((err) => {
    if (err) {
      console.log(err);
    } else {
      io.emit("NewRequest");
      res.json({
        status: 200,
        errors: [],
        data: {},
        message:
          "Yêu cầu của Bạn đã được chúng tôi tiếp nhận và sẽ phản hồi sớm nhất",
      });
    }
  });
};

exports.inviteCode = async (req, res) => {
  const { id, keyword } = req.body;
  const page = parseInt(req.body.page);
  const perPage = parseInt(req.body.resultsPerPage);

  let listChildArr = await getInfoFullChildren(id, keyword);
  return res.json({
    status: 200,
    data: {
      id,
      listChild: listChildArr.slice((page - 1) * perPage, page * perPage),
      totalResults: listChildArr.length,
      allPage: Math.ceil(listChildArr.length / perPage),
    },
    message: "",
    errors: [],
  });
};

const getInfoFullChildren = async (id, keyword) => {
  var kq = [];
  var listUser = await User.find({ parent_id: id }).exec();
  for (var user of listUser) {
    if (removeAccents(user.uname).includes(removeAccents(keyword))) {
      kq.push(user);
    }
    kq = kq.concat(await getInfoFullChildren(user._id, keyword));
  }
  return kq;
};

exports.createTransRenew = async (req, res) => {
  console.log("-----------------ok-------------");
  var user_id = req.user_id;
  var datenow = new Date();
  var checktrans = await Transaction.findOne({
    user_id: user_id,
    status: "pending",
    is_renew: true,
  }).exec();
  if (checktrans) {
    return res.json({
      status: 404,
      data: {},
      message: "Đã có lệnh gia hạn, vui lòng liên hệ với admin",
      errors: [],
    });
  }
  await Transaction.deleteMany({ user_id: user_id, status: "pending" }).exec();
  var oldTrans = await Transaction.findOne({
    user_id: user_id,
    status: "success",
  })
    .sort({ _id: -1 })
    .exec();
  var user = await User.findOne({ _id: user_id }).exec();
  const listPackage = await Package.find().exec();
  const amount_vnd = listPackage.find(
    (ele) => ele.sid == user.buy_package
  ).price_vnd;
  const amount_usd = listPackage.find(
    (ele) => ele.sid == user.buy_package
  ).price_usd;
  if (!oldTrans) {
    var newTrans = new Transaction({
      token: "",
      status: "pending",
      created_time: datenow,
      user_id: user_id,
      user_name: user.full_name,
      user_uname: removeAccents(user.full_name),
      invite_id: user.parent_id,
      invite_name:
        user.parent_id === process.env.INVITE_CODE
          ? process.env.INVITE_CODE
          : await User.findOne({ _id: user.parent_id }).exec().full_name,
      email: user.email,
      phone: user.phone,
      buy_package: user.buy_package,
      amount_vnd,
      amount_usd,
      is_renew: true,
      expired_time: new Date(
        datenow.getFullYear() + 1,
        datenow.getMonth(),
        datenow.getDate()
      ),
      account_type: user.account_type,
    });
    console.log(newTrans);
    await newTrans.save();
    return res.json({
      status: 200,
      data: { newTrans },
      message: "Success",
      errors: [],
    });
  } else {
    var newTrans = new Transaction({
      token: "",
      status: "pending",
      created_time: datenow,
      user_id: user_id,
      user_name: user.full_name,
      user_uname: removeAccents(user.full_name),
      invite_id: oldTrans.invite_id,
      invite_name: oldTrans.invite_name,
      email: user.email,
      phone: user.phone,
      buy_package: user.buy_package,
      amount_vnd,
      amount_usd,
      is_renew: true,
      expired_time: new Date(
        datenow.getFullYear() + 1,
        datenow.getMonth(),
        datenow.getDate()
      ),
      account_type: user.account_type,
    });
    await newTrans.save();
    return res.json({
      status: 200,
      data: {
        newTrans,
      },
      message: "Success",
      errors: [],
    });
  }
};
