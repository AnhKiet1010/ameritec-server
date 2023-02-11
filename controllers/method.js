const User = require("../models/user.model");
const Activation = require("../models/activation.model");
const Tree = require("../models/tree.model");
const Package = require("../models/package.model");
const Transaction = require("../models/transaction.model");
const Commission = require("../models/commission.model");
const axios = require("axios");
const { Mail } = require("./mail.js");
const MailTemplate = require("../models/mailtemplate.model");
exports.updateParent = async (id, buy_package) => {
  const parent = await User.findOne({ _id: id }).exec();
  const checkUp = await checkUpLevel(id, buy_package);

  await User.findOneAndUpdate(
    { _id: parent._id },
    {
      point: buy_package == "1"
        ? parent.point + 0.25
        : buy_package == "2"
          ? parent.point + 1
          : buy_package == "3"
            ? parent.point + 10
            : parent.point,
      level: checkUp ? parent.level + 1 : parent.level,
    }
  );

  if (parent.parent_id === process.env.INVITE_CODE) {
    return;
  } else {
    await updateParent(parent.parent_id, buy_package);
  }
};

const updateParent = async (id, buy_package) => {
  const parent = await User.findOne({ _id: id }).exec();
  const checkUp = await checkUpLevel(id, buy_package);

  await User.findOneAndUpdate(
    { _id: parent._id },
    {
      point: buy_package == "1"
        ? parent.point + 0.25
        : buy_package == "2"
          ? parent.point + 1
          : buy_package == "3"
            ? parent.point + 10
            : parent.point,
      level: checkUp ? parent.level + 1 : parent.level,
    }
  );

  if (parent.parent_id === process.env.INVITE_CODE) {
    return;
  } else {
    await updateParent(parent.parent_id, buy_package);
  }
};

exports.systemCountLevelAllUsers = async (req, res,) => {
  var list = await User.find({ id_ameritecjsc: { $ne: null } }).exec();
  for (const element of list) {
    let amount = 0;
    let point = 0;
    let level = 0;
    if (element.parent_id != process.env.INVITE_CODE) {
      //updateParent(element.parent_id, element.buy_package);
    }
    await User.countDocuments({ parent_id: element._id, buy_package: "2" }, function (err, c) {
      amount += c * 160;
      point += c * 1;
    });
    await User.countDocuments({ parent_id: element._id, buy_package: "1" }, function (err, c) {
      amount += c * 40;
      point += c * 0.25;
    });
    element.point = point;
    element.amount = amount;
    if (element.buy_package === "2") {
      await User.countDocuments({ parent_id: element._id }, function (err, c) {
        if (c > 9) {
          level = 1;
        }
      });
    }
    element.level = level;
    await element.save(function (err) {
      if (err) {
        console.log("fail to update user: " + element.id_ameritecjsc);
      }
    });
  };

  res.json({
    status: 200,
    errors: ["hi"],
  });
};

exports.checkPoint = async (id) => {
  return await checkPoint(id);
}
const checkPoint = async (id) => {
  if (id && id !== process.env.INVITE_CODE) {
    var user = await User.findOne({ _id: id }).exec();
  } else {
    return 0;
  }
  if (!user) {
    return 0;
  }
  var base_point = user.buy_package === "1" ? 0.25 : 1;
  var point_old = user.point;
  var list_child = await User.find({ parent_id: id }).exec();
  let binus_point = 0;
  for (var child of list_child) {
    if ((child.expired !== false || child.is_delete === true) && child.is_clone === false) {
      if (child.buy_package === "1") {
        binus_point += 0.25;
      }
      if (child.buy_package === "2") {
        binus_point += 1;
      }
      if (child.buy_package === "3") {
        binus_point += 10;
      }
      if (child.buy_package === "4") {
        binus_point += 4;
      }
    }
    base_point += child.point;
  }
  await User.findOneAndUpdate({ _id: id },
    {
      point: base_point - binus_point
    }).exec();
  var compare = base_point - binus_point;
  if (compare !== point_old) {
    await checkLevel(user.parent_id);
    await checkPoint(user.parent_id);
  }
}
exports.checkLevel = async (id) => {
  return await checkLevel(id);
}

const checkLevel = async (id) => {

  if (id && id !== process.env.INVITE_CODE) {
    var user = await User.findOne({ _id: id }).exec();
  }
  else {
    return 0;
  }
  if (!user) {
    return 0;
  }
  let lv = parseInt(user.level);
  var targetNumber = 0;
  var targetNumber_current = 0;
  var tree = await Tree.findOne({ parent: id }).exec();
  let flag = false;
  switch (lv) {
    case 0:
      targetNumber = process.env.STEP1_NUMBER;
      targetNumber_current = 1;
      break;
    case 1:
      targetNumber = process.env.STEP2_NUMBER;
      targetNumber_current = process.env.STEP1_NUMBER;
      break;
    case 2:
      targetNumber = process.env.STEP3_NUMBER;
      targetNumber_current = process.env.STEP2_NUMBER;
      break;
    case 3:
      targetNumber = process.env.STEP4_NUMBER;
      targetNumber_current = process.env.STEP3_NUMBER;
      break;
    case 4:
      targetNumber = process.env.STEP5_NUMBER;
      targetNumber_current = process.env.STEP4_NUMBER;
      break;
    case 5:
      targetNumber = process.env.STEP6_NUMBER;
      targetNumber_current = process.env.STEP5_NUMBER;
      break;
    case 6:
      targetNumber = 0;
      targetNumber_current = process.env.STEP6_NUMBER;
      break;
    default:
      targetNumber = 0;
  }
  
  var sumPointGroup1 = await sumPoint(tree.group1);
  var sumPointGroup2 = await sumPoint(tree.group2);
  var sumPointGroup3 = await sumPoint(tree.group3);
  if(user.buy_package=="1"){
    targetNumber = parseInt(targetNumber)+ 0.75;
    targetNumber_current=parseInt(targetNumber_current)+0.75;
  }
  console.log(user.full_name + "targetNumber", targetNumber);
  console.log(user.full_name + "targetNumber_current", targetNumber_current);
  console.log("sumPoint check", sumPointGroup1 + "/" + sumPointGroup2 + "/" + sumPointGroup3);
  var perGroup1 = (sumPointGroup1 / targetNumber) * 100;
  var perGroup2 = (sumPointGroup2 / targetNumber) * 100;
  var perGroup3 = (sumPointGroup3 / targetNumber) * 100;
  if (perGroup1 > 40) {
    perGroup1 = 40;
    //sumPointGroup1 = Math.round(targetNumber * 0.4);
    if (perGroup2 > 35) {
      perGroup2 = 35;
      //sumPointGroup2 = Math.round(targetNumber * 0.35);
      if (perGroup3 > 25) {
        perGroup3 = 25;
        //sumPointGroup3 = Math.round(targetNumber * 0.25);
      }
    }
    if (perGroup3 > 35) {
      perGroup3 = 35;
      //sumPointGroup3 = Math.round(targetNumber * 0.35);
      if (perGroup2 > 25) {
        perGroup2 = 25;
        //sumPointGroup2 = Math.round(targetNumber * 0.25);
      }
    }
  }
  if (perGroup2 > 40) {
    perGroup2 = 40;
    //sumPointGroup2 = Math.round(targetNumber * 0.4);
    if (perGroup1 > 35) {
      perGroup1 = 35;
      //sumPointGroup1 = Math.round(targetNumber * 0.35);
      if (perGroup3 > 25) {
        perGroup3 = 25;
        //sumPointGroup3 = Math.round(targetNumber * 0.25);
      }
    }
    if (perGroup3 > 35) {
      perGroup3 = 35;
      //sumPointGroup3 = Math.round(targetNumber * 0.35);
      if (perGroup1 > 25) {
        perGroup1 = 25;
        //sumPointGroup1 = Math.round(targetNumber * 0.25);
      }
    }
  }
  if (perGroup3 > 40) {
    perGroup3 = 40;
    //sumPointGroup3 = Math.round(targetNumber * 0.4);
    if (perGroup1 > 35) {
      perGroup1 = 35;
      //sumPointGroup1 = Math.round(targetNumber * 0.35);
      if (perGroup2 > 25) {
        perGroup2 = 25;
        //sumPointGroup2 = Math.round(targetNumber * 0.25);
      }
    }
    if (perGroup2 > 35) {
      perGroup2 = 35;
      //sumPointGroup2 = Math.round(targetNumber * 0.35);
      if (perGroup1 > 25) {
        perGroup1 = 25;
        //sumPointGroup1 = Math.round(targetNumber * 0.25);
      }
    }
  }
  // await User.countDocuments({ $and: [{ _id: tree.group3 }, { expired: false }, { level: { $gte: lv } }] }, async function (err, c) {
  //   if (c >= 3) {
  //     await User.countDocuments({ $and: [{ _id: tree.group2 }, { expired: false }, { level: { $gte: lv } }] }, async function (err, c) {
  //       if (c >= 3) {
  //         await User.countDocuments({ $and: [{ _id: tree.group1 }, { expired: false }, { level: { $gte: lv } }] }, async function (err, c) {
  //           if (c >= 3) {
  //             await User.findOneAndUpdate({ _id: user._id }, { level: lv + 1, level_up_time: new Date() }).exec();
  //             flag = true;
  //           }
  //         });
  //       }
  //     });
  //   }
  // });
  console.log(user.full_name + "perGroup", perGroup1 + "/" + perGroup2 + "/" + perGroup3);
  var count_check1 = await User.countDocuments({ $and: [{ _id: { $in: tree.group1 } }, { buy_package: { $ne: "0" } }, { expired: false }] }).exec();
  var count_check2 = await User.countDocuments({ $and: [{ _id: { $in: tree.group2 } }, { buy_package: { $ne: "0" } }, { expired: false }] }).exec();
  var count_check3 = await User.countDocuments({ $and: [{ _id: { $in: tree.group3 } }, { buy_package: { $ne: "0" } }, { expired: false }] }).exec();
  // if(user.buy_package=="1"){
  //    count_check1 = await User.countDocuments({ $and: [{ _id: { $in: tree.group1 } }, { buy_package: { $ne: "0" } }, { expired: false }] }).exec();
  //    count_check2 = await User.countDocuments({ $and: [{ _id: { $in: tree.group2 } }, { buy_package: { $ne: "0" } }, { expired: false }] }).exec();
  //    count_check3 = await User.countDocuments({ $and: [{ _id: { $in: tree.group3 } }, { buy_package: { $ne: "0" } }, { expired: false }] }).exec();
  // }
  console.log(user.full_name + "count_check", count_check1 + "/" + count_check2 + "/" + count_check3);
  switch (user.buy_package) {
    
    case "2":
    case "3":
      if (count_check1 >= 1 && count_check2 >= 1 && count_check3 >= 1 /* && count_check1 + count_check2 + count_check3 > 8*/) {
        if ((perGroup1 + perGroup2 + perGroup3) >= 99.99999 && perGroup1 >= 25 && perGroup2 >= 25 && perGroup3 >= 25) {
          await User.findOneAndUpdate({ _id: user._id }, { level: lv + 1, level_up_time: new Date() }).exec();
          await levelUpMail(user._id);
          flag = true;
          console.log(lv + 1);
        }
        else {
          if (lv != 0) {
            var perGroup1_current = (sumPointGroup1 / targetNumber_current) * 100;
            var perGroup2_current = (sumPointGroup2 / targetNumber_current) * 100;
            var perGroup3_current = (sumPointGroup3 / targetNumber_current) * 100;
            if (perGroup1_current > 40) {
              perGroup1_current = 40;
              //sumPointGroup1 = Math.round(targetNumber * 0.4);
              if (perGroup2_current > 35) {
                perGroup2_current = 35;
                //sumPointGroup2 = Math.round(targetNumber * 0.35);
                if (perGroup3_current > 25) {
                  perGroup3_current = 25;
                  //sumPointGroup3 = Math.round(targetNumber * 0.25);
                }
              }
              if (perGroup3_current > 35) {
                perGroup3_current = 35;
                //sumPointGroup3 = Math.round(targetNumber * 0.35);
                if (perGroup2_current > 25) {
                  perGroup2_current = 25;
                  //sumPointGroup2 = Math.round(targetNumber * 0.25);
                }
              }
            }
            if (perGroup2_current > 40) {
              perGroup2_current = 40;
              //sumPointGroup2 = Math.round(targetNumber * 0.4);
              if (perGroup1_current > 35) {
                perGroup1_current = 35;
                //sumPointGroup1 = Math.round(targetNumber * 0.35);
                if (perGroup3_current > 25) {
                  perGroup3_current = 25;
                  //sumPointGroup3 = Math.round(targetNumber * 0.25);
                }
              }
              if (perGroup3 > 35) {
                perGroup3 = 35;
                //sumPointGroup3 = Math.round(targetNumber * 0.35);
                if (perGroup1 > 25) {
                  perGroup1 = 25;
                  //sumPointGroup1 = Math.round(targetNumber * 0.25);
                }
              }
            }
            if (perGroup3_current > 40) {
              perGroup3_current = 40;
              //sumPointGroup3 = Math.round(targetNumber * 0.4);
              if (perGroup1_current > 35) {
                perGroup1_current = 35;
                //sumPointGroup1 = Math.round(targetNumber * 0.35);
                if (perGroup2_current > 25) {
                  perGroup2_current = 25;
                  //sumPointGroup2 = Math.round(targetNumber * 0.25);
                }
              }
              if (perGroup2_current > 35) {
                perGroup2_current = 35;
                //sumPointGroup2 = Math.round(targetNumber * 0.35);
                if (perGroup1_current > 25) {
                  perGroup1_current = 25;
                  //sumPointGroup1 = Math.round(targetNumber * 0.25);
                }
              }
            }
            if (perGroup1_current < 25 || perGroup2_current < 25 || perGroup3_current < 25 || ((perGroup1_current + perGroup2_current + perGroup3_current)) < 99.99) {
              await User.findOneAndUpdate({ _id: user._id }, { level: lv - 1, level_up_time: "" }).exec();
              await levelUpMail(user._id);
              flag = true;
              console.log(user.full_name + "level down", lv - 1);
            }
          }
        }
        var target1 = process.env.STEP1_NUMBER;
        var CheckperGroup1 = (sumPointGroup1 / target1) * 100;
        var CheckperGroup2 = (sumPointGroup2 / target1) * 100;
        var CheckperGroup3 = (sumPointGroup3 / target1) * 100;
        if (((CheckperGroup1 + CheckperGroup2 + CheckperGroup3) < 99.99) || CheckperGroup1 < 25 || CheckperGroup2 < 25 || CheckperGroup3 < 25) {
          await User.findOneAndUpdate({ _id: user._id }, { level: 0, level_up_time: "" }).exec();
          await checkLevel(user.parent_id);
        }
      }
      else {
        await User.findOneAndUpdate({ _id: user._id }, { level: 0, level_up_time: "" }).exec();
        await checkLevel(user.parent_id);
      }
      break;
    case "1":
    case "4":
      console.log(user.full_name + " check");
      if (count_check1 >= 1 && count_check2 >= 1 && count_check3 >= 1) {
        if ((perGroup1 + perGroup2 + perGroup3) >= 99.99999 && perGroup1 >= 25 && perGroup2 >= 25 && perGroup3 >= 25) {
          await User.findOneAndUpdate({ _id: user._id }, { level: lv + 1, level_up_time: new Date() }).exec();
          await levelUpMail(user._id);
          flag = true;
          console.log(user.full_name + " Level up!!!" + lv + 1);
        }
        else {
          if (lv != 0) {
            var perGroup1_current = (sumPointGroup1 / targetNumber_current) * 100;
            var perGroup2_current = (sumPointGroup2 / targetNumber_current) * 100;
            var perGroup3_current = (sumPointGroup3 / targetNumber_current) * 100;
            if (perGroup1_current > 40) {
              perGroup1_current = 40;
              //sumPointGroup1 = Math.round(targetNumber * 0.4);
              if (perGroup2_current > 35) {
                perGroup2_current = 35;
                //sumPointGroup2 = Math.round(targetNumber * 0.35);
                if (perGroup3_current > 25) {
                  perGroup3_current = 25;
                  //sumPointGroup3 = Math.round(targetNumber * 0.25);
                }
              }
              if (perGroup3_current > 35) {
                perGroup3_current = 35;
                //sumPointGroup3 = Math.round(targetNumber * 0.35);
                if (perGroup2_current > 25) {
                  perGroup2_current = 25;
                  //sumPointGroup2 = Math.round(targetNumber * 0.25);
                }
              }
            }
            if (perGroup2_current > 40) {
              perGroup2_current = 40;
              //sumPointGroup2 = Math.round(targetNumber * 0.4);
              if (perGroup1_current > 35) {
                perGroup1_current = 35;
                //sumPointGroup1 = Math.round(targetNumber * 0.35);
                if (perGroup3_current > 25) {
                  perGroup3_current = 25;
                  //sumPointGroup3 = Math.round(targetNumber * 0.25);
                }
              }
              if (perGroup3 > 35) {
                perGroup3 = 35;
                //sumPointGroup3 = Math.round(targetNumber * 0.35);
                if (perGroup1 > 25) {
                  perGroup1 = 25;
                  //sumPointGroup1 = Math.round(targetNumber * 0.25);
                }
              }
            }
            if (perGroup3_current > 40) {
              perGroup3_current = 40;
              //sumPointGroup3 = Math.round(targetNumber * 0.4);
              if (perGroup1_current > 35) {
                perGroup1_current = 35;
                //sumPointGroup1 = Math.round(targetNumber * 0.35);
                if (perGroup2_current > 25) {
                  perGroup2_current = 25;
                  //sumPointGroup2 = Math.round(targetNumber * 0.25);
                }
              }
              if (perGroup2_current > 35) {
                perGroup2_current = 35;
                //sumPointGroup2 = Math.round(targetNumber * 0.35);
                if (perGroup1_current > 25) {
                  perGroup1_current = 25;
                  //sumPointGroup1 = Math.round(targetNumber * 0.25);
                }
              }
            }
            if (perGroup1_current < 25 || perGroup2_current < 25 || perGroup3_current < 25 || ((perGroup1_current + perGroup2_current + perGroup3_current)) < 99.99) {
              await User.findOneAndUpdate({ _id: user._id }, { level: lv - 1, level_up_time: "" }).exec();
              await levelUpMail(user._id);
              flag = true;
              console.log(user.full_name + "Level Down !!!" + lv - 1);
            }
          }
        }
        var target1 = process.env.STEP1_NUMBER;
        var CheckperGroup1 = (sumPointGroup1 / target1) * 100;
        var CheckperGroup2 = (sumPointGroup2 / target1) * 100;
        var CheckperGroup3 = (sumPointGroup3 / target1) * 100;
        console.log(user.full_name + " CheckperGroup", CheckperGroup1 + "/" + CheckperGroup2 + "/" + CheckperGroup3);
        if (((CheckperGroup1 + CheckperGroup2 + CheckperGroup3) < 99.99) || CheckperGroup1 < 25 || CheckperGroup2 < 25 || CheckperGroup3 < 25) {
          await User.findOneAndUpdate({ _id: user._id }, { level: 0, level_up_time: "" }).exec();
          await checkLevel(user.parent_id);
          console.log(user.full_name + " level0!!");
          return 0;
        }
      }
      else {
        await User.findOneAndUpdate({ _id: user._id }, { level: 0, level_up_time: "" }).exec();
        await checkLevel(user.parent_id);
      }
      break;
  }
  if (flag == true) {
    await checkLevel(user._id);
  }
  return 0;
}


exports.checkChildPoint = async(id,flag_parent=true)=>{
  return await checkChildPoint(id,flag_parent);
}
const checkChildPoint = async (id,flag_parent=true)=>{
  try{
    if (id && id !== process.env.INVITE_CODE) {
      var user = await User.findOne({ _id: id , active:1 }).exec();
    } else {
      return 0;
    }
    if (!user) {
      return 0;
    }
    if(user.gender == "N/A"){
      user.gender=1;
    }
    if(user.child1 == null){
      user.child1= {
        arr: [],
        countChild: 0,
        countPoint: 0,
      };
    }
    if(user.child2 == null){
      user.child2= {
        arr: [],
        countChild: 0,
        countPoint: 0,
      };
    }
    if(user.child3 == null){
      user.child3= {
        arr: [],
        countChild: 0,
        countPoint: 0,
      };
    }
    await user.save();
    
    var tree = await Tree.findOne({parent:id}).exec();
    
    var totalchild1 = await countTotalChildMember(tree.group1);
    var totalchild2 = await countTotalChildMember(tree.group2);
    var totalchild3 = await countTotalChildMember(tree.group3);
  
    var totalpoint1 = await sumPoint(tree.group1);
    var totalpoint2 = await sumPoint(tree.group2);
    var totalpoint3 = await sumPoint(tree.group3);
    console.log("child",totalchild1 + "/"+totalchild2 + "/"+totalchild3 );
    // console.log("point",totalpoint1 + "/"+totalpoint2 + "/"+totalpoint3 );
     console.log("user",user);

    var flag = false;
    if(totalchild1!=user.child1.countChild){
      user.child1.countChild=totalchild1;
      flag=true;
    }
    if(totalchild2!=user.child2.countChild){
      user.child2.countChild=totalchild2;
      flag=true;
    }
    if(totalchild3!=user.child3.countChild){
      user.child3.countChild=totalchild3;
      flag=true;
    }
   
    if(totalpoint1!=user.child1.countPoint){
      user.child1.countPoint=totalpoint1;
      flag=true;
    }
    if(totalpoint2!=user.child2.countPoint){
      user.child2.countPoint=totalpoint2;
      flag=true;
    }
    if(totalpoint3!=user.child3.countPoint){
      user.child3.countPoint=totalpoint3;
      flag=true;
    }
    console.log("user change",user)
    if(flag){
      //await user.save();
      await User.findOneAndUpdate(
        { _id: user._id }, 
        { 
          child1 : { arr: [], countChild: totalchild1, countPoint: totalpoint1},
          child2 : { arr: [], countChild: totalchild2, countPoint: totalpoint2},
          child3 : { arr: [], countChild: totalchild3, countPoint: totalpoint3},
        }).exec();
      console.log("Update success: ",user.id);
      if(flag_parent==true){
        await checkChildPoint(user.parent_id);
      }
      
      return 2;
    }
    
    return 1;
  }
  catch(error){
    console.log("id",id);
    console.log(error);
    return -1;
  }
  
}
// const sumPoint = async (array_user_id) => {
//   var kq = 0;
//   for (var ele of array_user_id) {
//     var user = await User.findOne({ $and: [{ _id: ele }, { expired: false }, { is_delete: false }] }).exec();
//     if (user) {
//       kq = kq + user.point;
//     }
//   }
//   return kq;
// }

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
  return kq - binus_point;
}

exports.calPointLevelAllUser = async (req, res) => {
  const listUser = await User.find({}).exec();
  for (let user of listUser) {
    await checkPoint(user._id);
    await checkLevel(user._id);
  }
}

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

exports.getActiveLink = async (email, full_name, phone, buy_package) => {
  //return [];
  let accessToken = "";
  let groupId = "";
  let order = 0;
  var links = [];
  var user = await User.findOne({ $and: [{ email }, { is_clone: { $ne: true } }] }).exec();
  if (!user) {
    return [];
  }
  await axios
    .post(`${process.env.APP_ZIMPERIUM_LOGIN_LINK}`, {
      clientId: process.env.APP_ZIMPERIUM_CLIENT,
      secret: process.env.APP_ZIMPERIUM_SECRET,
    })
    .then((res) => {
      accessToken = res.data.accessToken;
    })
    .catch((err) => {
      console.log("err in get active link accessToken", err);
    });

  await axios
    .get(`${process.env.APP_GET_GROUPS_LINK}`, {
      headers: {
        Authorization: "Bearer " + accessToken,
        ContentType: "application/json",
      },
    })
    .then((res) => {
      groupId = res.data[0].id;
    })
    .catch((err) => {
      console.log("err in get active link groupId", err);
    });

  if (buy_package === "1") {
    while (links.length < 1) {
      let newEmail = email.split("@");
      let ran = makeid(10);
      let result = newEmail[0] + "_" + ran + "@" + newEmail[1];
      await axios
        .post(
          `${process.env.APP_CREATE_USER_LINK}`,
          {
            activationLimit: 4,
            email: `${result}`,
            firstName: full_name,
            groupId,
            lastName: `${ran}`,
            phoneNumber: phone,
            sendEmailInvite: false,
            sendSmsInvite: false,
          },
          {
            headers: {
              Authorization: "Bearer " + accessToken,
              ContentType: "application/json",
            },
          }
        )
        .then(async (res) => {
          const activation = new Activation({
            email: result,
            order,
            user_id: user._id,
            linkId: res.data.id,
            accountId: res.data.accountId,
            groupId: res.data.groupId,
            firstName: res.data.firstName,
            lastName: res.data.lastName,
            activationLimit: res.data.activationLimit,
            activationCount: res.data.activationCount,
            licenseJwt: res.data.licenseJwt,
            shortToken: res.data.shortToken,
            created: res.data.created,
            modified: res.data.modified,
          });

          await activation.save((err) => {
            if (err) {
              console.log("err when save activation", err);
            }
          });
          links.push(res.data.shortToken);
          console.log('link in get', links);
        })
        .catch((err) => {
          console.log("err in get active link", err);
        });
    }

  } else if (buy_package === "2") {
    while (links.length < 4) {
      let newEmail = email.split("@");
      let ran = makeid(10);
      let result = newEmail[0] + "_" + ran + "@" + newEmail[1];
      await axios
        .post(
          `${process.env.APP_CREATE_USER_LINK}`,
          {
            activationLimit: 4,
            email: result,
            firstName: full_name,
            groupId,
            lastName: `${ran}`,
            phoneNumber: phone,
            sendEmailInvite: false,
            sendSmsInvite: false,
          },
          {
            headers: {
              Authorization: "Bearer " + accessToken,
              ContentType: "application/json",
            },
          }
        )
        .then(async (res) => {
          links.push(res.data.shortToken);

          const activation = new Activation({
            email: result,
            order,
            user_id: user._id,
            linkId: res.data.id,
            accountId: res.data.accountId,
            groupId: res.data.groupId,
            firstName: res.data.firstName,
            lastName: res.data.lastName,
            activationLimit: res.data.activationLimit,
            activationCount: res.data.activationCount,
            licenseJwt: res.data.licenseJwt,
            shortToken: res.data.shortToken,
            created: res.data.created,
            modified: res.data.modified,
          });

          await activation.save((err) => {
            if (err) {
              console.log("err when save activation", err);
            }
            order++;
          });
        })
        .catch((err) => {
          console.log("err in get active link", err);
        });
    }
  } else if (buy_package === "3") {
    while (links.length < 40) {
      let newEmail = email.split("@");
      let ran = makeid(10);
      let result = newEmail[0] + "_" + ran + "@" + newEmail[1];
      await axios
        .post(
          `${process.env.APP_CREATE_USER_LINK}`,
          {
            activationLimit: 4,
            email: result,
            firstName: full_name,
            groupId,
            lastName: `${ran}`,
            phoneNumber: phone,
            sendEmailInvite: false,
            sendSmsInvite: false,
          },
          {
            headers: {
              Authorization: "Bearer " + accessToken,
              ContentType: "application/json",
            },
          }
        )
        .then(async (res) => {
          links.push(res.data.shortToken);

          const activation = new Activation({
            email: result,
            order,
            user_id: user._id,
            linkId: res.data.id,
            accountId: res.data.accountId,
            groupId: res.data.groupId,
            firstName: res.data.firstName,
            lastName: res.data.lastName,
            activationLimit: res.data.activationLimit,
            activationCount: res.data.activationCount,
            licenseJwt: res.data.licenseJwt,
            shortToken: res.data.shortToken,
            created: res.data.created,
            modified: res.data.modified,
          });

          await activation.save((err) => {
            if (err) {
              console.log("err when save activation", err);
            }
            order++;
          });
        })
        .catch((err) => {
          console.log("err in get active link", err);
        });
    }
  } else if (buy_package === "4") {
    while (links.length < 16) {
      let newEmail = email.split("@");
      let ran = makeid(10);
      let result = newEmail[0] + "_" + ran + "@" + newEmail[1];
      await axios
        .post(
          `${process.env.APP_CREATE_USER_LINK}`,
          {
            activationLimit: 4,
            email: result,
            firstName: full_name,
            groupId,
            lastName: `${ran}`,
            phoneNumber: phone,
            sendEmailInvite: false,
            sendSmsInvite: false,
          },
          {
            headers: {
              Authorization: "Bearer " + accessToken,
              ContentType: "application/json",
            },
          }
        )
        .then(async (res) => {
          links.push(res.data.shortToken);

          const activation = new Activation({
            email: result,
            order,
            user_id: user._id,
            linkId: res.data.id,
            accountId: res.data.accountId,
            groupId: res.data.groupId,
            firstName: res.data.firstName,
            lastName: res.data.lastName,
            activationLimit: res.data.activationLimit,
            activationCount: res.data.activationCount,
            licenseJwt: res.data.licenseJwt,
            shortToken: res.data.shortToken,
            created: res.data.created,
            modified: res.data.modified,
          });

          await activation.save((err) => {
            if (err) {
              console.log("err when save activation", err);
            }
            order++;
          });
        })
        .catch((err) => {
          console.log("err in get active link", err);
        });
    }
  }
  return links;
};
const makeid = (length) => {
  var result = '';
  var characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  var charactersLength = characters.length;
  for (var i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() *
      charactersLength));
  }
  return result;
}
const getMoreActiveLink = async (id, count) => {
 
  var user = await User.findOne({ _id: id }).exec();
  let accessToken = "";
  let groupId = "";
  let order = 0;
  var links = [];
  await axios
    .post(`${process.env.APP_ZIMPERIUM_LOGIN_LINK}`, {
      clientId: process.env.APP_ZIMPERIUM_CLIENT,
      secret: process.env.APP_ZIMPERIUM_SECRET,
    })
    .then((res) => {
      accessToken = res.data.accessToken;
    })
    .catch((err) => {
      console.log("err in get active link accessToken", err);
    });
  await axios
    .get(`${process.env.APP_GET_GROUPS_LINK}`, {
      headers: {
        Authorization: "Bearer " + accessToken,
        ContentType: "application/json",
      },
    })
    .then((res) => {
      groupId = res.data[0].id;
    })
    .catch((err) => {
      console.log("err in get active link groupId", err);
    });
  while (links.length < count) {
    let newEmail = user.email.split("@");
    let result = newEmail[0] + "_" + makeid(10) + "@" + newEmail[1];
    await axios
      .post(
        `${process.env.APP_CREATE_USER_LINK}`,
        {
          activationLimit: 4,
          email: `${result}`,
          firstName: user.full_name,
          groupId,
          lastName: makeid(10),
          phoneNumber: user.phone,
          sendEmailInvite: false,
          sendSmsInvite: false,
        },
        {
          headers: {
            Authorization: "Bearer " + accessToken,
            ContentType: "application/json",
          },
        }
      )
      .then(async (res) => {
        const activation = new Activation({
          email: result,
          order,
          linkId: res.data.id,
          accountId: res.data.accountId,
          groupId: res.data.groupId,
          firstName: res.data.firstName,
          lastName: res.data.lastName,
          activationLimit: res.data.activationLimit,
          activationCount: res.data.activationCount,
          licenseJwt: res.data.licenseJwt,
          shortToken: res.data.shortToken,
          created: res.data.created,
          modified: res.data.modified,
          user_id: user._id,
        });

        await activation.save((err) => {
          if (err) {
            console.log("err when save activation", err);
          }
          order++;
        });
        links.push(res.data.shortToken);
        console.log('link in get', links);
      })
      .catch((err) => {
        console.log("err in get active link", err);
      });
  }
  return links;
}
exports.getMoreActiveLink = async (id, count) => {
  return await getMoreActiveLink(id, count);
}
exports.returnCommission = async (trans_id, parent_id, buy_package, user_id, user_name, account_type, email) => {
  const bankAccountOfParent = await User.findOne({ _id: parent_id }).exec();
  const listPackage = await Package.find().exec();
  const packageObj = listPackage.find((ele) => ele.sid == bankAccountOfParent.buy_package);
  var amount_vnd = 0;
  var amount_usd = 0;
  if (buy_package == 1) {
    amount_vnd = packageObj.commission.package1.price_vnd;
    amount_usd = packageObj.commission.package1.price_usd;
  }
  if (buy_package == 2) {
    amount_vnd = packageObj.commission.package2.price_vnd;
    amount_usd = packageObj.commission.package2.price_usd;
  }
  if (buy_package == 3) {
    amount_vnd = packageObj.commission.package3.price_vnd;
    amount_usd = packageObj.commission.package3.price_usd;
  }
  if (buy_package == 4) {
    amount_vnd = packageObj.commission.package4.price_vnd;
    amount_usd = packageObj.commission.package4.price_usd;
  }

  const commission = new Commission({
    trans_id,
    receive_mem_id: parent_id,
    join_mem_id: user_id,
    receive_mem_name: bankAccountOfParent.full_name,
    join_mem_name: user_name,
    receive_mem_uname: removeAccents(bankAccountOfParent.full_name),
    join_mem_uname: removeAccents(user_name),
    bank_account: bankAccountOfParent.bank_account,
    bank: bankAccountOfParent.bank,
    bank_name: bankAccountOfParent.bank_name,
    amount_vnd,
    amount_usd,
    created_time: new Date(),
    payment_method: "",
    active_admin: false,
    status: "pending",
    buy_package,
    account_type,
    email
  });

  await commission.save(function (err) {
    if (err) {
      console.log("error add commission", err);
    } else {
      console.log("saved commission");
    }
  });
};

exports.createCloneBuyPackage3 = async (user) => {
  var tree_parent = await Tree.findOne({ parent: user._id }).exec();
  var group1 = [];
  var group2 = [];
  var group3 = [];
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
      group_number,
      created_time: user.created_time,
      expire_time: user.expire_time,
      id_code: user.id_code,
      id_time: user.id_time,
      issued_by: user.issued_by,
      bank_account: user.bank_account,
      point: 1,
      level: 0,
      bank: user.bank,
      bank_name: user.bank_name,
      tax_code: user.tax_code,
      cmndMT: user.cmndMT,
      cmndMS: user.cmndMS,
      buy_package: "3",
      gender: user.gender,
      is_clone: true,
      uname: removeAccents(user.full_name + " " + i),
      is_partner: user.is_partner,
      is_delete: user.is_delete,
      active: user.active,
      role: user.role,
      account_type: user.account_type,
      state: user.state,
      ss: user.ss,
      request_commission: user.request_commission,
      drive_id: user.drive_id

    });
    await user_new.save();
    const tree = new Tree({
      oldid: user_new.oldid,
      parent: user_new._id,
      buy_package: 3,
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
}
exports.createCloneBuyPackage4 = async (user) => {
  var tree_parent = await Tree.findOne({ parent: user._id }).exec();
  var group1 = [];
  var group2 = [];
  var group3 = [];
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
      group_number,
      created_time: user.created_time,
      expire_time: user.expire_time,
      id_code: user.id_code,
      id_time: user.id_time,
      issued_by: user.issued_by,
      bank_account: user.bank_account,
      point: 1,
      level: 0,
      bank: user.bank,
      bank_name: user.bank_name,
      tax_code: user.tax_code,
      cmndMT: user.cmndMT,
      cmndMS: user.cmndMS,
      buy_package: "4",
      gender: user.gender,
      is_clone: true,
      uname: removeAccents(user.full_name + " " + i),
      is_partner: user.is_partner,
      is_delete: user.is_delete,
      active: user.active,
      role: user.role,
      account_type: user.account_type,
      state: user.state,
      ss: user.ss,
      request_commission: user.request_commission,
      drive_id: user.drive_id
    });
    await user_new.save();
    const tree = new Tree({
      oldid: user_new.oldid,
      parent: user_new._id,
      buy_package: 4,
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
  console.log("clone user backage 4 done!!!");
}
exports.countTotalPersonPackage = async (subTreeIdList, countLevel, level) => {
  var count = 0;
  for (let id of subTreeIdList) {
    let branchObject = await Tree.findOne({ parent: id })
      .select("buy_package")
      .exec();
    if (branchObject.buy_package === "1") {
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
        if (group.length !== 0 && branchObject.buy_package === "1") {
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

exports.cutName = (name) => {
  const nameArr = name.split(" ");
  const newName = nameArr.slice(nameArr.length - 2, nameArr.length).join(" ");
  return newName;
};

exports.getResult = async (group, kq) => {
  for (let id of group) {
    let parent = await User.findOne({ _id: id });
    let listGroup = await getListChildId(id);
    if (listGroup.length > 0) {
      for (let i of listGroup) {
        let child = await User.findOne({ _id: i });
        kq.push({
          child: cutName(child.full_name),
          parent: cutName(parent.full_name),
        });
      }
      await getResult(listGroup, kq);
    } else {
      continue;
    }
  }
  return kq;
};

const getResult = async (group, kq) => {
  for (let id of group) {
    let parent = await User.findOne({ _id: id });
    let listGroup = await getListChildId(id);
    if (listGroup.length > 0) {
      for (let i of listGroup) {
        let child = await User.findOne({ _id: i });
        kq.push({
          child: cutName(child.full_name),
          parent: cutName(parent.full_name),
        });
      }
      await getResult(listGroup, kq);
    } else {
      continue;
    }
  }
  return kq;
};

const getFullChildren = async (group, kq) => {
  for (let id of group) {
    let parent = await User.findOne({ _id: id }).select("").exec();
    kq.push(parent);
    let listGroup = await getListChildId(id);
    if (listGroup.length > 0) {
      await getFullChildren(listGroup, kq);
    } else {
      continue;
    }
  }
  return kq;
};

exports.getFullChildren = async (group, kq) => {
  for (let id of group) {
    let parent = await User.findOne({ _id: id }).select("").exec();
    kq.push(parent);
    let listGroup = await getListChildId(id);
    if (listGroup.length > 0) {
      await getFullChildren(listGroup, kq);
    } else {
      continue;
    }
  }
  return kq;
};

const countTotalChildMemberForLevel = async (
  subTreeIdList,
  countLevel,
  level
) => {
  var count = 0;
  for (let id of subTreeIdList) {
    let branchObject = await User.findOne({ _id: id })
      .select("expired")
      .exec();
    if (!branchObject.expired) {
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
}

exports.getListChildId = async (id) => {
  const objBranch = await Tree.findOne({ parent: id })
    .select("group1 group2 group3")
    .exec();

  const { group1, group2, group3 } = objBranch;

  return [...group1, ...group2, ...group3];
};

const getListChildId = async (id) => {
  const objBranch = await Tree.findOne({ parent: id })
    .select("group1 group2 group3")
    .exec();

  const { group1, group2, group3 } = objBranch;

  return [...group1, ...group2, ...group3];
};


exports.countTotalChildMember = async (subTreeIdList) => {
  // for (let id of subTreeIdList) {
  //   let branchObject = await User.findOne({ _id: id })
  //     .select("expired")
  //     .exec();
  //   if (!branchObject.expired) {
  //     count++;
  //   }
  // }
  let count = subTreeIdList.length;

  for (let ele of subTreeIdList) {
    let branchObject = await Tree.findOne({ parent: ele._id })
      .select("group1 group2 group3")
      .exec();

    if (branchObject) {
      let group = [
        ...branchObject.group1,
        ...branchObject.group2,
        ...branchObject.group3,
      ];
      if (group.length !== 0) {
        count += await countTotalChildMember(group);
      } else {
        continue;
      }
    } else {
      continue;
    }
  }
  return count;
};

const countTotalChildMember = async (subTreeIdList) => {
  // for (let id of subTreeIdList) {
  //   let branchObject = await User.findOne({ _id: id })
  //     .select("expired")
  //     .exec();
  //   if (!branchObject.expired) {
  //     count++;
  //   }
  // }

  let count = subTreeIdList.length;


  for (let i = 0; i < subTreeIdList.length; i++) {
    let user = await User.findOne({ _id: subTreeIdList[i]._id }).exec();
    // if (!user.expired) {
    let branchObject = await Tree.findOne({ parent: subTreeIdList[i]._id })
      .select("group1 group2 group3")
      .exec();

    if (branchObject) {
      let group = [
        ...branchObject.group1,
        ...branchObject.group2,
        ...branchObject.group3,
      ];
      if (group.length !== 0) {
        count += await countTotalChildMember(group);
      } else {
        continue;
      }
    } else {
      continue;
    }
    // } else {
    //   continue;
    // }
  }
  return count;
};

exports.getSubUserListAndChildNumber = async (current_user_id) => {
  let branchObject = await Tree.findOne({ parent: current_user_id })
    .select("group1 group2 group3")
    .exec();
  let group = [
    ...branchObject.group1,
    ...branchObject.group2,
    ...branchObject.group3,
  ];

  var subTreeIdList = [];
  var subUserListAndChild = [];

  for (let id of group) {
    const user = await User.findOne({ _id: id }).exec();
    var childNumber = 0;
    const childGroupObj = await Tree.findOne({ parent: id }).exec();
    if (childGroupObj) {
      const childGroupArr = [
        ...childGroupObj.group1,
        ...childGroupObj.group2,
        ...childGroupObj.group3,
      ];
      childNumber = await countTotalChildMember(childGroupArr);
    }
    if (!user) {
      console.log("loop user err");
    } else {
      subTreeIdList.push(user._id);
      subUserListAndChild.push({ user, childNumber });
    }
  }
  return { subTreeIdList, subUserListAndChild };
};

exports.thankMail = async (parentName, email, full_name) => {
  const subject = "[AMERITEC] THƯ CẢM ƠN BẠN ĐÃ GIỚI THIỆU TÀI KHOẢN";
  const html = `<!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta http-equiv="X-UA-Compatible" content="IE=edge">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Mail</title>
    </head>
    <body>
    <div class="">
        <div class="aHl"></div>
        <div id=":9e" tabindex="-1"></div>
        <div id=":93" class="ii gt">
          <div id=":92" class="a3s aiL msg-3508132029520417464"><u></u>
            <div>
              <center class="m_-3508132029520417464wrapper">
                <div>
                  <table cellpadding="0" cellspacing="0" border="0" width="100%" class="m_-3508132029520417464wrapper"
                    bgcolor="#F7F6F1">
                    <tbody>
                      <tr>
                        <td valign="top" bgcolor="#F7F6F1" width="100%">
                          <table width="100%" role="content-container" align="center" cellpadding="0" cellspacing="0"
                            border="0">
                            <tbody>
                              <tr>
                                <td width="100%">
                                  <table width="100%" cellpadding="0" cellspacing="0" border="0">
                                    <tbody>
                                      <tr>
                                        <td>
    
                                          <table width="100%" cellpadding="0" cellspacing="0" border="0"
                                            style="width:100%;max-width:600px" align="center">
                                            <tbody>
                                              <tr>
                                                <td role="modules-container"
                                                  style="padding:32px 0px 0px 0px;color:#000000;text-align:left"
                                                  bgcolor="#F7F6F1" width="100%" align="left">
    
                                                  <table class="m_-3508132029520417464wrapper" role="module" border="0"
                                                    cellpadding="0" cellspacing="0" width="100%" style="table-layout:fixed">
                                                    <tbody>
                                                      <tr>
                                                        <td style="font-size:6px;line-height:10px;padding:0px 0px 16px 0px"
                                                          valign="top" align="center">
                                                          <img class="m_-3508132029520417464max-width CToWUd" border="0"
                                                            style="display:block;color:#000000;text-decoration:none;font-family:Helvetica,arial,sans-serif;font-size:16px;max-width:40%!important;width:20%;height:auto!important"
                                                            src="https://ameritecjsc.com/wp-content/themes/zimperium/assets/img/logo-ameritec-02.png"
                                                            alt="" width="200">
                                                        </td>
                                                      </tr>
                                                    </tbody>
                                                  </table>
                                                  <table role="module" border="0" cellpadding="0" cellspacing="0"
                                                    width="100%" style="table-layout:fixed">
                                                    <tbody>
                                                      <tr>
                                                        <td height="100%" valign="top">
                                                          <div
                                                            style="padding:0 20px;background-color:#f7f6f1;line-height:20">
                                                            <div style="padding:32px 20px;background-color:#fff; line-height: 26px;">
                                                              <p>Thân gửi <b>${parentName}</b>,
                                                                <br>
                                                                <br>
                                                                Ameritec xin chân thành cảm ơn Bạn đã giới thiệu thành công tài khoản <span style="font-weight: bold">${full_name}</span> tham gia vào gia đình Ameritec
                                                                </p>
                                                              </br>
                                                                Mọi chi tiết vui lòng liên hệ :
                                                                <br>
                                                                <ul
                                                                  style="list-style-type: square; color: #34495e">
                                                                  <li style="margin-bottom: 10px;">Văn phòng đại diện : Tầng
                                                                    25.02 Tòa nhà Viettel số 285 cách mạng tháng 8 , P.12,
                                                                    Q.10, TP. Hồ Chí Minh</li>
                                                                  <li style="margin-bottom: 10px;">Điện thoại di động:
                                                                    028.2250.8166
                                                                  </li>
                                                                  <li style="margin-bottom: 10px;">Email:
                                                                    support@ameritecjsc.com
                                                                  </li>
                                                                  <li style="margin-bottom: 10px;">Website:
                                                                    <a href="https://ameritecjsc.com"
                                                                  target="_blank"
                                                                  data-saferedirecturl="https://ameritecjsc.com">
                                                                  https://ameritecjsc.com</a>
                                                                    </li>
                                                                  </ul>
                                                                  <p style="color: gray">Bản quyền thuộc về Công Ty Cổ Phần
                                                                    Ameritec | 2020 - 2021</p>
                                                              </p>
    
                                                            </div>
                                                          </div>
                                                        </td>
                                                      </tr>
                                                    </tbody>
                                                  </table>
                                                  <table role="module" align="center" border="0" cellpadding="0"
                                                    cellspacing="0" width="100%" style="table-layout:fixed">
                                                    <tbody>
                                                      <tr>
                                                        <td valign="top"
                                                          style="padding:16px 0px 0px 0px;font-size:6px;line-height:10px">
                                                          <table align="center">
                                                            <tbody>
                                                              <tr>
                                                                <td style="padding:0px 5px">
                                                                  <a role="social-icon-link" href="https://www.facebook.com/ameritecjsc"
                                                                    alt="Facebook" title="Facebook "
                                                                    style="border-radius:2px;display:inline-block;background-color:#3b579d"
                                                                    target="_blank"
                                                                    data-saferedirecturl="https://www.google.com/url?q=https://www.facebook.com/ameritecjsc&amp;source=gmail&amp;ust=1619031131977000&amp;usg=AFQjCNHQmRbZpFhWdj7esEk7ow0b_zG9cA">
                                                                    <img role="social-icon" alt="Facebook" title="Facebook "
                                                                      height="30" width="30"
                                                                      src="https://ci4.googleusercontent.com/proxy/K1eMvXT1j0-5WuAYzEYqtvFJMgW9CbX-EiTADXY3a_KswGhH6_Pi_oaE2m0rPYdsHLuGsLZX5DXOWczTu9DXcOdkWBqkH3rl5eMY8XNsZuV0Wt1feIaGxafEwWAiSmfW=s0-d-e1-ft#https://marketing-image-production.s3.amazonaws.com/social/white/facebook.png"
                                                                      class="CToWUd">
                                                                  </a>
                                                                </td>
    
                                                                <td style="padding:0px 5px">
                                                                  <a role="social-icon-link"
                                                                    href="https://www.youtube.com/channel/UCh0r0lk4Nk0KxLLaU1LUVnA"
                                                                    alt="Instagram" title="Instagram "
                                                                    style="border-radius:2px;display:inline-block;background-color:#7f4b30"
                                                                    target="_blank"
                                                                    data-saferedirecturl="https://www.google.com/url?q=https://www.youtube.com/channel/UCh0r0lk4Nk0KxLLaU1LUVnA&amp;source=gmail&amp;ust=1619031131977000&amp;usg=AFQjCNHZYmGVDuZEQkzGB248K8aetQtsSw">
                                                                    <img role="social-icon" alt="Youtube"
                                                                      title="Youtube " height="30" width="30"
                                                                      src="https://icons-for-free.com/iconfiles/png/512/tube+video+you+youtube+icon-1320185153402885670.png"
                                                                      class="CToWUd">
                                                                  </a>
                                                                </td>
    
    
    
                                                              </tr>
                                                            </tbody>
                                                          </table>
                                                        </td>
                                                      </tr>
                                                    </tbody>
                                                  </table>
                                                  <div role="module"
                                                    style="color:#444444;font-size:12px;line-height:20px;padding:16px 16px 16px 16px;text-align:center">
                                                  </div>
                                                </td>
                                              </tr>
                                            </tbody>
                                          </table>
    
                                        </td>
                                      </tr>
                                    </tbody>
                                  </table>
                                </td>
                              </tr>
                            </tbody>
                          </table>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </center>
              <img
                src="https://ci3.googleusercontent.com/proxy/1fjQwUmop-HyJVaulTA57GGFlFmu0-ggkWuVEfdgTkDmzAccDPNUJGekBkLJyNgmx53Pi-KmljrAJSjH7alShtAh95odwjHrjwiRC9shZ3Ptg-zU5n1N8QjaFPctPNIlHUZlkjr61HzcCmQKsWoSIBCSRauQ5poF_Pr1YNpbpzp0ESA8jSYr_53oh8y19CiDju0s3pTZSLx-imbcIhI750xO1Ktun133BGWOLPBkLi7k0A8WGth3ryGwEM_cHwWlDg5Vth-FtDG23zZHHLq_oOaiuCFPtpqy58CvBds5AX7QmNvHT17rEz_ZUrukPWyvUpEdqg9NblW3bAtS0ouaYevHj2QMsO5vxDpH1ASttEyTK0kbcTTL2Yum2AHmKFIc3rkgalW7BJ6T6De1jB7siUqdCT5MgeHUBt3w2ON11QOWgM_R7uPOUHr2CnOwhqBgLaZeVS50vEpXXkKqetlSEM8opXoirsVpIuABSNUSNeiYwKoylAoJCv03yKUuaIfyNdAhSjPaw3H8lQCJftCIhoUw82oXMBuFHJPdmlc84RGBZUliLgHT2seL6-gPNsW5mHJZ06NvI1VD052BARbgAWlLbtH6hkB8-6otVmsl3sWwFflxJC8orNiSuoA=s0-d-e1-ft#http://url5616.coders-x.com/wf/open?upn=bXICfEuWu47bhJwXYqwTRvqJTENX8zPTpCdkz3FNpu-2BFcvkzYw-2B39SJ4cEfvnSODAnR03Z9qpDVuTsHBrji689weS-2Fy6JnEqAwNCbVyZM6uklTX94734B-2FtrfYInRcQ4hCV8vgJ97a8cphoMTNezitfUXj9NXuSafpIRkDo05XH8fGVZeKp2RkQGuGT3iyEOob9VjD8l-2F2rXk-2FV-2F-2Fe9bTbt7tLWvCgB5Lo7PJpbHPX7vN9bIlzRHkxi4-2BP4-2BSsX4H-2F0hjbrI8vYh-2FJhXY6S5vn8yQw844ezthR0k4AHWL-2FIxXQX4W8gmOxPyoWXqJ0vOIGYy-2F4yrrfwjGI5Fwi-2FDskjgQfVnTVqYuGU3wySQe0uaPrFSE36ddpuMjBear-2Fxp"
                alt="" width="1" height="1" border="0"
                style="height:1px!important;width:1px!important;border-width:0!important;margin-top:0!important;margin-bottom:0!important;margin-right:0!important;margin-left:0!important;padding-top:0!important;padding-bottom:0!important;padding-right:0!important;padding-left:0!important"
                class="CToWUd">
            </div>
            <div class="yj6qo"></div>
            <div class="adL">
            </div>
          </div>
        </div>
        <div id=":9i" class="ii gt" style="display:none">
          <div id=":9j" class="a3s aiL "></div>
        </div>
        <div class="hi"></div>
      </div>
        </body>
    </html>
          `;

  try {

    await Mail(email, html, subject);
    console.log("thanks mail sended!!!! to", email);
    return true;

  } catch (err) {
    console.log("error send thanks mail!!!! to", email);
    console.log(err);
    return false;
  }
};

exports.successMail = async (full_name, email, phone, links) => {
  const subject = "[AMERITEC] ĐÃ KÍCH HOẠT TÀI KHOẢN THÀNH CÔNG";
  const html = `
      <!DOCTYPE html>
  <html lang="en">
  <head>
      <meta charset="UTF-8">
      <meta http-equiv="X-UA-Compatible" content="IE=edge">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Mail</title>
  </head>
  <body>
  <div class="">
      <div class="aHl"></div>
      <div id=":9e" tabindex="-1"></div>
      <div id=":93" class="ii gt">
        <div id=":92" class="a3s aiL msg-3508132029520417464"><u></u>
          <div>
            <center class="m_-3508132029520417464wrapper">
              <div>
                <table cellpadding="0" cellspacing="0" border="0" width="100%" class="m_-3508132029520417464wrapper"
                  bgcolor="#F7F6F1">
                  <tbody>
                    <tr>
                      <td valign="top" bgcolor="#F7F6F1" width="100%">
                        <table width="100%" role="content-container" align="center" cellpadding="0" cellspacing="0"
                          border="0">
                          <tbody>
                            <tr>
                              <td width="100%">
                                <table width="100%" cellpadding="0" cellspacing="0" border="0">
                                  <tbody>
                                    <tr>
                                      <td>
  
                                        <table width="100%" cellpadding="0" cellspacing="0" border="0"
                                          style="width:100%;max-width:600px" align="center">
                                          <tbody>
                                            <tr>
                                              <td role="modules-container"
                                                style="padding:32px 0px 0px 0px;color:#000000;text-align:left"
                                                bgcolor="#F7F6F1" width="100%" align="left">
  
                                                <table class="m_-3508132029520417464wrapper" role="module" border="0"
                                                  cellpadding="0" cellspacing="0" width="100%" style="table-layout:fixed">
                                                  <tbody>
                                                    <tr>
                                                      <td style="font-size:6px;line-height:10px;padding:0px 0px 16px 0px"
                                                        valign="top" align="center">
                                                        <img class="m_-3508132029520417464max-width CToWUd" border="0"
                                                          style="display:block;color:#000000;text-decoration:none;font-family:Helvetica,arial,sans-serif;font-size:16px;max-width:40%!important;width:20%;height:auto!important"
                                                          src="https://ameritecjsc.com/wp-content/themes/zimperium/assets/img/logo-ameritec-02.png"
                                                          alt="" width="200">
                                                      </td>
                                                    </tr>
                                                  </tbody>
                                                </table>
                                                <table role="module" border="0" cellpadding="0" cellspacing="0"
                                                  width="100%" style="table-layout:fixed">
                                                  <tbody>
                                                    <tr>
                                                      <td height="100%" valign="top">
                                                        <div
                                                          style="padding:0 20px;background-color:#f7f6f1;line-height:20">
                                                          <div style="padding:32px 20px;background-color:#fff; line-height: 26px;">
                                                            <p>Thân gửi <b>${full_name}</b>,
                                                              <br>
                                                              <br>
                                                              Chúc mừng Bạn đã đăng ký thành công tài khoản tại <span style="font-weight: bold">Ameritec</span>
                                                              </p>
                                                              <p>Thông tin tài khoản</p>
                                                              <div>
  
                                                                <ul>
                                                                <li style="margin-bottom: 10px;">Họ và tên : ${full_name}</li>
                                                                <li style="margin-bottom: 10px;">Điện thoại di động: ${phone}
                                                              </li>
                                                              <li style="margin-bottom: 10px;">Email: ${email}
                                                              </li>
                                                              <li style="margin-bottom: 10px;">Link giới thiệu: Vui lòng truy cập vào <a href="${process.env.CLIENT_URL}/login">hệ thống</a> để tạo link giới thiệu.</li>
                                                              </ul>
                                                              </div>
                                                                <div>
                                                                  <p style="color: #2c3e50">Đường dẫn kích hoạt AIPS App</p>
                                                                </div>
                                                                <div>
                                                              
                                                                <ul style="color: #34495e">
                                                                ${links.map((link, index) => {
    return `<li style="margin-bottom: 10px;">Link ${index + 1} : <a href=https://ameritec.zimperium.com/api/acceptor/v1/user-activation/activation?stoken=${link}>AIPS APP ${index + 1}</a></li>`;
  })}
                                                              </ul>
                                                            </br>
                                                              Mọi chi tiết vui lòng liên hệ :
                                                              <br>
                                                              <ul
                                                                style="list-style-type: square; color: #34495e">
                                                                <li style="margin-bottom: 10px;">Văn phòng đại diện : Tầng
                                                                  25.02 Tòa nhà Viettel số 285 cách mạng tháng 8 , P.12,
                                                                  Q.10, TP. Hồ Chí Minh</li>
                                                                <li style="margin-bottom: 10px;">Điện thoại di động:
                                                                  028.2250.8166
                                                                </li>
                                                                <li style="margin-bottom: 10px;">Email:
                                                                  support@ameritecjsc.com
                                                                </li>
                                                                <li style="margin-bottom: 10px;">Website:
                                                                  <a href="https://ameritecjsc.com"
                                                                target="_blank"
                                                                data-saferedirecturl="https://ameritecjsc.com">
                                                                https://ameritecjsc.com</a>
                                                                  </li>
                                                                </ul>
                                                                <p style="color: gray">Bản quyền thuộc về Công Ty Cổ Phần
                                                                  Ameritec | 2020 - 2021</p>
                                                            </p>
  
                                                          </div>
                                                        </div>
                                                      </td>
                                                    </tr>
                                                  </tbody>
                                                </table>
                                                <table role="module" align="center" border="0" cellpadding="0"
                                                  cellspacing="0" width="100%" style="table-layout:fixed">
                                                  <tbody>
                                                    <tr>
                                                      <td valign="top"
                                                        style="padding:16px 0px 0px 0px;font-size:6px;line-height:10px">
                                                        <table align="center">
                                                          <tbody>
                                                            <tr>
                                                              <td style="padding:0px 5px">
                                                                <a role="social-icon-link" href="https://www.facebook.com/ameritecjsc"
                                                                  alt="Facebook" title="Facebook "
                                                                  style="border-radius:2px;display:inline-block;background-color:#3b579d"
                                                                  target="_blank"
                                                                  data-saferedirecturl="https://www.google.com/url?q=https://www.facebook.com/ameritecjsc&amp;source=gmail&amp;ust=1619031131977000&amp;usg=AFQjCNHQmRbZpFhWdj7esEk7ow0b_zG9cA">
                                                                  <img role="social-icon" alt="Facebook" title="Facebook "
                                                                    height="30" width="30"
                                                                    src="https://ci4.googleusercontent.com/proxy/K1eMvXT1j0-5WuAYzEYqtvFJMgW9CbX-EiTADXY3a_KswGhH6_Pi_oaE2m0rPYdsHLuGsLZX5DXOWczTu9DXcOdkWBqkH3rl5eMY8XNsZuV0Wt1feIaGxafEwWAiSmfW=s0-d-e1-ft#https://marketing-image-production.s3.amazonaws.com/social/white/facebook.png"
                                                                    class="CToWUd">
                                                                </a>
                                                              </td>
  
                                                              <td style="padding:0px 5px">
                                                                <a role="social-icon-link"
                                                                  href="https://www.youtube.com/channel/UCh0r0lk4Nk0KxLLaU1LUVnA"
                                                                  alt="Instagram" title="Instagram "
                                                                  style="border-radius:2px;display:inline-block;background-color:#7f4b30"
                                                                  target="_blank"
                                                                  data-saferedirecturl="https://www.google.com/url?q=https://www.youtube.com/channel/UCh0r0lk4Nk0KxLLaU1LUVnA&amp;source=gmail&amp;ust=1619031131977000&amp;usg=AFQjCNHZYmGVDuZEQkzGB248K8aetQtsSw">
                                                                  <img role="social-icon" alt="Youtube"
                                                                    title="Youtube " height="30" width="30"
                                                                    src="https://icons-for-free.com/iconfiles/png/512/tube+video+you+youtube+icon-1320185153402885670.png"
                                                                    class="CToWUd">
                                                                </a>
                                                              </td>
  
  
  
                                                            </tr>
                                                          </tbody>
                                                        </table>
                                                      </td>
                                                    </tr>
                                                  </tbody>
                                                </table>
                                                <div role="module"
                                                  style="color:#444444;font-size:12px;line-height:20px;padding:16px 16px 16px 16px;text-align:center">
                                                </div>
                                              </td>
                                            </tr>
                                          </tbody>
                                        </table>
  
                                      </td>
                                    </tr>
                                  </tbody>
                                </table>
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </center>
            <img
              src="https://ci3.googleusercontent.com/proxy/1fjQwUmop-HyJVaulTA57GGFlFmu0-ggkWuVEfdgTkDmzAccDPNUJGekBkLJyNgmx53Pi-KmljrAJSjH7alShtAh95odwjHrjwiRC9shZ3Ptg-zU5n1N8QjaFPctPNIlHUZlkjr61HzcCmQKsWoSIBCSRauQ5poF_Pr1YNpbpzp0ESA8jSYr_53oh8y19CiDju0s3pTZSLx-imbcIhI750xO1Ktun133BGWOLPBkLi7k0A8WGth3ryGwEM_cHwWlDg5Vth-FtDG23zZHHLq_oOaiuCFPtpqy58CvBds5AX7QmNvHT17rEz_ZUrukPWyvUpEdqg9NblW3bAtS0ouaYevHj2QMsO5vxDpH1ASttEyTK0kbcTTL2Yum2AHmKFIc3rkgalW7BJ6T6De1jB7siUqdCT5MgeHUBt3w2ON11QOWgM_R7uPOUHr2CnOwhqBgLaZeVS50vEpXXkKqetlSEM8opXoirsVpIuABSNUSNeiYwKoylAoJCv03yKUuaIfyNdAhSjPaw3H8lQCJftCIhoUw82oXMBuFHJPdmlc84RGBZUliLgHT2seL6-gPNsW5mHJZ06NvI1VD052BARbgAWlLbtH6hkB8-6otVmsl3sWwFflxJC8orNiSuoA=s0-d-e1-ft#http://url5616.coders-x.com/wf/open?upn=bXICfEuWu47bhJwXYqwTRvqJTENX8zPTpCdkz3FNpu-2BFcvkzYw-2B39SJ4cEfvnSODAnR03Z9qpDVuTsHBrji689weS-2Fy6JnEqAwNCbVyZM6uklTX94734B-2FtrfYInRcQ4hCV8vgJ97a8cphoMTNezitfUXj9NXuSafpIRkDo05XH8fGVZeKp2RkQGuGT3iyEOob9VjD8l-2F2rXk-2FV-2F-2Fe9bTbt7tLWvCgB5Lo7PJpbHPX7vN9bIlzRHkxi4-2BP4-2BSsX4H-2F0hjbrI8vYh-2FJhXY6S5vn8yQw844ezthR0k4AHWL-2FIxXQX4W8gmOxPyoWXqJ0vOIGYy-2F4yrrfwjGI5Fwi-2FDskjgQfVnTVqYuGU3wySQe0uaPrFSE36ddpuMjBear-2Fxp"
              alt="" width="1" height="1" border="0"
              style="height:1px!important;width:1px!important;border-width:0!important;margin-top:0!important;margin-bottom:0!important;margin-right:0!important;margin-left:0!important;padding-top:0!important;padding-bottom:0!important;padding-right:0!important;padding-left:0!important"
              class="CToWUd">
          </div>
          <div class="yj6qo"></div>
          <div class="adL">
          </div>
        </div>
      </div>
      <div id=":9i" class="ii gt" style="display:none">
        <div id=":9j" class="a3s aiL "></div>
      </div>
      <div class="hi"></div>
    </div>
      </body>
  </html>
      `;

  try {

    await Mail(email, html, subject);
    console.log("success mail sended!!!! to", email);
    return true;

  } catch (err) {
    console.log("error send success mail!!!! to", email);
    console.log(err);
    return false;
  }
}

exports.upgradeMail = async (full_name, email, phone, links) => {
  const subject = "[AMERITEC] NÂNG CẤP TÀI KHOẢN THÀNH CÔNG";
  const html = `
      <!DOCTYPE html>
  <html lang="en">
  <head>
      <meta charset="UTF-8">
      <meta http-equiv="X-UA-Compatible" content="IE=edge">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Mail</title>
  </head>
  <body>
  <div class="">
      <div class="aHl"></div>
      <div id=":9e" tabindex="-1"></div>
      <div id=":93" class="ii gt">
        <div id=":92" class="a3s aiL msg-3508132029520417464"><u></u>
          <div>
            <center class="m_-3508132029520417464wrapper">
              <div>
                <table cellpadding="0" cellspacing="0" border="0" width="100%" class="m_-3508132029520417464wrapper"
                  bgcolor="#F7F6F1">
                  <tbody>
                    <tr>
                      <td valign="top" bgcolor="#F7F6F1" width="100%">
                        <table width="100%" role="content-container" align="center" cellpadding="0" cellspacing="0"
                          border="0">
                          <tbody>
                            <tr>
                              <td width="100%">
                                <table width="100%" cellpadding="0" cellspacing="0" border="0">
                                  <tbody>
                                    <tr>
                                      <td>
  
                                        <table width="100%" cellpadding="0" cellspacing="0" border="0"
                                          style="width:100%;max-width:600px" align="center">
                                          <tbody>
                                            <tr>
                                              <td role="modules-container"
                                                style="padding:32px 0px 0px 0px;color:#000000;text-align:left"
                                                bgcolor="#F7F6F1" width="100%" align="left">
  
                                                <table class="m_-3508132029520417464wrapper" role="module" border="0"
                                                  cellpadding="0" cellspacing="0" width="100%" style="table-layout:fixed">
                                                  <tbody>
                                                    <tr>
                                                      <td style="font-size:6px;line-height:10px;padding:0px 0px 16px 0px"
                                                        valign="top" align="center">
                                                        <img class="m_-3508132029520417464max-width CToWUd" border="0"
                                                          style="display:block;color:#000000;text-decoration:none;font-family:Helvetica,arial,sans-serif;font-size:16px;max-width:40%!important;width:20%;height:auto!important"
                                                          src="https://ameritecjsc.com/wp-content/themes/zimperium/assets/img/logo-ameritec-02.png"
                                                          alt="" width="200">
                                                      </td>
                                                    </tr>
                                                  </tbody>
                                                </table>
                                                <table role="module" border="0" cellpadding="0" cellspacing="0"
                                                  width="100%" style="table-layout:fixed">
                                                  <tbody>
                                                    <tr>
                                                      <td height="100%" valign="top">
                                                        <div
                                                          style="padding:0 20px;background-color:#f7f6f1;line-height:20">
                                                          <div style="padding:32px 20px;background-color:#fff; line-height: 26px;">
                                                            <p>Thân gửi <b>${full_name}</b>,
                                                              <br>
                                                              <br>
                                                              Chúc mừng Bạn đã nâng cấp thành công tài khoản tại <span style="font-weight: bold">Ameritec</span>
                                                              </p>
                                                              <p>Thông tin tài khoản</p>
                                                              <div>
  
                                                                <ul>
                                                                <li style="margin-bottom: 10px;">Họ và tên : ${full_name}</li>
                                                                <li style="margin-bottom: 10px;">Điện thoại di động: ${phone}
                                                              </li>
                                                              <li style="margin-bottom: 10px;">Email: ${email}
                                                              </li>
                                                              <li style="margin-bottom: 10px;">Link giới thiệu: Vui lòng truy cập vào <a href="${process.env.CLIENT_URL}/login">hệ thống</a> để tạo link giới thiệu.</li>
                                                              </ul>
                                                              </div>
                                                                <div>
                                                                  <p style="color: #2c3e50">Đường dẫn kích hoạt AIPS App</p>
                                                                </div>
                                                                <div>
                                                              
                                                                <ul style="color: #34495e">
                                                                ${links.map((link, index) => {
    return `<li style="margin-bottom: 10px;">Link ${index + 1} : <a href=https://ameritec.zimperium.com/api/acceptor/v1/user-activation/activation?stoken=${link}>AIPS APP ${index + 1}</a></li>`;
  })}
                                                              </ul>
                                                            </br>
                                                              Mọi chi tiết vui lòng liên hệ :
                                                              <br>
                                                              <ul
                                                                style="list-style-type: square; color: #34495e">
                                                                <li style="margin-bottom: 10px;">Văn phòng đại diện : Tầng
                                                                  25.02 Tòa nhà Viettel số 285 cách mạng tháng 8 , P.12,
                                                                  Q.10, TP. Hồ Chí Minh</li>
                                                                <li style="margin-bottom: 10px;">Điện thoại di động:
                                                                  028.2250.8166
                                                                </li>
                                                                <li style="margin-bottom: 10px;">Email:
                                                                  support@ameritecjsc.com
                                                                </li>
                                                                <li style="margin-bottom: 10px;">Website:
                                                                  <a href="https://ameritecjsc.com"
                                                                target="_blank"
                                                                data-saferedirecturl="https://ameritecjsc.com">
                                                                https://ameritecjsc.com</a>
                                                                  </li>
                                                                </ul>
                                                                <p style="color: gray">Bản quyền thuộc về Công Ty Cổ Phần
                                                                  Ameritec | 2020 - 2021</p>
                                                            </p>
  
                                                          </div>
                                                        </div>
                                                      </td>
                                                    </tr>
                                                  </tbody>
                                                </table>
                                                <table role="module" align="center" border="0" cellpadding="0"
                                                  cellspacing="0" width="100%" style="table-layout:fixed">
                                                  <tbody>
                                                    <tr>
                                                      <td valign="top"
                                                        style="padding:16px 0px 0px 0px;font-size:6px;line-height:10px">
                                                        <table align="center">
                                                          <tbody>
                                                            <tr>
                                                              <td style="padding:0px 5px">
                                                                <a role="social-icon-link" href="https://www.facebook.com/ameritecjsc"
                                                                  alt="Facebook" title="Facebook "
                                                                  style="border-radius:2px;display:inline-block;background-color:#3b579d"
                                                                  target="_blank"
                                                                  data-saferedirecturl="https://www.google.com/url?q=https://www.facebook.com/ameritecjsc&amp;source=gmail&amp;ust=1619031131977000&amp;usg=AFQjCNHQmRbZpFhWdj7esEk7ow0b_zG9cA">
                                                                  <img role="social-icon" alt="Facebook" title="Facebook "
                                                                    height="30" width="30"
                                                                    src="https://ci4.googleusercontent.com/proxy/K1eMvXT1j0-5WuAYzEYqtvFJMgW9CbX-EiTADXY3a_KswGhH6_Pi_oaE2m0rPYdsHLuGsLZX5DXOWczTu9DXcOdkWBqkH3rl5eMY8XNsZuV0Wt1feIaGxafEwWAiSmfW=s0-d-e1-ft#https://marketing-image-production.s3.amazonaws.com/social/white/facebook.png"
                                                                    class="CToWUd">
                                                                </a>
                                                              </td>
  
                                                              <td style="padding:0px 5px">
                                                                <a role="social-icon-link"
                                                                  href="https://www.youtube.com/channel/UCh0r0lk4Nk0KxLLaU1LUVnA"
                                                                  alt="Instagram" title="Instagram "
                                                                  style="border-radius:2px;display:inline-block;background-color:#7f4b30"
                                                                  target="_blank"
                                                                  data-saferedirecturl="https://www.google.com/url?q=https://www.youtube.com/channel/UCh0r0lk4Nk0KxLLaU1LUVnA&amp;source=gmail&amp;ust=1619031131977000&amp;usg=AFQjCNHZYmGVDuZEQkzGB248K8aetQtsSw">
                                                                  <img role="social-icon" alt="Youtube"
                                                                    title="Youtube " height="30" width="30"
                                                                    src="https://icons-for-free.com/iconfiles/png/512/tube+video+you+youtube+icon-1320185153402885670.png"
                                                                    class="CToWUd">
                                                                </a>
                                                              </td>
  
  
  
                                                            </tr>
                                                          </tbody>
                                                        </table>
                                                      </td>
                                                    </tr>
                                                  </tbody>
                                                </table>
                                                <div role="module"
                                                  style="color:#444444;font-size:12px;line-height:20px;padding:16px 16px 16px 16px;text-align:center">
                                                </div>
                                              </td>
                                            </tr>
                                          </tbody>
                                        </table>
  
                                      </td>
                                    </tr>
                                  </tbody>
                                </table>
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </center>
            <img
              src="https://ci3.googleusercontent.com/proxy/1fjQwUmop-HyJVaulTA57GGFlFmu0-ggkWuVEfdgTkDmzAccDPNUJGekBkLJyNgmx53Pi-KmljrAJSjH7alShtAh95odwjHrjwiRC9shZ3Ptg-zU5n1N8QjaFPctPNIlHUZlkjr61HzcCmQKsWoSIBCSRauQ5poF_Pr1YNpbpzp0ESA8jSYr_53oh8y19CiDju0s3pTZSLx-imbcIhI750xO1Ktun133BGWOLPBkLi7k0A8WGth3ryGwEM_cHwWlDg5Vth-FtDG23zZHHLq_oOaiuCFPtpqy58CvBds5AX7QmNvHT17rEz_ZUrukPWyvUpEdqg9NblW3bAtS0ouaYevHj2QMsO5vxDpH1ASttEyTK0kbcTTL2Yum2AHmKFIc3rkgalW7BJ6T6De1jB7siUqdCT5MgeHUBt3w2ON11QOWgM_R7uPOUHr2CnOwhqBgLaZeVS50vEpXXkKqetlSEM8opXoirsVpIuABSNUSNeiYwKoylAoJCv03yKUuaIfyNdAhSjPaw3H8lQCJftCIhoUw82oXMBuFHJPdmlc84RGBZUliLgHT2seL6-gPNsW5mHJZ06NvI1VD052BARbgAWlLbtH6hkB8-6otVmsl3sWwFflxJC8orNiSuoA=s0-d-e1-ft#http://url5616.coders-x.com/wf/open?upn=bXICfEuWu47bhJwXYqwTRvqJTENX8zPTpCdkz3FNpu-2BFcvkzYw-2B39SJ4cEfvnSODAnR03Z9qpDVuTsHBrji689weS-2Fy6JnEqAwNCbVyZM6uklTX94734B-2FtrfYInRcQ4hCV8vgJ97a8cphoMTNezitfUXj9NXuSafpIRkDo05XH8fGVZeKp2RkQGuGT3iyEOob9VjD8l-2F2rXk-2FV-2F-2Fe9bTbt7tLWvCgB5Lo7PJpbHPX7vN9bIlzRHkxi4-2BP4-2BSsX4H-2F0hjbrI8vYh-2FJhXY6S5vn8yQw844ezthR0k4AHWL-2FIxXQX4W8gmOxPyoWXqJ0vOIGYy-2F4yrrfwjGI5Fwi-2FDskjgQfVnTVqYuGU3wySQe0uaPrFSE36ddpuMjBear-2Fxp"
              alt="" width="1" height="1" border="0"
              style="height:1px!important;width:1px!important;border-width:0!important;margin-top:0!important;margin-bottom:0!important;margin-right:0!important;margin-left:0!important;padding-top:0!important;padding-bottom:0!important;padding-right:0!important;padding-left:0!important"
              class="CToWUd">
          </div>
          <div class="yj6qo"></div>
          <div class="adL">
          </div>
        </div>
      </div>
      <div id=":9i" class="ii gt" style="display:none">
        <div id=":9j" class="a3s aiL "></div>
      </div>
      <div class="hi"></div>
    </div>
      </body>
  </html>
      `;

  try {

    await Mail(email, html, subject);
    console.log("success mail sended!!!! to", email);
    return true;

  } catch (err) {
    console.log("error send success mail!!!! to", email);
    return false;
  }
}
//THÔNG BÁO GIA HẠN LẦN 1
exports.remindRenew1Mail = async (id) => {
  var mail = await MailTemplate.findOne({ template_name: "remindRenew1Mail" }).exec();
  var signature = await MailTemplate.findOne({ template_name: "signature" }).exec();
  var user = await User.findOne({ _id: id }).exec();
  var subject_vn = mail.subject_vn;
  var content_vn = mail.content_vn;
  var subject_en = mail.subject_en;
  var content_en = mail.content_en;
  var thang = user.expire_time.getMonth() + 1;
  var ngayhethan = user.expire_time.getDate() + "/" + thang + "/" + user.expire_time.getFullYear();
  content_vn = content_vn.replace("[CHU_KY]", signature.content_vn);
  content_en = content_en.replace("[CHU_KY]", signature.content_en);
  content_vn = content_vn.replace("[NGAY_HET_HAN]", ngayhethan);
  content_en = content_en.replace("[NGAY_HET_HAN]", ngayhethan);
  content_vn = content_vn.replace("[FULL_NAME]", user.full_name);
  content_en = content_en.replace("[FULL_NAME]", user.full_name);
  try {
    if (user.account_type === "vi") {
      await Mail(user.email, content_vn, subject_vn);
    }
    else {
      await Mail(user.email, content_en, subject_en);
    }
    console.log("success mail sended!!!! to", user.email);
    return true;

  } catch (err) {
    console.log("error send success mail!!!! to", user.email);
    console.log(err);
    return false;
  }
}
//THÔNG BÁO GIA HẠN LẦN 2
exports.remindRenew2Mail = async (id) => {
  var mail = await MailTemplate.findOne({ template_name: "remindRenew2Mail" }).exec();
  var signature = await MailTemplate.findOne({ template_name: "signature" }).exec();
  var user = await User.findOne({ _id: id }).exec();
  var subject_vn = mail.subject_vn;
  var content_vn = mail.content_vn;
  var subject_en = mail.subject_en;
  var content_en = mail.content_en;
  var thang = user.expire_time.getMonth() + 1;
  var ngayhethan = user.expire_time.getDate() + "/" + thang + "/" + user.expire_time.getFullYear();
  content_vn = content_vn.replace("[CHU_KY]", signature.content_vn);
  content_en = content_en.replace("[CHU_KY]", signature.content_en);
  content_vn = content_vn.replace("[NGAY_HET_HAN]", ngayhethan);
  content_en = content_en.replace("[NGAY_HET_HAN]", ngayhethan);
  content_vn = content_vn.replace("[FULL_NAME]", user.full_name);
  content_en = content_en.replace("[FULL_NAME]", user.full_name);
  try {
    if (user.account_type === "vi") {
      await Mail(user.email, content_vn, subject_vn);
    }
    else {
      await Mail(user.email, content_en, subject_en);
    }
    console.log("success mail sended!!!! to", user.email);
    return true;

  } catch (err) {
    console.log("error send success mail!!!! to", user.email);
    console.log(err);
    return false;
  }
}
//Thông báo thành viên mới tham gia hệ thống: Sau khi kích hoạt tài khoản sẽ gửi mail này cho người nhận hoa hồng
exports.reciveCommissonMail = async (id) => {
  var mail = await MailTemplate.findOne({ template_name: "reciveCommissonMail" }).exec();
  var signature = await MailTemplate.findOne({ template_name: "signature" }).exec();
  var user = await User.findOne({ _id: id }).exec();
  if (user.parent_id === process.env.INVITE_CODE) {
    return false;
  }
  var user_con = await User.findOne({ _id: user.parent_id }).exec();
  var subject_vn = mail.subject_vn;
  var content_vn = mail.content_vn;
  var subject_en = mail.subject_en;
  var content_en = mail.content_en;
  content_vn = content_vn.replace("[CHU_KY]", signature.content_vn);
  content_vn = content_vn.replace("[FULL_NAME]", user_con.full_name);
  content_vn = content_vn.replace("[FULL_NAME_NEW]", user.full_name);
  content_vn = content_vn.replace("[EMAIL_NEW]", user.email);

  content_en = content_en.replace("[CHU_KY]", signature.content_en);
  content_en = content_en.replace("[FULL_NAME]", user_con.full_name);
  content_en = content_en.replace("[FULL_NAME_NEW]", user.full_name);
  content_en = content_en.replace("[EMAIL_NEW]", user.email);
  try {
    if (user.account_type === "vi") {
      await Mail(user_con.email, content_vn, subject_vn);
      console.log("send email VN");
    }
    else {
      await Mail(user_con.email, content_en, subject_en);
      console.log("send email EN");
    }
    console.log("success mail sended!!!! to", user.email);
    return true;

  } catch (err) {
    console.log("error send success mail!!!! to", user.email);
    console.log(err);
    return false;
  }
}
//Thông báo Đăng ký thành viên và Thanh toán bằng tiền mặt thành công: Mail này được gửi sau khi admin chuyển trạng thái đã thanh toán
exports.paymentSuccessMail = async (id, links) => {
  var mail = await MailTemplate.findOne({ template_name: "paymentSuccessMail" }).exec();
  var signature = await MailTemplate.findOne({ template_name: "signature" }).exec();
  var user = await User.findOne({ _id: id }).exec();
  var parent;
  if (user.invite_user_id !== process.env.INVITE_CODE) {
    parent = await User.findOne({ _id: user.invite_user_id }).exec();
  }

  var package = await Package.findOne({ sid: user.buy_package }).exec();
  var subject_vn = mail.subject_vn;
  var content_vn = mail.content_vn;
  var subject_en = mail.subject_en;
  var content_en = mail.content_en;
  var stringlink = "";
  var string = "";
  var stringref = "";
  var thongtin;
  links.map((link, index) => {
    stringlink = stringlink + "<br>" + '<p> Link' + (index + 1) + ': https://ameritec.zimperium.com/api/acceptor/v1/user-activation/activation?stoken=' + link + '</p>'
  });
  switch (user.account_type) {
    case "vi":
      string = "<p>Tài khoản: " + user.full_name + "</p>";
      string = string + "<p>Email: " + user.email + "</p>";
      if (parent) {
        string = string + "<p>Người bảo trợ: " + parent.full_name + "</p>";
      }
      else {
        string = string + "<p>Người bảo trợ: " + "" + "</p>";
      }
      if (user.is_partner === true) {
        stringref = stringref + "<ul>";
        if (user.buy_package !== "0") {
          for (var i = 1; i < 4; i++) {
            stringref = stringref + "<li>Nhóm " + i + ": " + process.env.CLIENT_URL + "/referral/" + user._id + "/" + i + "</li>"
          }
        }
        else {
          stringref = stringref + "<li>Link : " + process.env.CLIENT_URL + "/referral/" + user._id + "/1</li>"
        }
        stringref = stringref + "</ul>";
        if (user.buy_package === "3" || user.buy_package === "4") {
          var list_clone = await User.find({ parent_id: id, is_clone: true }).exec();
          for (var a of list_clone) {
            var stringclone = "<p>Tài khoản: " + a.full_name + "</p><ul>";
            for (var i = 1; i < 4; i++) {
              stringclone = stringclone + "<li>Nhóm " + i + ": " + process.env.CLIENT_URL + "/referral/" + user._id + "/" + i + "/" + a._id + "</li>"
            }
            stringclone = stringclone + "</ul>";
            stringref = stringref + stringclone;
          }
        }
      }
      break;
    case "en":
      string = "<p>Fullname: " + user.full_name + "</p>";
      string = string + "<p>Email: " + user.email + "</p>";
      if (parent) {
        string = string + "<p>Your Sponsor: " + parent.full_name + "</p>";
      }
      else {
        string = string + "<p>Your Sponsor: " + "" + "</p>";
      }
      if (user.is_partner === true) {
        // stringref = stringref + "<p>Here is your Affiliate referral link:</p><ul>";
        stringref = stringref + "<ul>";

        if (user.buy_package !== "0") {
          for (var i = 1; i < 4; i++) {
            stringref = stringref + "<li>Group " + i + ": " + process.env.CLIENT_URL + "/referral/" + user._id + "/" + i + "</li>"
          }
        }
        else {
          stringref = stringref + "<li>Link : " + process.env.CLIENT_URL + "/referral/" + user._id + "/1</li>"
        }
        stringref = stringref + "</ul>";
        if (user.buy_package === "3" || user.buy_package === "4") {
          var list_clone = await User.find({ parent_id: id, is_clone: true }).exec();
          for (var a of list_clone) {
            var stringclone = "<p>Account: " + a.full_name + "</p><ul>";
            for (var i = 1; i < 4; i++) {
              stringclone = stringclone + "<li>Group " + i + ": " + process.env.CLIENT_URL + "/referral/" + user._id + "/" + i + "/" + a._id + "</li>"
            }
            stringclone = stringclone + "</ul>";
            stringref = stringref + stringclone;
          }
        }
      }
      break;
    default:
      string = "<p>Tài khoản: " + user.full_name + "</p>";
      string = string + "<p>Email: " + user.email + "</p>";
      if (parent) {
        string = string + "<p>Người bảo trợ: " + parent.full_name + "</p>";
      }
      else {
        string = string + "<p>Người bảo trợ: " + "" + "</p>";
      }
      if (user.is_partner === true) {
        stringref = stringref + "<p>Link giới thiệu của bạn:</p><ul>";
        if (user.buy_package !== "1") {
          for (var i = 1; i < 4; i++) {
            stringref = stringref + "<li>Group " + i + ": " + process.env.CLIENT_URL + "/referral/" + user._id + "/" + i + "</li>"
          }
        }
        else {
          stringref = stringref + "<li>Link : " + process.env.CLIENT_URL + "/referral/" + user._id + "/1</li>"
        }
        stringref = stringref + "</ul>";
        if (user.buy_package === "3" || user.buy_package === "4") {
          var list_clone = await User.find({ parent_id: id, is_clone: true }).exec();
          for (var a of list_clone) {
            var stringclone = "<p>Tài khoản: " + a.full_name + "</p><ul>";
            for (var i = 1; i < 4; i++) {
              stringclone = stringclone + "<li>Group " + i + ": " + process.env.CLIENT_URL + "/referral/" + user._id + "/" + i + "/" + a._id + "</li>"
            }
            stringclone = stringclone + "</ul>";
            stringref = stringref + stringclone;
          }
        }
      }
      break;
  }
  content_vn = content_vn.replace("[FULL_NAME]", user.full_name);
  content_vn = content_vn.replace("[CHU_KY]", signature.content_vn);
  content_en = content_en.replace("[FULL_NAME]", user.full_name);
  content_en = content_en.replace("[CHU_KY]", signature.content_en);
  // content_vn = content_vn.replace("[LINK_GIOI_THIEU]", string);
  // content_en = content_en.replace("[LINK_GIOI_THIEU]", string);
  content_vn = content_vn.replace("[THONG_TIN]", string);
  content_en = content_en.replace("[THONG_TIN]", string);
  content_vn = content_vn.replace("[LINK_GIOI_THIEU]", stringref);
  content_en = content_en.replace("[LINK_GIOI_THIEU]", stringref);
  if (user.buy_package !== "3") {
    content_vn = content_vn.replace("[DANH_SACH_TAI_KHOAN]", stringlink);
    content_en = content_en.replace("[DANH_SACH_TAI_KHOAN]", stringlink);

  }
  else {
    if (links.length > 0) {
      content_vn = content_vn.replace("[DANH_SACH_TAI_KHOAN]", "Sẽ được gửi chi tiết ở mail bổ sung");
      content_en = content_en.replace("[DANH_SACH_TAI_KHOAN]", "Detail will be send in replenish email");
    }
    else {
      content_vn = content_vn.replace("[DANH_SACH_TAI_KHOAN]", "");
      content_en = content_en.replace("[DANH_SACH_TAI_KHOAN]", "");
    }
  }


  try {
    if (user.account_type === "vi") {
      thongtin = package.name + "<br>" + package.price_vnd.toString().replace(/(\d)(?=(\d{3})+(?!\d))/g, "$1,") + " VND";
      content_vn = content_vn.replace("[SANPHAM]", thongtin);
      await Mail(user.email, content_vn, subject_vn);
    }
    else {
      thongtin = package.name_en + "<br>" + package.price_usd.toString().replace(/(\d)(?=(\d{3})+(?!\d))/g, "$1,") + " USD";
      content_en = content_en.replace("[SANPHAM]", thongtin);
      await Mail(user.email, content_en, subject_en);
    }
    console.log("success mail sended!!!! to", user.email);
    if (user.buy_package === "3" && links.length > 0) {
      var mail2package3 = await MailTemplate.findOne({ template_name: "mail2package3" }).exec();
      var content_bosung;
      var subject_bosung;
      if (user.account_type == "vi") {
        content_bosung = mail2package3.content_vn;
        subject_bosung = mail2package3.subject_vn;
        content_bosung = content_bosung.replace("[CHU_KY]", signature.content_vn);
      }
      else {
        content_bosung = mail2package3.content_en;
        subject_bosung = mail2package3.subject_en;
        content_bosung = content_bosung.replace("[CHU_KY]", signature.content_en);
      }
      content_bosung = content_bosung.replace("[FULL_NAME]", user.full_name);
      content_bosung = content_bosung.replace("[DANH_SACH_TAI_KHOAN]", stringlink);
      await Mail(user.email, content_bosung, subject_bosung);
    }
    return true;

  } catch (err) {
    console.log("error send success mail!!!! to", user.email);
    console.log(err);
    return false;
  }
}
//Bổ Sung link Active
exports.replenishActiveKey = async (id, links) => {
  var user = await User.findOne({ _id: id }).exec();
  var link = await MailTemplate.findOne({ template_name: "link" }).exec();
  var signature = await MailTemplate.findOne({ template_name: "signature" }).exec();
  var stringlink = "";
  links.map((link, index) => {
    // stringlink = stringlink + "<br>" + '<a href="https://ameritec.zimperium.com/api/acceptor/v1/user-activation/activation?stoken=' + link + '"> Link' + (index + 1) + '</a>'
    stringlink = stringlink + "<br>" + '<p> Link' + (index + 1) + ': https://ameritec.zimperium.com/api/acceptor/v1/user-activation/activation?stoken=' + link + '</p>'
  });
  var content;
  if (user.account_type == "vi") {
    content = link.content_vn;
    content = content.replace("[CHU_KY]", signature.content_vn);
  }
  if (user.account_type == "en") {
    content = link.content_en;
    content = content.replace("[CHU_KY]", signature.content_en);
  }
  content = content.replace("[DANH_SACH_TAI_KHOAN]", stringlink);
  await Mail(user.email, content, "Bổ sung Link kích hoạt sản phẩm");

}
//Gia Hạn Thành Công
exports.renewSuccess = async (id) => {
  var user = await User.findOne({ _id: id }).exec();
  var mail = await MailTemplate.findOne({ template_name: "renew" }).exec();
  var signature = await MailTemplate.findOne({ template_name: "signature" }).exec();
  var package = await Package.findOne({ sid: user.buy_package }).exec();
  // var links = await Activation.find({ user_id: id }).exec();
  var sl_link = 1;
  if (user.buy_package === "2") {
    sl_link = 4;
  }
  if (user.buy_package === "3") {
    sl_link = 40;
  }
  if (user.buy_package === "4") {
    sl_link = 16;
  }
  var links = await getMoreActiveLink(id, sl_link);
  var content;
  var subject;
  var thongtin;
  var stringlink = "";
  links.map((link, index) => {
    stringlink = stringlink + "<br>" + '<p> Link' + (index + 1) + ': https://ameritec.zimperium.com/api/acceptor/v1/user-activation/activation?stoken=' + link + '</p>'
  });
  if (user.account_type == "vi") {
    content = mail.content_vn;
    content = content.replace("[CHU_KY]", signature.content_vn);
    subject = mail.subject_vn;
    thongtin = package.name + "<br>" + package.price_vnd.toString().replace(/(\d)(?=(\d{3})+(?!\d))/g, "$1,") + " VND";
  }
  if (user.account_type == "en") {
    content = mail.content_en;
    content = content.replace("[CHU_KY]", signature.content_en);
    subject = mail.subject_en;
    thongtin = package.name_en + "<br>" + package.price_usd.toString().replace(/(\d)(?=(\d{3})+(?!\d))/g, "$1,") + " USD";
  }
  content = content.replace("[SANPHAM]", thongtin);
  content = content.replace("[FULL_NAME]", user.full_name);
  content = content.replace("[EMAIL]", user.email);
  if (user.buy_package !== "3") {
    content = content.replace("[DANH_SACH_TAI_KHOAN]", stringlink);
  }
  else {
    content = content.replace("[DANH_SACH_TAI_KHOAN]", user.account_type == "en" ? "Detail will be send in replenish email" : "Sẽ được gửi chi tiết ở mail bổ sung");
  }
  if (user.buy_package === "3") {
    var mail2package3 = await MailTemplate.findOne({ template_name: "mail2package3" }).exec();
    var content_bosung;
    var subject_bosung;
    if (user.account_type == "vi") {
      content_bosung = mail2package3.content_vn;
      subject_bosung = mail2package3.subject_vn;
      content_bosung = content_bosung.replace("[CHU_KY]", signature.content_vn);
    }
    else {
      content_bosung = mail2package3.content_en;
      subject_bosung = mail2package3.subject_en;
      content_bosung = content_bosung.replace("[CHU_KY]", signature.content_en);
    }
    content_bosung = content_bosung.replace("[FULL_NAME]", user.full_name);
    content_bosung = content_bosung.replace("[DANH_SACH_TAI_KHOAN]", stringlink);
    await Mail(user.email, content_bosung, subject_bosung);
  }
  await Mail(user.email, content, subject);
}
//Lên cấp
exports.levelUpMail = async (id) => {
  await levelUpMail(id);
}
const levelUpMail = async (id) => {
  var user = await User.findOne({ _id: id }).exec();
  var mail = await MailTemplate.findOne({ template_name: "levelup" }).exec();
  var signature = await MailTemplate.findOne({ template_name: "signature" }).exec();
  var content;
  var subject;
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
  content = content.replace("[FULL_NAME]", user.full_name);
  content = content.replace("[EMAIL]", user.email);
  content = content.replace("[LEVEL]", user.level);
  var stringmailcc = process.env.CC_EMAILBOSS;
  var arr = stringmailcc.split(",");
  console.log("method cc mail", arr);
  await Mail(user.email, content, subject, arr);
}


exports.randomString = (length = 6) => {
  var result = [];
  var characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  var charactersLength = characters.length;
  for (var i = 0; i < length; i++) {
    result.push(characters.charAt(Math.floor(Math.random() *
      charactersLength)));
  }
  return result.join('');
}

const getTreeChild = async (idcha) => {
  var userCha = await User.findOne({ _id: idcha })
    .exec();
  var listCon = await getListChildId2(idcha);
  var child = [];
  for (const element of listCon) {
    await child.push(await getTreeChild(element));
  }
  var Cha = {
    title: userCha.full_name,
    children: child
  };
  return Cha;
}

exports.removeAccents = (str) => {
  return removeAccents(str);
}

const removeAccents = (str) => {
  var AccentsMap = [
    "aàảãáạăằẳẵắặâầẩẫấậ",
    "AÀẢÃÁẠĂẰẲẴẮẶÂẦẨẪẤẬ",
    "dđ", "DĐ",
    "eèẻẽéẹêềểễếệ",
    "EÈẺẼÉẸÊỀỂỄẾỆ",
    "iìỉĩíị",
    "IÌỈĨÍỊ",
    "oòỏõóọôồổỗốộơờởỡớợ",
    "OÒỎÕÓỌÔỒỔỖỐỘƠỜỞỠỚỢ",
    "uùủũúụưừửữứự",
    "UÙỦŨÚỤƯỪỬỮỨỰ",
    "yỳỷỹýỵ",
    "YỲỶỸÝỴ"
  ];
  for (var i = 0; i < AccentsMap.length; i++) {
    var re = new RegExp('[' + AccentsMap[i].substr(1) + ']', 'g');
    var char = AccentsMap[i][0];
    str = str.replace(re, char);
  }
  return str.toLowerCase();
}



