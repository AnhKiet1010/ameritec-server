const User = require("../models/user.model");
const Tree = require("../models/tree.model");

const countTotalChildMember = async (subTreeIdList) => {
  var count = subTreeIdList.length;

  for (let i = 0; i < subTreeIdList.length; i++) {
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
  }
  return count;
};

const getSubUserListAndChildNumber = async (current_user_id) => {
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

exports.subUserList = async (req, res) => {
  const id = req.query.id;

  const subList = await getSubUserListAndChildNumber(id);
  const count = await countTotalChildMember(subList.subTreeIdList);
  console.log(count);

  return res.json({
    subUserListAndChild: subList.subUserListAndChild,
    child_member_total: count
  });
};

const getListChildId = async (id) => {
  const objBranch = await Tree.findOne({ parent: id }).select('group1 group2 group3').exec();

  const { group1, group2, group3 } = objBranch;

  return [...group1, ...group2, ...group3];
}

const cutName = (name) => {
  const nameArr = name.split(" ");
  const newName = nameArr.slice(nameArr.length - 2, nameArr.length).join(" ");
  return newName;
}

const getResult = async (group, kq) => {
  for (let id of group) {
    let parent = await User.findOne({ _id: id });
    let listGroup = await getListChildId(id);
    if (listGroup.length > 0) {
      for (let i of listGroup) {
        let child = await User.findOne({ _id: i });
        kq.push({ "child": cutName(child.full_name), "parent": cutName(parent.full_name) });
      }
      await getResult(listGroup, kq);
    } else {
      continue;
    }
  }
  return kq;
}

const getFullChildren = async (group, kq) => {
  for (let id of group) {
    let parent = await User.findOne({ _id: id }).select('full_name').exec();
    kq.push(parent);
    let listGroup = await getListChildId(id);
    if (listGroup.length > 0) {
      await getFullChildren(listGroup, kq);
    } else {
      continue;
    }
  }
  return kq;
}

exports.subTreeList = async (req, res) => {
  const { searchId, currentId, group_number } = req.query;

  const parent = await User.findOne({ _id: currentId }).exec();

  const objBranch = await Tree.findOne({ parent: searchId }).select('group1 group2 group3').exec();
  const { group1, group2, group3 } = objBranch;

  const objBranchChild = await Tree.findOne({ parent: currentId }).select('group1 group2 group3').exec();
  const listChildNameBefore = await getFullChildren([...objBranchChild.group1, ...objBranchChild.group2, ...objBranchChild.group3], []);

  const listChildName = listChildNameBefore.map(child => {
    return { value: child._id, label: child.full_name };
  });

  const kq1 = [];
  if (group_number === '1') {
    kq1.push({ "child": "Nhóm 1", "parent": "" });
  }
  for (let id of group1) {
    let child = await User.findOne({ _id: id });
    kq1.push({ "child": cutName(child.full_name), "parent": "Nhóm 1" })
  }

  const kq2 = [];
  if (group_number === '2') {
    kq2.push({ "child": "Nhóm 2", "parent": "" });
  }
  for (let id of group2) {
    let child = await User.findOne({ _id: id });
    kq2.push({ "child": cutName(child.full_name), "parent": "Nhóm 2" })
  }

  const kq3 = [];
  if (group_number === '3') {
    kq3.push({ "child": "Nhóm 3", "parent": "" });
  }
  for (let id of group3) {
    let child = await User.findOne({ _id: id });
    kq3.push({ "child": cutName(child.full_name), "parent": "Nhóm 3" })
  }

  const result1 = await getResult(group1, kq1);
  const result2 = await getResult(group2, kq2);
  const result3 = await getResult(group3, kq3);

  const currentResult = [];
  currentResult.push({ "child": parent.full_name, "parent": "" });
  currentResult.push({ "child": "Nhóm 1", "parent": cutName(parent.full_name) });
  currentResult.push({ "child": "Nhóm 2", "parent": cutName(parent.full_name) });
  currentResult.push({ "child": "Nhóm 3", "parent": cutName(parent.full_name) });

  if (group_number === '1') {
    res.json({ group: result1, listChildName });
  } else if (group_number === '2') {
    res.json({ group: result2, listChildName });
  } else if (group_number === '3') {
    res.json({ group: result3, listChildName });
  } else {
    res.json({ group: [...currentResult, ...result1, ...result2, ...result3], listChildName });
  }
};

const getData = async (group, parentIn) => {

  let kq = [];

  for (let i of group) {
    let parent = await User.findOne({ _id: i }).select("full_name child1 child2 child3 countChild avatar group_number level buy_package").exec();
    let listGroup = await getListChildId(parent._id);
    if (listGroup.length > 0) {
      for (let id of listGroup) {
        let child = await User.findOne({ _id: id }).select("full_name child1 child2 child3 countChild avatar group_number level buy_package").exec();
        if (child.group_number === '1') {
          parent.child1.arr.push(child);
          parent.child1.countChild = await countTotalChildMember(parent.child1.arr.map(item => item._id));
        } else if (child.group_number === '2') {
          parent.child2.arr.push(child);
          parent.child2.countChild = await countTotalChildMember(parent.child2.arr.map(item => item._id));
        } else if (child.group_number === '3') {
          parent.child3.arr.push(child);
          parent.child3.countChild = await countTotalChildMember(parent.child3.arr.map(item => item._id));
        }
        let listGroupOfChild = await getListChildId(child._id);
        parent.countChild = await countTotalChildMember(listGroup);
        child.countChild = await countTotalChildMember(listGroupOfChild);
        await getData(listGroupOfChild, child);
      }
      if (parentIn) {
        if (parent.group_number === '1') {
          parentIn.child1.arr.push(parent);
          parentIn.child1.countChild = await countTotalChildMember(parentIn.child1.arr.map(item => item._id));
        } else if (parent.group_number === '2') {
          parentIn.child2.arr.push(parent);
          parentIn.child2.countChild = await countTotalChildMember(parentIn.child2.arr.map(item => item._id));
        } else if (parent.group_number === '3') {
          parentIn.child3.arr.push(parent);
          parentIn.child3.countChild = await countTotalChildMember(parentIn.child3.arr.map(item => item._id));
        }
      } else {
        kq.push(parent);
      }
    } else {
      if (parentIn) {
        if (parent.group_number === '1') {
          parentIn.child1.arr.push(parent);
          parentIn.child1.countChild = await countTotalChildMember(parentIn.child1.arr.map(item => item._id));
        } else if (parent.group_number === '2') {
          parentIn.child2.arr.push(parent);
          parentIn.child2.countChild = await countTotalChildMember(parentIn.child2.arr.map(item => item._id));
        } else if (parent.group_number === '3') {
          parentIn.child3.arr.push(parent);
          parentIn.child3.countChild = await countTotalChildMember(parentIn.child3.arr.map(item => item._id));
        }
      } else {
        kq.push(parent);
      }
      continue;
    }
  }
  return kq;
}

exports.folderView = async (req, res) => {
  const { currentId, searchId } = req.query;

  const searchUser = await User.findOne({ _id: searchId }).exec();

  const objBranch = await Tree.findOne({ parent: searchId }).select('group1 group2 group3').exec();
  const { group1, group2, group3 } = objBranch;
  const arrObjectOfSearchUsers = [...group1, ...group2, ...group3];

  const objBranchChild = await Tree.findOne({ parent: currentId }).select('group1 group2 group3').exec();
  const listChildNameBefore = await getFullChildren([...objBranchChild.group1, ...objBranchChild.group2, ...objBranchChild.group3], []);

  const listChildName = listChildNameBefore.map(child => {
    return { value: child._id, label: child.full_name };
  });

  const result1 = await getData(group1);
  const result2 = await getData(group2);
  const result3 = await getData(group3);

  const root = [];
  root.push({
    _id: searchUser._id,
    avatar: searchUser.avatar,
    full_name: searchUser.full_name,
    countChild: await countTotalChildMember(arrObjectOfSearchUsers),
    level: searchUser.level,
    child1: {
      arr: [...result1],
      countChild: await countTotalChildMember(result1)
    },
    child2: {
      arr: [...result2],
      countChild: await countTotalChildMember(result2)
    },
    child3: {
      arr: [...result3],
      countChild: await countTotalChildMember(result3)
    },
  });
  res.json({ listChildName, group: root });
}